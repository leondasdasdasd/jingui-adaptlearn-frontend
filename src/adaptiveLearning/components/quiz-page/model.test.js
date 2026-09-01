/** @jest-environment node */

import {
  displayCorrectAnswer,
  emptyAnswerForQuestion,
  practiceGateOutcome,
} from "./model";

describe("quiz page model", () => {
  test("creates an answer value matching the question shape", () => {
    expect(emptyAnswerForQuestion({ type: "multiple_choice" })).toEqual([]);
    expect(emptyAnswerForQuestion({ type: "classification" })).toEqual({});
    expect(emptyAnswerForQuestion({ type: "short_answer" })).toBe("");
  });

  test("maps grading answer ids to learner-facing option text", () => {
    const question = { options: [{ id: "A", text: "正数" }] };
    expect(displayCorrectAnswer(question, { correctAnswer: "A" })).toBe("正数");
  });

  test("keeps practice active before the minimum question count", () => {
    expect(
      practiceGateOutcome({
        status: "continue",
        answered: 2,
        minimumQuestionsMet: false,
      }),
    ).toMatchObject({
      status: "continue",
      title: "继续练习",
    });
  });
});
