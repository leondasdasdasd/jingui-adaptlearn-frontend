import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import {
  fetchPlatformCourseRoster,
  fetchPlatformCourses,
  fetchPlatformCurrentSemester,
  fetchPlatformSubjects,
} from "../data/platformTeachingDirectoryRepository";
import { usePlatformTeachingDirectory } from "./usePlatformTeachingDirectory";

jest.mock("../data/platformTeachingDirectoryRepository", () => ({
  fetchPlatformCourseRoster: jest.fn(),
  fetchPlatformCourses: jest.fn(),
  fetchPlatformCurrentSemester: jest.fn(),
  fetchPlatformSubjects: jest.fn(),
}));

function DirectoryProbe({ onRender }) {
  onRender(usePlatformTeachingDirectory(true));
  return null;
}

describe("usePlatformTeachingDirectory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchPlatformSubjects.mockResolvedValue([
      { subjectId: "14", subjectName: "数学" },
    ]);
    fetchPlatformCurrentSemester.mockResolvedValue({
      semesterId: "165",
      semesterName: "Year 2025Semester 2",
    });
    fetchPlatformCourses.mockResolvedValue([
      { courseId: "2155", courseName: "数学 G7", subjectId: "14" },
    ]);
    fetchPlatformCourseRoster.mockResolvedValue([
      { classId: "7651", className: "七年级 1 班", students: [] },
    ]);
  });

  it("finishes loading after subject selection triggers the course cascade", async () => {
    let latestDirectory;

    await act(async () => {
      TestRenderer.create(
        <DirectoryProbe
          onRender={(directory) => {
            latestDirectory = directory;
          }}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchPlatformCourses).toHaveBeenCalledWith("14", "165");
    expect(fetchPlatformCourseRoster).toHaveBeenCalledWith("2155", "165");
    expect(latestDirectory.loading).toBe(false);
    expect(latestDirectory.classes).toHaveLength(1);
  });
});
