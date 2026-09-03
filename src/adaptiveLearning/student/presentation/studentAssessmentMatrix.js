const ROLE_MASTERY_THRESHOLDS = Object.freeze({
  CORE: 70,
  SUPPORT: 80,
  EXTENSION: 90,
});

export const STUDENT_ASSESSMENT_DOMAINS = Object.freeze([
  { id: "CR", code: "CR", name: "概念与符号" },
  { id: "PJ", code: "PJ", name: "程序、推理与论证" },
  { id: "M", code: "M", name: "模型与不变结构" },
  { id: "SF", code: "SF", name: "总结、交流与反思" },
]);

export const STUDENT_ASSESSMENT_LEVELS = Object.freeze([
  { id: "A", code: "A", name: "识别与再现" },
  { id: "B", code: "B", name: "理解与转换" },
  { id: "C", code: "C", name: "选择与执行" },
  { id: "D", code: "D", name: "关联与论证" },
  { id: "E", code: "E", name: "迁移与建构" },
]);

/**
 *
 * @param knowledgePoint
 */
function standardKnowledgePointMatrix(knowledgePoint) {
  const id = knowledgePoint.id;
  const name = knowledgePoint.name;
  return {
    knowledgePointId: id,
    knowledgePointName: name,
    targetStatement:
      knowledgePoint.objective || `掌握 ${name} 的基本概念与解题方法。`,
    rationale: "课标核心要求与学业质量标准。",
    cells: [
      {
        matrixCellId: `${id}:CR:A`,
        domain: "CR",
        targetLevel: "A",
        role: "CORE",
        observableBehavior: `能够准确识别和描述 ${name} 的基本概念与符号表示。`,
        evidenceCriteria: ["概念表述准确无误", "能区分正负及基准"],
        recommendedQuestionTypes: ["single_choice", "fill_blank"],
        minimumIndependentEvidence: 1,
      },
      {
        matrixCellId: `${id}:CR:B`,
        domain: "CR",
        targetLevel: "B",
        role: "SUPPORT",
        observableBehavior: `能够理解 ${name} 的数学含义并在不同表征之间进行转换。`,
        evidenceCriteria: ["能解释具体情境中的数学含义", "准确进行数形转换"],
        recommendedQuestionTypes: ["single_choice", "fill_blank"],
        minimumIndependentEvidence: 1,
      },
      {
        matrixCellId: `${id}:PJ:C`,
        domain: "PJ",
        targetLevel: "C",
        role: "CORE",
        observableBehavior: `能够选择合适的方法并规范执行 ${name} 的计算或推理步骤。`,
        evidenceCriteria: ["运算过程完整无跳步", "推理依据合理"],
        recommendedQuestionTypes: ["fill_blank", "short_answer"],
        minimumIndependentEvidence: 1,
      },
      {
        matrixCellId: `${id}:M:B`,
        domain: "M",
        targetLevel: "B",
        role: "SUPPORT",
        observableBehavior: `能够在实际问题情境中提炼 ${name} 的数学模型并建立数量关系。`,
        evidenceCriteria: [
          "能准确抽象出关键变量与条件",
          "建立的方程或模型符合题意",
        ],
        recommendedQuestionTypes: ["single_choice", "short_answer"],
        minimumIndependentEvidence: 1,
      },
      {
        matrixCellId: `${id}:SF:D`,
        domain: "SF",
        targetLevel: "D",
        role: "EXTENSION",
        observableBehavior: `能反思求解过程并总结关于 ${name} 的数学思想方法与错因规律。`,
        evidenceCriteria: ["总结逻辑清晰条理", "能指出易错点与变式规律"],
        recommendedQuestionTypes: ["short_answer"],
        minimumIndependentEvidence: 1,
      },
    ],
  };
}

/**
 *
 */
