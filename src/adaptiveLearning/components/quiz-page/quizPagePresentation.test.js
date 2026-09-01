import {
  correctionReadingGuideCopy,
  difficultyAdjustmentLabel,
  historyNavigationLabel,
  quizProgressActionLabel,
  quizQuestionTypeLabel,
} from "./quizPagePresentation";

describe("quiz page presentation", () => {
  afterEach(() => {
    delete window.globalLange;
  });

  test("localizes question and adaptive difficulty labels", () => {
    window.globalLange = "en";

    expect(quizQuestionTypeLabel("single_choice")).toBe("Single choice");
    expect(quizQuestionTypeLabel("unknown")).toBe("Question");
    expect(difficultyAdjustmentLabel("up")).toBe(
      "The next question will be more challenging",
    );
    expect(correctionReadingGuideCopy().confirmLabel).toBe(
      "I have reread the question. Start correction",
    );
  });

  test("projects history and progress actions in the active language", () => {
    window.globalLange = "zh-CN";
    expect(historyNavigationLabel(0, 2)).toBe("下一题");
    expect(historyNavigationLabel(1, 2)).toBe("返回当前题");
    expect(quizProgressActionLabel("resubmit", "我已读题，开始订正")).toBe(
      "重新提交",
    );

    window.globalLange = "en";
    expect(quizProgressActionLabel("review-problem", "Confirm")).toBe(
      "Review the issue together",
    );
  });
});
