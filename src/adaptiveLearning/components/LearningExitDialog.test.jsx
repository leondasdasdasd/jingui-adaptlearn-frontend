import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import LearningExitDialog from "./LearningExitDialog";

describe("LearningExitDialog", () => {
  let portalHost;

  beforeEach(() => {
    portalHost = document.createElement("div");
    portalHost.id = "adaptive-learning-portal-host";
    document.body.append(portalHost);
  });

  afterEach(() => portalHost.remove());

  it("keeps continue as the safe focused action and restores focus after Escape", () => {
    const onContinue = vi.fn();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const { unmount } = render(
      <LearningExitDialog
        title="确认退出练习？"
        description="进度已保存"
        exitLabel="退出练习"
        continueLabel="继续学习"
        onExit={vi.fn()}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByRole("button", { name: "继续学习" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onContinue).toHaveBeenCalledTimes(1);
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("keeps Tab navigation inside the modal", () => {
    render(
      <LearningExitDialog
        title="确认退出练习？"
        description="进度已保存"
        exitLabel="退出练习"
        continueLabel="继续学习"
        onExit={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    const exitButton = screen.getByRole("button", { name: "退出练习" });
    const continueButton = screen.getByRole("button", { name: "继续学习" });
    continueButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(exitButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(continueButton).toHaveFocus();
  });

  it("exits only from the explicit exit action", () => {
    const onExit = vi.fn();
    render(
      <LearningExitDialog
        title="确认退出练习？"
        description="进度已保存"
        exitLabel="退出练习"
        continueLabel="继续学习"
        onExit={onExit}
        onContinue={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "退出练习" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
