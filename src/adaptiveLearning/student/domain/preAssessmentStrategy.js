import { enabledLearningModules } from "../../shared/domain/learningGenerationPolicy.js";
import { isMasteredValue } from "../../shared/domain/masteryPolicy.js";
import { knowledgeEvidenceProfile } from "../../shared/domain/questionEvidence.js";
import {
  normalizeU1Difficulty,
  U1_DIFFICULTIES,
} from "../../shared/domain/unifiedMastery.js";

export const PRE_ASSESSMENT_STRATEGY_VERSION = "pre-diagnostic-rules-v4-u1-v6";

export const PRE_DIAGNOSIS_STATUS = Object.freeze({
  ASSESSING: "assessing",
  PROVISIONALLY_MASTERED: "provisionally_mastered",
  NEEDS_LEARNING: "needs_learning",
  UNCERTAIN: "uncertain",
  NOT_ASSESSED: "not_assessed",
});

const TERMINAL_STATUSES = new Set([
  PRE_DIAGNOSIS_STATUS.PROVISIONALLY_MASTERED,
  PRE_DIAGNOSIS_STATUS.NEEDS_LEARNING,
  PRE_DIAGNOSIS_STATUS.UNCERTAIN,
]);
const FIRST_WRONG_THRESHOLD = 0.5;
const CORRECT_THRESHOLD = 0.8;
const MAX_QUESTIONS_PER_KP = 3;
const GLOBAL_FIRST_ERROR_LIMIT = 3;
const HISTORY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const primaryKnowledgePointId = (question = {}) =>
  knowledgeEvidenceProfile(question).primaryKnowledgePointId;

/**
 *
 * @param attempt
 */
function scoreRatio(attempt = {}) {
  if (Number.isFinite(Number(attempt.scoreRatio)))
    return Math.max(0, Math.min(1, Number(attempt.scoreRatio)));
  const score = Number(attempt.score);
  const maxScore = Number(attempt.maxScore);
  return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
    ? Math.max(0, Math.min(1, score / maxScore))
    : 0;
}

/**
 *
 * @param questions
 * @param attempts
 * @param knowledgePointId
 */
function answeredForKnowledgePoint(questions, attempts, knowledgePointId) {
  return questions
    .map((question, questionIndex) => ({
      question,
      questionIndex,
      attempt: attempts[question.id],
    }))
    .filter(
      ({ question, attempt }) =>
        attempt?.submittedAt &&
        primaryKnowledgePointId(question) === knowledgePointId,
    )
    .sort(
      (left, right) =>
        new Date(left.attempt.submittedAt).getTime() -
          new Date(right.attempt.submittedAt).getTime() ||
        left.questionIndex - right.questionIndex,
    );
}

/**
 *
 * @param history
 * @param now
 */
export function hasStableRecentHistory(history = {}, now = Date.now()) {
  if (
    history?.masterySource !== "authoritative" ||
    history?.status !== "mastered"
  )
    return false;
  if (!isMasteredValue(history.mastery)) return false;
  const confidence =
    Number(history.confidence || 0) <= 1
      ? Number(history.confidence || 0) * 100
      : Number(history.confidence || 0);
  if (confidence < 50 || Number(history.evidenceCount || 0) < 3) return false;
  const updatedAt = new Date(history.updatedAt || 0).getTime();
  return (
    Number.isFinite(updatedAt) &&
    updatedAt > 0 &&
    now - updatedAt <= HISTORY_MAX_AGE_MS
  );
}

/**
 *
 * @param root0
 * @param root0.knowledgePoints
 * @param root0.historicalMastery
 * @param root0.generationPolicy
 * @param root0.now
 */
export function prepareHistoricalMasteryForPolicy({
  knowledgePoints = [],
  historicalMastery = {},
  generationPolicy,
  now = Date.now(),
}) {
  const modules = enabledLearningModules(generationPolicy);
  const bypassPreAssessment = !modules.preAssessment;
  return Object.fromEntries(
    knowledgePoints.map((knowledgePoint) => {
      const history = historicalMastery[knowledgePoint.id] || {};
      const stableMastery = hasStableRecentHistory(history, now);
      let preAssessmentDisposition = "";
      if (modules.masteredKnowledgePointPolicy === "FORCE_LEARN")
        preAssessmentDisposition = bypassPreAssessment ? "NEEDS_LEARNING" : "";
      else if (stableMastery && modules.masteredKnowledgePointPolicy === "SKIP")
        preAssessmentDisposition = "MASTERED";
      else if (bypassPreAssessment)
        preAssessmentDisposition = stableMastery
          ? "MASTERED"
          : "NEEDS_LEARNING";
      return [knowledgePoint.id, { ...history, preAssessmentDisposition }];
    }),
  );
}

