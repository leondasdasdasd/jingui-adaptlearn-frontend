import {
  applyU1Evidence,
  calculateU1KnowledgeMastery,
  createU1State,
  normalizeU1Difficulty,
  summarizeU1State,
  U1_ALGORITHM_VERSION,
} from "../shared/domain/unifiedMastery.js";

const clamp = (value) => Math.max(0, Math.min(1, Number(value)));

/**
 *
 * @param question
 * @param attempt
 */
function attemptScoreRatio(question, attempt = {}) {
  if (Number.isFinite(Number(attempt.scoreRatio)))
    return clamp(attempt.scoreRatio);
  const score = Number(attempt.score);
  const maxScore = Number(attempt.maxScore || question.maxScore || 1);
  if (Number.isFinite(score) && maxScore > 0) return clamp(score / maxScore);
  return attempt.answer === question.answer ? 1 : 0;
}

/**
 *
 * @param questions
 * @param attempts
 * @param knowledgePointId
 * @param defaultSource
 */
function evidenceRows(
  questions = [],
  attempts = {},
  knowledgePointId,
  defaultSource = "PRE",
) {
  return questions
    .map((question, index) => ({
      question,
      attempt: attempts[question.id],
      index,
    }))
    .filter(
      ({ question, attempt }) =>
        attempt &&
        (question.primaryKnowledgePointId === knowledgePointId ||
          question.knowledgePointIds?.includes(knowledgePointId) ||
          question.knowledgePointWeights?.[knowledgePointId] != null),
    )
    .sort(
      (a, b) =>
        new Date(a.attempt.submittedAt || 0) -
          new Date(b.attempt.submittedAt || 0) || a.index - b.index,
    )
    .flatMap(({ question, attempt }) => {
      const map = Array.isArray(question.knowledgeEvidenceMap)
        ? question.knowledgeEvidenceMap
        : [];
      const mapped = map.find(
        (item) => item.knowledgePointId === knowledgePointId,
      );
      const weight =
        mapped?.weight ??
        question.knowledgePointWeights?.[knowledgePointId] ??
        (question.primaryKnowledgePointId === knowledgePointId ||
        question.knowledgePointIds?.[0] === knowledgePointId
          ? 1
          : 0.3);
      if (Number(weight) <= 0) return [];
      return [
        {
          questionId: question.id,
          source: String(
            question.source || question.purpose || defaultSource,
          ).toUpperCase(),
          difficulty: normalizeU1Difficulty(question.difficulty),
          scoreRatio: attemptScoreRatio(question, attempt),
          score: attempt.score,
          maxScore: attempt.maxScore || question.maxScore,
          role: mapped?.role
            ? String(mapped.role).toUpperCase()
            : question.primaryKnowledgePointId === knowledgePointId ||
                question.knowledgePointIds?.[0] === knowledgePointId
              ? "PRIMARY"
              : "SECONDARY_OBSERVED",
          knowledgePointWeight: Number(weight),
          independence:
            mapped?.independence ??
            question.independence ??
            attempt.independence ??
            1,
          itemQuality: question.itemQuality ?? attempt.itemQuality ?? 1,
          gradingConfidence:
            attempt.gradingConfidence ?? question.gradingConfidence ?? 1,
          hint: attempt.hint || question.hint || "NONE",
          hintUsed: Boolean(attempt.hintUsed),
          novelty: attempt.novelty || question.novelty || "NEW",
        },
      ];
    });
}

/**
 *
 * @param questions
 * @param attempts
 * @param knowledgePoints
 * @param root0
 * @param root0.source
 * @param root0.priorMastery
 */
export function calculateUnifiedMastery(
  questions = [],
  attempts = {},
  knowledgePoints = [],
  { source = "PRE", priorMastery = {} } = {},
) {
  return Object.fromEntries(
    knowledgePoints.map((kp) => {
      const evidence = evidenceRows(questions, attempts, kp.id, source);
      const item = calculateU1KnowledgeMastery({
        knowledgePointId: kp.id,
        evidence,
        prior: priorMastery[kp.id] || {},
      });
      const answered = evidence.length;
      const unassessed = answered === 0 && priorMastery[kp.id]?.mastery == null;
      const correctRate = answered
        ? Math.round(
            (evidence.reduce((sum, row) => sum + row.scoreRatio, 0) /
              answered) *
              100,
          )
        : null;
      return [
        kp.id,
        {
          ...item,
          ...(unassessed
            ? {
                mastery: null,
                confidence: 0,
                lowerBound: null,
                upperBound: null,
                status: "NOT_ASSESSED",
              }
            : {}),
          masterySource: "U1",
          algorithmVersion: U1_ALGORITHM_VERSION,
          correctRate,
          evidenceCount: item.evidenceCount,
          evidenceWeight: Number(
            evidence
              .reduce((sum, row) => sum + row.knowledgePointWeight, 0)
              .toFixed(2),
          ),
          status: item.status,
        },
      ];
    }),
  );
}

