import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  LoaderCircle,
} from "lucide-react";

const phaseCopy = {
  generating: "正在生成缺失内容，已完成的模块会立即保存到草稿。",
  validating: "正在按发布规则检查题量、答案、难度和课堂内容。",
  repairing: "发现未满足项，AI 正在自动补全。",
  ready: "内容已通过完整性检查，等待教师预览确认。",
  dirty: "内容有修改，可单独检查或自动补全；发布前会强制检查。",
  stopped: "已停止后续生成，已完成内容已经保存在草稿中。",
  failed: "自动处理暂未全部完成，可查看原因后再次补全。",
};

/**
 *
 * @param module
 * @param task
 */
function moduleStatus(module, task) {
  const runtime = task.moduleStatuses?.[module.id];
  if (runtime) return runtime;
  return module.complete ? "ready" : "missing";
}

/**
 *
 * @param items
 * @param task
 */
function combinedStatus(items, task) {
  const statuses = items.map((item) => moduleStatus(item, task));
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("generating")) return "generating";
  if (statuses.includes("queued")) return "queued";
  if (statuses.every((status) => status === "ready")) return "ready";
  return "missing";
}

/**
 *
 * @param modules
 * @param task
 */
function groupModules(modules, task) {
  const pre = modules.filter((module) => module.kind === "pre-assessment");
  const knowledgeQuestions = modules.filter(
    (module) => module.kind === "knowledge-questions",
  );
  const review = modules.filter((module) => module.kind === "composite-review");
  const compositeClassroom = modules.filter(
    (module) => module.kind === "composite-classroom",
  );
  const knowledgeClassrooms = modules.filter(
    (module) => module.kind === "knowledge-classroom",
  );
  return [
    {
      id: "pre",
      label: "课前测验",
      items: pre,
    },
    {
      id: "knowledge-questions",
      label: "单点题池",
      items: knowledgeQuestions,
    },
    {
      id: "review",
      label: "综合练习",
      items: review,
    },
    {
      id: "composite-classroom",
      label: "复合 MAIC 课堂",
      items: compositeClassroom,
    },
    {
      id: "knowledge-classrooms",
      label: "单点 MAIC 课堂",
      items: knowledgeClassrooms,
    },
  ]
    .filter((group) => group.items.length)
    .map((group) => ({
      ...group,
      status: combinedStatus(group.items, task),
      readyCount: group.items.filter(
        (item) => moduleStatus(item, task) === "ready",
      ).length,
      generatingCount: group.items.filter(
        (item) => moduleStatus(item, task) === "generating",
      ).length,
      durationSeconds: Math.max(
        0,
        ...group.items.map((item) =>
          Number(task.moduleProgress?.[item.id]?.durationSeconds || 0),
        ),
      ),
      queuePosition: Math.min(
        ...group.items.map((item) =>
          Number(
            task.moduleProgress?.[item.id]?.queuePosition ||
              Number.POSITIVE_INFINITY,
          ),
        ),
      ),
      activeItem: group.items.find(
        (item) => moduleStatus(item, task) === "generating",
      ),
    }));
}

/**
 *
 * @param root0
 * @param root0.modules
 * @param root0.task
 * @param root0.publishing
 */
export default function LessonContentGenerationPanel({
  modules,
  task,
  publishing = false,
}) {
  const groups = groupModules(modules, task);
  const readyCount = groups.filter((group) => group.status === "ready").length;
  const running = ["generating", "validating", "repairing"].includes(
    task.phase,
  );
  const taskBusy = running || publishing;
  const hasIssues = task.issues?.length > 0;
  const processStatus = taskBusy
    ? "active"
    : ["stopped", "canceled", "cancelled"].includes(task.phase)
      ? "cancelled"
      : task.phase === "failed" || hasIssues
        ? "attention"
        : task.phase === "ready" || task.phase === "published"
          ? "completed"
          : "idle";
  const [expanded, setExpanded] = useState(taskBusy);
  const statusMessage =
    hasIssues && task.phase === "ready"
      ? `检查发现 ${task.issues.length} 项问题，需要继续自动补全。`
      : task.message || phaseCopy[task.phase];
  const statusLabel = publishing
    ? "发布中"
    : running
      ? "执行中"
      : processStatus === "completed"
        ? task.phase === "published"
          ? "已发布"
          : "内容已就绪"
        : processStatus === "cancelled"
          ? "已停止"
          : processStatus === "attention"
            ? "需处理"
            : `${readyCount}/${groups.length} 类可用`;

  useEffect(() => {
    // A completed inspection with findings is still an actionable result. Keep
    // it visible instead of collapsing the task card as soon as validation
    // stops, otherwise teachers only see “检查已完成” but not what was found.
    setExpanded(taskBusy || hasIssues);
  }, [hasIssues, processStatus, taskBusy]);

  return (
    <section
      className="teacher-agent-task-card"
      data-process-status={processStatus}
      aria-busy={taskBusy}
      aria-label="整课内容任务"
    >
      <button
        className="teacher-agent-task-toggle"
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? "收起整课内容任务" : "展开整课内容任务"}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="teacher-agent-task-state-dot" aria-hidden="true" />
        <strong>整课内容任务</strong>
        <span className="teacher-agent-task-status" role="status">
          {statusLabel}
        </span>
        <ChevronDown
          className="teacher-agent-task-chevron"
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="teacher-agent-task-body">
          {statusMessage && (
            <p className="teacher-agent-task-message">{statusMessage}</p>
          )}
          <div
            className="teacher-agent-task-progress"
            role="progressbar"
            aria-label={`整课内容完成 ${readyCount}/${groups.length}`}
            aria-valuemin="0"
            aria-valuemax={groups.length}
            aria-valuenow={readyCount}
          >
            <span
              style={{
                width: `${groups.length > 0 ? (readyCount / groups.length) * 100 : 0}%`,
              }}
            />
          </div>

          <div
            className="teacher-agent-task-groups"
            aria-label="整课生成子任务"
          >
            {groups.map((group) => (
              <div
                className={`teacher-agent-task-group ${group.status}`}
                key={group.id}
              >
                <span
                  className="teacher-agent-task-group-icon"
                  aria-hidden="true"
                >
                  {group.status === "ready" ? (
                    <CheckCircle2 size={16} />
                  ) : group.status === "generating" ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <CircleDashed size={16} />
                  )}
                </span>
                <div>
                  <strong>{group.label}</strong>
                  <small>
                    {group.activeItem
                      ? `${group.readyCount}/${group.items.length} 已完成 · 正在生成：${group.activeItem.label}`
                      : group.status === "ready"
                        ? `${group.readyCount}/${group.items.length} 已完成并保存`
                        : `${group.readyCount}/${group.items.length} 已完成`}
                  </small>
                </div>
                <span className="teacher-agent-task-group-meta">
                  {group.durationSeconds > 0 && (
                    <>
                      <Clock3 size={13} />
                      {group.durationSeconds}s
                    </>
                  )}
                  {group.status === "queued"
                    ? Number.isFinite(group.queuePosition)
                      ? `排队第 ${group.queuePosition} 位`
                      : "排队中"
                    : group.status === "failed"
                      ? "需重试"
                      : ""}
                </span>
              </div>
            ))}
          </div>

          {task.issues?.length > 0 && (
            <div className="teacher-agent-task-issues" role="status">
              <strong>
                <AlertTriangle size={15} />
                还有 {task.issues.length} 项需要处理
              </strong>
              <ul>
                {task.issues.map((issue, index) => (
                  <li key={`${issue.code || index}-${issue.message}`}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
