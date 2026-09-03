import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import QuestionAnswer from "./QuestionAnswer";

vi.mock("@yungu-fed/question-editor", () => ({
  QuestionPlayer: () => null,
}));

vi.mock("./AnswerRichEditor", () => ({ default: () => null }));
vi.mock("./DrawingBoardInput", () => ({ default: () => null }));
vi.mock("./PhotoAnswerInput", () => ({ default: () => null }));
vi.mock("./VoiceAnswerInput", () => ({ default: () => null }));

vi.mock("./MathContent", () => ({
  default: ({ as: Element = "span", children }) => (
    <Element>{children}</Element>
  ),
}));

describe("QuestionAnswer fill blanks", () => {
  const question = {
    id: "fill-1",
    type: "fill_blank",
    answerKind: "formula",
    stem: "计算：____",
  };

  it("默认使用普通输入框，并在聚焦后报告所选空格", () => {
    const onFillBlankSelect = vi.fn();
    render(
      <QuestionAnswer
        disabled={false}
        onChange={vi.fn()}
        onFillBlankSelect={onFillBlankSelect}
        question={question}
        value="\\frac{1}{2}"
      />,
    );

    const input = screen.getByRole("textbox", { name: "空 1" });
    expect(input.tagName).toBe("INPUT");
    expect(document.querySelector("math-field")).not.toBeInTheDocument();

    fireEvent.focus(input);
    expect(onFillBlankSelect).toHaveBeenCalledWith(0);
  });
});
