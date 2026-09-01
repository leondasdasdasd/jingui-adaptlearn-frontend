import {
  normalizeU1Difficulty,
  U1_DIFFICULTIES,
} from "../../shared/domain/unifiedMastery.js";

/**
 *
 * @param value
 */
function difficultyRank(value) {
  return U1_DIFFICULTIES.indexOf(normalizeU1Difficulty(value));
}

/**
 *
 * @param root0
 * @param root0.knowledgePoints
 * @param root0.result
 * @param root0.resultSource
 */
export function enhancementEligibility({
  knowledgePoints = [],
  result = {},
  resultSource = "preview",
}) {
  void knowledgePoints;
  void result;
  void resultSource;
  return { eligible: false, reason: "ENHANCEMENT_DISABLED" };
}

/**
 *
 * @param root0
 * @param root0.publishedContent
 * @param root0.attempts
 * @param root0.limit
 */
export function selectEnhancementQuestions({
  publishedContent = {},
  attempts = {},
  limit = 8,
}) {
  const pools = Object.values(
    publishedContent.knowledgePracticePools || {},
  ).flat();
  const composite = publishedContent.compositeReviewPool || [];
  const seen = new Set(Object.keys(attempts || {}));
  const unique = new Map();
  for (const question of [...pools, ...composite]) {
    if (!question?.id || seen.has(question.id) || unique.has(question.id))
      continue;
    unique.set(question.id, question);
  }
  const unattempted = [...unique.values()];
  const challenging = unattempted.filter(
    (question) => difficultyRank(question.difficulty) >= difficultyRank("D4"),
  );
  const candidates = challenging.length >= 3 ? challenging : unattempted;
  return candidates
    .sort(
      (left, right) =>
        difficultyRank(right.difficulty) - difficultyRank(left.difficulty) ||
        String(left.id).localeCompare(String(right.id)),
    )
    .slice(0, Math.max(1, limit))
    .map((question) => ({
      ...question,
      phase: "enhancement",
      sourceType: "PRACTICE",
    }));
}
