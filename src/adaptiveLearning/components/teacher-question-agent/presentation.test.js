import {
  backendPlanStepStatus,
  inspectResultMessage,
  lessonAgentStatus,
  processingPresentation,
  scopeCopy,
  teacherFacingMessage,
} from "./presentation";

describe("teacher agent presentation", () => {
  it("maps backend execution phases to plan statuses", () => {
    expect(backendPlanStepStatus("running")).toBe("submitted");
    expect(backendPlanStepStatus("awaiting_review")).toBe("completed");
    expect(backendPlanStepStatus("failed")).toBe("failed");
  });

  it("keeps internal question ids out of teacher-facing receipts", () => {
    expect(
      teacherFacingMessage("请重做题目 lesson__pre-assessment__q1", [
        { id: "lesson__pre-assessment__q1", section: "pre", number: 2 },
      ]),
    ).toBe("请重做课前测验第 2 题");
  });

  it("describes read-only inspection failures without implying writes", () => {
    expect(
      inspectResultMessage({
        passed: false,
        issues: [{ message: "存在重复题" }],
      }),
    ).toContain("本次只读检查没有修改课时内容");
  });

  it("provides scoped copy and lesson status from domain state", () => {
    expect(scopeCopy("review").title).toBe("综合练习");
    expect(lessonAgentStatus({ phase: "dirty" }, [], false)).toMatchObject({
      label: "有修改",
      tone: "warning",
    });
  });

  it("keeps publishing status and scoped generation detail independent", () => {
    expect(
      processingPresentation({
        planning: false,
        executing: false,
        lessonActionsDisabled: true,
        wholeLesson: false,
        copy: { title: "课前测验" },
        lessonTask: {},
        generationStatus: { message: "正在补充基准题" },
      }),
    ).toEqual({
      title: "正在按教师确认发布整课内容",
      message: "正在补充基准题",
    });
  });
});
