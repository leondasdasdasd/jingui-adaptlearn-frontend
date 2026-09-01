/** @jest-environment node */

import { requestStudentAccountSession } from "./studentAccountSessionApi";
import {
  fetchStudentAccountSession,
  studentAccountLoginUrl,
  studentAccountSessionIssues,
  studentIdentityFromAccountSession,
} from "./studentAccountSessionRepository";

jest.mock("./studentAccountSessionApi", () => ({
  requestStudentAccountSession: jest.fn(),
}));

describe("student account session repository", () => {
  beforeEach(() => jest.clearAllMocks());

  test("normalizes the BFF session to the existing classroom identity", () => {
    expect(
      studentIdentityFromAccountSession({
        accessToken: "classroom-token",
        student: { id: 1001, name: "林同学" },
        class: { id: 701, name: "七年级 1 班" },
        learningPeriod: { id: "period-1", status: "PUBLISHED" },
      }),
    ).toEqual({
      accessToken: "classroom-token",
      classId: "701",
      className: "七年级 1 班",
      studentId: "1001",
      studentName: "林同学",
    });
  });

  test("reports a valid student without an active class as no classroom", () => {
    expect(() =>
      studentIdentityFromAccountSession({
        accessToken: "classroom-token",
        identity: { studentId: "1001", studentName: "林同学" },
      }),
    ).toThrow(expect.objectContaining({ code: "NO_CLASSROOM" }));
  });

  test.each([
    [401, studentAccountSessionIssues.loginRequired],
    [403, studentAccountSessionIssues.accessDenied],
    [404, studentAccountSessionIssues.noClassroom],
    [503, studentAccountSessionIssues.unavailable],
  ])("maps HTTP %s to %s", async (status, code) => {
    requestStudentAccountSession.mockRejectedValue(
      Object.assign(new Error("transport failure"), { status }),
    );
    await expect(fetchStudentAccountSession()).rejects.toMatchObject({ code });
  });

  test("accepts same-origin login paths and rejects executable URLs", () => {
    const location = { origin: "https://quiz.example.test" };
    expect(studentAccountLoginUrl("/login", location)).toBe(
      "https://quiz.example.test/login",
    );
    expect(studentAccountLoginUrl("javascript:alert(1)", location)).toBe("");
  });
});
