/**
 * 将普通 patch 或原子函数式 patch 应用到教师草稿，并统一失效旧质检结果。
 * @param {object} currentLesson 当前课时草稿
 * @param {object|((lesson: object) => object)} patchOrUpdater 草稿变更
 * @param {string} updatedAt 更新时间
 * @returns {object} 下一份教师草稿
 */
export function applyTeacherDraftMutation(
  currentLesson,
  patchOrUpdater,
  updatedAt = new Date().toISOString(),
) {
  const patch =
    typeof patchOrUpdater === "function"
      ? patchOrUpdater(currentLesson)
      : patchOrUpdater;
  return {
    ...currentLesson,
    ...patch,
    qualityReport: null,
    inspectionStatus: null,
    status: "draft",
    updatedAt,
  };
}
