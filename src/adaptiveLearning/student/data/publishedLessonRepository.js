import {
  getPublishedLessonVersion as getServerPublishedLessonVersion,
  getPublishedLessonVersions,
} from "../../shared/infrastructure/classroomApi.js";
import { mapContentVersionToStudentLesson } from "../domain/publishedLessonMapper.js";

export { mapContentVersionToStudentLesson } from "../domain/publishedLessonMapper.js";

/**
 *
 * @param lessonId
 */
export async function loadPublishedLessonContent(lessonId) {
  try {
    return mapContentVersionToStudentLesson(
      await getServerPublishedLessonVersion(lessonId),
    );
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 *
 * @param lessonIds
 */
export async function loadPublishedLessonContents(lessonIds) {
  const summaries = await getPublishedLessonVersions(lessonIds);
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
