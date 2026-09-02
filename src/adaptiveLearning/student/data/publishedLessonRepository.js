import { getMockLessonContent } from "../../shared/domain/defaultLessonContent.js";

export async function loadPublishedLessonContent(lessonId) {
  return getMockLessonContent(lessonId);
}
