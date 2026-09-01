/** @jest-environment node */

import { buildStartClassLaunch } from "./startClassLaunch";
import { START_CLASS_ISSUES } from "./startClassIssue";

describe("start class launch", () => {
  test("keeps a single real class and only its selected students", () => {
    const payload = buildStartClassLaunch({
      teachingCourse: {
        courseId: "2155",
        courseName: "七年级数学",
        subjectId: "2",
        semesterId: "165",
        semesterName: "第一学期",
      },
      activeClass: {
        classId: "class-1",
        className: "七年级 1 班",
        students: [
          { studentId: "student-1", studentName: "林同学" },
          { studentId: "student-2", studentName: "周同学" },
        ],
      },
      selectedStudentIds: new Set(["student-2", "other-class-student"]),
      content: {
        contentVersionId: "version-1",
        sourceLessonIds: ["lesson-1", "lesson-2"],
        title: "跨章课堂",
      },
      classDate: "2026-08-31",
      classTime: "08:30",
    });
    expect(payload).toEqual(
      expect.objectContaining({
        teachingCourse: expect.objectContaining({
          courseId: "2155",
          semesterId: "165",
        }),
        linkedLessonContent: expect.objectContaining({
          contentVersionId: "version-1",
          lessonIds: ["lesson-1", "lesson-2"],
        }),
        rosterSelection: expect.objectContaining({
          classId: "class-1",
          className: "七年级 1 班",
          students: [{ studentId: "student-2", studentName: "周同学" }],
        }),
      }),
    );
  });

  test("requires a selected student in the active class", () => {
    expect(() =>
      buildStartClassLaunch({
        teachingCourse: { courseId: "2155", semesterId: "165" },
        activeClass: { classId: "class-1", students: [] },
        selectedStudentIds: new Set(),
        content: {
          contentVersionId: "version-1",
          sourceLessonIds: ["lesson-1"],
        },
        classDate: "2026-08-31",
        classTime: "08:30",
      }),
    ).toThrow(START_CLASS_ISSUES.SELECT_STUDENTS);
  });

  test("keeps course selection separate from the required linked lessons", () => {
    expect(() =>
      buildStartClassLaunch({
        teachingCourse: { courseId: "2155", semesterId: "165" },
        activeClass: {
          classId: "class-1",
          students: [{ studentId: "student-1", studentName: "林同学" }],
        },
        selectedStudentIds: new Set(["student-1"]),
        content: { contentVersionId: "version-1", sourceLessonIds: [] },
        classDate: "2026-08-31",
        classTime: "08:30",
      }),
    ).toThrow(START_CLASS_ISSUES.SELECT_LESSONS);
  });
});
