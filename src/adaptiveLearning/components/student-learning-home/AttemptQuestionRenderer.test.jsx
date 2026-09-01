import React from "react";
import { render } from "@testing-library/react";
import { QuestionPlayer, QuestionPreview } from "@yungu-fed/question-editor";

import AttemptQuestionRenderer from "./AttemptQuestionRenderer";

jest.mock("@yungu-fed/question-editor", () => ({
  QuestionPlayer: jest.fn(() => <div>player</div>),
  QuestionPreview: jest.fn(() => <div>preview</div>),
}));
jest.mock("../MathContent", () => ({ children }) => <div>{children}</div>);
jest.mock("../QuestionReferenceAnswer", () => () => null);

const attempt = { sequence: 1 };
const question = {
  stem: "Question",
  type: "short_answer",
  options: [],
};

describe("AttemptQuestionRenderer", () => {
  beforeEach(() => {
    window.globalLange = "en";
    jest.clearAllMocks();
  });

  test.each([
    ["player", QuestionPlayer],
    ["preview", QuestionPreview],
  ])("uses the supported English locale for the %s", (kind, component) => {
    render(
      <AttemptQuestionRenderer
        attempt={attempt}
        question={question}
        renderer={{ kind, draft: {}, response: {}, templates: [] }}
      />,
    );

    expect(component).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en-US" }),
      expect.any(Object),
    );
  });
});
