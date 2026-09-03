export const correctionEncouragementIds = [
  "reread-close",
  "check-conditions",
  "try-another-approach",
  "verify-first-attempt",
  "check-missing-condition",
  "restart-key-step",
  "recalculate",
  "find-inconsistency",
  "identify-question",
  "correction-progress",
];

/**
 *
 * @param value
 */
function stableHash(value) {
  return [...String(value || "")].reduce(
    (hash, character) => (hash * 31 + character.codePointAt(0)) >>> 0,
    0,
  );
}

/**
 *
 * @param questionId
 */
export function correctionEncouragementId(questionId) {
  return correctionEncouragementIds[
    stableHash(questionId) % correctionEncouragementIds.length
  ];
}

/**
 *
 * @param correction
 * @param confirmedAt
 */
export function confirmCorrectionReading(
  correction,
  confirmedAt = new Date().toISOString(),
) {
  if (!correction?.questionId) return correction;
  return {
    ...correction,
    readingConfirmedAt: correction.readingConfirmedAt || confirmedAt,
  };
}

/**
 *
 * @param correction
 */
export function hasConfirmedCorrectionReading(correction) {
  return Boolean(correction?.questionId && correction.readingConfirmedAt);
}

/**
 *
 * @param root0
 * @param root0.mode
 * @param root0.grading
 * @param root0.correction
 * @param root0.revalidation
 */
export function shouldRequestCorrection({
  mode,
  grading,
  correction,
  revalidation = false,
}) {
  return (
    mode === "post" &&
    !revalidation &&
    !correction &&
    Boolean(grading) &&
    grading.correct !== true &&
    !["off_task", "no_attempt"].includes(grading.answerQuality)
  );
}

/**
 *
 * @param correction
 * @param answer
 * @param grading
 */
export function correctionAttemptMetadata(correction, answer, grading) {
  if (!correction) return {};
  return {
    correctionAttempted: true,
    correctionSucceeded: grading.correct === true,
    hintUsed: true,
    initialAnswer: correction.initialAnswer,
    initialRecognizedAnswer: correction.initialRecognizedAnswer,
    initialScore: correction.initialScore,
    initialMaxScore: correction.initialMaxScore,
    initialScoreRatio: correction.initialScoreRatio,
    correctedAnswer: answer,
  };
}
