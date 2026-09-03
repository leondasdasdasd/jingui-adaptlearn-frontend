const DIFFICULTIES = Object.freeze(["D1", "D2", "D3", "D4", "D5"]);

/**
 *
 * @param slot
 * @param countEmptySlotsAsPlanned
 */
function questionCountForSlot(slot, countEmptySlotsAsPlanned) {
  if (slot.questionCount > 0) return slot.questionCount;
  return countEmptySlotsAsPlanned ? 1 : 0;
}

/**
 *
 * @param row
 * @param badge
 * @param slot
 * @param questionCount
 */
function addSlotCoverage(row, badge, slot, questionCount) {
  if (!row) return;
  if (badge.role === "primary") row.primaryQuestionCount += questionCount;
  else row.secondaryQuestionCount += questionCount;
  if (DIFFICULTIES.includes(slot.difficulty)) {
    row.difficultyCounts[slot.difficulty] += questionCount;
  }
}

/**
 * 从统一插槽视图统计知识点题目覆盖，不让查询器理解持久化或生成任务结构。
 * @param {object} input 统计输入
 * @param {object[]} input.knowledgePoints 当前综合或单元知识点
 * @param {object[]} input.slots 已投影插槽
 * @param {boolean} input.countEmptySlotsAsPlanned 是否把空插槽作为前端规划题计数
 * @returns {object[]} 知识点覆盖行
 */
export function projectAssessmentKnowledgeCoverage({
  knowledgePoints,
  slots,
  countEmptySlotsAsPlanned = false,
}) {
  const rows = new Map(
    knowledgePoints.map((item) => [
      String(item.id),
      {
        id: String(item.id),
        name: String(item.name),
        primaryQuestionCount: 0,
        secondaryQuestionCount: 0,
        difficultyCounts: Object.fromEntries(
          DIFFICULTIES.map((difficulty) => [difficulty, 0]),
        ),
      },
    ]),
  );
  for (const slot of slots) {
    const questionCount = questionCountForSlot(slot, countEmptySlotsAsPlanned);
    if (questionCount === 0) continue;
    for (const badge of slot.knowledgePointBadges) {
      addSlotCoverage(rows.get(String(badge.id)), badge, slot, questionCount);
    }
  }
  return [...rows.values()];
}
