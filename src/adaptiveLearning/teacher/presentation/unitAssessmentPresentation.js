/**
 * 目录组件只消费窄展示合同，不理解章节内部知识点结构。
 * @param {object} chapter 章节目录对象
 * @returns {object} 单元入口展示合同
 */
export function projectUnitAssessmentEntry(chapter) {
  const knowledgePointIds = new Set(
    (chapter.sections || []).flatMap((section) =>
      (section.knowledgePoints || []).map((item) => String(item.id)),
    ),
  );
  return {
    chapterId: String(chapter.id),
    lessonCount: chapter.sections?.length || 0,
    knowledgePointCount: knowledgePointIds.size,
  };
}

/**
 * 将单元矩阵与插槽合同显式投影为综合评估工作台和独立覆盖查询所需结构。
 * @param {object} content 单元测试内容合同
 * @returns {object} 单元评估展示合同
 */
export function projectUnitAssessmentContent(content) {
  const matrixCellById = new Map(
    (content.matrixCells || []).map((item) => [
      String(item.matrixCellId),
      item,
    ]),
  );
  const knowledgePoints = (content.knowledgePoints || []).map((item) => ({
    id: String(item.id),
    name: String(item.name),
  }));

  const rawMatrix = content.matrix || {
    assessmentPolicyId: "math-assessment-matrix-v1",
    policyVersion: "math-assessment-matrix-v1",
    scopeId: String(content.chapterId || "unit"),
    knowledgePointId: String(content.chapterId || "unit"),
    knowledgePointIds: knowledgePoints.map((kp) => kp.id),
    targetStatement: `全面考查${content.chapterTitle || "本单元"}的核心数学概念理解、多步程序推理与综合建模能力，达成90%掌握率要求。`,
    rationale:
      "单元认知评估矩阵跨课时覆盖核心表征、计算与推理、情境建模与探究迁移，作为单元综合测试插槽生成基准。",
    reviewStatus: "APPROVED",
    generationSource: "AI_GENERATED",
    cells: content.matrixCells || [],
  };

  const domainIds = new Set(["CR", "PJ", "M", "SF"]);
  const applicableCells = (rawMatrix.cells || [])
    .filter((cell) => domainIds.has(cell.domain))
    .map((cell) => ({
      cellId: cell.matrixCellId,
      assessmentPolicyId:
        rawMatrix.assessmentPolicyId || "math-assessment-matrix-v1",
      domain: cell.domain,
      level: cell.targetLevel,
      role: cell.role || "CORE",
      observableBehavior: cell.observableBehavior || "",
      evidenceCriteria: cell.evidenceCriteria || [],
      variationRequirements: cell.variationRequirements || [],
      commonMisconceptions: cell.commonMisconceptions || [],
      recommendedQuestionTypes: cell.recommendedQuestionTypes || [],
      requiredSlotCount: cell.minimumIndependentEvidence || 1,
      questions: [],
    }));

  const projectedMatrix = {
    assessmentPolicyId:
      rawMatrix.assessmentPolicyId || "math-assessment-matrix-v1",
    knowledgePointIds:
      rawMatrix.knowledgePointIds || knowledgePoints.map((kp) => kp.id),
    knowledgePointId:
      rawMatrix.knowledgePointId || String(content.chapterId || "unit"),
    targetStatement: rawMatrix.targetStatement,
    rationale: rawMatrix.rationale,
    reviewStatus: rawMatrix.reviewStatus || "APPROVED",
    generationSource: rawMatrix.generationSource || "AI_GENERATED",
    cells: applicableCells,
    applicableCellCount: applicableCells.length,
    coreCellCount: applicableCells.filter((c) => c.role === "CORE").length,
    evidenceSatisfiedCellCount: 0,
  };

  const questionSlots = (content.questionSlots || []).map((slot) => {
    const primaryKnowledgePointIds = Array.isArray(slot.primaryKnowledgePointIds)
      ? slot.primaryKnowledgePointIds.map(String)
      : slot.primaryKnowledgePointId
        ? [String(slot.primaryKnowledgePointId)]
        : [];
    const secondaryKnowledgePointIds = Array.isArray(
      slot.secondaryKnowledgePointIds,
    )
      ? slot.secondaryKnowledgePointIds.map(String)
      : [];
    const knowledgePointIds = Array.isArray(slot.knowledgePointIds)
      ? slot.knowledgePointIds.map(String)
      : [
          ...new Set([
            ...primaryKnowledgePointIds,
            ...secondaryKnowledgePointIds,
          ]),
        ];

    return {
      id: String(slot.id),
      matrixCellId: String(slot.matrixCellId),
      matrixCode:
        matrixCellById.get(String(slot.matrixCellId))?.matrixCellCode ||
        slot.matrixCellCode ||
        "-",
      knowledgePointIds,
      primaryKnowledgePointIds,
      primaryKnowledgePointId:
        primaryKnowledgePointIds[0] ||
        String(slot.primaryKnowledgePointId || ""),
      secondaryKnowledgePointIds,
      questionType: String(slot.questionType),
      difficulty: String(slot.difficulty),
      questions: slot.questions || [],
    };
  });

  return {
    chapterId: String(content.chapterId || ""),
    chapterTitle: String(content.chapterTitle || ""),
    knowledgePointCount: knowledgePoints.length,
    plannedQuestionCount: questionSlots.length,
    knowledgePoints,
    assessment: {
      scopeId: String(content.chapterId || "unit"),
      hasMatrix: (content.matrixCells || []).length > 0,
      matrix: projectedMatrix,
      isGeneratingMatrix: false,
      isBusy: false,
      slots: questionSlots,
      questionSlots,
      slotGeneration: {
        states: [],
        isPlanning: false,
        isRunning: false,
        canRetry: false,
      },
      unassignedQuestions: [],
    },
  };
}
