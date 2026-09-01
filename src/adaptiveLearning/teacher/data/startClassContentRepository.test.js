/** @jest-environment node */

import {
  getClassroomPlans,
  publishClassroomPlan,
} from "../../shared/infrastructure/classroomApi";
import { START_CLASS_ISSUES } from "../domain/startClassIssue";
import { ensureStartClassContent } from "./startClassContentRepository";

jest.mock("../../shared/infrastructure/classroomApi", () => ({
  getClassroomPlans: jest.fn(),
  publishClassroomPlan: jest.fn(),
}));

const lessonsById = {
  "section-1-1": { title: "有理数" },
  "section-2-1": { title: "代数式" },
};
const versionsByLessonId = {
  "section-1-1": { id: "version-1" },
  "section-2-1": { id: "version-2" },
};

describe("start class content repository", () => {
  beforeEach(() => jest.clearAllMocks());

  test("uses the published lesson version directly for one lesson", async () => {
    await expect(
      ensureStartClassContent({
        lessonIds: ["section-1-1"],
        lessonsById,
        versionsByLessonId,
      }),
    ).resolves.toEqual({
      contentVersionId: "version-1",
      sourceLessonIds: ["section-1-1"],
      title: "有理数",
    });
    expect(getClassroomPlans).not.toHaveBeenCalled();
  });

  test("reuses an existing multi-lesson plan with the same lesson scope", async () => {
    getClassroomPlans.mockResolvedValue([
      {
        title: "跨章复习",
        versionId: "plan-version-1",
        sourceLessons: [
          { textbookLessonId: "section-2-1" },
          { textbookLessonId: "section-1-1" },
        ],
      },
    ]);
    await expect(
      ensureStartClassContent({
        lessonIds: ["section-1-1", "section-2-1"],
        lessonsById,
        versionsByLessonId,
      }),
    ).resolves.toEqual({
      contentVersionId: "plan-version-1",
      sourceLessonIds: ["section-1-1", "section-2-1"],
      title: "跨章复习",
    });
    expect(publishClassroomPlan).not.toHaveBeenCalled();
  });

  test("publishes a reusable-content plan without AI generation", async () => {
    getClassroomPlans.mockResolvedValue([]);
    publishClassroomPlan.mockResolvedValue({
      title: "有理数 · 代数式",
      versionId: "plan-version-2",
    });
    await ensureStartClassContent({
      lessonIds: ["section-1-1", "section-2-1"],
      lessonsById,
      versionsByLessonId,
    });
    expect(publishClassroomPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceContentVersionIds: ["version-1", "version-2"],
        generatedContent: expect.objectContaining({
          generationPolicy: expect.objectContaining({
            assessment: "NONE",
            compositeExplanation: "OMIT",
          }),
        }),
      }),
    );
  });

  test("rejects unpublished lessons instead of using a different version", async () => {
    await expect(
      ensureStartClassContent({
        lessonIds: ["section-1-1", "section-2-1"],
        lessonsById,
        versionsByLessonId: { "section-1-1": { id: "version-1" } },
      }),
    ).rejects.toMatchObject({ code: START_CLASS_ISSUES.PUBLISH_LESSONS });
  });
});
