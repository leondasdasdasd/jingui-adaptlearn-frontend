/**
 *
 * @param question
 * @param mode
 */
export function assessmentPurposeForQuestion(question = {}, mode = "") {
  const normalizedMode = String(mode || "")
    .trim()
    .toUpperCase();
  const phase = String(question.phase || "")
    .trim()
    .toUpperCase();
  const publishedPurpose = String(question.purpose || "")
    .trim()
    .toUpperCase();
  if (
    normalizedMode === "PRE" ||
    phase === "DIAGNOSTIC" ||
    publishedPurpose === "PRE"
  )
    return "PRE";
  if (
    phase === "REVIEW" ||
    ["REVIEW", "COMPOSITE_REVIEW", "POST_ASSESSMENT"].includes(publishedPurpose)
  ) {
    return "POST";
  }
  return "PRACTICE";
}

/**
 *
 * @param question
 */
export function normalizeKnowledgePracticeQuestion(question = {}) {
  const normalized = { ...question, purpose: "PRACTICE" };
  if (Object.hasOwn(normalized, "sourceType"))
    normalized.sourceType = "PRACTICE";
  delete normalized.poolPartition;
  return normalized;
}
