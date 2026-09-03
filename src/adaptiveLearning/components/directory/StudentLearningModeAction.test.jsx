/** @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import StudentLearningModeAction from "./StudentLearningModeAction";

const actions = {
  busy: false,
  newLessonBlockReason: "",
  newLessonEligible: true,
  onStartFoundation: vi.fn(),
  onStartNewLesson: vi.fn(),
  onStartRemediation: vi.fn(),
};

describe("StudentLearningModeAction", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
    vi.clearAllMocks();
  });

  it.each([
    ["NEW_LESSON", "上新课", "onStartNewLesson"],
    ["FOUNDATION", "开始课前测", "onStartFoundation"],
    ["REMEDIATION", "开始单元测试", "onStartRemediation"],
  ])("shows one primary action for %s", (learningMode, label, actionName) => {
    render(
      <StudentLearningModeAction {...actions} learningMode={learningMode} />,
    );

    const button = screen.getByRole("button", { name: label });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(button);
    expect(actions[actionName]).toHaveBeenCalledTimes(1);
  });
});
