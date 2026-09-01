import { practicePoolBlueprint } from "./questionPoolPolicy.js";

export const KNOWLEDGE_ASSESSMENT_MATRIX_POLICY_VERSION =
  "math-assessment-matrix-v1";

export const ASSESSMENT_MATRIX_DOMAINS = Object.freeze(["CR", "PJ", "M", "SF"]);
export const ASSESSMENT_MATRIX_LEVELS = Object.freeze([
  "A",
  "B",
  "C",
  "D",
  "E",
]);
export const ASSESSMENT_MATRIX_ROLES = Object.freeze([
  "CORE",
  "SUPPORT",
  "EXTENSION",
]);

export const ASSESSMENT_MATRIX_DOMAIN_LABELS = Object.freeze({
  CR: "概念与符号",
  PJ: "程序、推理与论证",
  M: "模型与不变结构",
  SF: "总结、交流与反思",
});

export const ASSESSMENT_MATRIX_LEVEL_LABELS = Object.freeze({
  A: "识别与再现",
  B: "理解与转换",
  C: "选择与执行",
  D: "关联与论证",
  E: "迁移与建构",
});

const roleWeight = Object.freeze({ CORE: 3, SUPPORT: 2, EXTENSION: 1 });
const domainOrder = new Map(
  ASSESSMENT_MATRIX_DOMAINS.map((domain, index) => [domain, index]),
);
const levelOrder = new Map(
  ASSESSMENT_MATRIX_LEVELS.map((level, index) => [level, index]),
);

/**
 *
 * @param value
 */
function compactText(value) {
  return String(value ?? "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

/**
 *
 * @param value
 * @param maximum
 */
function compactStringList(value, maximum = 6) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .map((item) => compactText(item))
        .filter(Boolean),
    ),
  ].slice(0, maximum);
}

/**
 *
 * @param value
 * @param maximum
 */
function normalizeQuestionRecommendations(value, maximum = 6) {
  const source = Array.isArray(value) ? value : [];
  return [
    ...new Set(
      source
        .filter((item) => typeof item === "string")
        .map((item) =>
          compactText(item)
            .toLowerCase()
            .replaceAll(/[\s-]+/g, "_"),
        )
        .filter(Boolean),
    ),
  ].slice(0, maximum);
}

/**
 *
 * @param knowledgePointId
 * @param domain
 * @param level
 */
export function assessmentMatrixCellId(knowledgePointId, domain, level) {
  return `${compactText(knowledgePointId)}:${compactText(domain).toUpperCase()}:${compactText(level).toUpperCase()}`;
}

/**
 *
 * @param rawMatrix
 */
export function normalizeKnowledgeAssessmentMatrix(rawMatrix = {}) {
  const knowledgePointId = compactText(rawMatrix.knowledgePointId);
  return {
    policyVersion:
      compactText(rawMatrix.policyVersion) ||
      KNOWLEDGE_ASSESSMENT_MATRIX_POLICY_VERSION,
    knowledgePointId,
    targetStatement: compactText(rawMatrix.targetStatement),
    rationale: compactText(rawMatrix.rationale),
    reviewStatus: compactText(rawMatrix.reviewStatus) || "PENDING_REVIEW",
    generationSource: compactText(rawMatrix.generationSource),
    generationModel: compactText(rawMatrix.generationModel),
    generatedAt: compactText(rawMatrix.generatedAt),
    cells: (Array.isArray(rawMatrix.cells) ? rawMatrix.cells : []).map(
      (rawCell) => {
        const domain = compactText(rawCell?.domain).toUpperCase();
        const targetLevel = compactText(
          rawCell?.targetLevel || rawCell?.level,
        ).toUpperCase();
        const recommendedQuestionTypes = normalizeQuestionRecommendations(
          rawCell?.recommendedQuestionTypes,
          6,
        );
        return {
          matrixCellId: assessmentMatrixCellId(
            knowledgePointId,
            domain,
            targetLevel,
          ),
          domain,
          targetLevel,
          role: compactText(rawCell?.role).toUpperCase(),
          observableBehavior: compactText(rawCell?.observableBehavior),
          evidenceCriteria: compactStringList(rawCell?.evidenceCriteria, 4),
          commonMisconceptions: compactStringList(
            rawCell?.commonMisconceptions,
            4,
          ),
          recommendedQuestionTypes,
          minimumIndependentEvidence: Math.max(
            1,
            Math.min(4, Number(rawCell?.minimumIndependentEvidence) || 1),
          ),
        };
      },
    ),
  };
}

