export const UNIT_MATRIX_CELLS = Object.freeze([
  {
    matrixCellId: "unit:CR:B",
    matrixCellCode: "CR · B",
    domain: "CR",
    targetLevel: "B",
    role: "CORE",
    observableBehavior: "理解并准确转换单元核心数学概念与符号表征",
    evidenceCriteria: ["能在概念等价表征间准确转换并说明关键性质"],
    variationRequirements: ["更换情境与符号表达后仍能保持概念一致性"],
    commonMisconceptions: ["混淆概念内涵或忽视成立前提条件"],
    recommendedQuestionTypes: [
      { questionType: "multiple_choice", difficulty: "D2" },
      { questionType: "matching", difficulty: "D2" },
    ],
    minimumIndependentEvidence: 2,
  },
  {
    matrixCellId: "unit:PJ:C",
    matrixCellCode: "PJ · C",
    domain: "PJ",
    targetLevel: "C",
    role: "CORE",
    observableBehavior: "熟练执行多步骤代数运算与推理证明程序",
    evidenceCriteria: ["能独立选择适宜求解方法并完成规范推理步骤"],
    variationRequirements: ["在多条件与变式数据下稳定完成求解与判断"],
    commonMisconceptions: ["推理断层、符号代入错误或遗漏分类讨论"],
    recommendedQuestionTypes: [
      { questionType: "short_answer", difficulty: "D3" },
      { questionType: "ordering", difficulty: "D3" },
    ],
    minimumIndependentEvidence: 2,
  },
  {
    matrixCellId: "unit:M:C",
    matrixCellCode: "M · C",
    domain: "M",
    targetLevel: "C",
    role: "CORE",
    observableBehavior: "从综合情境中提取数量与空间关系并建立跨知识点模型",
    evidenceCriteria: [
      "能抽象实际情境条件并建立有效数学关系方程/几何模型",
    ],
    variationRequirements: ["更换真实应用背景后仍能准确建立数学模型"],
    commonMisconceptions: ["将非本质背景信息作为建模约束条件"],
    recommendedQuestionTypes: [
      { questionType: "multiple_choice", difficulty: "D3" },
      { questionType: "short_answer", difficulty: "D4" },
    ],
    minimumIndependentEvidence: 2,
  },
  {
    matrixCellId: "unit:CR:D",
    matrixCellCode: "CR · D",
    domain: "CR",
    targetLevel: "D",
    role: "SUPPORT",
    observableBehavior: "在综合变式情境中探究概念本质与不变性质",
    evidenceCriteria: ["能辨析概念边界条件并给出反例或变式解释"],
    variationRequirements: ["在未知复合背景下识别核心数学概念不变性"],
    commonMisconceptions: ["把特殊特例当作普遍定理"],
    recommendedQuestionTypes: [
      { questionType: "multiple_choice", difficulty: "D4" },
      { questionType: "short_answer", difficulty: "D4" },
    ],
    minimumIndependentEvidence: 1,
  },
  {
    matrixCellId: "unit:PJ:D",
    matrixCellCode: "PJ · D",
    domain: "PJ",
    targetLevel: "D",
    role: "SUPPORT",
    observableBehavior: "构造综合多步证明与开放性问题策略",
    evidenceCriteria: ["能灵活综合多个知识点完成复杂推理与多解探究"],
    variationRequirements: ["面对反常或开放设问时能自主构建解题逻辑链"],
    commonMisconceptions: ["循环论证或忽略隐藏边界值"],
    recommendedQuestionTypes: [
      { questionType: "short_answer", difficulty: "D4" },
      { questionType: "short_answer", difficulty: "D5" },
    ],
    minimumIndependentEvidence: 1,
  },
  {
    matrixCellId: "unit:M:D",
    matrixCellCode: "M · D",
    domain: "M",
    targetLevel: "D",
    role: "SUPPORT",
    observableBehavior: "高阶综合迁移建模与最优解策略探究",
    evidenceCriteria: [
      "能对复杂多变量实际问题建立模型并验证求解结论的合理性",
    ],
    variationRequirements: ["跨情境迁移与优化建模方案分析"],
    commonMisconceptions: ["未验证模型在实际情境中的合理性与极值限制"],
    recommendedQuestionTypes: [
      { questionType: "short_answer", difficulty: "D5" },
    ],
    minimumIndependentEvidence: 1,
  },
]);

const QUESTION_TYPES = Object.freeze([
  "multiple_choice",
  "short_answer",
  "ordering",
  "matching",
]);
const DIFFICULTIES = Object.freeze(["D2", "D3", "D3", "D4", "D5"]);

/**
 * 单元知识点以教材章节为权威来源，跨课时按 ID 去重并保留首次来源课时。
 * @param {object} chapter 教材章节
 * @returns {object[]} 单元内全部知识点
 */
export function unitKnowledgePoints(chapter) {
  const points = new Map();
  for (const section of chapter?.sections || []) {
    for (const knowledgePoint of section.knowledgePoints || []) {
      const id = String(knowledgePoint.id);
      if (!points.has(id)) {
        points.set(id, {
          id,
          name: String(knowledgePoint.name || ""),
          sourceLessonId: String(section.id),
          sourceLessonTitle: String(section.title || ""),
        });
      }
    }
  }
  return [...points.values()];
}

/**
 * 每个课时只选择一个主知识点锚点，其余知识点通过混合题作为次知识点覆盖。
 * @param chapter
 */
