/**
 * 将评估插槽转换为共享题目编辑器的新增请求，页面不接触编辑草稿结构。
 * @param {object} input - 当前评估范围和交互上下文。
 * @param {string} input.scopeId - 当前知识点或整课范围。
 * @param {string} input.slotId - 目标插槽标识。
 * @param {object} input.assessment - 已投影的评估范围。
 * @param {string} input.requestId - 本次交互唯一标识。
 * @param {object} [input.opener] - 打开编辑器的焦点来源。
 * @returns {object|null} 共享编辑器新增请求。
 */
export function assessmentQuestionCreationRequest({
  scopeId,
  slotId,
  assessment,
  requestId,
  opener,
}) {
  const { slots = [], matrix = {} } = assessment || {};
  const slot = findById(slots, slotId);
  if (!slot) return null;
  const cell = findById(matrix.cells, slot.matrixCellId) || {};
  const knowledgePointIds = stringList(slot.knowledgePointIds);
  const [primaryKnowledgePointId = ""] = knowledgePointIds;
  return {
    id: requestId,
    scopeId,
    opener,
    draft: {
      blueprintSlotId: String(slot.id),
      assessmentPolicyId: stringValue(
        matrix.assessmentPolicyId,
        slot.assessmentPolicyId,
      ),
      matrixCellId: stringValue(slot.matrixCellId),
      matrixRole: stringValue(cell.role),
      type: stringValue(slot.questionType, "single_choice"),
      difficulty: slot.difficulty ?? 2,
      knowledgePointIds,
      primaryKnowledgePointId,
    },
  };
}
const stringValue = (value, fallback = "") => String(value || fallback);
const stringList = (values) =>
  (Array.isArray(values) ? values : []).map(String);

/**
 * @param items
 * @param id
 */
function findById(items, id) {
  return (Array.isArray(items) ? items : []).find(
    (item) => String(item.id || item.cellId) === String(id),
  );
}
