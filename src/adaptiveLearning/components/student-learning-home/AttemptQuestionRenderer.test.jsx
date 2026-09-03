import React from "react";
import { render } from "@testing-library/react";
import { QuestionPlayer, QuestionPreview } from "@yungu-fed/question-editor";

import AttemptQuestionRenderer from "./AttemptQuestionRenderer";

vi.mock("@yungu-fed/question-editor", () => ({
  QuestionPlayer: vi.fn(() => <div>player</div>),
  QuestionPreview: vi.fn(() => <div>preview</div>),
}));
vi.mock("../MathContent", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("../QuestionReferenceAnswer", () => ({ default: () => null }));

const attempt = { sequence: 1 };
const question = {
  stem: "Question",
  type: "short_answer",
  options: [],
};

describe("AttemptQuestionRenderer", () => {
  beforeEach(() => {
    window.globalLange = "en";
    vi.clearAllMocks();
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
      undefined,
    );
  });
});
