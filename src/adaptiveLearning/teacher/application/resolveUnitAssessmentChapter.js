import { findChapterById } from "../../shared/domain/courseCatalog";
import { readCachedCurriculumChapter } from "../data/curriculumCatalogRepository";

/**
 * 以课程与章节复合身份恢复单元目录对象；路由 state 仅作为同身份的快速来源。
 * @param {object} input 查询输入
 * @param {string} input.courseId 课程 ID
 * @param {string} input.chapterId 章节 ID
 * @param {object|null} input.routedChapter 路由携带的章节快照
 * @returns {object|null} 唯一章节目录合同
 */
export function resolveUnitAssessmentChapter({
  courseId,
  chapterId,
  routedChapter,
}) {
  const routedMatches =
    String(routedChapter?.id) === String(chapterId) &&
    String(routedChapter?.course?.id) === String(courseId);
  if (routedMatches) return routedChapter;
  return (
    readCachedCurriculumChapter(chapterId, courseId) ||
    findChapterById(chapterId, courseId)
  );
}
