const QUESTION_TYPES = Object.freeze([
  "multiple_choice",
  "short_answer",
  "ordering",
  "matching",
]);
const DIFFICULTIES = Object.freeze(["D2", "D3", "D3", "D4"]);
const UNIT_MATRIX_CELLS = Object.freeze([
  { matrixCellId: "unit:CR:B", matrixCellCode: "CR · B" },
  { matrixCellId: "unit:PJ:C", matrixCellCode: "PJ · C" },
  { matrixCellId: "unit:M:C", matrixCellCode: "M · C" },
  { matrixCellId: "unit:CR:D", matrixCellCode: "CR · D" },
]);

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
      const localSecondaryIds = primary.sectionKnowledgePointIds.filter(
        (id, index) => id !== primary.id && index % 2 === occurrence,
      );
      const fallbackSecondaryId =
        allKnowledgePointIds[
          (allKnowledgePointIds.indexOf(primary.id) +
            occurrence +
            1 +
            variant) %
            allKnowledgePointIds.length
        ];
      const secondaryKnowledgePointIds = [
        ...new Set(
          localSecondaryIds.length > 0
            ? localSecondaryIds
            : [fallbackSecondaryId].filter((id) => id && id !== primary.id),
        ),
      ];
      const sequence = primaryIndex * 2 + occurrence;
      const matrixCell =
        UNIT_MATRIX_CELLS[(sequence + variant) % UNIT_MATRIX_CELLS.length];
      return {
        id: `${chapter.id}:unit:${primary.id}:${occurrence + 1}`,
        matrixCellId: matrixCell.matrixCellId,
        primaryKnowledgePointId: primary.id,
        secondaryKnowledgePointIds,
        questionType:
          QUESTION_TYPES[(sequence + variant) % QUESTION_TYPES.length],
        difficulty: DIFFICULTIES[(sequence + variant) % DIFFICULTIES.length],
      };
    }),
  );
  return {
    id: `${chapter?.id || "unit"}:assessment-content`,
    chapterId: String(chapter?.id || ""),
    knowledgePoints,
    matrixCells: UNIT_MATRIX_CELLS.map((item) => ({ ...item })),
    questionSlots,
    requiredMastery: 90,
    requiredCoverage: 100,
    minimumQuestionsPerPrimaryKnowledgePoint: 2,
  };
}
