import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";

import { useLocation } from "../routing";

import { clientEvents } from "../shared/contracts/storageKeys";
import {
  isTransientLearningSession,
  transientQuizDraftPrefix,
  transientScratchPaperScopePrefix,
} from "../shared/domain/learningSessionPolicy";
import { createTutoringSession } from "../shared/domain/tutoringStateMachine";
import { flushClassroomOutbox } from "../student/data/classroomSyncRepository";
import { recordLearningEvent } from "../student/data/learningEventRepository";
import {
  ensureLocalStudentIdentity,
  upsertLearningSessionSnapshot,
} from "../student/data/learningHistoryRepository";
import {
  clearAllScratchPaperSessions,
  clearScratchPaperSessionsByScopePrefix,
} from "../student/data/scratchPaperSessionRepository";
import {
  saveSessionSnapshot,
  snapshotSyncMetadata,
} from "../student/data/sessionSnapshotRepository";
import {
  clearAllQuizDrafts,
  clearQuizDraft,
  clearQuizDraftsByPrefix,
  clearStudentSession,
  clearTransientStudentSession,
  readActiveStudentSession,
  writeStudentSession,
  writeTransientStudentSession,
} from "../student/data/studentSessionRepository";
import { ensureLearningPlanCheckpoints } from "../student/domain/learningPlan";
import { shouldRecordSessionHeartbeat } from "../student/domain/sessionHeartbeat";
import {
  CHECK_IN_VERSION,
  createEmptyLearningSession,
  emptySession,
} from "./learningSessionModel";

export { emptySession } from "./learningSessionModel";

const LearningSessionContext = createContext(null);

const FLOW_CONTEXT_FIELDS = [
  "preQuestions",
  "postQuestions",
  "preAttempts",
  "postAttempts",
  "preMastery",
  "preAssessment",
  "result",
  "resultSource",
  "publishedContent",
];

/**
 * 为旧版自主学习会话补齐本机身份，正式课堂会话仍使用服务端身份。
 * @param {typeof emptySession} session 待迁移会话
 */
function migrateLocalStudentIdentity(session) {
  if (
    session.selection &&
    !session.selection.studentId &&
    !session.selection.classroomAccessToken
  ) {
    const identity = ensureLocalStudentIdentity();
    session.selection = {
      ...session.selection,
      studentId: identity.id,
      studentName: session.selection.studentName || "当前学生（本机）",
    };
    writeStudentSession(session);
  }
}

/**
 * 补齐旧学习计划缺少的检查点。
 * @param {typeof emptySession} session 待迁移会话
 */
function migrateLearningPlan(session) {
  const migratedPlan = ensureLearningPlanCheckpoints(
    session.learningFlow?.plan,
  );
  if (migratedPlan !== session.learningFlow?.plan) {
    session.learningFlow = { ...session.learningFlow, plan: migratedPlan };
    writeStudentSession(session);
  }
}

/**
 * 清除无法区分阶段的旧版学后题，避免将旧草稿误当成本轮结果。
 * @param {typeof emptySession} session 待迁移会话
 */
function clearLegacyPostAssessment(session) {
  if (session.postQuestions.some((question) => !question.phase)) {
    session.postQuestions = [];
    session.postAttempts = {};
    session.result = {};
    clearQuizDraft("post");
    writeStudentSession(session);
  }
}

/**
 * 版本变化时重置不可兼容的学习诊断对话。
 * @param {typeof emptySession} session 待迁移会话
 */
function migrateLearningCheckIn(session) {
  if (session.learningCheckIn?.version !== CHECK_IN_VERSION) {
    session.learningCheckIn = {
      version: CHECK_IN_VERSION,
      messages: [],
      diagnosis: null,
    };
    writeStudentSession(session);
  }
}

/**
 * 从旧干预状态创建统一的辅导会话状态。
 * @param {typeof emptySession} session 待迁移会话
 */