function unitPrimaryKnowledgePoints(chapter) {
  const selected = [];
  const selectedIds = new Set();
  for (const section of chapter?.sections || []) {
    const candidates = section.knowledgePoints || [];
    const primary =
      candidates.find(
        (item) => item.importance === "primary" || item.isPrimary === true,
      ) || candidates.find((item) => !selectedIds.has(String(item.id)));
    if (!primary) continue;
    const id = String(primary.id);
    selectedIds.add(id);
    selected.push({
      id,
      sectionId: String(section.id),
      sectionKnowledgePointIds: candidates.map((item) => String(item.id)),
    });
  }
  return selected;
}

/**
 * 前端规划遵守“先单元矩阵、后插槽”的形状；真实矩阵要求与题目仍由后端生成。
 * 每个课时主知识点锚点生成两个混合插槽，不再为每个知识点固定生成两题。
 * @param {object} chapter 教材章节
 * @param {number} variant 前端重新规划序号
 * @returns {object} 单元测试内容合同
 */
export function buildUnitAssessmentContent(chapter, variant = 0) {
  const knowledgePoints = unitKnowledgePoints(chapter);
  const allKnowledgePointIds = knowledgePoints.map((item) => item.id);
  const primaryPoints = unitPrimaryKnowledgePoints(chapter);
  const questionSlots = primaryPoints.flatMap((primary, primaryIndex) =>
    [0, 1].map((occurrence) => {
      const sequence = primaryIndex * 2 + occurrence;
      const matrixCell =
        UNIT_MATRIX_CELLS[(sequence + variant) % UNIT_MATRIX_CELLS.length];

      // 主知识点数量不唯一：允许单个，大部分为多个主知识点
      let primaryKnowledgePointIds = [primary.id];
      if (sequence % 3 !== 0 && allKnowledgePointIds.length > 1) {
        const nextIdx =
          (allKnowledgePointIds.indexOf(primary.id) + 1 + (sequence % 2)) %
          allKnowledgePointIds.length;
        const otherPrimaryId = allKnowledgePointIds[nextIdx];
        if (otherPrimaryId && otherPrimaryId !== primary.id) {
          primaryKnowledgePointIds = [primary.id, otherPrimaryId];
        }
      } else if (sequence % 4 === 2 && allKnowledgePointIds.length > 2) {
        const p2 =
          allKnowledgePointIds[
            (allKnowledgePointIds.indexOf(primary.id) + 1) %
              allKnowledgePointIds.length
          ];
        const p3 =
          allKnowledgePointIds[
            (allKnowledgePointIds.indexOf(primary.id) + 2) %
              allKnowledgePointIds.length
          ];
        primaryKnowledgePointIds = [
          ...new Set([primary.id, p2, p3].filter(Boolean)),
        ];
      }

      const localSecondaryIds = primary.sectionKnowledgePointIds.filter(
        (id) => !primaryKnowledgePointIds.includes(id),
      );
      const remainingKnowledgePointIds = allKnowledgePointIds.filter(
        (id) => !primaryKnowledgePointIds.includes(id),
      );
      const secondaryKnowledgePointIds = [
        ...new Set(
          localSecondaryIds.length > 0
            ? localSecondaryIds
            : remainingKnowledgePointIds.length > 0
              ? [
                  remainingKnowledgePointIds[
                    (occurrence + variant) % remainingKnowledgePointIds.length
                  ],
                ]
              : [],
        ),
      ];

      return {
        id: `${chapter.id}:unit:${primary.id}:${occurrence + 1}`,
        matrixCellId: matrixCell.matrixCellId,
        primaryKnowledgePointIds,
        primaryKnowledgePointId: primary.id,
        secondaryKnowledgePointIds,
        knowledgePointIds: [
          ...new Set([
            ...primaryKnowledgePointIds,
            ...secondaryKnowledgePointIds,
          ]),
        ],
        questionType:
          QUESTION_TYPES[(sequence + variant) % QUESTION_TYPES.length],
        difficulty: DIFFICULTIES[(sequence + variant) % DIFFICULTIES.length],
      };
    }),
  );
  return {
    id: `${chapter?.id || "unit"}:assessment-content`,
    chapterId: String(chapter?.id || ""),
    chapterTitle: String(chapter?.title || ""),
    knowledgePoints,
    matrixCells: UNIT_MATRIX_CELLS.map((item) => ({ ...item })),
    matrix: {
      assessmentPolicyId: "math-assessment-matrix-v1",
      policyVersion: "math-assessment-matrix-v1",
      scopeId: String(chapter?.id || "unit"),
      knowledgePointId: String(chapter?.id || "unit"),
      knowledgePointIds: allKnowledgePointIds,
      targetStatement: `全面考查${chapter?.title || "本单元"}的核心数学概念理解、多步程序推理与综合建模能力，达成90%掌握率要求。`,
      rationale:
        "单元认知评估矩阵跨课时覆盖核心表征、计算与推理、情境建模与探究迁移，作为单元综合测试插槽生成基准。",
      reviewStatus: "APPROVED",
      generationSource: "AI_GENERATED",
      cells: UNIT_MATRIX_CELLS.map((item) => ({ ...item })),
    },
    questionSlots,
    requiredMastery: 90,
    requiredCoverage: 100,
    minimumQuestionsPerPrimaryKnowledgePoint: 2,
  };
}
