import { questionsForLearningUnit } from "./learningUnitQuestionMapper";

describe("learning unit question mapper", () => {
  const unit = {
    kind: "knowledge_practice",
    knowledgePointId: "kp-1",
  };

  test("prefers the dedicated published knowledge practice pool", () => {
    const dedicated = { id: "practice-1", knowledgePointIds: ["kp-1"] };
    const review = {
      id: "review-1",
      phase: "review",
      knowledgePointIds: ["kp-1", "kp-2"],
    };

    expect(
      questionsForLearningUnit(
        {
          postQuestions: [review],
          publishedContent: {
            knowledgePracticePools: { "kp-1": [dedicated] },
            compositeReviewPool: [review],
          },
        },
        unit,
      ),
    ).toEqual([dedicated]);
  });

  test("uses mapped real review questions when an old publication has an empty pool", () => {
    const relevant = {
      id: "review-1",
      phase: "review",
      knowledgePointIds: ["kp-1", "kp-2"],
    };
    const unrelated = {
      id: "review-2",
      phase: "review",
      knowledgePointIds: ["kp-2"],
    };

    expect(
      questionsForLearningUnit(
        {
          postQuestions: [relevant, unrelated],
          publishedContent: {
            knowledgePracticePools: { "kp-1": [] },
            compositeReviewPool: [relevant, unrelated],
          },
        },
        unit,
      ),
    ).toEqual([relevant]);
  });
});
