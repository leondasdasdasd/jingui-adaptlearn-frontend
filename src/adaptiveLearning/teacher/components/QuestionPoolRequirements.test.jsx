import React from "react";
import { render, screen } from "@testing-library/react";

import QuestionPoolRequirements from "./QuestionPoolRequirements";

describe("QuestionPoolRequirements", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
  });

  test("keeps the fixed pool acceptance criteria visible with live counts", () => {
    render(
      <QuestionPoolRequirements
        questions={[
          { id: "q-1", difficulty: 1, taskCategory: "application" },
          { id: "q-2", difficulty: "D3", taskCategory: "calculation" },
        ]}
      />,
    );

    const requirements = screen.getByLabelText("单点题池要求");
    expect(requirements).toHaveTextContent("单点题池：2 题（至少 15 题）");
    expect(requirements).toHaveTextContent("1星 1/3");
    expect(requirements).toHaveTextContent("3星 1/4");
    expect(requirements).toHaveTextContent("应用题 1（目标 7–9）");
  });
});
