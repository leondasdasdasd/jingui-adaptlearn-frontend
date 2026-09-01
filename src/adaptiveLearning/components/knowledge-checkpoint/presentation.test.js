import {
  knowledgeCheckpointAnswerText,
  knowledgeCheckpointEncouragement,
  knowledgeCheckpointMasteryChange,
  knowledgeCheckpointQuestionAria,
  knowledgeCheckpointText,
} from "./presentation";

describe("knowledge checkpoint presentation", () => {
  const originalLanguage = window.globalLange;

  afterEach(() => {
    window.globalLange = originalLanguage;
  });

  test("formats English question and answer summaries", () => {
    window.globalLange = "en";
    expect(knowledgeCheckpointAnswerText(["A", "B"])).toBe("A, B");
    expect(
      knowledgeCheckpointText("questionPosition", { index: 2, total: 5 }),
    ).toBe("Question 2 of 5");
    expect(knowledgeCheckpointMasteryChange(-3.25)).toBe(
      "Mastery decreased by 3.3%",
    );
    expect(
      knowledgeCheckpointQuestionAria({
        index: 2,
        difficulty: "D4",
        state: "Correct",
        score: "Correct",
        mastery: "Mastery increased by 2.0%",
      }),
    ).toBe(
      "Question 2, Difficulty · D4 Variant synthesis, Correct, Correct, Mastery increased by 2.0%",
    );
  });

  test("localizes evidence-based next-step guidance", () => {
    window.globalLange = "en";
    expect(
      knowledgeCheckpointEncouragement({
        answered: 3,
        correctRate: 67,
        masteryAfter: 92,
        correctStreak: 1,
      }),
    ).toBe(
      "Current mastery has reached 90%, but the consecutive evidence is not stable yet (1/2). Keep reinforcing it in later practice.",
    );
  });
});
