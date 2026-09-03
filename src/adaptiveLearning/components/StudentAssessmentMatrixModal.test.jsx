import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import StudentAssessmentMatrixModal from "./StudentAssessmentMatrixModal";

const lesson = {
  id: "lesson-1",
  title: "第一课",
  knowledgePoints: [{ id: "kp-1", name: "正数与负数" }],
};

describe("StudentAssessmentMatrixModal", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
  });

  it("opens the lesson matrix with focus and scroll locking", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <StudentAssessmentMatrixModal isOpen lesson={lesson} onClose={onClose} />,
    );

    expect(screen.getByRole("button", { name: "关闭弹窗" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
