import {
  preAssessmentAnswerStateMeta,
  preAssessmentAnswerText,
  preAssessmentDiagnosticStatus,
  preAssessmentNextStep,
  preAssessmentSummary,
} from "./presentation";

describe("pre-assessment result presentation", () => {
  const originalLanguage = window.globalLange;

  afterEach(() => {
    window.globalLange = originalLanguage;
  });

  test("localizes stable diagnostic states in English", () => {
    window.globalLange = "en";
    expect(
      preAssessmentDiagnosticStatus(
        { diagnosisStatus: "needs_learning" },
        true,
      ),
    ).toEqual({ label: "Needs learning", tone: "warning" });
    expect(preAssessmentAnswerStateMeta("skipped")).toEqual({
      label: "Marked as don't know",
      shortLabel: "Don't know",
    });
  });

  test("localizes next step and summary without route-provided copy", () => {
    window.globalLange = "en";
    expect(preAssessmentNextStep("verification_new")).toEqual({
      title: "Your foundation looks stable",
      description: "Skip repeated instruction and verify with an unseen question.",
      actionLabel: "Continue learning",
    });
    expect(
      preAssessmentSummary({
        hasQuestions: true,
        questionCount: 3,
        knowledgeCount: 2,
        confirmedCount: 2,
        correctCount: 3,
        focusCount: 0,
      }),
    ).toEqual({
      heading: "You completed 3 adaptive diagnostic questions",
      description:
        "Confirmed 2 knowledge points with 3 correct answers. Your foundation is stable, so you can move directly to independent verification.",
    });
  });

  test("uses an English separator for multiple answer values", () => {
    window.globalLange = "en";
    expect(preAssessmentAnswerText(["A", "B"])).toBe("A, B");
  });
});
