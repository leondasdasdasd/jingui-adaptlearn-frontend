import { backendPlanStepStatus, BACKGROUND_STEP_KINDS } from "./presentation";

const terminalBackendStatuses = new Set([
  "awaiting_review",
  "published",
  "failed",
  "canceled",
  "cancelled",
]);

/**
 * @param plan
 */
function backgroundStepForPlan(plan) {
  return plan?.steps?.find((step) => BACKGROUND_STEP_KINDS.has(step.kind));
}

/**
 * 后端进入待复核但仍带质检问题时，计划步骤必须按失败呈现。
 * @param task
 */
function effectiveBackendStatus(task) {
  const status = task.backendStatus || task.phase;
  return status === "awaiting_review" && task.issues?.length
    ? "failed"
    : status;
}

/**
 *
 * @param scope
 * @param pendingPlan
 * @param runLink
 */
function backgroundPlanContext(scope, pendingPlan, runLink) {
  if (scope !== "whole") return null;
  if (!pendingPlan) return null;
  const backgroundStep = backgroundStepForPlan(pendingPlan);
  if (!backgroundStep) return null;
  const mismatchedExecution =
    runLink?.executionId &&
    pendingPlan.executionId &&
    runLink.executionId !== pendingPlan.executionId;
  return mismatchedExecution ? null : { backgroundStep, pendingPlan };
}

/**
 *
 * @param runLink
 * @param currentStepStatus
 * @param lessonTask
 */
function associatedRunId(runLink, currentStepStatus, lessonTask) {
  if (runLink?.runId) return runLink.runId;
  return currentStepStatus === "submitted" ? lessonTask.runId : "";
}

/**
 *
 * @param runLink
 * @param lessonTask
 */
function runBelongsToCurrentTask(runLink, lessonTask) {
  if (!runLink?.runId) return true;
  if (!lessonTask.runId) return true;
  return runLink.runId === lessonTask.runId;
}

/**
 *
 * @param lessonTask
 * @param runLink
 */
function backgroundUpdatedAt(lessonTask, runLink) {
  return (
    [lessonTask.updatedAt, runLink?.updatedAt].find(Boolean) ||
    new Date().toISOString()
  );
}

/**
 * 将课堂后台任务状态映射为一次原子的智能体会话更新。
 * @param input
 * @param input.scope
 * @param input.pendingPlan
 * @param input.runLink
 * @param input.stepStatuses
 * @param input.lessonTask
 * @param input.notifiedPhases
 */
export function deriveBackgroundPlanUpdate({
  scope,
  pendingPlan,
  runLink,
  stepStatuses,
  lessonTask,
  notifiedPhases,
}) {
  const context = backgroundPlanContext(scope, pendingPlan, runLink);
  if (!context) return null;
  const { backgroundStep } = context;
  const currentStepStatus = stepStatuses[backgroundStep.id] || "pending";
  const runId = associatedRunId(runLink, currentStepStatus, lessonTask);
  if (!runId) return null;
  if (!runBelongsToCurrentTask(runLink, lessonTask)) return null;
  const backendStatus = effectiveBackendStatus(lessonTask);
  const nextStepStatus = backendPlanStepStatus(backendStatus);
  if (!nextStepStatus) return null;
  const notificationKey = `${runId}:${backendStatus}`;
  return {
    backgroundStep,
    backendStatus,
    currentStepStatus,
    nextStepStatus,
    notificationKey,
    shouldNotify: shouldNotifyPhase(
      backendStatus,
      notificationKey,
      notifiedPhases,
    ),
    runLink: {
      ...runLink,
      runId,
      executionId: pendingPlan.executionId,
      backendStatus,
      updatedAt: backgroundUpdatedAt(lessonTask, runLink),
    },
  };
}

/**
 *
 * @param backendStatus
 * @param notificationKey
 * @param notifiedPhases
 */
function shouldNotifyPhase(backendStatus, notificationKey, notifiedPhases) {
  return (
    terminalBackendStatuses.has(backendStatus) &&
    !notifiedPhases.has(notificationKey)
  );
}
