import {
  historyAnswerReview,
  historyAnswerValues,
  historyQuestionStem,
  toHistoryAttemptView,
} from "./learningAttemptHistory";

describe("learning attempt history contract", () => {
  test("maps supported answer values without exposing unknown objects", () => {
    expect(historyAnswerValues(["A", { text: "B" }, { internal: true }])).toEqual([
      "A",
      "B",
    ]);
  });

  test("maps known question snapshot fields to one stable stem", () => {
    expect(historyQuestionStem({ prompt: { text: "Solve x + 1 = 2" } })).toBe(
      "Solve x + 1 = 2",
    );
    expect(historyQuestionStem({ transportOnly: true })).toBe("");
  });

  test("maps an on-demand review to the stable history contract", () => {
    expect(
      historyAnswerReview({
        correctAnswer: { text: "42", transportOnly: true },
        analysis: { text: "Subtract one from both sides" },
        transportOnly: true,
      }),
    ).toEqual({
      correctAnswerValues: ["42"],
      analysis: "Subtract one from both sides",
    });
  });

  test("whitelists the history view and normalizes nested display fields", () => {
    const view = toHistoryAttemptView({
      historyId: "history-1",
      attemptId: "attempt-1",
      questionId: "question-1",
      questionSnapshot: {
        prompt: { text: "Question" },
        answer: { text: "Answer" },
        analysis: { text: "Explanation" },
      },
      answer: { text: "Student answer", transportOnly: true },
      improvements: [{ text: "Show your work" }, { internal: true }],
      transportOnly: true,
    });

    expect(view).toMatchObject({
      questionStem: "Question",
      answerValues: ["Student answer"],
      correctAnswerValues: ["Answer"],
      analysis: "Explanation",
      improvements: ["Show your work"],
    });
    expect(view).not.toHaveProperty("questionSnapshot");
    expect(view).not.toHaveProperty("answer");
    expect(view).not.toHaveProperty("transportOnly");
  });
});
