import { canonicalAssessmentTypeSlot } from "./assessmentTypeSlot";

const text = (value) => String(value || "").trim();
export const ASSESSMENT_TYPE_SLOT_STRUCTURE_VERSION = "matrix-type-slots-v1";
const HISTORICAL_SLOT_TYPES = Object.freeze([
  "single_choice",
  "fill_blank",
  "judgement",
  "short_answer",
  "multiple_choice",
  "classification",
  "matching",
  "ordering",
]);

/**
 *
 * @param values
 */
function uniqueIds(values) {
  return [...new Set(values.map((value) => text(value)).filter(Boolean))];
}

/**
 *
 * @param slot
 */
function slotGroupingKey(slot) {
  const matrixCellId = text(slot.matrixCellId);
  const questionType = text(slot.questionType);
  return matrixCellId && questionType
    ? `${matrixCellId}:${questionType}`
    : `slot:${slot.id}`;
}

/**
 *
 * @param storage
 */
function matrixCollections(storage) {
  return Array.isArray(storage) ? storage : Object.values(storage || {});
}

/**
 * @param slotStorage
 */
function legacyVariationsByCell(slotStorage) {
  const slots = Array.isArray(slotStorage)
    ? slotStorage
    : Object.values(slotStorage || {}).flat();
  const variationsByCell = new Map();
  for (const slot of slots) {
    const cellId = text(slot.matrixCellId);
    const variation = text(slot.variationRequirement);
    if (!cellId || !variation) continue;
    variationsByCell.set(
      cellId,
      uniqueIds([...(variationsByCell.get(cellId) || []), variation]),
    );
  }
  return variationsByCell;
}

/**
 * @param matrix
 * @param variationsByCell
 */
function matrixWithMigratedVariations(matrix, variationsByCell) {
  return {
    ...matrix,
    cells: (matrix?.cells || []).map((cell) => ({
      ...cell,
      variationRequirements:
        Array.isArray(cell.variationRequirements) &&
        cell.variationRequirements.length > 0
          ? cell.variationRequirements
          : variationsByCell.get(text(cell.matrixCellId)) || [],
    })),
  };
}

/**
 * 历史插槽中的变化要求只迁移一次到对应矩阵格，之后插槽合同会删除该副本。
 * @param matrices
 * @param slotStorage
 */
function migrateLegacySlotRequirements(matrices, slotStorage) {
  const variationsByCell = legacyVariationsByCell(slotStorage);
  if (Array.isArray(matrices))
    return matrices.map((matrix) =>
      matrixWithMigratedVariations(matrix, variationsByCell),
    );
  return Object.fromEntries(
    Object.entries(matrices || {}).map(([scopeId, matrix]) => [
      scopeId,
      matrixWithMigratedVariations(matrix, variationsByCell),
    ]),
  );
}

/**
 *
 * @param cell
 */
function requiredTypeSlotCount(cell) {
  if (text(cell.role) === "NOT_APPLICABLE") return 0;
  return text(cell.role) === "CORE" ? 4 : 3;
}

/**
 *
 * @param root0
 * @param root0.matrix
 * @param root0.cell
 * @param root0.questionType
 */
function historicalSlotFromMatrix({ matrix, cell, questionType }) {
  return canonicalAssessmentTypeSlot({
    id: `${cell.matrixCellId}:type:${questionType}`,
    slotStructureVersion: ASSESSMENT_TYPE_SLOT_STRUCTURE_VERSION,
    assessmentPolicyId: text(matrix.assessmentPolicyId || matrix.policyVersion),
    knowledgePointId: text(matrix.knowledgePointId),
    knowledgePointIds: uniqueIds(
      matrix.knowledgePointIds || [matrix.knowledgePointId],
    ),
    matrixCellId: text(cell.matrixCellId),
    matrixCellCode: `${text(cell.domain)}-${text(cell.targetLevel)}`,
    domain: text(cell.domain),
    targetLevel: text(cell.targetLevel),
    matrixRole: text(cell.role),
    questionType,
    difficulty: "D2",
  });
}

/**
 *
 * @param completed
 * @param matrix
 * @param cell
 */