/**
 *
 * @param code
 * @param path
 * @param message
 */
function issue(code, path, message) {
  return { code, path, message };
}

/**
 *
 * @param raw
 * @param root0
 * @param root0.knowledgePoints
 * @param root0.allowedQuestionTypes
 */
export function validateKnowledgeAssessmentMatrices(
  raw,
  { knowledgePoints = [], allowedQuestionTypes = [] } = {},
) {
  const errors = [];
  const source = Array.isArray(raw) ? { matrices: raw } : raw;
  const rawMatrices = Array.isArray(source?.matrices) ? source.matrices : [];
  const matrices = rawMatrices.map(normalizeKnowledgeAssessmentMatrix);
  const knownIds = [
    ...new Set(
      (Array.isArray(knowledgePoints) ? knowledgePoints : [])
        .map((item) =>
          compactText(
            typeof item === "object"
              ? item?.id || item?.knowledgePointId
              : item,
          ),
        )
        .filter(Boolean),
    ),
  ];
  const knownIdSet = new Set(knownIds);
  const allowedTypeSet = new Set(allowedQuestionTypes);

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    errors.push(
      issue("INVALID_OBJECT", "matrixPlan", "评估矩阵计划必须是对象"),
    );
  }
  if (rawMatrices.length === 0)
    errors.push(
      issue(
        "MATRIX_COUNT_BELOW_MINIMUM",
        "matrices",
        "至少需要一个知识点评估矩阵",
      ),
    );

  const matrixIds = new Set();
  for (const [matrixIndex, matrix] of matrices.entries()) {
    const path = `matrices[${matrixIndex}]`;
    if (!matrix.knowledgePointId)
      errors.push(
        issue(
          "MISSING_KNOWLEDGE_POINT_ID",
          `${path}.knowledgePointId`,
          "矩阵缺少知识点 ID",
        ),
      );
    if (matrixIds.has(matrix.knowledgePointId))
      errors.push(
        issue(
          "DUPLICATE_MATRIX",
          `${path}.knowledgePointId`,
          `知识点 ${matrix.knowledgePointId} 的矩阵重复`,
        ),
      );
    matrixIds.add(matrix.knowledgePointId);
    if (knownIdSet.size > 0 && !knownIdSet.has(matrix.knowledgePointId))
      errors.push(
        issue(
          "UNKNOWN_KNOWLEDGE_POINT",
          `${path}.knowledgePointId`,
          `未知知识点 ${matrix.knowledgePointId}`,
        ),
      );
    if (
      matrix.targetStatement.length < 4 ||
      matrix.targetStatement.length > 240
    )
      errors.push(
        issue(
          "INVALID_TARGET_STATEMENT",
          `${path}.targetStatement`,
          "目标陈述需为 4 至 240 个字符",
        ),
      );
    if (matrix.rationale.length < 4 || matrix.rationale.length > 360)
      errors.push(
        issue(
          "INVALID_RATIONALE",
          `${path}.rationale`,
          "矩阵取舍理由需为 4 至 360 个字符",
        ),
      );
    if (matrix.cells.length === 0 || matrix.cells.length > 12)
      errors.push(
        issue(
          "INVALID_ACTIVE_CELL_COUNT",
          `${path}.cells`,
          "每个知识点必须有 1 至 12 个适用格，未列出的格视为不适用",
        ),
      );
    if (
      matrix.cells.length > 0 &&
      !matrix.cells.some((cell) => cell.role === "CORE")
    )
      errors.push(
        issue(
          "CORE_CELL_MISSING",
          `${path}.cells`,
          "每个知识点至少需要一个核心评估格",
        ),
      );
    const cellIds = new Set();
    for (const [cellIndex, cell] of matrix.cells.entries()) {
      const cellPath = `${path}.cells[${cellIndex}]`;
      if (!ASSESSMENT_MATRIX_DOMAINS.includes(cell.domain))
        errors.push(
          issue(
            "INVALID_DOMAIN",
            `${cellPath}.domain`,
            `领域 ${cell.domain} 不在允许范围内`,
          ),
        );
      if (!ASSESSMENT_MATRIX_LEVELS.includes(cell.targetLevel))
        errors.push(
          issue(
            "INVALID_LEVEL",
            `${cellPath}.targetLevel`,
            `层级 ${cell.targetLevel} 不在允许范围内`,
          ),
        );
      if (!ASSESSMENT_MATRIX_ROLES.includes(cell.role))
        errors.push(
          issue(
            "INVALID_ROLE",
            `${cellPath}.role`,
            `角色 ${cell.role} 不在允许范围内`,
          ),
        );
      if (cellIds.has(cell.matrixCellId))
        errors.push(
          issue("DUPLICATE_CELL", cellPath, `评估格 ${cell.matrixCellId} 重复`),
        );
      cellIds.add(cell.matrixCellId);
      if (
        cell.observableBehavior.length < 8 ||
        cell.observableBehavior.length > 240
      )
        errors.push(
          issue(
            "INVALID_OBSERVABLE_BEHAVIOR",
            `${cellPath}.observableBehavior`,
            "可观察行为需为 8 至 240 个字符",
          ),
        );
      if (cell.evidenceCriteria.length === 0)
        errors.push(
          issue(
            "EVIDENCE_CRITERIA_MISSING",
            `${cellPath}.evidenceCriteria`,
            "适用格至少需要一条证据标准",
          ),
        );
      if (cell.recommendedQuestionTypes.length === 0)
        errors.push(
          issue(
            "QUESTION_TYPES_MISSING",
            `${cellPath}.recommendedQuestionTypes`,
            "适用格至少需要一种推荐题型",
          ),
        );
      if (allowedTypeSet.size > 0)
        for (const type of cell.recommendedQuestionTypes) {
          if (!allowedTypeSet.has(type))
            errors.push(
              issue(
                "INVALID_QUESTION_TYPE",
                `${cellPath}.recommendedQuestionTypes`,
                `不支持题型 ${type}`,
              ),
            );
        }
    }
  }

  for (const knowledgePointId of knownIds) {
    if (!matrixIds.has(knowledgePointId))
      errors.push(
        issue(
          "MATRIX_MISSING",
          "matrices",
          `缺少知识点 ${knowledgePointId} 的评估矩阵`,
        ),
      );
  }

  return { valid: errors.length === 0, matrices, errors };
}

