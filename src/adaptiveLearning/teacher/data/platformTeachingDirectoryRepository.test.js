/** @jest-environment node */

import { queryExamOptions, querySubjectList } from "../../../services/example";
import {
  getCourseList,
  queryCourseStudents,
} from "../../../services/publishToStudent";
import {
  fetchPlatformCourseRoster,
  fetchPlatformCourses,
  fetchPlatformCurrentSemester,
  fetchPlatformSubjects,
} from "./platformTeachingDirectoryRepository";
import { loginRedirect } from "../../../utils/utils";

jest.mock("../../../services/example", () => ({
  queryExamOptions: jest.fn(),
  querySubjectList: jest.fn(),
}));
jest.mock("../../../services/publishToStudent", () => ({
  getCourseList: jest.fn(),
  queryCourseStudents: jest.fn(),
}));
jest.mock("../../../utils/utils", () => ({ loginRedirect: jest.fn() }));

describe("platform teaching directory repository", () => {
  beforeEach(() => jest.clearAllMocks());

  test("loads subjects and assigned courses through existing platform services", async () => {
    querySubjectList.mockResolvedValue({
      ifLogin: true,
      status: true,
      content: [{ id: 14, name: "Math" }],
    });
    getCourseList.mockResolvedValue({
      ifLogin: true,
      status: true,
      content: [{ courseId: 4, courseName: "Standard Math G7" }],
    });

    await expect(fetchPlatformSubjects()).resolves.toEqual([
      { subjectId: "14", subjectName: "Math" },
    ]);
    expect(querySubjectList).toHaveBeenCalledWith();
    await expect(fetchPlatformCourses("14", "165")).resolves.toEqual([
      { courseId: "4", courseName: "Standard Math G7", subjectId: "" },
    ]);
    expect(getCourseList).toHaveBeenCalledWith({
      subjectId: "14",
      semesterId: "165",
      ifQueryHistory: false,
    });
  });

  test("loads the current semester and never falls back to school-wide courses", async () => {
    queryExamOptions.mockResolvedValue({
      ifLogin: true,
      status: true,
      content: [
        { semesterId: 164, semesterName: "2025-S1", current: false },
        { semesterId: 165, semesterName: "2025-S2", current: true },
      ],
    });
    await expect(fetchPlatformCurrentSemester()).resolves.toEqual({
      semesterId: "165",
      semesterName: "2025-S2",
    });
  });

  test("loads the selected course roster and preserves login failures", async () => {
    queryCourseStudents.mockResolvedValueOnce({
      ifLogin: true,
      status: true,
      content: [
        {
          groupCourseId: 7651,
          studentGroupName: "G7 C1",
          studentList: [{ id: 101, name: "林同学" }],
        },
      ],
    });
    await expect(fetchPlatformCourseRoster("4", "165")).resolves.toEqual([
      expect.objectContaining({ classId: "7651", className: "G7 C1" }),
    ]);
    expect(queryCourseStudents).toHaveBeenCalledWith({
      courseId: "4",
      semesterId: "165",
    });

    queryCourseStudents.mockResolvedValueOnce({ ifLogin: false });
    await expect(fetchPlatformCourseRoster("4", "165")).rejects.toMatchObject({
      code: "PLATFORM_LOGIN_REQUIRED",
    });
    expect(loginRedirect).toHaveBeenCalledTimes(1);
  });
});
