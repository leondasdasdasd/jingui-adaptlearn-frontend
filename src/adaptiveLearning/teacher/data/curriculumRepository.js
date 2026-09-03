import { getPublishedLessonVersions } from "../../shared/infrastructure/classroomApi";

/**
 * @param {object} version 发布版本接口记录
 * @returns {object} 稳定发布版本模型
 */
function publishedVersionFromApi(version) {
  return {
    lessonId: String(version?.textbookLessonId || version?.lessonId || ""),
    versionId: String(version?.id || version?.versionId || ""),
    versionNumber: Number(version?.versionNumber) || null,
    publishedAt: version?.publishedAt || "",
  };
}

/**
 * 获取课时发布版本并在 repository 边界转换为稳定模型。
 * @param {Array<string>} lessonIds 课时标识
 * @param {RequestInit} options 请求选项
 * @returns {Promise<Array<object>>} 稳定发布版本列表
 */
export async function fetchPublishedLessonVersions(lessonIds, options = {}) {
  const payload = await getPublishedLessonVersions(lessonIds, options);
  return (Array.isArray(payload) ? payload : [])
    .map((version) => publishedVersionFromApi(version))
    .filter((version) => version.lessonId && version.versionId);
}