function appendMissingHistoricalCellSlots(completed, matrix, cell) {
  const existing = completed.filter(
    (slot) => text(slot.matrixCellId) === text(cell.matrixCellId),
  );
  const missingCount = requiredTypeSlotCount(cell) - existing.length;
  if (missingCount <= 0) return;
  const existingTypes = new Set(existing.map((slot) => slot.questionType));
  const candidates = uniqueIds([
    ...(cell.recommendedQuestionTypes || []),
    ...HISTORICAL_SLOT_TYPES,
  ]).filter((type) => !existingTypes.has(type));
  for (const questionType of candidates.slice(0, missingCount)) {
    completed.push(historicalSlotFromMatrix({ matrix, cell, questionType }));
  }
}

/**
 *
 * @param slots
 * @param matrices
 */
function completeHistoricalTypeSlots(slots, matrices) {
  const isHistoricalShape =
    slots.length > 0 && slots.every((slot) => !slot.slotStructureVersion);
  if (!isHistoricalShape) return slots;
  const completed = slots.map((slot) => ({
    ...slot,
    slotStructureVersion: ASSESSMENT_TYPE_SLOT_STRUCTURE_VERSION,
  }));
  for (const matrix of matrixCollections(matrices)) {
    for (const cell of matrix?.cells || []) {
      appendMissingHistoricalCellSlots(completed, matrix, cell);
    }
  }
  return completed;
}

/**
 *
 * @param slots
 * @param canonicalIdByOldId
 */
function canonicalizeSlotCollection(slots, canonicalIdByOldId) {
  const canonicalSlots = [];
  const byCellAndType = new Map();
  for (const slot of Array.isArray(slots) ? slots : []) {
    const key = slotGroupingKey(slot);
    const canonical = byCellAndType.get(key);
    if (canonical) {
      canonicalIdByOldId.set(text(slot.id), text(canonical.id));
      canonical.knowledgePointIds = uniqueIds([
        ...(canonical.knowledgePointIds || []),
        ...(slot.knowledgePointIds || []),
      ]);
      continue;
    }
    const next = canonicalAssessmentTypeSlot(slot);
    canonicalIdByOldId.set(text(slot.id), text(slot.id));
    byCellAndType.set(key, next);
    canonicalSlots.push(next);
  }
  return canonicalSlots;
}

/**
 *
 * @param storage
 * @param matrices
 * @param canonicalIdByOldId
 */
function canonicalizeSlotStorage(storage, matrices, canonicalIdByOldId) {
  if (Array.isArray(storage)) {
    return completeHistoricalTypeSlots(
      canonicalizeSlotCollection(storage, canonicalIdByOldId),
      matrices,
    );
  }
  return Object.fromEntries(
    Object.entries(storage || {}).map(([scopeId, slots]) => [
      scopeId,
      completeHistoricalTypeSlots(
        canonicalizeSlotCollection(slots, canonicalIdByOldId),
        matrices?.[scopeId] ? [matrices[scopeId]] : [],
      ),
    ]),
  );
}

/**
 *
 * @param question
 * @param canonicalIdByOldId
 */
function migrateQuestionSlotId(question, canonicalIdByOldId) {
  const currentId = text(question?.blueprintSlotId);
  const canonicalId = canonicalIdByOldId.get(currentId);
  return canonicalId && canonicalId !== currentId
    ? { ...question, blueprintSlotId: canonicalId }
    : question;
}

/**
 * 将历史“一题一槽”原子迁移为真实题型槽，并同步所有题目的唯一主槽 ID。
 * @param {object} content - 草稿或发布快照的教师内容。
 * @returns {object} 仅包含 canonical 题型槽身份的内容。
 */
export function canonicalizeAssessmentTypeSlotsInContent(content) {
  const canonicalIdByOldId = new Map();
  const assessmentMatrices = migrateLegacySlotRequirements(
    content?.assessmentMatrices,
    content?.assessmentQuestionSlots,
  );
  const assessmentQuestionSlots = canonicalizeSlotStorage(
    content?.assessmentQuestionSlots,
    assessmentMatrices,
    canonicalIdByOldId,
  );
  return {
    ...content,
    assessmentMatrices,
    assessmentQuestionSlots,
    preQuestions: (content?.preQuestions || []).map((question) =>
      migrateQuestionSlotId(question, canonicalIdByOldId),
    ),
    postQuestions: (content?.postQuestions || []).map((question) =>
      migrateQuestionSlotId(question, canonicalIdByOldId),
    ),
  };
}
