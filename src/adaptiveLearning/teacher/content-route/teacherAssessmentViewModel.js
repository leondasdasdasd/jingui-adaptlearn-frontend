import { assessmentPolicy } from "../../shared/domain/assessmentMatrixPolicy";
import { classifyAssessmentQuestionAssignment } from "../../shared/domain/assessmentQuestionAssignment";
import {
  ASSESSMENT_MATRIX_LEVELS,
  assessmentMatrixCellRequiredSlotCount,
  normalizeKnowledgeAssessmentMatrix,
} from "../../shared/domain/knowledgeAssessmentMatrix";

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

/**
 *
 * @param source
 * @param scopeId
 */
function matrixFromSource(source, scopeId) {
  if (Array.isArray(source)) {
    return source.find(
      (matrix) => String(matrix?.knowledgePointId || "") === scopeId,
    );
  }
  return source?.[scopeId] || null;
}

/**
 *
 * @param source
 * @param scopeId
 */
function slotsFromSource(source, scopeId) {
  if (Array.isArray(source)) {
    return source.filter(
      (slot) => String(slot?.knowledgePointId || "") === scopeId,
    );
  }
  return Array.isArray(source?.[scopeId]) ? source[scopeId] : [];
}

/**
 *
 * @param role
 */
function normalizedRole(role) {
  const value = String(role || "")
    .trim()
    .toUpperCase();
  if (["NA", "N/A", "NONE", "NOT_APPLICABLE"].includes(value)) {
    return "NOT_APPLICABLE";
  }
  return ROLE_IDS.has(value) ? value : "SUPPORT";
}

/**
 *
 * @param values
 * @param fallback
 */
function firstPresent(values, fallback = "") {
  return (
    values.find(
      (value) => value !== undefined && value !== null && value !== "",
    ) ?? fallback
  );
}

/**
 * 矩阵覆盖只消费统一归属判定，历史多格字段不得再次参与计数。
 * @param assignedQuestions
 */
function questionsByCell(assignedQuestions) {
  const result = new Map();
  for (const { projected, assignment } of assignedQuestions) {
    const current = result.get(assignment.matrixCellId) || [];
    current.push({
      id: projected.id,
      displayNumber: projected.displayNumber,
      stem: projected.stem,
      type: projected.type,
      difficulty: projected.difficulty,
    });
    result.set(assignment.matrixCellId, current);
  }
  return result;
}

/**
 *
 * @param rawMatrix
 * @param scopeId
 * @param questions
 * @param slots
 * @param assignedQuestions
 */
function projectMatrix(rawMatrix, scopeId, assignedQuestions) {
  if (!rawMatrix?.cells?.length) return null;
  const normalized = normalizeKnowledgeAssessmentMatrix({
    ...rawMatrix,
    knowledgePointId: rawMatrix.knowledgePointId || scopeId,
  });
  const coverage = questionsByCell(assignedQuestions);
  const domainIds = new Set(
    assessmentPolicy(normalized.assessmentPolicyId).domains.map(
      (item) => item.id,
    ),
  );
  const cells = normalized.cells
    .filter(
      (cell) => domainIds.has(cell.domain) && LEVEL_IDS.has(cell.targetLevel),
    )
    .map((cell) => ({
      cellId: cell.matrixCellId,
      assessmentPolicyId: normalized.assessmentPolicyId,
      domain: cell.domain,
      level: cell.targetLevel,
      role: normalizedRole(cell.role),
      observableBehavior: cell.observableBehavior,
      evidenceCriteria: cell.evidenceCriteria,
      variationRequirements: cell.variationRequirements,
      commonMisconceptions: cell.commonMisconceptions,
      recommendedQuestionTypes: cell.recommendedQuestionTypes,
      requiredSlotCount: assessmentMatrixCellRequiredSlotCount(cell),
      questions: coverage.get(cell.matrixCellId) || [],
    }));
  const applicableCells = cells.filter(
    (cell) => cell.role !== "NOT_APPLICABLE",
  );

  return {
    assessmentPolicyId: normalized.assessmentPolicyId,
    knowledgePointIds: normalized.knowledgePointIds,
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

/**
 *
 * @param slot
 */
function projectSlotContract(slot) {
  const matrixCode = firstPresent(
    [slot.matrixCellCode],
    `${firstPresent([slot.domain])}-${firstPresent([slot.targetLevel])}`,
  );
  return {
    id: slot.id,
    assessmentPolicyId: firstPresent([
      slot.assessmentPolicyId,
      slot.policyVersion,
    ]),
    matrixCellId: firstPresent([slot.matrixCellId]),
    knowledgePointIds: Array.isArray(slot.knowledgePointIds)
      ? slot.knowledgePointIds.map(String)
      : [slot.knowledgePointId].filter(Boolean).map(String),
    primaryKnowledgePointId: firstPresent([slot.primaryKnowledgePointId]),
    secondaryKnowledgePointIds: Array.isArray(slot.secondaryKnowledgePointIds)
      ? slot.secondaryKnowledgePointIds.map(String)
      : [],
    matrixCode,
    difficulty: firstPresent([slot.difficulty]),
    questionType: firstPresent([slot.questionType]),
  };
}

/**
 *
 * @param question
 * @param index
 */
function projectQuestion(question, index) {
  const assignment = classifyAssessmentQuestionAssignment(question);
  return {
    id: String(question.id),
    displayNumber: index + 1,
    stem: question.stem || question.title || "",
    type: question.type || "",
    difficulty: question.difficulty || "",
    matrixCellId: assignment.matrixCellId,
    blueprintSlotId: assignment.slotId || null,
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
  const slotGeneration = projectSlotGenerationState(
    questionGeneration,
    scopeId,
  );
  const projectedQuestions = questions.map((question, index) =>
    projectQuestion(question, index),
  );
  const slotContracts = slotsFromSource(
    content?.assessmentQuestionSlots,
    scopeId,
  ).map((slot) => projectSlotContract(slot));
  const matrixShape = projectMatrix(rawMatrix, scopeId, []);
  const cellsById = new Map(
    (matrixShape?.cells || []).map((cell) => [String(cell.cellId), cell]),
  );
  const assignmentContext = {
    slotAssignments: slotContracts.map((slot) => ({
      slotId: String(slot.id),
      matrixCellId: String(slot.matrixCellId),
      matrixCell: cellsById.get(String(slot.matrixCellId)) || null,
    })),
  };
  const assignments = projectedQuestions.map((question) =>
    classifyAssessmentQuestionAssignment(question, assignmentContext),
  );
  const assignedQuestions = projectedQuestions
    .map((projected, index) => ({ projected, assignment: assignments[index] }))
    .filter(({ assignment }) => !assignment.outsideMatrix);
  const matrix = projectMatrix(rawMatrix, scopeId, assignedQuestions);
  const slots = slotContracts.map((slot) => ({
    ...slot,
    questions: projectedQuestions.filter(
      (question, index) =>
        !assignments[index].outsideMatrix &&
        assignments[index].slotId === String(slot.id),
    ),
  }));
  return {
    scopeId,
    matrix,
    hasMatrix: Boolean(matrix),
    assignmentContext,
    slots,
    unassignedQuestions: projectedQuestions.filter(
      (_question, index) => assignments[index].outsideMatrix,
    ),
    slotGeneration,
    isBusy: slotGeneration.isBusy,
    isGeneratingMatrix: slotGeneration.isGeneratingMatrix,
  };
}
