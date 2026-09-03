import { attemptsFromAuthority } from "./authoritativeLearningProfile";

const course = {
  chapters: [
    {
      id: "chapter-1",
      sections: [
        {
          id: "lesson-1",
          index: "1.1",
          title: "Linear equations",
          knowledgePoints: [{ id: "kp-1", name: "Solve equations" }],
        },
      ],
    },
  ],
};

describe("authoritative learning profile", () => {
  test("maps authority attempts to the stable history display contract", () => {
    const [attempt] = attemptsFromAuthority(
      {
        student: { id: "student-1" },
        attempts: [
          {
            id: "attempt-1",
            questionId: "question-1",
            knowledgeObjectiveId: "kp-1",
            questionSnapshot: {
              prompt: { text: "Solve x + 1 = 2" },
              type: "short_answer",
              answer: { text: "1" },
              analysis: "Subtract one from both sides",
            },
            answerContent: { text: "1", transportOnly: true },
            score: 1,
            maxScore: 1,
          },
        ],
      },
      course,
    );

    expect(attempt).toMatchObject({
      questionStem: "Solve x + 1 = 2",
      answerValues: ["1"],
      correctAnswerValues: ["1"],
      analysis: "Subtract one from both sides",
    });
  });

  test("keeps the submitted do-not-know disposition as skipped", () => {
    const [attempt] = attemptsFromAuthority(
      {
        attempts: [
          {
            id: "attempt-skipped",
            questionId: "question-skipped",
            knowledgeObjectiveId: "kp-1",
            questionSnapshot: { type: "short_answer" },
            answerContent: { disposition: "SKIPPED_DONT_KNOW" },
            score: 0,
            maxScore: 1,
          },
        ],
      },
      course,
    );

    expect(attempt.outcome).toBe("skipped");
  });
});