function standardCompositeMatrix() {
  return {
    knowledgePointId: "composite",
    knowledgePointName: "整课综合评估",
    targetStatement: "综合运用本课各知识点解决复杂与迁移问题。",
    rationale: "全课综合认知建构与核心素养考查。",
    cells: [
      {
        matrixCellId: "composite:CR:B",
        domain: "CR",
        targetLevel: "B",
        role: "CORE",
        observableBehavior:
          "能综合分析各知识点之间的内在逻辑联系并形成知识结构。",
        evidenceCriteria: ["构建完整的概念图谱", "准确阐明概念间的承接关系"],
        recommendedQuestionTypes: ["single_choice", "short_answer"],
        minimumIndependentEvidence: 1,
      },
      {
        matrixCellId: "composite:PJ:C",
        domain: "PJ",
        targetLevel: "C",
        role: "CORE",
        observableBehavior: "能综合运用多种法则与步骤完成多阶段问题的求解。",
        evidenceCriteria: ["多步骤演算准确", "综合解题逻辑严谨"],
        recommendedQuestionTypes: ["fill_blank", "short_answer"],
        minimumIndependentEvidence: 1,
      },
      {
        matrixCellId: "composite:M:D",
        domain: "M",
        targetLevel: "D",
        role: "EXTENSION",
        observableBehavior:
          "能在跨情境、综合情境中建立复合数学模型并论证其合理性。",
        evidenceCriteria: ["提炼复合情境关键规律", "论证严密且结论正确"],
        recommendedQuestionTypes: ["short_answer"],
        minimumIndependentEvidence: 1,
      },
    ],
  };
}

/**
 * 将已发布内容中的矩阵转换为学生端唯一使用的矩阵集合；未发布课时使用稳定的视觉兜底。
 * @param {object} input 课时及已发布矩阵。
 * @param input.lesson
 * @param input.assessmentMatrices
 */
export function resolveStudentAssessmentMatrices({
  lesson,
  assessmentMatrices = {},
}) {
  if (!lesson) return {};
  if (
    assessmentMatrices &&
    typeof assessmentMatrices === "object" &&
    Object.keys(assessmentMatrices).length > 0
  ) {
    return assessmentMatrices;
  }
  return {
    ...Object.fromEntries(
      (lesson.knowledgePoints || []).map((knowledgePoint) => [
        knowledgePoint.id,
        standardKnowledgePointMatrix(knowledgePoint),
      ]),
    ),
    composite: standardCompositeMatrix(),
  };
}

/**
 *
 * @param activeTargetId
 * @param currentKpName
 * @param knowledgePoint
 */
function fallbackActiveMatrix(activeTargetId, currentKpName, knowledgePoint) {
  return {
    knowledgePointId: activeTargetId,
    knowledgePointName: currentKpName,
    targetStatement:
      knowledgePoint?.objective || `掌握 ${currentKpName} 的核心认知结构。`,
    rationale: "依据国家新课标素养评价框架建立。",
    cells: [
      {
        matrixCellId: `${activeTargetId}:CR:A`,
        domain: "CR",
        targetLevel: "A",
        role: "CORE",
        observableBehavior: `能准确识别并表述 ${currentKpName} 的定义及数学符号。`,
        evidenceCriteria: ["概念清晰", "符号无误"],
        recommendedQuestionTypes: ["single_choice", "fill_blank"],
      },
      {
        matrixCellId: `${activeTargetId}:PJ:B`,
        domain: "PJ",
        targetLevel: "B",
        role: "CORE",
        observableBehavior: `能理解 ${currentKpName} 的法则并在具体情境中执行演算。`,
        evidenceCriteria: ["计算准确", "步骤合规"],
        recommendedQuestionTypes: ["fill_blank", "short_answer"],
      },
      {
        matrixCellId: `${activeTargetId}:M:C`,
        domain: "M",
        targetLevel: "C",
        role: "SUPPORT",
        observableBehavior: `能在应用情境中运用 ${currentKpName} 建立数量关系。`,
        evidenceCriteria: ["模型建立合理", "答案正确"],
        recommendedQuestionTypes: ["single_choice", "short_answer"],
      },
    ],
  };
}

