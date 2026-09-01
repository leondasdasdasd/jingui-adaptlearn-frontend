/**
 * 计算课时内容状态；本地草稿优先于历史发布版本。
 * @param {object} content 教师课时内容
 * @returns {"published" | "unpublished" | "empty"} 稳定内容状态
 */
export function deriveCurriculumContentStatus(content = {}) {
  const hasDraftContent = [
    content.preQuestions?.length,
    content.postQuestions?.length,
    content.learningUnits?.length,
    content.learningContent?.composite,
    content.learningContent?.knowledgePoints?.length,
  ].some(Boolean);
  if (content.status === "draft" && hasDraftContent) return "unpublished";
  if (content.publishedVersionId || content.publishedSnapshot)
    return "published";
  return hasDraftContent ? "unpublished" : "empty";
}
