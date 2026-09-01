import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import EndClassroomDialog from "./EndClassroomDialog";

describe("EndClassroomDialog", () => {
  let portalHost;

  beforeEach(() => {
    window.globalLange = "zh-CN";
    portalHost = document.createElement("div");
    portalHost.id = "adaptive-learning-portal-host";
    document.body.append(portalHost);
  });

  afterEach(() => {
    portalHost.remove();
  });

  const renderDialog = (properties = {}) => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    render(
      <EndClassroomDialog
        className="自适应学习演示班"
        lessonTitle="自主学习"
        studentCount={2}
        onlineCount={1}
        pending={false}
        error=""
        onCancel={onCancel}
        onConfirm={onConfirm}
        {...properties}
      />,
    );
    return { onCancel, onConfirm };
  };

  it("renders in the adaptive portal and focuses the destructive action", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", {
      name: "确认下课？",
    });
    const confirmButton = screen.getByRole("button", {
      name: "确认下课",
    });
    expect(portalHost).toContainElement(dialog);
    expect(confirmButton).toHaveFocus();
    expect(screen.getByText(/当前仍有 1 名学生在线/)).toBeInTheDocument();
  });

  it("closes from the mask or Escape and submits from the primary action", () => {
    const { onCancel, onConfirm } = renderDialog();

    fireEvent.click(
      screen.getByRole("button", {
        name: "取消下课",
      }),
    );
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(
      screen.getByRole("button", { name: "确认下课" }),
    );

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cannot be dismissed while the end-class request is pending", () => {
    const { onCancel } = renderDialog({ pending: true });

    fireEvent.click(
      screen.getByRole("button", {
        name: "取消下课",
      }),
    );
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(onCancel).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "正在下课…" }),
    ).toBeDisabled();
  });
});
