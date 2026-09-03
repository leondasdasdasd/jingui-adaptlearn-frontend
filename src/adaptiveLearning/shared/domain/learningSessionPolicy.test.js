import {
  isTransientLearningSelection,
  isTransientLearningSession,
  scopedQuizDraftId,
  transientScratchPaperScopePrefix,
  transientQuizDraftPrefix,
} from "./learningSessionPolicy";

describe("learning session persistence policy", () => {
  test("keeps regular learning sessions and draft ids persistent", () => {
    const selection = {
      sessionType: "lesson",
      studentSessionId: "student-session-1",
    };

    expect(isTransientLearningSelection(selection)).toBe(false);
    expect(isTransientLearningSession({ selection })).toBe(false);
    expect(scopedQuizDraftId(selection, "pre:version-1")).toBe("pre:version-1");
  });

  test("isolates teacher preview drafts by the simulated session", () => {
    const selection = {
      sessionType: "teacher_preview",
      studentId: "teacher-preview:version-1",
      studentSessionId: "teacher-preview:version-1:123",
    };

    expect(isTransientLearningSelection(selection)).toBe(true);
    expect(isTransientLearningSession({ selection })).toBe(true);
    expect(scopedQuizDraftId(selection, "pre:version-1")).toBe(
      "transient:teacher-preview:version-1:123:pre:version-1",
    );
    expect(transientQuizDraftPrefix(selection)).toBe(
      "transient:teacher-preview:version-1:123:",
    );
    expect(transientScratchPaperScopePrefix(selection)).toBe(
      "teacher-preview:version-1:123:",
    );
  });
});
