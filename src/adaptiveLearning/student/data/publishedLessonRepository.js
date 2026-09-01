import {
  getPublishedLessonVersion as getServerPublishedLessonVersion,
  getPublishedLessonVersions,
} from "../../shared/infrastructure/classroomApi.js";
import { getMockContentVersion } from "../../shared/domain/defaultLessonContent.js";
import { mapContentVersionToStudentLesson } from "../domain/publishedLessonMapper.js";

export { mapContentVersionToStudentLesson } from "../domain/publishedLessonMapper.js";

/**
 * 读取已发布的课时学习内容（支持离线/Mock回退）
 * @param {string} lessonId 课时 ID
 */
export async function loadPublishedLessonContent(lessonId) {
  try {
    const serverVersion = await getServerPublishedLessonVersion(lessonId);
    if (serverVersion) {
      return mapContentVersionToStudentLesson(serverVersion);
    }
  } catch (error) {
    // 离线/开发/测试环境无服务端时，回退到本地 Mock 数据
  }
  const mockVersion = getMockContentVersion(lessonId);
  return mockVersion ? mapContentVersionToStudentLesson(mockVersion) : null;
}

/**
 * 批量读取课时发布状态摘要（支持离线/Mock回退）
 * @param {string[]} lessonIds 课时 ID 列表
 */
export async function loadPublishedLessonContents(lessonIds) {
  try {
    const summaries = await getPublishedLessonVersions(lessonIds);
    if (Array.isArray(summaries) && summaries.length > 0) {
      return Object.fromEntries(
        summaries.map((summary) => [
          summary.textbookLessonId,
          {
            lessonId: summary.textbookLessonId,
            version: summary.versionNumber,
            versionId: summary.id,
            status: "published",
            publishedAt: summary.publishedAt,
          },
        ]),
      );
    }
  } catch (error) {
    // 回退到本地 Mock 状态
  }
  const now = new Date().toISOString();
  return Object.fromEntries(
    (lessonIds || []).map((id) => [
      id,
      {
        lessonId: id,
        version: 1,
        versionId: `mock-version-${id}`,
        status: "published",
        publishedAt: now,
      },
    ]),
  );
}