/**
 *
 * @param attempt
 * @param activeTargetId
 * @param currentKpName
 * @param composite
 */
function attemptMatchesTarget(
  attempt,
  activeTargetId,
  currentKpName,
  composite,
) {
  return (
    composite ||
    attempt.kpId === activeTargetId ||
    attempt.kpName === currentKpName ||
    attempt.knowledgePointId === activeTargetId
  );
}

/**
 *
 * @param attempt
 * @param cell
 * @param domain
 * @param level
 */
function attemptMatchesCell(attempt, cell, domain, level) {
  return (
    attempt.matrixCellId === cell.matrixCellId ||
    attempt.question?.matrixCellId === cell.matrixCellId ||
    attempt.matrixCellCode === `${domain}-${level}` ||
    attempt.matrixCellCode === `${domain}:${level}` ||
    ((attempt.domain === domain || attempt.question?.domain === domain) &&
      (attempt.targetLevel === level || attempt.level === level))
  );
}

/**
 *
 * @param attempt
 */
function attemptPassed(attempt) {
  if (attempt.result === "已通过") return true;
  const score = Number(attempt.score);
  const maxScore = Number(attempt.maxScore);
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0)
    return false;
  return score === maxScore || score / maxScore >= 0.7;
}

/**
 *
 * @param root0
 * @param root0.matrices
 * @param root0.activeTargetId
 * @param root0.currentKpName
 * @param root0.composite
 * @param root0.knowledgePoint
 */
function selectActiveMatrix({
  matrices,
  activeTargetId,
  currentKpName,
  composite,
  knowledgePoint,
}) {
  const directMatrix = matrices[activeTargetId];
  const matchedMatrix = composite
    ? null
    : Object.values(matrices).find(
        (matrix) =>
          matrix.knowledgePointId === activeTargetId ||
          matrix.knowledgePointName === currentKpName,
      );
  const currentMatrix = directMatrix || matchedMatrix;
  return currentMatrix?.cells?.length
    ? currentMatrix
    : fallbackActiveMatrix(activeTargetId, currentKpName, knowledgePoint);
}

/**
 *
 * @param root0
 * @param root0.cell
 * @param root0.domain
 * @param root0.level
 * @param root0.targetAttempts
 * @param root0.activeTargetId
 * @param root0.currentKpName
 * @param root0.mastery
 * @param root0.hasMastery
 */
function applicableCellView({
  cell,
  domain,
  level,
  targetAttempts,
  activeTargetId,
  currentKpName,
  mastery,
  hasMastery,
}) {
  const relatedAttempts = targetAttempts.filter((attempt) =>
    attemptMatchesCell(attempt, cell, domain.id, level.id),
  );
  const passedAttempts = relatedAttempts.filter((attempt) =>
    attemptPassed(attempt),
  );
  const threshold = ROLE_MASTERY_THRESHOLDS[cell.role];
  const isLighted =
    passedAttempts.length > 0 ||
    (hasMastery && threshold != null && mastery >= threshold);
  return {
    key: `${domain.id}:${level.id}`,
    domain: domain.id,
    level: level.id,
    cellId: cell.matrixCellId || `${activeTargetId}:${domain.id}:${level.id}`,
    role: cell.role || "CORE",
    observableBehavior:
      cell.observableBehavior ||
      `能够理解并运用 ${currentKpName} 在 ${domain.name} 维度达到 ${level.name} 认知层级。`,
    evidenceCriteria:
      Array.isArray(cell.evidenceCriteria) && cell.evidenceCriteria.length > 0
        ? cell.evidenceCriteria
        : ["能准确理解关键概念并独立推导", "解题规范且逻辑严密"],
    recommendedQuestionTypes: Array.isArray(cell.recommendedQuestionTypes)
      ? cell.recommendedQuestionTypes
      : ["single_choice", "fill_blank"],
    isApplicable: true,
    isLighted,
    relatedAttempts,
    passedAttempts,
  };
}

