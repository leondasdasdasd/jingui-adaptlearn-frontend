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
    content.matrixCells.map((item) => [String(item.matrixCellId), item]),
  );
  const knowledgePoints = content.knowledgePoints.map((item) => ({
    id: String(item.id),
    name: String(item.name),
  }));
  return {
    knowledgePointCount: knowledgePoints.length,
    plannedQuestionCount: content.questionSlots.length,
    knowledgePoints,
    assessment: {
      hasMatrix: content.matrixCells.length > 0,
      questionSlots: content.questionSlots.map((slot) => ({
        id: String(slot.id),
        matrixCellId: String(slot.matrixCellId),
        matrixCode:
          matrixCellById.get(String(slot.matrixCellId))?.matrixCellCode || "-",
        knowledgePointIds: [
          String(slot.primaryKnowledgePointId),
          ...slot.secondaryKnowledgePointIds.map(String),
        ],
        primaryKnowledgePointId: String(slot.primaryKnowledgePointId),
        secondaryKnowledgePointIds: slot.secondaryKnowledgePointIds.map(String),
        questionType: String(slot.questionType),
        difficulty: String(slot.difficulty),
        questions: [],
      })),
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
