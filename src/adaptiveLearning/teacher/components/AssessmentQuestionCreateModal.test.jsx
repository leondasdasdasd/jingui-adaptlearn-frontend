import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import AssessmentQuestionCreateModal from "./AssessmentQuestionCreateModal";

describe("AssessmentQuestionCreateModal", () => {
  const defaultSlot = {
    id: "slot-cr-b-1",
    matrixCellId: "cell-cr-b",
    matrixCode: "CR · B",
    questionType: "single_choice",
    difficulty: 2,
    primaryKnowledgePointId: "kp-1",
    knowledgePointIds: ["kp-1", "kp-2"],
  };

  const knowledgePoints = [
    { id: "kp-1", name: "有理数乘法" },
    { id: "kp-2", name: "有理数除法" },
  ];

  test("renders nothing when open is false", () => {
    const { container } = render(
      <AssessmentQuestionCreateModal
        open={false}
        slot={defaultSlot}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders create question form with slot defaults", () => {
    render(
      <AssessmentQuestionCreateModal
        open={true}
        slot={defaultSlot}
        knowledgePoints={knowledgePoints}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/CR · B/)).toBeInTheDocument();
    expect(screen.getByLabelText("题干")).toBeInTheDocument();
  });

  test("validates required stem and submits newly created question", () => {
    const onConfirm = vi.fn();
    render(
      <AssessmentQuestionCreateModal
        open={true}
        slot={defaultSlot}
        knowledgePoints={knowledgePoints}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    // Try submit empty
    fireEvent.click(screen.getByRole("button", { name: "保存并归入插槽" }));
    expect(screen.getByText("请检查标红的必填内容")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    // Fill stem
    fireEvent.change(screen.getByLabelText("题干"), {
      target: { value: "计算 (-2) * 3 的结果是多少？" },
    });
    fireEvent.change(screen.getByLabelText("参考答案"), {
      target: { value: "A" },
    });

    fireEvent.click(screen.getByRole("button", { name: "保存并归入插槽" }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        stem: "计算 (-2) * 3 的结果是多少？",
        type: "single_choice",
        difficulty: 2,
        answer: "A",
        blueprintSlotId: "slot-cr-b-1",
        matrixCellId: "cell-cr-b",
        source: "custom",
      }),
    );
  });
});
