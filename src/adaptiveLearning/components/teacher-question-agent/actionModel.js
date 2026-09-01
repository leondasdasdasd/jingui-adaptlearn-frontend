import { BACKGROUND_STEP_KINDS, inspectResultMessage } from "./presentation";

/**
 *
 * @param values
 */
function firstText(values) {
  return values.find(Boolean) || "";
}

/**
 * @param plan
 */
export function initialPlanStatuses(plan) {
  return Object.fromEntries(plan.steps.map((step) => [step.id, "pending"]));
}

/**
 * @param plan
 * @param stepResults
 */
export function backgroundRunLink(plan, stepResults) {
  const backgroundResult = stepResults.find(
    (item) => item.result?.background,
  )?.result;
  if (!backgroundResult?.runId) return null;
  const backgroundStep = plan.steps.find((step) =>
    BACKGROUND_STEP_KINDS.has(step.kind),
  );
  const now = new Date().toISOString();
  return {
    runId: backgroundResult.runId,
    executionId: plan.executionId,
    backendStatus: firstText([backgroundResult.status, "queued"]),
    toolKind: firstText([backgroundResult.toolOperation, backgroundStep?.kind]),
    teacherInstruction: firstText([
      backgroundResult.requestedInstruction,
      backgroundStep?.instruction,
    ]),
    sourceIssueCount: Number(backgroundResult.sourceIssueCount || 0),
    submittedAt: now,
    updatedAt: firstText([backgroundResult.updatedAt, now]),
  };
}

/**
 * @param plan
 * @param stepResults
 */
function latestInspectionResult(plan, stepResults) {
  return stepResults
    .filter(
      (item) =>
        plan.steps.find((step) => step.id === item.stepId)?.kind ===
        "inspect_lesson",
    )
    .at(-1)?.result;
}

/**
 * @param plan
 * @param execution
 */
export function executionReceipt(plan, execution) {
  const summary = String(plan.summary || "").replace(/[!?。！？]+$/, "");
  if (execution.backgroundSubmitted) {
    return `已提交：${summary}。后台会按当前缺口或检查问题定向处理，保留已通过内容，完成后自动复检。刷新页面后进度和回执仍会恢复。`;
  }
  const inspectionMessage = inspectResultMessage(
    latestInspectionResult(plan, execution.stepResults),
  );
  if (inspectionMessage) return inspectionMessage;
  return plan.confirmationRequired
    ? `已完成：${summary}。修改已进入课时草稿，请检查后再发布。`
    : `检查完成：${summary}。你可以继续让我处理发现的问题。`;
}

/**
 * @param error
 */
export function executionErrorMessage(error) {
  if (error?.status === 403) {
    return "课堂服务拒绝了本次检查（403）。课时内容没有被修改；请确认教师权限或服务配置后重新检查。";
  }
  return (
    error?.message ||
    "执行计划时出现问题；已完成的步骤仍保留，失败步骤不会自动重放。"
  );
}

/**
 * @param root0
 * @param root0.runLink
 * @param root0.previousStep
 * @param root0.stepStatuses
 * @param root0.lessonTask
 */
export function planningContext({
  runLink,
  previousStep,
  stepStatuses,
  lessonTask,
}) {
  return {
    kind: firstText([runLink?.toolKind, previousStep?.kind]),
    instruction: firstText([
      runLink?.teacherInstruction,
      previousStep?.instruction,
    ]),
    status: firstText([runLink?.backendStatus, stepStatuses[previousStep?.id]]),
    message: firstText([lessonTask.message]),
    issues: lessonTask.issues || [],
  };
}

/**
 * @param plan
 */
export function planAcknowledgement(plan) {
  if (!plan.confirmationRequired) return plan.reply;
  const summary = String(plan.summary || "").replace(/[!?。！？]+$/, "");
  return `我已理解你的要求：${summary}。执行计划已经列出，但尚未开始；点击“确认执行”后才会写入草稿或提交后台任务。`;
}
