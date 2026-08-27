import { storageKeys } from '../../shared/contracts/storageKeys.js';
import { writeJson } from '../../shared/infrastructure/browserStorage.js';
import { getStudentLearningProfile } from '../../shared/infrastructure/classroomApi.js';
import { isPreAssessmentProgressEstablished, preAssessmentContext } from '../domain/preAssessmentAccess.js';
import { loadSessionSnapshot } from './sessionSnapshotRepository.js';
import { restoreQuizDrafts } from './studentSessionRepository.js';

export function snapshotMatchesAuthoritativeSession(snapshotSession, profile) {
  const selection = snapshotSession?.selection;
  const currentSession = profile?.currentSession;
  const studentId = profile?.student?.id;
  if (!selection || !currentSession?.id || !studentId) return false;
  return selection.studentId === studentId
    && selection.studentSessionId === currentSession.id
    && selection.learningPeriodId === currentSession.learningPeriodId
    && selection.contentVersionId === currentSession.contentVersionId;
}

function sameStudentSession(left, right) {
  const leftSelection = preAssessmentContext(left)?.selection;
  const rightSelection = preAssessmentContext(right)?.selection;
  return Boolean(leftSelection?.studentSessionId)
    && leftSelection.studentSessionId === rightSelection?.studentSessionId
    && leftSelection.studentId === rightSelection?.studentId
    && leftSelection.contentVersionId === rightSelection?.contentVersionId;
}

function progressVector(session = {}) {
  const context = preAssessmentContext(session);
  const flow = session.learningFlow || context.learningFlow;
  const plan = flow?.plan;
  const planIndex = Math.max(0, Number(plan?.currentIndex) || 0);
  const planComplete = Boolean(plan?.units?.length) && planIndex >= plan.units.length;
  const practiceAttemptCount = Object.keys(context.postAttempts || {}).length;
  const resultEvidenceCount = Object.values(context.result || {}).reduce((total, item) => (
    total + Math.max(0, Number(item?.evidenceCount ?? item?.total ?? 0) || 0)
  ), 0);
  const preAttemptCount = Object.keys(context.preAttempts || {}).length;
  return [
    Number(isPreAssessmentProgressEstablished(session)),
    Number(planComplete),
    planIndex,
    practiceAttemptCount,
    resultEvidenceCount,
    preAttemptCount,
    Number(context.resultSource === 'authoritative'),
  ];
}

export function preferMoreAdvancedStudentSession(currentSession, restoredSession) {
  if (!currentSession?.selection && !preAssessmentContext(currentSession)?.selection) return restoredSession;
  if (!restoredSession?.selection && !preAssessmentContext(restoredSession)?.selection) return currentSession;
  if (!sameStudentSession(currentSession, restoredSession)) return restoredSession;
  const currentProgress = progressVector(currentSession);
  const restoredProgress = progressVector(restoredSession);
  for (let index = 0; index < currentProgress.length; index += 1) {
    if (currentProgress[index] === restoredProgress[index]) continue;
    return currentProgress[index] > restoredProgress[index] ? currentSession : restoredSession;
  }
  return restoredSession;
}

export async function restorePersistentStudentState(accessToken, options = {}) {
  if (!accessToken) return { profile: null, snapshot: null, session: null, resetLocalSession: false };
  const profile = await getStudentLearningProfile('', accessToken, { cache: 'no-store', ...options });
  const studentSessionId = profile?.currentSession?.id || '';
  if (!studentSessionId) return { profile, snapshot: null, session: null, resetLocalSession: true };
  const snapshot = await loadSessionSnapshot({ sessionId: studentSessionId, accessToken }, options);
  if (!snapshot.hydrated?.session) {
    return { profile, snapshot, session: null, resetLocalSession: true };
  }
  if (!snapshotMatchesAuthoritativeSession(snapshot.payload?.session, profile)) {
    return { profile, snapshot, session: null, resetLocalSession: true };
  }
  const session = preferMoreAdvancedStudentSession(options.currentSession, snapshot.hydrated.session);
  if (session === snapshot.hydrated.session) {
    restoreQuizDrafts(snapshot.hydrated.drafts);
    writeJson(storageKeys.knowledgeProfile, snapshot.hydrated.knowledgeProfile || {});
    writeJson(storageKeys.studentLearningHistory, snapshot.hydrated.learningHistory || []);
  }
  return { profile, snapshot, session, resetLocalSession: false };
}
