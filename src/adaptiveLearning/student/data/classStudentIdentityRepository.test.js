/** @jest-environment node */

import { getClassStudentIdentity } from "../../shared/infrastructure/classroomApi";
import { classStudentIdentityIssues } from "../domain/classStudentIdentity";
import { fetchClassStudentIdentity } from "./classStudentIdentityRepository";

jest.mock("../../shared/infrastructure/classroomApi", () => ({
  getClassStudentIdentity: jest.fn(),
}));

describe("class student identity repository", () => {
  test("maps the transport payload to a stable identity", async () => {
    getClassStudentIdentity.mockResolvedValue({
      class: { id: "class-1", name: "一班" },
      student: { id: "student-1", name: "林同学" },
    });
    await expect(
      fetchClassStudentIdentity("token-1", "student-1"),
    ).resolves.toEqual({
      accessToken: "token-1",
      classId: "class-1",
      className: "一班",
      studentId: "student-1",
      studentName: "林同学",
    });
  });

  test("hides transport errors and reports identity mismatches by stable code", async () => {
    getClassStudentIdentity.mockRejectedValueOnce(new Error("private response"));
    await expect(fetchClassStudentIdentity("token-1", "student-1")).rejects.toMatchObject(
      { code: classStudentIdentityIssues.unavailable },
    );

    getClassStudentIdentity.mockResolvedValueOnce({ student: { id: "student-2" } });
    await expect(fetchClassStudentIdentity("token-1", "student-1")).rejects.toMatchObject(
      { code: classStudentIdentityIssues.mismatch },
    );
  });

  test("preserves request cancellation semantics", async () => {
    const controller = new AbortController();
    controller.abort();
    getClassStudentIdentity.mockRejectedValueOnce(new Error("transport stopped"));

    await expect(
      fetchClassStudentIdentity("token-1", "student-1", {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
