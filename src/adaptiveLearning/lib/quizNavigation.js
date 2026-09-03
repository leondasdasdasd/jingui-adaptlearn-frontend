/**
 *
 * @param index
 * @param orderLength
 * @param questionLength
 */
export function clampQuizIndex(index, orderLength, questionLength) {
  const maxIndex = Math.max(
    0,
    Math.min(Number(orderLength || 0), Number(questionLength || 0)) - 1,
  );
  return Math.max(0, Math.min(Number(index || 0), maxIndex));
}

/**
 *
 * @param root0
 * @param root0.assessmentComplete
 * @param root0.index
 * @param root0.order
 */
export function isQuizSequenceComplete({
  assessmentComplete = false,
  index = 0,
  order = [],
}) {
  return Boolean(assessmentComplete) || Number(index || 0) + 1 >= order.length;
}

/**
 *
 * @param draft
 * @param questionId
 * @param restoredAttempt
 */
export function restoreCurrentQuestionInput(
  draft = {},
  questionId = "",
  restoredAttempt = null,
) {
  if (restoredAttempt) {
    return {
      answer: restoredAttempt.answer ?? "",
      image: null,
    };
  }
  if (!questionId || draft.currentQuestionId !== questionId) {
    return { answer: "", image: null };
  }
  return {
    answer: draft.currentAnswer ?? "",
    image: draft.currentImage || null,
  };
}
