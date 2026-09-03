import {
  backgroundRunLink,
  executionReceipt,
  planningContext,
} from "./actionModel";

describe("teacher agent action model", () => {
  it("maps a background execution result to the persisted run link", () => {
    const link = backgroundRunLink(
      {
        executionId: "execution-1",
        steps: [
          {
            id: "generate",
            kind: "generate_whole_lesson",
            instruction: "补齐内容",
          },
        ],
      },
      [
        {
          stepId: "generate",
          result: { background: true, runId: "run-1", status: "queued" },
        },
      ],
    );

    expect(link).toMatchObject({
      runId: "run-1",
      executionId: "execution-1",
      teacherInstruction: "补齐内容",
    });
  });

  it("keeps inspection receipts read-only", () => {
    const receipt = executionReceipt(
      {
        summary: "检查课时",
        confirmationRequired: false,
        steps: [{ id: "inspect", kind: "inspect_lesson" }],
      },
      {
        backgroundSubmitted: false,
        stepResults: [
          {
            stepId: "inspect",
            result: { passed: false, issues: [{ message: "存在重复题" }] },
          },
        ],
      },
    );

    expect(receipt).toContain("本次只读检查没有修改课时内容");
  });

  it("prefers the active run when preparing the next planning context", () => {
    expect(
      planningContext({
        runLink: {
          toolKind: "repair_quality_issues",
          teacherInstruction: "只修复重复题",
          backendStatus: "failed",
        },
        previousStep: { id: "old", kind: "inspect_lesson" },
        stepStatuses: { old: "completed" },
        lessonTask: { message: "仍有问题", issues: [{ message: "重复" }] },
      }),
    ).toMatchObject({
      kind: "repair_quality_issues",
      instruction: "只修复重复题",
      status: "failed",
      message: "仍有问题",
    });
  });
});