/**
 *
 * @param root0
 * @param root0.currentMatrix
 * @param root0.domains
 * @param root0.levels
 * @param root0.targetAttempts
 * @param root0.activeTargetId
 * @param root0.currentKpName
 * @param root0.mastery
 * @param root0.hasMastery
 */
function matrixGridViewModel({
  currentMatrix,
  domains,
  levels,
  targetAttempts,
  activeTargetId,
  currentKpName,
  mastery,
  hasMastery,
}) {
  const cellMap = new Map();
  for (const domain of domains) {
    for (const level of levels) {
      const key = `${domain.id}:${level.id}`;
      const cell = currentMatrix.cells.find(
        (item) =>
          (item.domain === domain.id || item.domainId === domain.id) &&
          (item.targetLevel === level.id || item.level === level.id),
      );
      if (!cell || ["NOT_APPLICABLE", "NA"].includes(cell.role)) {
        cellMap.set(key, {
          key,
          domain: domain.id,
          level: level.id,
          role: "NOT_APPLICABLE",
          isApplicable: false,
          isLighted: false,
        });
        continue;
      }
      cellMap.set(
        key,
        applicableCellView({
          cell,
          domain,
          level,
          targetAttempts,
          activeTargetId,
          currentKpName,
          mastery,
          hasMastery,
        }),
      );
    }
  }
  const activeCells = [...cellMap.values()].filter((cell) => cell.isApplicable);
  const lightedCount = activeCells.filter((cell) => cell.isLighted).length;
  const totalApplicable = activeCells.length;
  return {
    cellMap,
    activeCells,
    lightedCount,
    totalApplicable,
    lightingRate:
      totalApplicable > 0
        ? Math.round((lightedCount / totalApplicable) * 100)
        : 0,
  };
}

/**
 * 把发布矩阵、掌握度和证据记录集中映射为弹窗及知识图谱共同消费的视图模型。
 * @param {object} input 标准化学生评估输入。
 * @param input.lesson
 * @param input.knowledgePoint
 * @param input.mode
 * @param input.profile
 * @param input.attempts
 * @param input.assessmentMatrices
 * @param input.domains
 * @param input.levels
 */
export function buildStudentAssessmentMatrixViewModel({
  lesson,
  knowledgePoint = null,
  mode = "lesson",
  profile = {},
  attempts = [],
  assessmentMatrices = {},
  domains = STUDENT_ASSESSMENT_DOMAINS,
  levels = STUDENT_ASSESSMENT_LEVELS,
}) {
  const composite = mode === "lesson" && !knowledgePoint;
  const activeTargetId = knowledgePoint?.id || "composite";
  const currentKpName = knowledgePoint
    ? knowledgePoint.name
    : lesson
      ? `${lesson.title} · 课时综合矩阵`
      : "认知与考核矩阵";
  const matrices = resolveStudentAssessmentMatrices({
    lesson,
    assessmentMatrices,
  });
  const currentMatrix = selectActiveMatrix({
    matrices,
    activeTargetId,
    currentKpName,
    composite,
    knowledgePoint,
  });

  const mastery = Number(profile[activeTargetId]?.mastery);
  const hasMastery = Number.isFinite(mastery);
  const targetAttempts = (attempts || []).filter((attempt) =>
    attemptMatchesTarget(attempt, activeTargetId, currentKpName, composite),
  );
  const grid = matrixGridViewModel({
    currentMatrix,
    domains,
    levels,
    targetAttempts,
    activeTargetId,
    currentKpName,
    mastery,
    hasMastery,
  });
  return {
    activeTargetId,
    currentKpName,
    currentMatrix,
    ...grid,
  };
}

/**
 *
 * @param input
 */
export function getKnowledgePointMatrixStats(input) {
  const viewModel = buildStudentAssessmentMatrixViewModel({
    ...input,
    mode: "knowledgePoint",
  });
  return {
    lighted: viewModel.lightedCount,
    total: viewModel.totalApplicable,
    rate: viewModel.lightingRate,
  };
}
