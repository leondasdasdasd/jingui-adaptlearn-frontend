/**
 * 将一次插槽生成结果作为新题追加到题池，并保留插槽绑定。
 * 同一插槽允许累积多道题；已有题目永远不会被本操作替换。
 * @param {object} input 现有题池、生成题及插槽上下文。
 * @param {Array<object>} input.existingQuestions 当前课后题池。
 * @param {object} input.generatedQuestion 本次新生成题目。
 * @param {string} input.slotId 目标插槽标识。
 * @param {boolean} input.isComposite 是否为整课综合题。
 * @returns {Array<object>} 追加后的新题池。
 */
export function appendQuestionBoundToSlot({
  existingQuestions,
  generatedQuestion,
  slotId,
  isComposite,
}) {
  if (!generatedQuestion?.id) {
    throw slotQuestionAppendIssue(SLOT_QUESTION_APPEND_ISSUES.MISSING_NEW_ID);
  }
  if (generatedQuestion.blueprintSlotId !== slotId) {
    throw slotQuestionAppendIssue(SLOT_QUESTION_APPEND_ISSUES.SLOT_MISMATCH);
  }
  if (
    existingQuestions.some((question) => question.id === generatedQuestion.id)
  ) {
    throw slotQuestionAppendIssue(SLOT_QUESTION_APPEND_ISSUES.DUPLICATE_ID);
  }

  const next = [...existingQuestions];
  const boundQuestion = isComposite
    ? { ...generatedQuestion, phase: "review" }
    : generatedQuestion;
  if (isComposite) return [...next, boundQuestion];

  const reviewIndex = next.findIndex((question) => question.phase === "review");
  if (reviewIndex < 0) next.push(boundQuestion);
  else next.splice(reviewIndex, 0, boundQuestion);
  return next;
}
export const SLOT_QUESTION_APPEND_ISSUES = Object.freeze({
  MISSING_NEW_ID: "SLOT_QUESTION_MISSING_NEW_ID",
  SLOT_MISMATCH: "SLOT_QUESTION_SLOT_MISMATCH",
  DUPLICATE_ID: "SLOT_QUESTION_DUPLICATE_ID",
});

function slotQuestionAppendIssue(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}
