import {
  adaptiveCueTitle,
  masteryChangeLabel,
  questionFeedbackScore,
  questionFeedbackTitle,
} from "./questionFeedbackPresentation";

describe("question feedback presentation", () => {
  const originalLanguage = window.globalLange;

  afterEach(() => {
    window.globalLange = originalLanguage;
  });

  test("renders one locale from stable domain IDs", () => {
    window.globalLange = "en";
    expect(questionFeedbackTitle({ titleId: "partialIncomplete" })).toBe(
      "One more step will complete your answer",
    );
    expect(
      questionFeedbackScore({
        showScore: true,
        state: "partial",
        scoreRatio: 0.65,
      }),
    ).toBe("65% correct");
  });

  test("keeps runtime adaptive content and localizes fallback actions", () => {
    window.globalLange = "zh-CN";
    expect(adaptiveCueTitle({ titleText: "老师给出的下一步" })).toBe(
      "老师给出的下一步",
    );
    expect(adaptiveCueTitle({ titleId: "continuePractice" })).toBe("继续练习");
    expect(
      masteryChangeLabel({
        breakthrough: true,
        direction: "up",
        deltaLabel: "+5.00%",
      }),
    ).toBe("突破掌握线 +5.00%");
  });

  test("formats scores from the domain state without reclassifying them", () => {
    window.globalLange = "en";
    expect(
      questionFeedbackScore({
        showScore: true,
        state: "partial",
        scoreRatio: 1,
      }),
    ).toBe("100% correct");
  });
});
