/** @vitest-environment node */

import {
  ALL_COURSES,
  course,
  findChapterById,
  findCourse,
  findLessonById,
  getCourseById,
} from "./courseCatalog";

describe("course catalog", () => {
  test("保留默认教材和多版本精确查询", () => {
    expect(course.id).toBe("zhejiang-grade7-math-volume1");
    expect(ALL_COURSES.length).toBeGreaterThanOrEqual(10);
    expect(
      findCourse({
        subject: "数学",
        grade: "grade7-up",
        publisher: "pep",
      }).id,
    ).toBe("pep-grade7-math-volume1");
    expect(
      findCourse({
        subject: "科学",
        grade: "七年级上册",
        publisher: "浙教版",
      }).id,
    ).toBe("zhejiang-grade7-science-volume1");
    expect(
      findCourse({
        subject: "物理",
        grade: "八年级上册",
        publisher: "人教版",
      }).id,
    ).toBe("pep-grade8-physics-volume1");
    expect(getCourseById("zhejiang-grade7-math-volume2").grade).toBe(
      "七年级下册",
    );
    expect(getCourseById("missing-course")).toBe(course);
  });

  test("课时查询补齐所属章节和课程上下文", () => {
    const lesson = findLessonById("section-1-2");

    expect(lesson.title).toBe("数轴");
    expect(lesson.chapter.id).toBe("chapter-1");
    expect(lesson.course).toBe(course);
    expect(lesson.grade).toBe("七年级上册");
  });

  test("章节查询只返回精确章节并补齐课程上下文", () => {
    const chapter = findChapterById("chapter-1", course.id);

    expect(chapter.title).toBe("有理数");
    expect(chapter.course).toBe(course);
    expect(findChapterById("missing-chapter")).toBeNull();
    expect(findChapterById("chapter-1", "missing-course")).toBeNull();
  });
});
