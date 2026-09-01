import { deriveBackgroundPlanUpdate } from "./backgroundPlanSync";

const plan = {
  executionId: "execution-1",
  steps: [{ id: "generate", kind: "generate_whole_lesson" }],
};

describe("teacher agent background plan sync", () => {
  it("associates a submitted step with its new classroom run", () => {
    const update = deriveBackgroundPlanUpdate({
      scope: "whole",
      pendingPlan: plan,
      runLink: null,
      stepStatuses: { generate: "submitted" },
      lessonTask: { runId: "run-1", phase: "running" },
      notifiedPhases: new Set(),
    });

    expect(update).toMatchObject({
      backendStatus: "running",
      nextStepStatus: "submitted",
      shouldNotify: false,
      runLink: { runId: "run-1", executionId: "execution-1" },
    });
  });

  it("reports awaiting-review runs with quality issues as failures once", () => {
    const update = deriveBackgroundPlanUpdate({
      scope: "whole",
      pendingPlan: plan,
      runLink: { runId: "run-1", executionId: "execution-1" },
      stepStatuses: { generate: "submitted" },
      lessonTask: {
        runId: "run-1",
        phase: "awaiting_review",
        issues: [{ message: "重复题" }],
      },
      notifiedPhases: new Set(),
    });

    expect(update).toMatchObject({
      backendStatus: "failed",
      nextStepStatus: "failed",
      shouldNotify: true,
    });
  });

  it("retains the persisted timestamp when the backend omits one", () => {
    const update = deriveBackgroundPlanUpdate({
      scope: "whole",
      pendingPlan: plan,
      runLink: {
        runId: "run-1",
        executionId: "execution-1",
        updatedAt: "2026-08-31T00:00:00.000Z",
      },
      stepStatuses: { generate: "submitted" },
      lessonTask: { runId: "run-1", phase: "running" },
      notifiedPhases: new Set(),
    });

    expect(update.runLink.updatedAt).toBe("2026-08-31T00:00:00.000Z");
  });
});