/**
 *
 * @param knowledgePoints
 */
export function fallbackKnowledgeAssessmentMatrices(knowledgePoints = []) {
  return (Array.isArray(knowledgePoints) ? knowledgePoints : [])
    .map((point) => {
      const knowledgePointId = compactText(
        point?.id || point?.knowledgePointId,
      );
      const name = compactText(point?.name || point?.title || knowledgePointId);
      const objective = compactText(
        point?.objective ||
          point?.description ||
          point?.learningObjective ||
          name,
      );
      return normalizeKnowledgeAssessmentMatrix({
        policyVersion: KNOWLEDGE_ASSESSMENT_MATRIX_POLICY_VERSION,
        knowledgePointId,
        targetStatement: objective,
        rationale:
          "模型矩阵不可用时采用保守基线，覆盖概念理解、标准执行和基本建模证据。",
        cells: [
          {
            domain: "CR",
            targetLevel: "B",
            role: "CORE",
            observableBehavior: `理解并转换${name}的核心表示`,
            evidenceCriteria: ["能在等价表示间正确转换并说明关键含义"],
            commonMisconceptions: ["混淆对象、符号或适用边界"],
            recommendedQuestionTypes: [
              { questionType: "single_choice", difficulty: "D1" },
              { questionType: "classification", difficulty: "D2" },
              { questionType: "matching", difficulty: "D2" },
            ],
            minimumIndependentEvidence: 2,
          },
          {
            domain: "PJ",
            targetLevel: "C",
            role: "CORE",
            observableBehavior: `选择并执行${name}的标准程序`,
            evidenceCriteria: ["能独立选择适用方法并完成连续步骤"],
            commonMisconceptions: ["程序顺序错误或遗漏必要条件"],
            recommendedQuestionTypes: [
              { questionType: "fill_blank", difficulty: "D2" },
              { questionType: "ordering", difficulty: "D3" },
              { questionType: "short_answer", difficulty: "D4" },
            ],
            minimumIndependentEvidence: 3,
          },
          {
            domain: "M",
            targetLevel: "C",
            role: "SUPPORT",
            observableBehavior: `从情境中识别并建立与${name}有关的数量关系`,
            evidenceCriteria: ["能提取有效条件并形成可计算关系"],
            commonMisconceptions: ["把无关背景信息当成建模条件"],
            recommendedQuestionTypes: [
              { questionType: "multiple_choice", difficulty: "D3" },
              { questionType: "word_builder", difficulty: "D3" },
              { questionType: "short_answer", difficulty: "D4" },
            ],
            minimumIndependentEvidence: 2,
          },
        ],
      });
    })
    .filter((matrix) => matrix.knowledgePointId);
}

/**
 *
 * @param matrix
 */