/**
 *
 * @param status
 */
export function isTerminalPreDiagnosis(status) {
  return TERMINAL_STATUSES.has(status);
}

/**
 *
 * @param value
 */
function difficultyRank(value) {
  return U1_DIFFICULTIES.indexOf(normalizeU1Difficulty(value));
}

/**
 *
 * @param evidence
 */
function targetDifficulty(evidence = []) {
  if (evidence.length === 0) return "D3";
  const latest = evidence.at(-1);
  const current = difficultyRank(latest.difficulty);
  if (latest.scoreRatio >= CORRECT_THRESHOLD)
    return U1_DIFFICULTIES[Math.min(4, current + 1)];
  if (latest.scoreRatio < FIRST_WRONG_THRESHOLD)
    return U1_DIFFICULTIES[Math.max(0, current - 1)];
  return normalizeU1Difficulty(latest.difficulty);
}

/**
 *
 * @param questions
 * @param attempts
 * @param knowledgePointId
 */
function evidenceFor(questions, attempts, knowledgePointId) {
  return answeredForKnowledgePoint(questions, attempts, knowledgePointId).map(
    ({ question, attempt }) => ({
      questionId: question.id,
      difficulty: normalizeU1Difficulty(question.difficulty),
      type: question.type || "",
      scoreRatio: scoreRatio(attempt),
      skipped: Boolean(attempt.skipped),
      submittedAt: attempt.submittedAt,
    }),
  );
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.knowledgePointId
 * @param root0.history
 * @param root0.now
 */
export function diagnosePreAssessmentKnowledgePoint({
  questions = [],
  attempts = {},
  knowledgePointId,
  history = {},
  now = Date.now(),
}) {
  const evidence = evidenceFor(questions, attempts, knowledgePointId);
  const recentHistory = hasStableRecentHistory(history, now);
  const base = {
    knowledgePointId,
    status:
      evidence.length > 0
        ? PRE_DIAGNOSIS_STATUS.ASSESSING
        : PRE_DIAGNOSIS_STATUS.NOT_ASSESSED,
    reason: evidence.length > 0 ? "MORE_EVIDENCE_REQUIRED" : "NOT_STARTED",
    confidence: evidence.length > 0 ? 25 : 0,
    evidenceCount: evidence.length,
    historicalEvidenceUsed: false,
    evidence,
  };
  if (history?.preAssessmentDisposition === "MASTERED") {
    return {
      ...base,
      status: PRE_DIAGNOSIS_STATUS.PROVISIONALLY_MASTERED,
      reason: "STABLE_HISTORY_ACCEPTED",
      confidence: 85,
      historicalEvidenceUsed: true,
    };
  }
  if (history?.preAssessmentDisposition === "NEEDS_LEARNING") {
    return {
      ...base,
      status: PRE_DIAGNOSIS_STATUS.NEEDS_LEARNING,
      reason: "ASSESSMENT_NOT_REQUIRED",
      confidence: recentHistory ? 70 : 0,
      historicalEvidenceUsed: recentHistory,
    };
  }
  if (evidence.length === 0) return base;
  if (
    recentHistory &&
    evidence.length === 1 &&
    evidence[0].scoreRatio >= CORRECT_THRESHOLD &&
    difficultyRank(evidence[0].difficulty) >= difficultyRank("D3")
  ) {
    return {
      ...base,
      status: PRE_DIAGNOSIS_STATUS.PROVISIONALLY_MASTERED,
      reason: "RECENT_MASTERY_VERIFIED",
      confidence: 85,
      historicalEvidenceUsed: true,
    };
  }
  if (evidence[0].scoreRatio < FIRST_WRONG_THRESHOLD) {
    return {
      ...base,
      status: PRE_DIAGNOSIS_STATUS.NEEDS_LEARNING,
      reason: "FIRST_WRONG_STOPPED",
      confidence: 45,
    };
  }
  // The pre-test is a short decision tree, not a long practice session. After
  // a correct D3 probe, the D4 confirmation is decisive: success may continue
  // to D5, while an incorrect/partial response closes this point as uncertain
  // and moves to the next point's D3 probe. This keeps difficulty changes to
  // one level and avoids an artificial D4 -> D2 jump when the D3 probe is
  // already consumed.
  if (evidence.length >= 2 && evidence.at(-1).scoreRatio < CORRECT_THRESHOLD) {
    return {
      ...base,
      status: PRE_DIAGNOSIS_STATUS.UNCERTAIN,
      reason: "SECOND_RESPONSE_NOT_CONFIRMED",
      confidence: evidence.at(-1).scoreRatio < FIRST_WRONG_THRESHOLD ? 55 : 60,
    };
  }
  if (evidence.length >= MAX_QUESTIONS_PER_KP) {
    const average =
      evidence.reduce((sum, item) => sum + item.scoreRatio, 0) /
      evidence.length;
    return {
      ...base,
      status:
        average >= CORRECT_THRESHOLD
          ? PRE_DIAGNOSIS_STATUS.PROVISIONALLY_MASTERED
          : PRE_DIAGNOSIS_STATUS.UNCERTAIN,
      reason:
        average >= CORRECT_THRESHOLD
          ? "THREE_RESPONSES_TARGET_REACHED"
          : "THREE_RESPONSES_LIMIT",
      confidence: average >= CORRECT_THRESHOLD ? 70 : 55,
    };
  }
  return {
    ...base,
    reason:
      evidence.length === 1
        ? "FIRST_CORRECT_RAISE_DIFFICULTY"
        : "CONTINUE_SAME_KNOWLEDGE_POINT",
    confidence: evidence.length === 2 ? 55 : 25,
  };
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.knowledgePoints
 * @param root0.historicalMastery
 * @param root0.now
 */
export function buildPreAssessmentDiagnosis({
  questions = [],
  attempts = {},
  knowledgePoints = [],
  historicalMastery = {},
  now = Date.now(),
}) {
  return Object.fromEntries(
    knowledgePoints.map((knowledgePoint) => [
      knowledgePoint.id,
      diagnosePreAssessmentKnowledgePoint({
        questions,
        attempts,
        knowledgePointId: knowledgePoint.id,
        history: historicalMastery[knowledgePoint.id],
        now,
      }),
    ]),
  );
}

/**
 *
 * @param root0
 * @param root0.knowledgePoints
 * @param root0.diagnosis
 */
function firstErrorStreak({ knowledgePoints, diagnosis }) {
  let streak = 0;
  for (const knowledgePoint of knowledgePoints) {
    const evidence = diagnosis[knowledgePoint.id]?.evidence || [];
    if (evidence.length === 0) break;
    if (evidence[0].scoreRatio < FIRST_WRONG_THRESHOLD) streak += 1;
    else streak = 0;
    if (streak >= GLOBAL_FIRST_ERROR_LIMIT) break;
  }
  return streak;
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.knowledgePointId
 * @param root0.evidence
 */
function selectCandidate({ questions, attempts, knowledgePointId, evidence }) {
  const candidates = questions.filter(
    (question) =>
      !attempts[question.id] &&
      primaryKnowledgePointId(question) === knowledgePointId,
  );
  if (candidates.length === 0) return null;
  const target = targetDifficulty(evidence);
  return [...candidates].sort(
    (left, right) =>
      Math.abs(difficultyRank(left.difficulty) - difficultyRank(target)) -
        Math.abs(difficultyRank(right.difficulty) - difficultyRank(target)) ||
      String(left.id).localeCompare(String(right.id)),
  )[0];
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.knowledgePoints
 * @param root0.historicalMastery
 */
export function selectNextPreAssessmentQuestion({
  questions = [],
  attempts = {},
  knowledgePoints = [],
  historicalMastery = {},
}) {
  const diagnosis = buildPreAssessmentDiagnosis({
    questions,
    attempts,
    knowledgePoints,
    historicalMastery,
  });
  if (
    firstErrorStreak({ knowledgePoints, diagnosis }) >= GLOBAL_FIRST_ERROR_LIMIT
  )
    return null;
  // The first unresolved point owns the cursor. This is intentionally not a
  // round-robin pass: after a correct answer, the same point gets the next
  // harder evidence before the test moves to the next point.
  for (const knowledgePoint of knowledgePoints) {
    const item = diagnosis[knowledgePoint.id];
    if (isTerminalPreDiagnosis(item.status)) continue;
    if (item.evidence.length >= MAX_QUESTIONS_PER_KP) continue;
    const candidate = selectCandidate({
      questions,
      attempts,
      knowledgePointId: knowledgePoint.id,
      evidence: item.evidence,
    });
    if (candidate) return candidate;
  }
  return null;
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.knowledgePoints
 * @param root0.historicalMastery
 * @param root0.currentQuestion
 */
export function advancePreAssessment({
  questions = [],
  attempts = {},
  knowledgePoints = [],
  historicalMastery = {},
  currentQuestion = null,
}) {
  const diagnosisByKnowledgePoint = buildPreAssessmentDiagnosis({
    questions,
    attempts,
    knowledgePoints,
    historicalMastery,
  });
  const globalStopped =
    firstErrorStreak({
      knowledgePoints,
      diagnosis: diagnosisByKnowledgePoint,
    }) >= GLOBAL_FIRST_ERROR_LIMIT;
  const nextQuestion = globalStopped
    ? null
    : selectNextPreAssessmentQuestion({
        questions,
        attempts,
        knowledgePoints,
        historicalMastery,
      });
  const resolvedKnowledgePointCount = Object.values(
    diagnosisByKnowledgePoint,
  ).filter((item) => isTerminalPreDiagnosis(item.status)).length;
  const answeredCount = Object.values(attempts).filter(
    (attempt) => attempt?.submittedAt,
  ).length;
  const assessmentComplete =
    globalStopped ||
    (knowledgePoints.length > 0 &&
      !nextQuestion &&
      (answeredCount > 0 ||
        resolvedKnowledgePointCount === knowledgePoints.length));
  const currentKnowledgePointId = primaryKnowledgePointId(
    currentQuestion || {},
  );
  return {
    strategyVersion: PRE_ASSESSMENT_STRATEGY_VERSION,
    nextQuestion,
    diagnosisByKnowledgePoint,
    resolvedKnowledgePointCount,
    totalKnowledgePointCount: knowledgePoints.length,
    assessmentComplete,
    globalStopped,
    globalStopReason: globalStopped ? "THREE_CONSECUTIVE_FIRST_ERRORS" : null,
    currentDecision: diagnosisByKnowledgePoint[currentKnowledgePointId] || null,
  };
}

/**
 *
 * @param summary
 */
export function calculatePreAssessmentProgress(summary = {}) {
  if (summary.assessmentComplete || summary.globalStopped) return 100;
  const total = Math.max(0, Number(summary.totalKnowledgePointCount || 0));
  if (!total) return 0;
  const progressUnits = Object.values(
    summary.diagnosisByKnowledgePoint || {},
  ).reduce((sum, diagnosis = {}) => {
    if (isTerminalPreDiagnosis(diagnosis.status)) return sum + 1;
    return (
      sum +
      Math.min(
        1,
        Math.max(0, Number(diagnosis.evidenceCount || 0)) /
          MAX_QUESTIONS_PER_KP,
      )
    );
  }, 0);
  return Math.max(0, Math.min(100, Math.round((progressUnits / total) * 100)));
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.knowledgePoints
 * @param root0.historicalMastery
 */
export function createPreAssessmentState({
  questions = [],
  knowledgePoints = [],
  historicalMastery = {},
}) {
  const firstQuestion = selectNextPreAssessmentQuestion({
    questions,
    attempts: {},
    knowledgePoints,
    historicalMastery,
  });
  return { order: firstQuestion ? [firstQuestion.id] : [], targetByKp: {} };
}

/**
 *
 * @param mastery
 * @param diagnosisByKnowledgePoint
 * @param historicalMastery
 */
export function mergePreAssessmentDiagnosisIntoMastery(
  mastery = {},
  diagnosisByKnowledgePoint = {},
  historicalMastery = {},
) {
  return Object.fromEntries(
    Object.entries(mastery).map(([knowledgePointId, item]) => {
      const diagnosis = diagnosisByKnowledgePoint[knowledgePointId] || {};
      const history = historicalMastery[knowledgePointId] || {};
      const acceptedHistory = diagnosis.reason === "STABLE_HISTORY_ACCEPTED";
      return [
        knowledgePointId,
        {
          ...item,
          ...(acceptedHistory
            ? {
                mastery: history.mastery,
                evidenceCount: history.evidenceCount,
                evidenceWeight: history.evidenceCount,
              }
            : {}),
          diagnosisStatus:
            diagnosis.status || PRE_DIAGNOSIS_STATUS.NOT_ASSESSED,
          diagnosisReason: diagnosis.reason || "DIAGNOSIS_MISSING",
          confidence: item.confidence ?? diagnosis.confidence ?? 0,
          historicalEvidenceUsed: Boolean(diagnosis.historicalEvidenceUsed),
          notAssessed:
            diagnosis.status === PRE_DIAGNOSIS_STATUS.NOT_ASSESSED ||
            item.evidenceCount === 0,
        },
      ];
    }),
  );
}
