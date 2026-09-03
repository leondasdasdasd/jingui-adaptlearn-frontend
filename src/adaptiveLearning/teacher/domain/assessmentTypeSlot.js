import { distributeCompositeSlotKnowledgePoints } from "./assessmentSlotManagement";

const uniqueIds = (values) => [
  ...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ),
];

/**
 * 插槽持久化合同只保存归属、题型与难度，矩阵要求不得复制到插槽。
 * @param {object} slot - BFF 或历史迁移返回的插槽。
 * @returns {object} 可持久化的规范插槽。
 */
export function canonicalAssessmentTypeSlot(slot) {
  return {
    id: String(slot?.id || ""),
    slotStructureVersion: String(slot?.slotStructureVersion || ""),
    assessmentPolicyId: String(slot?.assessmentPolicyId || ""),
    knowledgePointId: String(slot?.knowledgePointId || ""),
    knowledgePointIds: uniqueIds(slot?.knowledgePointIds),
    matrixCellId: String(slot?.matrixCellId || ""),
    questionType: String(slot?.questionType || ""),
    difficulty: slot?.difficulty || "D2",
  };
}

const stringList = (values) => (Array.isArray(values) ? values : []);

/**
 * @param values
 * @param occurrence
 * @param fallback
 */
function cyclicValue(values, occurrence, fallback = "") {
  const items = stringList(values);
  return items[occurrence % Math.max(1, items.length)] || fallback;
}

/**
 * @param slot
 * @param cell
 * @param occurrence
 */
function generationSlotFromMatrixCell(slot, cell, occurrence) {
  const evidenceCriteria = stringList(cell.evidenceCriteria);
  const evidenceCriterion = cyclicValue(
    evidenceCriteria,
    occurrence,
    cell.observableBehavior,
  );
  const variationRequirement = cyclicValue(
    cell.variationRequirements,
    occurrence,
  );
  return {
    ...canonicalAssessmentTypeSlot(slot),
    matrixCellCode: `${cell.domain}-${cell.targetLevel}`,
    domain: cell.domain,
    targetLevel: cell.targetLevel,
    matrixRole: cell.role,
    observableBehavior: cell.observableBehavior,
    evidenceCriteria,
    commonMisconceptions: stringList(cell.commonMisconceptions),
    evidenceCriterion,
    variationRequirement,
    assessmentFocus: [
      cell.observableBehavior,
      evidenceCriterion,
      variationRequirement,
    ]
      .filter(Boolean)
      .join("；"),
  };
}

/**
 * 仅在题目生成请求边界把矩阵格要求与插槽联结，避免持久化第二套要求。
 * @param {object} input - 当前矩阵与规范插槽。
 * @param {object[]} input.slots - 待生成题目的插槽。
 * @param {object} input.matrix - 当前范围的权威矩阵。
 * @returns {object[]} 生成 API 专用插槽请求。
 */
export function assessmentQuestionGenerationSlots({ slots, matrix }) {
  const cellsById = new Map(
    (matrix?.cells || []).map((cell) => [String(cell.matrixCellId), cell]),
  );
  const occurrenceByCell = new Map();
  return slots.map((slot) => {
    const cell = cellsById.get(String(slot.matrixCellId));
    if (!cell) return canonicalAssessmentTypeSlot(slot);
    const occurrence = occurrenceByCell.get(slot.matrixCellId) || 0;
    occurrenceByCell.set(slot.matrixCellId, occurrence + 1);
    return generationSlotFromMatrixCell(slot, cell, occurrence);
  });
}

/**
 * BFF 已完成矩阵格下 3/4 个题型槽的规划；前端只补齐课时知识点范围和策略版本。
 * @param {object} input - 已验证的题型槽与当前课时上下文。
 * @param input.assessmentPolicyId
 * @param input.composite
 * @param input.knowledgePointIds
 * @param input.questions
 * @param input.rawSlots
 * @returns {object[]} 可直接写入草稿的题型槽。
 */
export function prepareAssessmentTypeSlots({
  assessmentPolicyId,
  composite,
  knowledgePointIds,
  questions,
  rawSlots,
}) {
  const scopedSlots = composite
    ? distributeCompositeSlotKnowledgePoints({
        slots: rawSlots,
        knowledgePointIds,
        questions,
      })
    : rawSlots.map((slot) => ({ ...slot, knowledgePointIds }));
  return scopedSlots.map((slot) =>
    canonicalAssessmentTypeSlot({
      ...slot,
      assessmentPolicyId,
      slotStructureVersion: "matrix-type-slots-v1",
    }),
  );
}
