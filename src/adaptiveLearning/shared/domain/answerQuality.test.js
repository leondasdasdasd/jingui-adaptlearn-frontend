import { assessAnswerQuality, normalizedAnswerText } from "./answerQuality";

describe("answer quality", () => {
  it("normalizes punctuation and spacing without changing the source", () => {
    expect(normalizedAnswerText(" A， B。 ")).toBe("ab");
  });

  it("rejects empty and off-task answers before grading", () => {
    expect(assessAnswerQuality({ type: "short_answer" }, "").quality).toBe(
      "no_attempt",
    );
    expect(assessAnswerQuality({ type: "fill_blank" }, "随便").quality).toBe(
      "off_task",
    );
    expect(assessAnswerQuality({ type: "fill_blank" }, "-8").quality).toBe(
      "valid",
    );
  });
});
