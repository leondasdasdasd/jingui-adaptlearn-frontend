import {
  aiGeneratedImprovements,
  buildQuestionFeedback,
} from "./questionFeedback";

describe("question feedback domain", () => {
  test("returns stable presentation IDs for diagnostic outcomes", () => {
    expect(
      buildQuestionFeedback({
        diagnostic: true,
        grading: { skipped: true, disposition: "SKIPPED_DONT_KNOW" },
      }),
    ).toMatchObject({
      state: "recorded",
      titleId: "diagnosticSkipped",
      showScore: false,
    });
  });

  test("keeps score semantics without producing localized labels", () => {
    const feedback = buildQuestionFeedback({
      questionType: "short_answer",
      grading: {
        correct: false,
        scoreRatio: 0.5,
        answerQuality: "incomplete",
        feedbackSource: "ai",
      },
    });
    expect(feedback).toMatchObject({
      state: "partial",
      titleId: "partialIncomplete",
      showScore: true,
      scoreRatio: 0.5,
    });
    expect(feedback).not.toHaveProperty("title");
    expect(feedback).not.toHaveProperty("scoreText");
  });

  test("uses stable cue IDs for the intervention state", () => {
    expect(
      buildQuestionFeedback({
        needsIntervention: true,
        grading: { correct: false, scoreRatio: 0 },
      }).adaptiveCue,
    ).toEqual({
      tone: "support",
      titleId: "interventionTitle",
      detailId: "interventionDetail",
      titleText: "",
      detailText: "",
    });
  });

  test("keeps multiple AI improvements structured for the presentation layer", () => {
    expect(
      aiGeneratedImprovements("short_answer", {
        feedbackSource: "ai",
        correct: false,
        score: 0,
        maxScore: 2,
        improvements: ["Check the sign", "Show the final step"],
      }),
    ).toEqual(["Check the sign", "Show the final step"]);
  });
});
