/** @jest-environment node */

import {
  ALL_COURSES,
  course,
  findCourse,
  findLessonById,
  getCourseById,
} from "./courseCatalog";

describe("course catalog", () => {
  test("保留默认教材和多版本精确查询", () => {
    expect(course.id).toBe("zhejiang-grade7-math-volume1");
    expect(ALL_COURSES).toHaveLength(10);
    expect(
      findCourse({
        subject: "数学",
        grade: "grade7-up",
        publisher: "pep",
      }).id,
    ).toBe("pep-grade7-math-volume1");
    expect(getCourseById("missing-course")).toBe(course);
  });

  test("课时查询补齐所属章节和课程上下文", () => {
    const lesson = findLessonById("section-1-2");

    expect(lesson.title).toBe("数轴");
    expect(lesson.chapter.id).toBe("chapter-1");
    expect(lesson.course).toBe(course);
    expect(lesson.grade).toBe("七年级上册");
  });
});
