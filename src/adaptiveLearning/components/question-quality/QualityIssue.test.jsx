import React from "react";
import { render, screen } from "@testing-library/react";

import QualityIssue from "./QualityIssue";

describe("QualityIssue", () => {
  afterEach(() => {
    delete window.globalLange;
  });

  test("renders issue metadata in the selected language", () => {
    window.globalLange = "en";
    render(
      <QualityIssue
        index={0}
        issue={{
          type: "answer_error",
          severity: "major",
          certainty: "needs_human_review",
          originalText: "Original answer",
          reason: "The answer is inconsistent",
          suggestedRevision: "Use the verified answer",
        }}
      />,
    );

    expect(screen.getByText("Issue 1")).toBeInTheDocument();
    expect(screen.getByText("Answer error")).toBeInTheDocument();
    expect(screen.getByText("Major error")).toBeInTheDocument();
    expect(screen.getByText("Teacher review")).toBeInTheDocument();
    expect(screen.getByText("Suggested revision")).toBeInTheDocument();
  });
});