/**
 *
 * @param questions
 * @param attempts
 * @param knowledgePoints
 */
export function calculatePreMastery(questions, attempts, knowledgePoints) {
  return calculateUnifiedMastery(questions, attempts, knowledgePoints, {
    source: "PRE",
  });
}

/**
 *
 * @param questions
 * @param attempts
 */
export function isPreAssessmentComplete(questions = [], attempts = {}) {
  return (
    questions.length > 0 &&
    questions.every((question) => {
      const attempt = attempts[question.id];
      return (
        Boolean(attempt?.submittedAt) &&
        (attempt.skipped === true ||
          Number.isFinite(Number(attempt.scoreRatio)) ||
          (Number.isFinite(Number(attempt.score)) &&
            Number.isFinite(Number(attempt.maxScore))))
      );
    })
  );
}

/**
 *
 * @param result
 */
export function overallPreAssessmentMastery(result = {}) {
  const values = Object.values(result)
    .filter(
      (item) =>
        Number(item.evidenceCount || 0) > 0 &&
        Number.isFinite(Number(item.mastery)),
    )
    .map((item) => Number(item.mastery));
  return values.length > 0
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

/**
 *
 * @param questions
 * @param attempts
 */
export function overallPreAssessmentCorrectRate(questions = [], attempts = {}) {
  const answered = questions.filter((question) => attempts[question.id]);
  if (answered.length === 0) return null;
  const total = answered.reduce(
    (sum, question) => sum + attemptScoreRatio(question, attempts[question.id]),
    0,
  );
  return Math.round((total / answered.length) * 100);
}

/**
 *
 * @param questions
 * @param attempts
 * @param knowledgePoints
 * @param preMastery
 */
export function calculatePostMastery(
  questions,
  attempts,
  knowledgePoints,
  preMastery = {},
) {
  const result = calculateUnifiedMastery(questions, attempts, knowledgePoints, {
    source: "POST",
    priorMastery: preMastery,
  });
  return Object.fromEntries(
    knowledgePoints.map((kp) => {
      const item = result[kp.id];
      const pre = Number(preMastery[kp.id]?.mastery);
      return [
        kp.id,
        {
          ...item,
          preMastery: Number.isFinite(pre) ? pre : null,
          postScore: item.correctRate,
          improvement: Number.isFinite(pre)
            ? Math.round((item.mastery - pre) * 100) / 100
            : null,
        },
      ];
    }),
  );
}

/**
 *
 * @param result
 */
export function overallMastery(result) {
  const values = Object.values(result).filter(
    (item) => item.mastery != null && item.evidenceCount > 0,
  );
  return values.length > 0
    ? Math.round(
        values.reduce((sum, item) => sum + Number(item.mastery), 0) /
          values.length,
      )
    : null;
}

// Used by the student UI for the per-question estimate when the authoritative
// classroom response has not arrived yet. This is explicitly a U1 preview,
// never a correctness fallback.
/**
 *
 * @param root0
 * @param root0.question
 * @param root0.attempt
 * @param root0.previous
 * @param root0.knowledgePointId
 */
export function previewU1Update({
  question,
  attempt,
  previous = {},
  knowledgePointId,
}) {
  const state = createU1State({
    knowledgePointId,
    priorMastery: previous.mastery,
    priorConfidence: previous.confidence,
    priorCorrectStreak: previous.correctStreak,
    priorEvidenceCount: previous.evidenceCount,
    priorPrimaryEvidenceCount: previous.primaryEvidenceCount,
  });
  const before = summarizeU1State(state);
  const [trace] = [
    applyU1Evidence(state, {
      questionId: question.id,
      source: question.source || question.purpose || "PRACTICE",
      difficulty: question.difficulty,
      scoreRatio: attemptScoreRatio(question, attempt),
      role:
        question.primaryKnowledgePointId === knowledgePointId ||
        question.knowledgePointIds?.[0] === knowledgePointId
          ? "PRIMARY"
          : "SECONDARY_OBSERVED",
      knowledgePointWeight:
        question.knowledgePointWeights?.[knowledgePointId] ?? 1,
      itemQuality: question.itemQuality ?? 1,
      gradingConfidence: attempt.gradingConfidence ?? 1,
      hintUsed: Boolean(attempt.hintUsed),
      novelty: question.novelty || "NEW",
    }),
  ];
  return {
    ...trace,
    masteryBefore: before.mastery,
    confidenceBefore: before.confidence,
    isPreview: true,
  };
}
