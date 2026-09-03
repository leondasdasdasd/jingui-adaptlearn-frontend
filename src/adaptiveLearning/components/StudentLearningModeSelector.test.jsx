/** @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import StudentLearningModeSelector from "./StudentLearningModeSelector";

describe("StudentLearningModeSelector", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
  });

  it("lets the student choose among the three learning paths", () => {
    const onChange = vi.fn();
    render(
      <StudentLearningModeSelector value="NEW_LESSON" onChange={onChange} />,
    );

    expect(screen.getByText("学习新知")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "查缺补漏" }));
    expect(onChange).toHaveBeenCalledWith("REMEDIATION");
  });

  it("shows the selected path in English", () => {
    window.globalLange = "en";
    render(
      <StudentLearningModeSelector value="FOUNDATION" onChange={() => {}} />,
    );

    expect(screen.getByText("Pre-assessment")).toBeVisible();
    expect(screen.getByText("Layered learning")).toBeVisible();
    expect(screen.getByText("Unlock advanced content")).toBeVisible();
  });
});
