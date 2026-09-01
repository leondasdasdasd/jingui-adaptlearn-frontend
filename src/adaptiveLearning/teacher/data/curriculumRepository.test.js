/** @jest-environment node */

import { getPublishedLessonVersions } from "../../shared/infrastructure/classroomApi";
import { fetchPublishedLessonVersions } from "./curriculumRepository";

jest.mock("../../shared/infrastructure/classroomApi", () => ({
  getPublishedLessonVersions: jest.fn(),
}));

describe("curriculum repository", () => {
  test("maps published-version DTOs and drops records without identifiers", async () => {
    getPublishedLessonVersions.mockResolvedValue([
      {
        textbookLessonId: "lesson-1",
        id: "version-1",
        versionNumber: "2",
        publishedAt: "2026-08-31T08:00:00Z",
      },
      { id: "missing-lesson" },
    ]);

    await expect(fetchPublishedLessonVersions(["lesson-1"])).resolves.toEqual([
      {
        lessonId: "lesson-1",
        versionId: "version-1",
        versionNumber: 2,
        publishedAt: "2026-08-31T08:00:00Z",
      },
    ]);
  });
});
