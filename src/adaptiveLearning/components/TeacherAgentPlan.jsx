import React from "react";
import {
  CheckCircle2,
  Circle,
  Clock3,
  LoaderCircle,
  Play,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";

const toolLabels = {
  inspect_lesson: "检查整课内容",
  generate_whole_lesson: "生成整课内容",
  complete_missing_content: "补齐缺失内容",
  repair_quality_issues: "修复检查问题",
  generate_question_section: "生成题目板块",
  revise_questions: "改写指定题目",
  remove_questions: "删除指定题目",
  generate_learning_content: "生成学习内容",
  revise_learning_content: "修改学习内容",
  cancel_generation: "停止生成任务",
};

/**
 *
 * @param status
 */
function statusIcon(status) {
  if (status === "running")
    return <LoaderCircle className="spin" aria-hidden="true" />;
  if (status === "completed") return <CheckCircle2 aria-hidden="true" />;
  if (status === "submitted") return <Clock3 aria-hidden="true" />;
  if (status === "failed") return <XCircle aria-hidden="true" />;
  return <Circle aria-hidden="true" />;
}

const runStatusLabels = {
  queued: "排队中",
  running: "执行中",
  quality_check: "质检中",
  repairing: "返修中",
  awaiting_review: "待教师确认",
  published: "已发布",
  failed: "失败",
  canceled: "已取消",
  cancelled: "已取消",
};

/**
 *
 * @param value
 */
function teacherFacingInstruction(value) {
  return String(value || "")
    .replaceAll(/[(（]题目id[:：]\s*[^\s)）]+[)）]/gi, "")
    .replaceAll(/题目id[:：]\s*[\w-]+__[\w-]+/gi, "")
    .replaceAll(/\s{2,}/g, " ")
    .trim();
}

/**
 *
 * @param root0
 * @param root0.plan
 * @param root0.stepStatuses
 * @param root0.runLink
 * @param root0.executing
 * @param root0.onConfirm
 * @param root0.onCancel
 */
export default function TeacherAgentPlan({
  plan,
  stepStatuses,
  runLink,
  executing,
  onConfirm,
  onCancel,
}) {
  if (!plan) return null;
  const statuses = plan.steps.map((step) => stepStatuses[step.id] || "pending");
  const canConfirm = statuses.every((status) => status === "pending");
  const hasFailed = statuses.includes("failed");
  const allCompleted =
    statuses.length > 0 && statuses.every((status) => status === "completed");
  const backgroundSubmitted = statuses.includes("submitted");
  const canRetryReadOnly =
    hasFailed &&
    plan.steps.length === 1 &&
    plan.steps[0]?.kind === "inspect_lesson";
  const containsBackgroundTask = plan.steps.some((step) =>
    [
      "generate_whole_lesson",
      "complete_missing_content",
      "repair_quality_issues",
    ].includes(step.kind),
  );
  return (
    <section className="teacher-agent-plan" aria-label="教师智能体执行计划">
      <header>
        <div>
          <strong>{plan.summary}</strong>
          <small>
            {executing
              ? plan.confirmationRequired
                ? "正在执行教师已确认的计划"
                : "正在执行只读检查，不会修改内容"
              : hasFailed
                ? plan.confirmationRequired
                  ? "执行未完成；已完成步骤仍保留，未自动重放"
                  : "只读检查未完成，没有修改课时内容"
                : backgroundSubmitted
                  ? "后台任务已提交，刷新页面后仍会恢复进度和结果"
                  : allCompleted
                    ? plan.confirmationRequired
                      ? "执行已完成，结果已保存为待教师确认内容"
                      : "只读检查已完成，没有修改课时内容"
                    : plan.confirmationRequired
                      ? containsBackgroundTask
                        ? "尚未开始；确认后提交后台任务并持续质检"
                        : "尚未开始；确认后按顺序执行并写入课时草稿"
                      : "准备执行只读检查，不会修改内容"}
          </small>
          {runLink?.runId && (
            <small className="teacher-agent-plan-run">
              <Clock3 aria-hidden="true" />
              后台任务 · {runStatusLabels[runLink.backendStatus] || "已提交"}
            </small>
          )}
        </div>
      </header>
      <ol>
        {plan.steps.map((step, index) => {
          const status = stepStatuses[step.id] || "pending";
          return (
            <li key={step.id} data-status={status}>
              <span className="teacher-agent-plan-icon">
                {statusIcon(status)}
              </span>
              <div>
                <strong>
                  {index + 1}. {toolLabels[step.kind] || "处理内容"}
                </strong>
                <p>
                  {teacherFacingInstruction(step.instruction || plan.summary)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {!executing &&
        (hasFailed || (plan.confirmationRequired && canConfirm)) && (
          <footer>
            <button
              className="teacher-agent-plan-secondary"
              type="button"
              onClick={onCancel}
            >
              <X aria-hidden="true" />
              {hasFailed ? "关闭计划" : "取消"}
            </button>
            {canConfirm && (
              <button
                className="teacher-agent-plan-primary"
                type="button"
                onClick={onConfirm}
              >
                <Play aria-hidden="true" />
                确认执行
              </button>
            )}
            {canRetryReadOnly && (
              <button
                className="teacher-agent-plan-primary"
                type="button"
                onClick={onConfirm}
              >
                <RefreshCw aria-hidden="true" />
                重新检查
              </button>
            )}
          </footer>
        )}
    </section>
  );
}