function sortedActiveCells(matrix) {
  return [...matrix.cells].sort(
    (left, right) =>
      roleWeight[right.role] - roleWeight[left.role] ||
      domainOrder.get(left.domain) - domainOrder.get(right.domain) ||
      levelOrder.get(left.targetLevel) - levelOrder.get(right.targetLevel),
  );
}

/**
 *
 * @param cellInput
 */
export function assessmentMatrixCellRequiredSlotCount(cellInput = {}) {
  return Math.max(1, Number(cellInput.minimumIndependentEvidence) || 1);
}

/**
 *
 * @param matrix
 * @param count
 */
function evidenceCellSequence(matrix, count) {
  const cells = sortedActiveCells(matrix);
  if (cells.length === 0) return [];
  const sequence = cells.flatMap((cell) =>
    Array.from(
      {
        length: assessmentMatrixCellRequiredSlotCount(cell),
      },
      () => cell,
    ),
  );
  let cursor = 0;
  while (sequence.length < count) {
    const weighted = cells.flatMap((cell) =>
      Array.from({ length: roleWeight[cell.role] || 1 }, () => cell),
    );
    sequence.push(weighted[cursor % weighted.length]);
    cursor += 1;
  }
  return sequence.slice(0, count);
}

/**
 *
 * @param matrixInput
 */
export function assessmentMatrixRequiredSlotCount(matrixInput) {
  const matrix = normalizeKnowledgeAssessmentMatrix(matrixInput);
  return matrix.cells.reduce(
    (total, cell) => total + assessmentMatrixCellRequiredSlotCount(cell),
    0,
  );
}

// 兼容既有调用方。插槽数量只由独立证据要求决定，推荐题型仅供插槽规划参考。
export const assessmentMatrixRequiredEvidenceCount =
  assessmentMatrixRequiredSlotCount;

/**
 *
 * @param matrixInput
 * @param root0
 * @param root0.count
 * @param root0.allowedTypesByDifficulty
 */
export function practicePoolBlueprintFromAssessmentMatrix(
  matrixInput,
  { count = null, allowedTypesByDifficulty = {} } = {},
) {
  const matrix = normalizeKnowledgeAssessmentMatrix(matrixInput);
  const requiredSlotCount = assessmentMatrixRequiredSlotCount(matrix);
  const slotCount =
    count == null
      ? requiredSlotCount
      : Math.max(requiredSlotCount, Number(count) || requiredSlotCount);
  const baseSlots = practicePoolBlueprint(matrix.knowledgePointId, slotCount);
  const cells = evidenceCellSequence(matrix, baseSlots.length);
  if (cells.length === 0) return baseSlots;
  const occurrenceByCell = new Map();
  return baseSlots.map((slot, index) => {
    const cell = cells[index];
    const occurrence = occurrenceByCell.get(cell.matrixCellId) || 0;
    occurrenceByCell.set(cell.matrixCellId, occurrence + 1);
    const difficulty = slot.difficulty;
    const allowedTypes =
      allowedTypesByDifficulty[difficulty] ||
      cell.recommendedQuestionTypes ||
      slot.recommendedQuestionTypes ||
      [];
    const matrixRecommendedTypes = cell.recommendedQuestionTypes.filter(
      (type) => allowedTypes.includes(type),
    );
    const questionType =
      matrixRecommendedTypes[
        occurrence % Math.max(1, matrixRecommendedTypes.length)
      ] || slot.questionType;
    const evidenceCriterion =
      cell.evidenceCriteria[
        occurrence % Math.max(1, cell.evidenceCriteria.length)
      ] || cell.observableBehavior;
    const variationRequirement = slot.assessmentFocus;
    return {
      ...slot,
      difficulty,
      questionType,
      matrixCellId: cell.matrixCellId,
      domain: cell.domain,
      targetLevel: cell.targetLevel,
      matrixRole: cell.role,
      observableBehavior: cell.observableBehavior,
      evidenceCriteria: cell.evidenceCriteria,
      commonMisconceptions: cell.commonMisconceptions,
      matrixCellCode: `${cell.domain}-${cell.targetLevel}`,
      slotSequenceInCell: occurrence + 1,
      evidenceCriterion,
      variationRequirement,
      assessmentFocus: `${cell.observableBehavior}；本槽独立证据：${evidenceCriterion}；题型：${questionType}；难度：${difficulty}；与同格其他题的变化要求：${variationRequirement}`,
      recommendedQuestionTypes:
        matrixRecommendedTypes.length > 0
          ? matrixRecommendedTypes
          : slot.recommendedQuestionTypes,
    };
  });
}
