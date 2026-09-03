import { MASTERY_THRESHOLD_RATIO } from "../shared/domain/masteryPolicy.js";
import { knowledgeEvidenceProfile } from "../shared/domain/questionEvidence.js";
import { PRACTICE_SESSION_MAX_QUESTIONS } from "../shared/domain/questionPoolPolicy.js";

export const DIFFICULTY_LEVELS = Object.freeze(["D1", "D2", "D3", "D4", "D5"]);

/**
 *
 * @param value
 * @param fallback
 */
export function normalizeDifficulty(value, fallback = "D3") {
  if (typeof value === "string" && /^d[1-5]$/i.test(value.trim()))
    return value.trim().toUpperCase();
  const numeric = Number(value);
  if (Number.isFinite(numeric))
    return (
      DIFFICULTY_LEVELS[Math.max(0, Math.min(4, Math.round(numeric) - 1))] ||
      fallback
    );
  return fallback;
}

/**
 *
 * @param value
 * @param fallback
 */
export function difficultyRank(value, fallback = "D3") {
  return DIFFICULTY_LEVELS.indexOf(normalizeDifficulty(value, fallback));
}

// 单题仍按实际得分计入掌握度；连续未达到本轮练习要求时，才由 AI 老师介入复盘。
export const INTERVENTION_PASS_RATIO = 0.8;
// Practice needs a small amount of stable evidence before it may stop early.
// These gates do not change U1; they only decide whether the current practice
// window is allowed to hand the student to the next learning unit.
export const PRACTICE_MIN_QUESTIONS = 3;
export const PRACTICE_MIN_CORRECT_STREAK = 2;
export const PRACTICE_PASS_RATIO = INTERVENTION_PASS_RATIO;

/**
 *
 * @param question
 */
