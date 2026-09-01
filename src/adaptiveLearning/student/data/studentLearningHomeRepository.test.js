/** @jest-environment node */

import { getStudentLearningHome } from "../../shared/infrastructure/classroomApi";
import { fetchStudentLearningHome } from "./studentLearningHomeRepository";

jest.mock("../../shared/infrastructure/classroomApi", () => ({
  getStudentLearningHome: jest.fn(),
}));

describe("student learning home repository", () => {
  beforeEach(() => jest.clearAllMocks());

  test("loads the authoritative home with the stored classroom credential", async () => {
    const profile = { student: { id: "student-1" }, periods: [] };
    getStudentLearningHome.mockResolvedValue(profile);

    await expect(fetchStudentLearningHome("token-1")).resolves.toBe(profile);
    expect(getStudentLearningHome).toHaveBeenCalledWith("", "token-1", {
      cache: "no-store",
    });
  });

  test("maps a missing live view to the no-classroom state", async () => {
    getStudentLearningHome.mockRejectedValue(
      Object.assign(new Error("not found"), { status: 404 }),
    );
    await expect(fetchStudentLearningHome("token-1")).rejects.toMatchObject({
      code: "NO_CLASSROOM",
    });
  });
});
