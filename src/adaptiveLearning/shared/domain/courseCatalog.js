import { ALL_PHYSICS_COURSES } from "./courseCatalog/physicsCourses.js";
import {
  bnupGrade7Up,
  ecnuGrade7Up,
  pepGrade7Up,
  sukehGrade7Up,
} from "./courseCatalog/publisherCourses.js";
import { ALL_SCIENCE_COURSES } from "./courseCatalog/scienceCourses.js";
import { zhejiangGrade7Up } from "./courseCatalog/zhejiangGrade7Up.js";
import {
  zhejiangGrade7Down,
  zhejiangGrade8Up,
} from "./courseCatalog/zhejiangLowerCourses.js";
import {
  zhejiangGrade8Down,
  zhejiangGrade9Down,
  zhejiangGrade9Up,
} from "./courseCatalog/zhejiangUpperCourses.js";

export {
  AVAILABLE_GRADES,
  AVAILABLE_PUBLISHERS,
  AVAILABLE_SUBJECTS,
} from "./courseCatalog/metadata.js";

export const ALL_COURSES = [
  zhejiangGrade7Up,
  zhejiangGrade7Down,
  zhejiangGrade8Up,
  zhejiangGrade8Down,
  zhejiangGrade9Up,
  zhejiangGrade9Down,
  pepGrade7Up,
  bnupGrade7Up,
  sukehGrade7Up,
  ecnuGrade7Up,
  ...ALL_SCIENCE_COURSES,
  ...ALL_PHYSICS_COURSES,
];

// 默认标准课程 (浙教版 七年级上册)
export const course = zhejiangGrade7Up;

/**
 * 根据学科、年级、教材版本查询对应的教材课程
 * @param root0
 * @param root0.subject
 * @param root0.grade
 * @param root0.publisher
 */
export function findCourse({
  subject = "数学",
  grade = "七年级上册",
  publisher = "浙教版",
}) {
  // Exact match
  const matched = ALL_COURSES.find(
    (item) =>
      (item.subject === subject || item.subject.includes(subject)) &&
      (item.grade === grade || item.gradeKey === grade) &&
      (item.publisher === publisher || item.publisherKey === publisher),
  );
  if (matched) return matched;

  // Fallback by publisher & subject
  const publisherMatched = ALL_COURSES.find(
    (item) =>
      (item.publisher === publisher || item.publisherKey === publisher) &&
      (item.subject === subject || item.subject.includes(subject)),
  );
  if (publisherMatched) return publisherMatched;

  // Fallback by grade & subject
  const gradeMatched = ALL_COURSES.find(
    (item) =>
      (item.grade === grade || item.gradeKey === grade) &&
      (item.subject === subject || item.subject.includes(subject)),
  );
  if (gradeMatched) return gradeMatched;

  // Fallback by subject
  const subjectMatched = ALL_COURSES.find(
    (item) => item.subject === subject || item.subject.includes(subject),
  );
  if (subjectMatched) return subjectMatched;

  return course;
}

/**
 * 根据课程 ID 获取课程
 * @param courseId
 */
export function getCourseById(courseId) {
  return ALL_COURSES.find((item) => item.id === courseId) || course;
}

/**
 * 全局查找指定章节，并补齐所属课程上下文。
 * 找不到时返回 null，避免单元测试页把错误章节静默替换成默认章节。
 * @param {string} chapterId 章节 ID
 * @param courseId
 * @returns {(object & {course: object})|null} 章节目录合同
 */
export function findChapterById(chapterId, courseId = "") {
  const courses = courseId
    ? ALL_COURSES.filter((item) => String(item.id) === String(courseId))
    : ALL_COURSES;
  for (const catalogCourse of courses) {
    const chapter = (catalogCourse.chapters || []).find(
      (item) => String(item.id) === String(chapterId),
    );
    if (chapter) return { ...chapter, course: catalogCourse };
  }
  return null;
}

/**
 * 将课时补齐为目录查询的统一返回形状。
 * @param lesson 原始课时
 * @param chapter 所属章节
 * @param catalogCourse 所属课程
 */
function lessonWithCatalogContext(lesson, chapter, catalogCourse) {
  return {
    ...lesson,
    chapter,
    course: catalogCourse,
    grade: lesson.grade || catalogCourse.grade,
    subject: lesson.subject || catalogCourse.subject,
    publisher: lesson.publisher || catalogCourse.publisher,
  };
}

/**
 * 全局查找指定课时及其所属章节和教材课程信息
 * @param lessonId
 */
export function findLessonById(lessonId) {
  for (const c of ALL_COURSES) {
    for (const chapter of c.chapters || []) {
      if (lessonId && lessonId.startsWith("unit-assessment-")) {
        const chapterId = lessonId.replace("unit-assessment-", "");
        if (chapter.id === chapterId) {
          const allKps = (chapter.sections || []).flatMap(
            (s) => s.knowledgePoints || [],
          );
          return lessonWithCatalogContext(
            {
              id: lessonId,
              title: `${chapter.title} · 单元测试`,
              index: "单元测试",
              knowledgePoints: allKps,
            },
            chapter,
            c,
          );
        }
      }
      for (const s of chapter.sections || []) {
        if (s.id === lessonId) {
          return lessonWithCatalogContext(s, chapter, c);
        }
      }
    }
  }
  return lessonWithCatalogContext(
    course.chapters[0].sections[0],
    course.chapters[0],
    course,
  );
}
