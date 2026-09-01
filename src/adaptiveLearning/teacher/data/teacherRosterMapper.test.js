/** @jest-environment node */

import {
  mapTeacherClasses,
  mapTeacherClassStudents,
} from "./teacherRosterMapper";

describe("teacher roster mapper", () => {
  test("keeps an empty service response empty", () => {
    expect(mapTeacherClasses({ classes: [] })).toEqual([]);
    expect(
      mapTeacherClassStudents({ students: [] }, { classId: "c1" }),
    ).toEqual([]);
  });

  test("drops records without authoritative identifiers", () => {
    expect(
      mapTeacherClasses({ classes: [{ className: "无编号班级" }] }),
    ).toEqual([]);
    expect(
      mapTeacherClassStudents(
        { students: [{ studentName: "无编号学生" }] },
        { classId: "c1", className: "一班" },
      ),
    ).toEqual([]);
  });

  test("maps real service identifiers without generating students", () => {
    const classroom = mapTeacherClasses({
      classes: [{ id: "c1", name: "七年级一班", studentCount: 1 }],
    })[0];
    expect(
      mapTeacherClassStudents(
        { students: [{ id: "s1", name: "林同学", code: "2025001" }] },
        classroom,
      ),
    ).toEqual([
      expect.objectContaining({
        studentId: "s1",
        studentName: "林同学",
        studentCode: "2025001",
        classId: "c1",
      }),
    ]);
  });
});
