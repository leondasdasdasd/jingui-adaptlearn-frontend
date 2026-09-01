import {
  ASSESSMENT_MATRIX_DOMAINS,
  ASSESSMENT_MATRIX_LEVELS,
  assessmentMatrixCellRequiredSlotCount,
  normalizeKnowledgeAssessmentMatrix,
} from "../../shared/domain/knowledgeAssessmentMatrix";

const DOMAIN_IDS = new Set(ASSESSMENT_MATRIX_DOMAINS);
const LEVEL_IDS = new Set(ASSESSMENT_MATRIX_LEVELS);
const ROLE_IDS = new Set(["CORE", "SUPPORT", "EXTENSION"]);
const GENERATION_STATUSES = new Set([
  "ready",
  "pending",
  "running",
  "success",
  "failed",
  "stopped",
]);

function matrixFromSource(source, scopeId) {
  if (Array.isArray(source)) {
    return source.find(
      (matrix) => String(matrix?.knowledgePointId || "") === scopeId,
    );
  }
  return source?.[scopeId] || null;
}

function slotsFromSource(source, scopeId) {
  if (Array.isArray(source)) {
    return source.filter(
      (slot) => String(slot?.knowledgePointId || "") === scopeId,
    );
  }
  return Array.isArray(source?.[scopeId]) ? source[scopeId] : [];
}

function normalizedRole(role) {
  const value = String(role || "")
    .trim()
    .toUpperCase();
  if (["NA", "N/A", "NONE", "NOT_APPLICABLE"].includes(value)) {
    return "NOT_APPLICABLE";
  }
  return ROLE_IDS.has(value) ? value : "SUPPORT";
}

function firstPresent(values, fallback = "") {
  return (
    values.find(
      (value) => value !== undefined && value !== null && value !== "",
    ) ?? fallback
  );
}

function questionCellIds(question) {
  return new Set(
    [
      question?.matrixCellId,
      question?.assessmentMatrixCellId,
      question?.blueprint?.matrixCellId,
      ...(Array.isArray(question?.matrixCellIds) ? question.matrixCellIds : []),
    ]
      .filter(Boolean)
      .map(String),
  );
}

function questionsByCell(questions) {
  const result = new Map();
  for (const [index, question] of questions.entries()) {
    for (const cellId of questionCellIds(question)) {
      const current = result.get(cellId) || [];
      current.push({
        id: question.id,
        displayNumber: index + 1,
        stem: question.stem || "",
        type: question.type || "",
        difficulty: question.difficulty || "",
      });
      result.set(cellId, current);
    }
  }
  return result;
}

function projectMatrix(rawMatrix, scopeId, questions) {
  if (!rawMatrix?.cells?.length) return null;
  const normalized = normalizeKnowledgeAssessmentMatrix({
    ...rawMatrix,
    knowledgePointId: rawMatrix.knowledgePointId || scopeId,
  });
  const coverage = questionsByCell(questions);
  const cells = normalized.cells
    .filter(
      (cell) => DOMAIN_IDS.has(cell.domain) && LEVEL_IDS.has(cell.targetLevel),
    )
    .map((cell) => ({
      cellId: cell.matrixCellId,
      domain: cell.domain,
      level: cell.targetLevel,
      role: normalizedRole(cell.role),
      observableBehavior: cell.observableBehavior,
      evidenceCriteria: cell.evidenceCriteria,
      commonMisconceptions: cell.commonMisconceptions,
      recommendedQuestionTypes: cell.recommendedQuestionTypes,
      requiredSlotCount: assessmentMatrixCellRequiredSlotCount(cell),
      questions: coverage.get(cell.matrixCellId) || [],
    }));
  const applicableCells = cells.filter(
    (cell) => cell.role !== "NOT_APPLICABLE",
  );

  return {
    knowledgePointId: scopeId,
    targetStatement: normalized.targetStatement,
    rationale: normalized.rationale,
    reviewStatus: normalized.reviewStatus,
    generationSource: normalized.generationSource,
    cells,
    applicableCellCount: applicableCells.length,
    coreCellCount: applicableCells.filter((cell) => cell.role === "CORE")
      .length,
    evidenceSatisfiedCellCount: applicableCells.filter(
      (cell) => cell.questions.length >= cell.requiredSlotCount,
    ).length,
  };
}

function projectSlotContract(slot) {
  const matrixCode = firstPresent(
    [slot.matrixCellCode],
    `${firstPresent([slot.domain])}-${firstPresent([slot.targetLevel])}`,
  );
  return {
    id: slot.id,
    matrixCode,
    difficulty: firstPresent([slot.difficulty]),
    questionType: firstPresent([slot.questionType]),
    matrixRole: normalizedRole(firstPresent([slot.matrixRole, slot.role])),
    observableBehavior: firstPresent([slot.observableBehavior]),
    evidenceCriterion: firstPresent([
      slot.evidenceCriterion,
      slot.evidenceCriteria?.[0],
    ]),
    variationRequirement: firstPresent([
      slot.variationRequirement,
      slot.assessmentFocus,
    ]),
  };
}

/**
 * 将题目生成任务协议收口成插槽组件可消费的稳定运行态。
 * @param {object} questionGeneration - 路由持有的生成任务状态。
 * @param {string} scopeId - 当前知识点或整课范围。
 * @returns {object} 插槽生成展示状态。
 */
export function projectSlotGenerationState(questionGeneration, scopeId) {
  const selected =
    questionGeneration?.scope === scopeId ? questionGeneration : null;
  const isGeneratingMatrix = selected?.mode === "knowledge-matrix";
  const isPlanning = selected?.mode === "knowledge-slots";
  const isRunning =
    selected?.mode === "knowledge-questions" && selected?.phase === "running";
  const states = Array.isArray(selected?.slots)
    ? selected.slots.map((slot) => ({
        id: slot.id,
        status: GENERATION_STATUSES.has(slot.status) ? slot.status : "ready",
        questionId: slot.questionId || "",
      }))
    : [];

  return {
    states,
    isGeneratingMatrix,
    isPlanning,
    isRunning,
    isBusy: isGeneratingMatrix || isPlanning || isRunning,
    canRetry:
      selected?.phase === "partial" &&
      states.some((slot) => ["failed", "stopped"].includes(slot.status)),
  };
}

/**
 * 构造教师内容页单个评估范围的唯一视图合同。
 * @param {object} input - 当前内容与运行态。
 * @param {string} input.scopeId - 知识点或整课范围标识。
 * @param {object} input.content - 当前可见内容版本。
 * @param {object[]} input.questions - 当前范围题目。
 * @param {object} input.questionGeneration - 路由生成任务状态。
 * @returns {object} 矩阵和插槽视图合同。
 */
export function projectTeacherAssessmentScope({
  scopeId,
  content,
  questions = [],
  questionGeneration,
}) {
  const rawMatrix = matrixFromSource(content?.assessmentMatrices, scopeId);
  const matrix = projectMatrix(rawMatrix, scopeId, questions);
  const slotGeneration = projectSlotGenerationState(
    questionGeneration,
    scopeId,
  );
  return {
    scopeId,
    matrix,
    hasMatrix: Boolean(matrix),
    slots: slotsFromSource(content?.assessmentQuestionSlots, scopeId).map(
      (slot) => projectSlotContract(slot),
    ),
    slotGeneration,
    isBusy: slotGeneration.isBusy,
    isGeneratingMatrix: slotGeneration.isGeneratingMatrix,
  };
}
