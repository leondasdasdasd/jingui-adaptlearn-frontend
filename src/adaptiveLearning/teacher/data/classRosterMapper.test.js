/** @jest-environment node */

import {
  classRosterCredentialFromApi,
  classRosterFromApi,
} from "./classRosterMapper";

describe("class roster mapper", () => {
  test("merges detail credentials with the authoritative student overview", () => {
    expect(
      classRosterFromApi(
        {
          classInfo: {
            id: "class-1",
            name: "七年级一班",
            students: [
              {
                id: "student-1",
                accessCredential: {
                  status: "ACTIVE",
                  accessToken: "token-1",
                },
              },
            ],
          },
        },
        {
          items: [
            {
              studentId: "student-1",
              studentName: "林同学",
              rosterNumber: 3,
              activity: { sessionCount: 2, answerCount: 9 },
            },
          ],
        },
      ),
    ).toEqual({
      classInfo: { classId: "class-1", className: "七年级一班" },
      students: [
        {
          studentId: "student-1",
          studentName: "林同学",
          rosterNumber: 3,
          credential: {
            status: "ACTIVE",
            accessToken: "token-1",
            updatedAt: "",
          },
          activity: {
            sessionCount: 2,
            answerCount: 9,
            lastActiveAt: "",
          },
        },
      ],
    });
  });

  test("keeps missing activity evidence null and drops students without ids", () => {
    const view = classRosterFromApi(
      { class: { classId: "class-1" } },
      { students: [{ name: "无编号学生" }, { id: "student-1" }] },
    );
    expect(view.students).toEqual([
      expect.objectContaining({
        studentId: "student-1",
        activity: {
          sessionCount: null,
          answerCount: null,
          lastActiveAt: "",
        },
      }),
    ]);
  });

  test("normalizes credential response envelopes", () => {
    expect(
      classRosterCredentialFromApi({
        credential: { status: "ACTIVE", accessToken: "next-token" },
      }),
    ).toEqual({
      status: "ACTIVE",
      accessToken: "next-token",
      updatedAt: "",
    });
  });
});
