import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import AssessmentSlotsSection from "./AssessmentSlotsSection";

describe("AssessmentSlotsSection", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
  });

  test("keeps slot planning and question generation as sequential actions", () => {
    const onGenerateSlots = jest.fn();
    const onGenerateQuestions = jest.fn();
    const { rerender } = render(
      <AssessmentSlotsSection
        hasMatrix={true}
        questionSlots={[]}
        onGenerateSlots={onGenerateSlots}
        onGenerateQuestions={onGenerateQuestions}
      />,
    );

    expect(screen.queryByText("按插槽新增题目")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "生成题目插槽" }));
    expect(onGenerateSlots).toHaveBeenCalledTimes(1);
    expect(onGenerateQuestions).not.toHaveBeenCalled();

    rerender(
      <AssessmentSlotsSection
        hasMatrix={true}
        questionSlots={[
          {
            id: "slot-1",
            matrixCellCode: "CR-B",
            questionType: "single_choice",
            matrixRole: "CORE",
          },
        ]}
        onGenerateSlots={onGenerateSlots}
        onGenerateQuestions={onGenerateQuestions}
      />,
    );

    expect(
      screen.getByRole("button", { name: "重新生成插槽" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "按插槽新增题目" }));
    expect(onGenerateQuestions).toHaveBeenCalledTimes(1);
  });

  test("does not plan slots before a matrix exists", () => {
    const onGenerateSlots = jest.fn();
    render(
      <AssessmentSlotsSection
        hasMatrix={false}
        onGenerateSlots={onGenerateSlots}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "生成题目插槽" }));

    expect(onGenerateSlots).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("尚未生成评估矩阵");
  });

  test("blocks duplicate planning and question generation while slots are planning", () => {
    const onGenerateSlots = jest.fn();
    const onGenerateQuestions = jest.fn();
    render(
      <AssessmentSlotsSection
        hasMatrix={true}
        questionSlots={[{ id: "slot-1", matrixCellCode: "CR-B" }]}
        slotGeneration={{
          states: [],
          isPlanning: true,
          isRunning: false,
          canRetry: false,
        }}
        onGenerateSlots={onGenerateSlots}
        onGenerateQuestions={onGenerateQuestions}
      />,
    );

    const planningButton = screen.getByRole("button", {
      name: "正在规划题目插槽",
    });
    expect(planningButton).toBeDisabled();
    expect(screen.queryByText("按插槽新增题目")).not.toBeInTheDocument();
    fireEvent.click(planningButton);
    expect(onGenerateSlots).not.toHaveBeenCalled();
    expect(onGenerateQuestions).not.toHaveBeenCalled();
  });
});