function migrateTutoringSession(session) {
  if (session.practiceIntervention && !session.tutoringSession) {
    session.tutoringSession = createTutoringSession(
      session.practiceIntervention,
    );
    writeStudentSession(session);
  }
}

const SESSION_MIGRATIONS = [
  migrateLocalStudentIdentity,
  migrateLearningPlan,
  clearLegacyPostAssessment,
  migrateLearningCheckIn,
  migrateTutoringSession,
];

/**
 * 按固定顺序执行会话迁移，保留每一步原有的持久化时机。
 * @param {typeof emptySession} session 待迁移会话
 */
function migrateSession(session) {
  for (const migrate of SESSION_MIGRATIONS) migrate(session);
}

/**
 *
 */
function readSession() {
  try {
    const cached = readActiveStudentSession(null);
    if (!cached) return createEmptyLearningSession();
    const parsed = { ...emptySession, ...cached };
    // 临时试做来自当前发布版本，不执行会写回正式学生存储的旧会话迁移。
    if (!isTransientLearningSession(parsed)) migrateSession(parsed);
    return parsed;
  } catch {
    clearStudentSession();
    return createEmptyLearningSession();
  }
}

/**
 * 将 flow context 中的课堂快照映射回持久化会话边界。
 * @param {typeof emptySession} session 当前内存会话
 * @returns {typeof emptySession} 可持久化会话
 */
function sessionForPersistence(session) {
  const context = session.learningFlow?.context;
  if (session.selection || !context?.selection) return session;
  let snapshot = { ...session, selection: context.selection };
  for (const field of FLOW_CONTEXT_FIELDS) {
    snapshot = {
      ...snapshot,
      [field]: context[field] || session[field],
    };
  }
  return snapshot;
}

/**
 * 保存队列执行时重新读取最新会话，避免延迟窗口写入过期状态。
 * @param {{current: typeof emptySession}} sessionRef 最新会话引用
 * @param {{sessionId: string, accessToken: string}} credentials 快照凭证
 */
async function saveQueuedSessionSnapshot(sessionRef, routeRef, credentials) {
  const current = sessionRef.current;
  if (current.selection?.studentSessionId !== credentials.sessionId) return;
  const expectedRevision =
    snapshotSyncMetadata(credentials.sessionId).revision || 0;
  await saveSessionSnapshot({
    session: current,
    route: `${routeRef.current.pathname}${routeRef.current.search}`,
    credentials,
    expectedRevision,
  });
}

/**
 * 串行化浏览器快照写入，单次失败不阻断后续同步。
 * @param {{current: Promise<void>}} queueRef 写入队列引用
 * @param {{current: typeof emptySession}} sessionRef 最新会话引用
 * @param {{sessionId: string, accessToken: string}} credentials 快照凭证
 */
function enqueueSessionSnapshot(queueRef, sessionRef, routeRef, credentials) {
  queueRef.current = queueRef.current
    .catch(() => {})
    .then(() => saveQueuedSessionSnapshot(sessionRef, routeRef, credentials))
    .catch(() => {});
}

/**
 *
 * @param root0
 * @param root0.children
 */
