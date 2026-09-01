import { storageKeys } from "../../shared/contracts/storageKeys.js";
import { writeJson } from "../../shared/infrastructure/browserStorage.js";
import { getStudentLearningProfile } from "../../shared/infrastructure/classroomApi.js";
import { throwIfRequestAborted } from "../../shared/infrastructure/requestCancellation.js";
import {
  isPreAssessmentProgressEstablished,
  preAssessmentContext,
} from "../domain/preAssessmentAccess.js";
import { loadSessionSnapshot } from "./sessionSnapshotRepository.js";
import { restoreQuizDrafts } from "./studentSessionRepository.js";

/**
 *
 * @param snapshotSession
 * @param profile
 */
export function snapshotMatchesAuthoritativeSession(snapshotSession, profile) {
  const selection = snapshotSession?.selection;
  const currentSession = profile?.currentSession;
  const studentId = profile?.student?.id;
  if (!selection || !currentSession?.id || !studentId) return false;
  return (
    selection.studentId === studentId &&
    selection.studentSessionId === currentSession.id &&
    selection.learningPeriodId === currentSession.learningPeriodId &&
    selection.contentVersionId === currentSession.contentVersionId
  );
}

/**
 *
 * @param left
 * @param right
 */
function sameStudentSession(left, right) {
  const leftSelection = preAssessmentContext(left)?.selection;
  const rightSelection = preAssessmentContext(right)?.selection;
  return (
    Boolean(leftSelection?.studentSessionId) &&
    leftSelection.studentSessionId === rightSelection?.studentSessionId &&
    leftSelection.studentId === rightSelection?.studentId &&
    leftSelection.contentVersionId === rightSelection?.contentVersionId
  );
}

/**
 *
 * @param session
 */
function progressVector(session = {}) {
  const context = preAssessmentContext(session);
  const flow = session.learningFlow || context.learningFlow;
  const plan = flow?.plan;
  const planIndex = Math.max(0, Number(plan?.currentIndex) || 0);
  const planComplete =
    Boolean(plan?.units?.length) && planIndex >= plan.units.length;
  const practiceAttemptCount = Object.keys(context.postAttempts || {}).length;
  const resultEvidenceCount = Object.values(context.result || {}).reduce(
    (total, item) =>
      total + Math.max(0, Number(item?.evidenceCount ?? item?.total ?? 0) || 0),
    0,
  );
  const preAttemptCount = Object.keys(context.preAttempts || {}).length;
  return [
    Number(isPreAssessmentProgressEstablished(session)),
    Number(planComplete),
    planIndex,
    practiceAttemptCount,
    resultEvidenceCount,
    preAttemptCount,
    Number(context.resultSource === "authoritative"),
  ];
}

/**
 *
 * @param currentSession
 * @param restoredSession
 */
export function preferMoreAdvancedStudentSession(
  currentSession,
  restoredSession,
) {
  if (
    !currentSession?.selection &&
    !preAssessmentContext(currentSession)?.selection
  )
    return restoredSession;
  if (
    !restoredSession?.selection &&
    !preAssessmentContext(restoredSession)?.selection
  )
    return currentSession;
  if (!sameStudentSession(currentSession, restoredSession))
    return restoredSession;
  const currentProgress = progressVector(currentSession);
  const restoredProgress = progressVector(restoredSession);
  for (const [index, element] of currentProgress.entries()) {
    if (element === restoredProgress[index]) continue;
    return element > restoredProgress[index] ? currentSession : restoredSession;
  }
  return restoredSession;
}

/**
 *
 * @param accessToken
 * @param options
 */
export async function restorePersistentStudentState(accessToken, options = {}) {
  if (!accessToken)
    return {
      profile: null,
      snapshot: null,
      session: null,
      resetLocalSession: false,
    };
  const { currentSession, signal } = options;
  const requestOptions = { cache: "no-store", signal };
  const profile = await getStudentLearningProfile("", accessToken, {
    cache: "no-store",
    signal,
  });
  throwIfRequestAborted(signal);
  const studentSessionId = profile?.currentSession?.id || "";
  if (!studentSessionId)
    return { profile, snapshot: null, session: null, resetLocalSession: true };
  const snapshot = await loadSessionSnapshot(
    { sessionId: studentSessionId, accessToken },
    requestOptions,
  );
  throwIfRequestAborted(signal);
  if (!snapshot.hydrated?.session) {
    return { profile, snapshot, session: null, resetLocalSession: true };
  }
  if (
    !snapshotMatchesAuthoritativeSession(snapshot.payload?.session, profile)
  ) {
    return { profile, snapshot, session: null, resetLocalSession: true };
  }
  const session = preferMoreAdvancedStudentSession(
    currentSession,
    snapshot.hydrated.session,
  );
  if (session === snapshot.hydrated.session) {
    // 身份路由已经切换时，禁止旧学生快照覆盖当前浏览器状态。
    throwIfRequestAborted(signal);
    restoreQuizDrafts(snapshot.hydrated.drafts);
    writeJson(
      storageKeys.knowledgeProfile,
      snapshot.hydrated.knowledgeProfile || {},
    );
    writeJson(
      storageKeys.studentLearningHistory,
      snapshot.hydrated.learningHistory || [],
    );
  }
  return { profile, snapshot, session, resetLocalSession: false };
}
