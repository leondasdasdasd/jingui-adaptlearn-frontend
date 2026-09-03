import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import AssessmentSlotsSection from "./AssessmentSlotsSection";

describe("AssessmentSlotsSection", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
  });

  test("keeps slot planning and question generation as sequential actions", () => {
    const onGenerateSlots = vi.fn();
    const onGenerateQuestions = vi.fn();
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
    const onGenerateSlots = vi.fn();
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
    const onGenerateSlots = vi.fn();
    const onGenerateQuestions = vi.fn();
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

  test("keeps matrix requirements out of the type-and-difficulty slot", () => {
    render(
      <AssessmentSlotsSection
        hasMatrix={true}
        questionSlots={[
          {
            id: "slot-1",
            matrixCode: "ST-C",
            knowledgePointIds: ["kp-1", "kp-2"],
            observableBehavior: "解释实验现象",
            evidenceCriterion: "给出完整证据",
            variationRequirement: "更换实验条件",
            questions: [],
          },
        ]}
      />,
    );

    expect(screen.queryByText("目标行为")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "题目" }));
    expect(screen.queryByText("解释实验现象")).not.toBeInTheDocument();
    expect(screen.queryByText("给出完整证据")).not.toBeInTheDocument();
    expect(screen.queryByText("更换实验条件")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "编辑插槽" }),
    ).not.toBeInTheDocument();
  });

  test("groups unassigned questions outside matrix coverage and assigns them explicitly", () => {
    const onAssignQuestion = vi.fn();
    render(
      <AssessmentSlotsSection
        hasMatrix={true}
        questionSlots={[
          {
            id: "slot-1",
            matrixCode: "PC-B",
            questionType: "single_choice",
            difficulty: "D2",
          },
        ]}
        unassignedQuestions={[{ id: "q-1", stem: "光的反射方向" }]}
        onAssignQuestion={onAssignQuestion}
      />,
    );
    expect(screen.getByText(/不计入矩阵覆盖/)).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "PC-B · 单选题 · 2星" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("将题目归入插槽"), {
      target: { value: "slot-1" },
    });
    expect(onAssignQuestion).toHaveBeenCalledWith("q-1", "slot-1");
  });

  test("opens the matching matrix-cell detail from a slot code", () => {
    const onOpenMatrixCell = vi.fn();
    render(
      <AssessmentSlotsSection
        hasMatrix={true}
        questionSlots={[
          {
            id: "slot-1",
            matrixCellId: "kp-1:PC:B",
            matrixCode: "PC-B",
            questions: [],
          },
        ]}
        onOpenMatrixCell={onOpenMatrixCell}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "查看矩阵格 PC-B 的要求" }),
    );
    expect(onOpenMatrixCell).toHaveBeenCalledWith("kp-1:PC:B");
  });

  test("offers one picker entry plus the shared create and generation actions", () => {
    const onSelectQuestion = vi.fn();
    const onCreateQuestion = vi.fn();
    const onGenerateQuestion = vi.fn();
    render(
      <AssessmentSlotsSection
        hasMatrix={true}
        questionSlots={[
          {
            id: "slot-1",
            matrixCode: "PC-B",
            knowledgePointIds: ["kp-1"],
            observableBehavior: "识别光的反射现象",
            evidenceCriterion: "说明入射光与反射光",
            variationRequirement: "更换入射角",
            questions: [],
          },
        ]}
        onSelectQuestion={onSelectQuestion}
        onCreateQuestion={onCreateQuestion}
        onGenerateQuestion={onGenerateQuestion}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "题目" }));
    [
      ["题库选题", onSelectQuestion],
      ["新增题目", onCreateQuestion],
      ["单题生成", onGenerateQuestion],
    ].forEach(([name, callback]) => {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(callback.mock.calls[0][0]).toBe("slot-1");
    });

    expect(
      screen.queryByRole("button", { name: "从试卷添加" }),
    ).not.toBeInTheDocument();
  });

  test("groups reusable type slots under one matrix cell and keeps multiple questions in one slot", () => {
    render(
      <AssessmentSlotsSection
        hasMatrix={true}
        questionSlots={[
          {
            id: "slot-single",
            matrixCellId: "kp-1:PC:B",
            matrixCode: "PC-B",
            questionType: "single_choice",
            questions: [
              { id: "q-1", stem: "第一道单选题", type: "single_choice" },
              { id: "q-2", stem: "第二道单选题", type: "single_choice" },
            ],
          },
          {
            id: "slot-fill",
            matrixCellId: "kp-1:PC:B",
            matrixCode: "PC-B",
            questionType: "fill_blank",
            questions: [],
          },
          {
            id: "slot-judge",
            matrixCellId: "kp-1:PC:B",
            matrixCode: "PC-B",
            questionType: "judgement",
            questions: [],
          },
          {
            id: "slot-answer",
            matrixCellId: "kp-1:PC:B",
            matrixCode: "PC-B",
            questionType: "short_answer",
            questions: [],
          },
        ]}
      />,
    );

    expect(screen.getByText("4 个题型槽")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "单选题" }));
    expect(screen.getByText("第一道单选题")).toBeInTheDocument();
    expect(screen.getByText("第二道单选题")).toBeInTheDocument();
  });

  test("switches composite slots to one shared knowledge coverage view", () => {
    render(
      <AssessmentSlotsSection
        hasMatrix={true}
        knowledgePoints={[
          { id: "kp-1", name: "有理数" },
          { id: "kp-2", name: "数轴" },
        ]}
        questionSlots={[
          {
            id: "slot-1",
            matrixCellId: "unit:CR:B",
            matrixCode: "CR · B",
            primaryKnowledgePointId: "kp-1",
            secondaryKnowledgePointIds: ["kp-2"],
            knowledgePointIds: ["kp-1", "kp-2"],
            questionType: "single_choice",
            difficulty: "D3",
            questions: [{ id: "q-1", type: "single_choice" }],
          },
        ]}
      />,
    );

    expect(screen.getByText("主知识点 · 有理数")).toBeInTheDocument();
    expect(screen.getByText("次知识点 · 数轴")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "知识点覆盖" }));
    expect(screen.queryByText("按插槽新增题目")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "3★" })).toBeVisible();
    expect(screen.getByText("有理数")).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "插槽视图" }));
    expect(screen.getByText("按插槽新增题目")).toBeInTheDocument();
  });
});