export function LearningSessionProvider({ children }) {
  const location = useLocation();
  const [session, setSessionState] = useState(readSession);
  const [snapshotPulse, setSnapshotPulse] = useState(0);
  const sessionRef = useRef(session);
  const routeRef = useRef(location);
  const snapshotQueueRef = useRef(Promise.resolve());
  sessionRef.current = session;
  routeRef.current = location;

  useEffect(() => {
    // 自主学习也要有稳定的本机学生身份；正式课堂身份仍以服务端返回的 studentId 为准。
    ensureLocalStudentIdentity();
  }, []);

  useEffect(() => {
    const persistedSession = sessionForPersistence(session);
    if (isTransientLearningSession(persistedSession)) {
      writeTransientStudentSession(persistedSession);
      return;
    }
    if (!persistedSession.selection) {
      clearStudentSession();
      return;
    }
    writeStudentSession(persistedSession);
    try {
      upsertLearningSessionSnapshot(persistedSession, {
        status: "in_progress",
      });
    } catch {
      // 历史记录是增强能力；本轮学习不能因浏览器存储异常而中断。
    }
  }, [session]);

  useEffect(() => {
    const flush = () => {
      void flushClassroomOutbox();
    };
    flush();
    const timer = window.setInterval(flush, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const pulse = () => setSnapshotPulse((value) => value + 1);
    window.addEventListener(clientEvents.quizDraftUpdated, pulse);
    window.addEventListener("online", pulse);
    return () => {
      window.removeEventListener(clientEvents.quizDraftUpdated, pulse);
      window.removeEventListener("online", pulse);
    };
  }, []);

  useEffect(() => {
    const selection = session.selection;
    if (!selection?.studentSessionId || !selection?.classroomAccessToken)
      return;
    const credentials = {
      sessionId: selection.studentSessionId,
      accessToken: selection.classroomAccessToken,
    };
    const timer = window.setTimeout(() => {
      enqueueSessionSnapshot(
        snapshotQueueRef,
        sessionRef,
        routeRef,
        credentials,
      );
    }, 750);
    return () => window.clearTimeout(timer);
  }, [session, snapshotPulse]);

  useEffect(() => {
    if (!shouldRecordSessionHeartbeat(session)) return;
    const heartbeat = () =>
      recordLearningEvent({
        type: "heartbeat",
        stage: session.practiceIntervention ? "check_in" : undefined,
      });
    heartbeat();
    const timer = window.setInterval(heartbeat, 30_000);
    return () => window.clearInterval(timer);
  }, [
    session.selection?.studentSessionId,
    session.selection?.classroomAccessToken,
    session.practiceIntervention,
    session.resultSource,
  ]);

  const setSession = useCallback((next) => {
    setSessionState((current) => {
      return typeof next === "function" ? next(current) : next;
    });
  }, []);

  const startTransientSession = useCallback((nextSession) => {
    if (!isTransientLearningSession(nextSession)) {
      throw new Error("临时学习入口必须提供临时会话");
    }
    // 先同步写入临时仓储，确保子页面首个 effect 记录事件时已能识别试做身份。
    if (!writeTransientStudentSession(nextSession)) {
      throw new Error("TRANSIENT_SESSION_STORAGE_UNAVAILABLE");
    }
    setSessionState(nextSession);
  }, []);

  const restorePersistentSession = useCallback(() => {
    const transientSelection = sessionRef.current.selection;
    clearQuizDraftsByPrefix(transientQuizDraftPrefix(transientSelection));
    void clearScratchPaperSessionsByScopePrefix(
      transientScratchPaperScopePrefix(transientSelection),
    );
    clearTransientStudentSession();
    setSessionState(readSession());
  }, []);

  const resetSession = useCallback(() => {
    void clearAllScratchPaperSessions();
    clearTransientStudentSession();
    clearStudentSession();
    clearAllQuizDrafts();
    setSessionState(createEmptyLearningSession());
  }, []);

  const value = useMemo(
    () => ({
      session,
      setSession,
      resetSession,
      restorePersistentSession,
      startTransientSession,
    }),
    [
      resetSession,
      restorePersistentSession,
      session,
      setSession,
      startTransientSession,
    ],
  );
  return (
    <LearningSessionContext.Provider value={value}>
      {children}
    </LearningSessionContext.Provider>
  );
}

LearningSessionProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 *
 */
export function useLearningSession() {
  const context = useContext(LearningSessionContext);
  if (!context)
    throw new Error("useLearningSession 必须在 LearningSessionProvider 中使用");
  return context;
}

/**
 *
 */
export function useOptionalLearningSession() {
  return useContext(LearningSessionContext);
}
