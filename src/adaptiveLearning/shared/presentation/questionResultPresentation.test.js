import {
  localizedQuestionResult,
  localizedQuestionState,
  localizedQuestionType,
} from "./questionResultPresentation";

describe("question result presentation", () => {
  const originalLanguage = window.globalLange;

  afterEach(() => {
    window.globalLange = originalLanguage;
  });

  test("formats the shared result in English", () => {
    window.globalLange = "en";
    expect(localizedQuestionResult(1)).toBe("Correct");
    expect(localizedQuestionResult(0.6)).toBe("60% correct");
    expect(localizedQuestionResult(null, "unanswered")).toBe("Unanswered");
  });

  test("formats pending score copy in Chinese", () => {
    window.globalLange = "zh-CN";
    expect(localizedQuestionResult(null, "scorePending")).toBe("正确率待补充");
  });

  test("formats shared question types and states in English", () => {
    window.globalLange = "en";
    expect(localizedQuestionType("fill_blank")).toBe("Fill in the blank");
    expect(localizedQuestionType("unknown")).toBe("Other question type");
    expect(localizedQuestionState("partial")).toBe("Partially correct");
    expect(localizedQuestionState("pending", "unanswered")).toBe(
      "Unanswered",
    );
  });
});
