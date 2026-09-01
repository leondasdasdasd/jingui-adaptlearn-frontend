/** @jest-environment node */

import {
  mapPlatformCourseRoster,
  mapPlatformCourses,
  mapPlatformSubjects,
} from "./platformTeachingDirectoryMapper";

describe("platform teaching directory mapper", () => {
  test("maps system subjects and courses without leaking transport records", () => {
    expect(
      mapPlatformSubjects({ content: [{ id: 14, name: "Math" }] }),
    ).toEqual([{ subjectId: "14", subjectName: "Math" }]);
    expect(
      mapPlatformCourses({
        content: [{ courseId: 4, courseName: "Standard Math G7" }],
      }),
    ).toEqual([
      { courseId: "4", courseName: "Standard Math G7", subjectId: "" },
    ]);
  });

  test("maps real course groups and keeps every student under its class", () => {
    expect(
      mapPlatformCourseRoster({
        content: [
          {
            groupCourseId: 7651,
            studentGroupName: "G7 C1",
            groupCourseStudentNumbers: 2,
            internalTransportFlag: true,
            studentList: [
              { id: 101, name: "林同学", englishName: "lin101" },
              { id: 102, name: "周同学", studentNo: "2026102" },
            ],
          },
        ],
      }),
    ).toEqual([
      {
        classId: "7651",
        className: "G7 C1",
        studentCount: 2,
        students: [
          expect.objectContaining({
            studentId: "101",
            studentName: "林同学",
            studentCode: "lin101",
            classId: "7651",
          }),
          expect.objectContaining({
            studentId: "102",
            studentName: "周同学",
            studentCode: "2026102",
            classId: "7651",
          }),
        ],
      },
    ]);
  });

  test("drops records without authoritative identifiers and never invents roster data", () => {
    expect(mapPlatformSubjects({ content: [{ name: "无编号学科" }] })).toEqual(
      [],
    );
    expect(
      mapPlatformCourseRoster({
        content: [{ studentGroupName: "无编号班级", studentList: [{}] }],
      }),
    ).toEqual([]);
  });

  test("keeps missing names empty for the presentation layer to localize", () => {
    expect(mapPlatformSubjects({ content: [{ id: 14 }] })).toEqual([
      { subjectId: "14", subjectName: "" },
    ]);
    expect(
      mapPlatformCourseRoster({
        content: [{ groupCourseId: 7651, studentList: [{ id: 101 }] }],
      }),
    ).toEqual([
      expect.objectContaining({
        className: "",
        students: [expect.objectContaining({ studentName: "" })],
      }),
    ]);
  });
});
