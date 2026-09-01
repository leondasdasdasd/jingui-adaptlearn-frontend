import { applyTeacherDraftMutation } from "./teacherDraftMutation.js";

describe("applyTeacherDraftMutation", () => {
  it("applies an atomic updater to the latest lesson and invalidates old quality state", () => {
    const current = {
      version: 4,
      postQuestions: [{ id: "existing" }],
      qualityReport: { passed: true },
      inspectionStatus: "passed",
      status: "published",
    };

    expect(
      applyTeacherDraftMutation(
        current,
        (lesson) => ({
          version: lesson.version + 1,
          postQuestions: [...lesson.postQuestions, { id: "new" }],
        }),
        "2026-08-31T00:00:00.000Z",
      ),
    ).toEqual({
      version: 5,
      postQuestions: [{ id: "existing" }, { id: "new" }],
      qualityReport: null,
      inspectionStatus: null,
      status: "draft",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });
  });
});
