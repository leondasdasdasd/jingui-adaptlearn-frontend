import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearAllQuizDrafts,
  clearQuizDraft,
  clearStudentSession,
  readStudentSession,
  writeStudentSession,
} from '../student/data/studentSessionRepository';
import { recordLearningEvent } from '../student/data/learningEventRepository';
import { flushClassroomOutbox } from '../student/data/classroomSyncRepository';
import { clearAllScratchPaperSessions } from '../student/data/scratchPaperSessionRepository';
import {
  saveSessionSnapshot,
  snapshotSyncMetadata,
} from '../student/data/sessionSnapshotRepository';
import { clientEvents } from '../shared/contracts/storageKeys';
import { ensureLearningPlanCheckpoints } from '../student/domain/learningPlan';
import { shouldRecordSessionHeartbeat } from '../student/domain/sessionHeartbeat';
import { createTutoringSession } from '../shared/domain/tutoringStateMachine';
import {
  ensureLocalStudentIdentity,
  upsertLearningSessionSnapshot,
} from '../student/data/learningHistoryRepository';
const CHECK_IN_VERSION = 4;

export const emptySession = {
  selection: null,
  preQuestions: [],
  postQuestions: [],
  preAttempts: {},
  postAttempts: {},
  preMastery: {},
  preAssessment: null,
  result: {},
  resultSource: 'preview',
  publishedContent: null,
  learningFlow: {
    mode: 'lesson_flow', plan: null, activeUnit: null, context: null, returnTo: '', returnUnit: null, returnMode: null,
  },
  learningCheckIn: {
    version: CHECK_IN_VERSION,
    messages: [],
    diagnosis: null,
  },
  practiceIntervention: null,
  tutoringSession: null,
  remediationOpenMaic: {
    jobId: '',
    status: 'idle',
    step: '',
    progress: 0,
    message: '',
    classroomId: '',
    classroomUrl: '',
  },
};

const LearningSessionContext = createContext(null);

function readSession() {
  try {
    const cached = readStudentSession(null);
    if (!cached) return emptySession;
    const parsed = { ...emptySession, ...cached };
    if (parsed.selection && !parsed.selection.studentId && !parsed.selection.classroomAccessToken) {
      const identity = ensureLocalStudentIdentity();
      parsed.selection = {
        ...parsed.selection,
        studentId: identity.id,
        studentName: parsed.selection.studentName || '当前学生（本机）',
      };
      writeStudentSession(parsed);
    }
    const migratedPlan = ensureLearningPlanCheckpoints(parsed.learningFlow?.plan);
    if (migratedPlan !== parsed.learningFlow?.plan) {
      parsed.learningFlow = { ...parsed.learningFlow, plan: migratedPlan };
      writeStudentSession(parsed);
    }
    if (parsed.postQuestions.length && parsed.postQuestions.some((question) => !question.phase)) {
      parsed.postQuestions = [];
      parsed.postAttempts = {};
      parsed.result = {};
      clearQuizDraft('post');
      writeStudentSession(parsed);
    }
    if (parsed.learningCheckIn?.version !== CHECK_IN_VERSION) {
      parsed.learningCheckIn = { version: CHECK_IN_VERSION, messages: [], diagnosis: null };
      writeStudentSession(parsed);
    }
    if (parsed.practiceIntervention && !parsed.tutoringSession) {
      parsed.tutoringSession = createTutoringSession(parsed.practiceIntervention);
      writeStudentSession(parsed);
    }
    return parsed;
  } catch {
    clearStudentSession();
    return emptySession;
  }
}

export function LearningSessionProvider({ children }) {
  const [session, setSessionState] = useState(readSession);
  const [snapshotPulse, setSnapshotPulse] = useState(0);
  const sessionRef = useRef(session);
  const snapshotQueueRef = useRef(Promise.resolve());
  sessionRef.current = session;

  useEffect(() => {
    // 自主学习也要有稳定的本机学生身份；正式课堂身份仍以服务端返回的 studentId 为准。
    ensureLocalStudentIdentity();
  }, []);

  useEffect(() => {
    const context = session.learningFlow?.context;
    const persistedSession = session.selection || !context?.selection
      ? session
      : {
        ...session,
        selection: context.selection,
        preQuestions: context.preQuestions || session.preQuestions,
        postQuestions: context.postQuestions || session.postQuestions,
        preAttempts: context.preAttempts || session.preAttempts,
        postAttempts: context.postAttempts || session.postAttempts,
        preMastery: context.preMastery || session.preMastery,
        preAssessment: context.preAssessment || session.preAssessment,
        result: context.result || session.result,
        resultSource: context.resultSource || session.resultSource,
        publishedContent: context.publishedContent || session.publishedContent,
      };
    if (!persistedSession.selection) {
      clearStudentSession();
      return;
    }
    writeStudentSession(persistedSession);
    try {
      upsertLearningSessionSnapshot(persistedSession, { status: 'in_progress' });
    } catch {
      // 历史记录是增强能力；本轮学习不能因浏览器存储异常而中断。
    }
  }, [session]);

  useEffect(() => {
    const flush = () => { void flushClassroomOutbox(); };
    flush();
    const timer = window.setInterval(flush, 5_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const pulse = () => setSnapshotPulse((value) => value + 1);
    window.addEventListener(clientEvents.quizDraftUpdated, pulse);
    window.addEventListener('online', pulse);
    return () => {
      window.removeEventListener(clientEvents.quizDraftUpdated, pulse);
      window.removeEventListener('online', pulse);
    };
  }, []);

  useEffect(() => {
    const selection = session.selection;
    if (!selection?.studentSessionId || !selection?.classroomAccessToken) return undefined;
    const credentials = {
      sessionId: selection.studentSessionId,
      accessToken: selection.classroomAccessToken,
    };
    const timer = window.setTimeout(() => {
      const enqueue = async () => {
        const current = sessionRef.current;
        if (current.selection?.studentSessionId !== credentials.sessionId) return;
        const expectedRevision = snapshotSyncMetadata(credentials.sessionId).revision || 0;
        await saveSessionSnapshot({
          session: current,
          route: `${window.location.pathname}${window.location.search}`,
          credentials,
          expectedRevision,
        });
      };
      snapshotQueueRef.current = snapshotQueueRef.current
        .catch(() => undefined)
        .then(enqueue)
        .catch(() => undefined);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [session, snapshotPulse]);

  useEffect(() => {
    if (!shouldRecordSessionHeartbeat(session)) return undefined;
    const heartbeat = () => recordLearningEvent({ type: 'heartbeat', stage: session.practiceIntervention ? 'check_in' : undefined });
    heartbeat();
    const timer = window.setInterval(heartbeat, 30_000);
    return () => window.clearInterval(timer);
  }, [session.selection?.studentSessionId, session.selection?.classroomAccessToken, session.practiceIntervention, session.resultSource]);

  const setSession = useCallback((next) => {
    setSessionState((current) => {
      return typeof next === 'function' ? next(current) : next;
    });
  }, []);

  const resetSession = useCallback(() => {
    void clearAllScratchPaperSessions();
    clearStudentSession();
    clearAllQuizDrafts();
    setSessionState(emptySession);
  }, []);

  const value = useMemo(() => ({ session, setSession, resetSession }), [resetSession, session, setSession]);
  return <LearningSessionContext.Provider value={value}>{children}</LearningSessionContext.Provider>;
}

export function useLearningSession() {
  const context = useContext(LearningSessionContext);
  if (!context) throw new Error('useLearningSession 必须在 LearningSessionProvider 中使用');
  return context;
}

export function useOptionalLearningSession() {
  return useContext(LearningSessionContext);
}
