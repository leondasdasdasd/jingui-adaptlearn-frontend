/**
 * 读取题目当前的唯一插槽与矩阵格归属。
 * @param {object} question - 题目领域对象。
 * @returns {{slotId: string, matrixCellId: string}} 归属引用。
 */
export function assessmentQuestionAssignmentRefs(question) {
  const blueprint = question?.blueprint || {};
  return {
    slotId: String(
      question?.blueprintSlotId ||
        blueprint.blueprintSlotId ||
        blueprint.id ||
        "",
    ).trim(),
    matrixCellId: String(
      question?.matrixCellId ||
        question?.assessmentMatrixCellId ||
        blueprint.matrixCellId ||
        "",
    ).trim(),
  };
}

/**
 * 题目必须同时指向当前范围内的真实插槽和矩阵格，才能计入矩阵覆盖。
 * 省略集合时只校验引用完整性，便于领域对象在无页面上下文时使用。
 * @param {object} question - 题目领域对象。
 * @param {object} context - 当前范围内的合法归属集合。
 * @param {object[]} [context.slotAssignments] - 插槽与矩阵格的合法配对。
 * @returns {{outsideMatrix: boolean, slotId: string, matrixCellId: string, matrixCell: object|null}} 统一归属判定。
 */
export function classifyAssessmentQuestionAssignment(
  question,
  { slotAssignments } = {},
) {
  const refs = assessmentQuestionAssignmentRefs(question);
  const matchedAssignment = Array.isArray(slotAssignments)
    ? slotAssignments.find(
        (item) =>
          String(item.slotId) === refs.slotId &&
          String(item.matrixCellId) === refs.matrixCellId,
      )
    : null;
  const hasCompleteRefs = Boolean(refs.slotId && refs.matrixCellId);
  const hasValidPair =
    slotAssignments == null || Boolean(matchedAssignment?.matrixCell);
  return {
    ...refs,
    outsideMatrix: !hasCompleteRefs || !hasValidPair,
    matrixCell: matchedAssignment?.matrixCell || null,
  };
}