export function questionKnowledgePointId(question = {}) {
  return knowledgeEvidenceProfile(question).primaryKnowledgePointId;
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.knowledgePointId
 * @param root0.limit
 */
export function buildInterventionEvidence({
  questions = [],
  attempts = {},
  knowledgePointId,
  limit = 3,
}) {
  return questions
    .filter(
      (question) =>
        question.phase !== "review" &&
        questionKnowledgePointId(question) === knowledgePointId,
    )
    .filter((question) => attempts[question.id])
    .map((question) => ({ question, attempt: attempts[question.id] }))
    .sort(
      (a, b) =>
        new Date(a.attempt.submittedAt || 0) -
        new Date(b.attempt.submittedAt || 0),
    )
    .slice(-limit)
    .map(({ question, attempt }) => ({
      questionId: question.id,
      stem: question.stem,
      type: question.type,
      difficulty: question.difficulty,
      studentAnswer: attempt.recognizedAnswer || attempt.answer,
      score: attempt.score,
      maxScore: attempt.maxScore,
      feedback: attempt.feedback,
      correctAnswer: question.answer,
      analysis: question.analysis,
    }));
}

/**
 *
 * @param mastery
 */
export function targetDifficultyFromMastery(mastery = 0) {
  if (mastery < 30) return "D1";
  if (mastery < 50) return "D2";
  if (mastery < 75) return "D3";
  if (mastery < 90) return "D4";
  return "D5";
}

export const RECENT_ATTEMPT_LIMIT = 10;

/**
 *
 * @param attempt
 */
function scoreRatioForAttempt(attempt = {}) {
  if (attempt?.skipped || attempt?.disposition === "SKIPPED_DONT_KNOW")
    return null;
  if (Number.isFinite(Number(attempt.scoreRatio))) {
    return Math.max(0, Math.min(1, Number(attempt.scoreRatio)));
  }
  const score = Number(attempt.score);
  const maxScore = Number(attempt.maxScore);
  return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
    ? Math.max(0, Math.min(1, score / maxScore))
    : null;
}

/**
 *
 * @param attempts
 * @param limit
 */
export function recentAttemptSummary(
  attempts = [],
  limit = RECENT_ATTEMPT_LIMIT,
) {
  const valid = attempts
    .map((attempt, index) => ({
      attempt,
      index,
      ratio: scoreRatioForAttempt(attempt),
    }))
    .filter((item) => item.ratio != null)
    .sort(
      (left, right) =>
        String(right.attempt.submittedAt || "").localeCompare(
          String(left.attempt.submittedAt || ""),
        ) || right.index - left.index,
    )
    .slice(0, Math.max(1, limit));
  const average =
    valid.length > 0
      ? valid.reduce((sum, item) => sum + item.ratio, 0) / valid.length
      : null;
  return {
    attempts: valid.map((item) => item.attempt),
    count: valid.length,
    averageScoreRatio: average,
    averageCorrectRate: average == null ? null : Math.round(average * 100),
  };
}

/**
 *
 * @param root0
 * @param root0.mastery
 * @param root0.recentAttempts
 * @param root0.limit
 */
export function targetDifficultyFromSignals({
  mastery = 0,
  recentAttempts = [],
  limit = RECENT_ATTEMPT_LIMIT,
} = {}) {
  const masteryValue = Math.max(0, Math.min(100, Number(mastery) || 0));
  const recent = recentAttemptSummary(recentAttempts, limit);
  const recentRate =
    recent.averageScoreRatio == null ? null : recent.averageScoreRatio * 100;
  // Do not let a tiny sample override the stable mastery estimate. Once there
  // are three valid recent attempts, recent performance contributes 40%.
  const effectiveAbility =
    recentRate == null || recent.count < 3
      ? masteryValue
      : masteryValue * 0.6 + recentRate * 0.4;
  let targetDifficulty = targetDifficultyFromMastery(effectiveAbility);
  const latestTwo = recent.attempts
    .slice(0, 2)
    .map(scoreRatioForAttempt)
    .filter((ratio) => ratio != null);
  const recentWeakStreak =
    latestTwo.length === 2 && latestTwo.every((ratio) => ratio < 0.5);
  if (
    recentWeakStreak &&
    difficultyRank(targetDifficulty) > difficultyRank("D3")
  )
    targetDifficulty = "D3";
  return {
    targetDifficulty,
    mastery: masteryValue,
    recentAttemptCount: recent.count,
    recentCorrectRate: recent.averageCorrectRate,
    effectiveAbility: Math.round(effectiveAbility),
    reason:
      recentRate == null || recent.count < 3
        ? `当前掌握度 ${Math.round(masteryValue)}%，近期有效题不足3题`
        : `当前掌握度 ${Math.round(masteryValue)}%，最近${recent.count}题平均得分率 ${Math.round(recentRate)}%${recentWeakStreak ? "，连续两题偏弱，最高从D3开始" : ""}`,
  };
}

/**
 *
 * @param current
 * @param scoreRatio
 */
export function adjustDifficulty(current, scoreRatio) {
  const rank = difficultyRank(current);
  if (scoreRatio >= 0.8) return DIFFICULTY_LEVELS[Math.min(4, rank + 1)];
  if (scoreRatio < 0.5) return DIFFICULTY_LEVELS[Math.max(0, rank - 1)];
  return normalizeDifficulty(current);
}

/**
 *
 * @param question
 * @param target
 */
function questionDistance(question, target) {
  return Math.abs(difficultyRank(question.difficulty) - difficultyRank(target));
}

/**
 *
 * @param value
 */
function selectionHash(value = "") {
  let hash = 2_166_136_261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/**
 *
 * @param question
 * @param selectionSeed
 */
function questionTieBreak(question, selectionSeed = "") {
  if (!selectionSeed) return 0;
  return selectionHash(`${selectionSeed}:${question.id}`);
}

/**
 *
 * @param questions
 * @param mode
 * @param startingMastery
 * @param recentAttemptsByKnowledgePoint
 * @param selectionSeed
 */
export function createAdaptiveState(
  questions,
  mode,
  startingMastery = {},
  recentAttemptsByKnowledgePoint = {},
  selectionSeed = "",
) {
  if (mode !== "post") {
    return { order: questions.map((question) => question.id), targetByKp: {} };
  }
  const kpIds = [
    ...new Set(
      questions
        .filter((question) => question.phase !== "review")
        .map(questionKnowledgePointId)
        .filter(Boolean),
    ),
  ];
  const targetDecisions = Object.fromEntries(
    kpIds.map((kpId) => {
      const signal = targetDifficultyFromSignals({
        mastery: startingMastery[kpId]?.mastery || 0,
        recentAttempts:
          recentAttemptsByKnowledgePoint[kpId] ||
          startingMastery[kpId]?.recentAttempts ||
          [],
      });
      return [kpId, signal];
    }),
  );
  const targetByKp = Object.fromEntries(
    kpIds.map((kpId) => [kpId, targetDecisions[kpId].targetDifficulty]),
  );
  const firstKp = kpIds[0];
  const first = questions
    .filter((question) => questionKnowledgePointId(question) === firstKp)
    .sort(
      (a, b) =>
        questionDistance(a, targetByKp[firstKp]) -
          questionDistance(b, targetByKp[firstKp]) ||
        questionTieBreak(a, selectionSeed) - questionTieBreak(b, selectionSeed),
    )[0];
  return {
    order: first ? [first.id] : questions.map((question) => question.id),
    targetByKp,
    targetDecisions,
  };
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.knowledgePointId
 * @param root0.mastery
 * @param root0.maxQuestions
 */
export function evaluateKnowledgePoint({
  questions,
  attempts,
  knowledgePointId,
  mastery = null,
  maxQuestions = PRACTICE_SESSION_MAX_QUESTIONS,
}) {
  const answered = questions
    .filter(
      (question) =>
        question.phase !== "review" &&
        questionKnowledgePointId(question) === knowledgePointId,
    )
    .filter((question) => attempts[question.id])
    .map((question) => ({ question, attempt: attempts[question.id] }))
    .sort(
      (a, b) =>
        new Date(a.attempt.submittedAt || 0) -
        new Date(b.attempt.submittedAt || 0),
    );

  if (answered.length === 0)
    return { status: "continue", answered: answered.length };

  const hasU1Estimate =
    mastery !== null &&
    mastery !== undefined &&
    mastery !== "" &&
    Number.isFinite(Number(mastery));
  // Correctness is only an auxiliary statistic. The unified U1 estimate is
  // the sole mastery stop signal; without it, the practice keeps collecting
  // evidence (or ends at the 15-question ceiling as needs_support).
  const reachedMasteryTarget =
    hasU1Estimate && Number(mastery) >= MASTERY_THRESHOLD_RATIO * 100;
  let correctStreak = 0;
  for (let index = answered.length - 1; index >= 0; index -= 1) {
    if (Number(answered[index].attempt.scoreRatio || 0) < PRACTICE_PASS_RATIO)
      break;
    correctStreak += 1;
  }
  const minimumQuestionsMet = answered.length >= PRACTICE_MIN_QUESTIONS;
  const stabilityGateMet = correctStreak >= PRACTICE_MIN_CORRECT_STREAK;
  const baseDecision = {
    answered: answered.length,
    minimumQuestionsMet,
    correctStreak,
    stabilityGateMet,
    targetMasteryReached: reachedMasteryTarget,
    targetMastery: MASTERY_THRESHOLD_RATIO * 100,
  };

  if (answered.length >= maxQuestions) {
    if (reachedMasteryTarget) {
      return {
        ...baseDecision,
        status: "mastered",
        completionReason: stabilityGateMet
          ? "QUESTION_LIMIT_REACHED_AT_TARGET"
          : "QUESTION_LIMIT_REACHED_AT_TARGET_UNSTABLE",
      };
    }
    return {
      ...baseDecision,
      status: "needs_support",
      completionReason: "QUESTION_LIMIT_REACHED",
    };
  }

  if (!minimumQuestionsMet) {
    return { ...baseDecision, status: "continue" };
  }

  if (reachedMasteryTarget && stabilityGateMet) {
    return {
      ...baseDecision,
      status: "mastered",
      completionReason: "TARGET_REACHED_STABLE",
    };
  }

  const lastThree = answered.slice(-3);
  const threeWeak =
    lastThree.length === 3 &&
    lastThree.every(
      ({ attempt }) => Number(attempt.scoreRatio || 0) < PRACTICE_PASS_RATIO,
    );
  if (threeWeak) return { ...baseDecision, status: "needs_intervention" };

  return { ...baseDecision, status: "continue" };
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.currentQuestion
 * @param root0.targetByKp
 * @param root0.completedKnowledgePointIds
 * @param root0.selectionSeed
 */
export function selectNextAdaptiveQuestion({
  questions,
  attempts,
  currentQuestion,
  targetByKp,
  completedKnowledgePointIds = [],
  selectionSeed = "",
}) {
  const unanswered = questions.filter((question) => !attempts[question.id]);
  if (unanswered.length === 0) return null;
  const currentKp = questionKnowledgePointId(currentQuestion);
  const completed = new Set(completedKnowledgePointIds);
  const sameKp = completed.has(currentKp)
    ? []
    : unanswered.filter(
        (question) =>
          question.phase !== "review" &&
          questionKnowledgePointId(question) === currentKp,
      );
  const nextKnowledgeQuestion = unanswered.find(
    (question) =>
      question.phase !== "review" &&
      !completed.has(questionKnowledgePointId(question)),
  );
  const candidates =
    sameKp.length > 0
      ? sameKp
      : nextKnowledgeQuestion
        ? unanswered.filter(
            (question) =>
              question.phase !== "review" &&
              questionKnowledgePointId(question) ===
                questionKnowledgePointId(nextKnowledgeQuestion),
          )
        : unanswered.filter((question) => question.phase === "review");
  if (candidates.length === 0) return null;
  const kpId = questionKnowledgePointId(candidates[0]);
  const target = targetByKp[kpId] || "D3";
  return [...candidates].sort(
    (a, b) =>
      questionDistance(a, target) - questionDistance(b, target) ||
      questionTieBreak(a, selectionSeed) - questionTieBreak(b, selectionSeed),
  )[0];
}
