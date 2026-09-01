export const COMPOSER_MIN_HEIGHT = 32;
const COMPOSER_MAX_HEIGHT = 160;

export const BACKGROUND_STEP_KINDS = new Set([
  "generate_whole_lesson",
  "complete_missing_content",
  "repair_quality_issues",
]);

/**
 *
 * @param plan
 */
export function planWithIdentity(plan) {
  return {
    ...plan,
    executionId:
      plan.executionId ||
      `teacher-agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: plan.createdAt || new Date().toISOString(),
  };
}

/**
 *
 * @param status
 */
export function backendPlanStepStatus(status) {
  if (["queued", "running", "quality_check", "repairing"].includes(status))
    return "submitted";
  if (["awaiting_review", "published"].includes(status)) return "completed";
  if (["failed", "canceled", "cancelled"].includes(status)) return "failed";
  return "";
}

/**
 *
 * @param textarea
 */
export function resizeComposer(textarea) {
  textarea.style.height = `${COMPOSER_MIN_HEIGHT}px`;
  const nextHeight = Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
}

/**
 *
 * @param result
 */
export function inspectResultMessage(result) {
  if (
    !result ||
    typeof result !== "object" ||
    typeof result.passed !== "boolean"
  )
    return "";
  const issues = Array.isArray(result.issues)
    ? result.issues.filter((issue) => issue?.message)
    : [];
  if (result.passed || issues.length === 0) {
    return "检查完成：没有发现阻碍发布的问题，本次只读检查没有修改课时内容。";
  }
  return [
    `检查完成：发现 ${issues.length} 项需要处理，本次只读检查没有修改课时内容。`,
    ...issues.map((issue, index) => `${index + 1}. ${issue.message}`),
    "如果需要我处理，可以继续说“修复这些问题”；我会先列出写入计划，等你确认后再提交返修。",
  ].join("\n");
}

const backgroundToolTitles = {
  generate_whole_lesson: "整课生成",
  complete_missing_content: "自动补全",
  repair_quality_issues: "问题返修",
};

/**
 *
 * @param title
 * @param status
 * @param completedModules
 */
function completedToolReceipt(title, status, completedModules) {
  const readyCopy =
    completedModules.length > 0
      ? `当前已就绪：${completedModules.join("、")}。`
      : "";
  const publishCopy = {
    awaiting_review:
      "修改已保存为待确认内容，请预览后再发布；教师智能体不会代替你发布。",
    published: "内容已由教师确认发布。",
  }[status];
  return [
    `${title}已完成：已按教师确认的要求处理内容，并通过复检。`,
    readyCopy,
    publishCopy,
    "如果结果还不符合要求，可以继续说“还是没处理好，保留……，只修改……”。",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 *
 * @param root0
 * @param root0.kind
 * @param root0.task
 * @param root0.modules
 */
export function backgroundToolReceipt({ kind, task, modules = [] }) {
  const title = backgroundToolTitles[kind] || "后台处理";
  const issues = Array.isArray(task?.issues)
    ? task.issues.filter((issue) => issue?.message)
    : [];
  const completedModules = modules
    .filter((module) => module?.complete)
    .map((module) => module.label)
    .filter(Boolean);
  const status = task?.backendStatus || task?.phase;
  if (
    ["awaiting_review", "published"].includes(status) &&
    issues.length === 0
  ) {
    return completedToolReceipt(title, status, completedModules);
  }
  return [
    `${title}未全部完成：${task?.message || "还有内容需要处理"}。`,
    ...issues.map((issue, index) => `${index + 1}. ${issue.message}`),
    "已完成的内容会保留。你可以继续说“修复这些问题”，或补充保留项和禁改项；我会重新列出写入计划等你确认。",
  ].join("\n");
}

/**
 *
 * @param question
 */
function questionLabel(question) {
  if (question?.section === "pre") return `课前测验第 ${question.number} 题`;
  if (question?.section === "review") return `综合练习第 ${question.number} 题`;
  return `单点题池第 ${question?.number || ""} 题`.replace(
    "第  题",
    "中的命中题目",
  );
}

/**
 *
 * @param questionId
 */
function fallbackQuestionLabel(questionId) {
  const id = String(questionId || "");
  if (id.includes("__pre-assessment__")) return "课前测验中的命中题目";
  if (id.includes("__composite-review__")) return "综合练习中的命中题目";
  if (id.includes("__knowledge-questions")) return "单点题池中的命中题目";
  return "命中题目";
}

/**
 *
 * @param value
 * @param questions
 */
export function teacherFacingMessage(value, questions = []) {
  let text = String(value || "");
  for (const question of [...questions]
    .filter((question) => question?.id)
    .sort((left, right) => String(right.id).length - String(left.id).length)) {
    const id = String(question.id);
    const label = questionLabel(question);
    text = text.split(`题目 ${id}`).join(label).split(id).join(label);
  }
  return text.replaceAll(/题目\s+([\w-]+__[\w-]+)/g, (_match, id) =>
    fallbackQuestionLabel(id),
  );
}

/**
 *
 * @param scope
 */
export function scopeCopy(scope) {
  const copyByScope = {
    whole: {
      title: "教材课时内容",
      welcome:
        "我可以理解你的自然语言，检查、生成、补全或修改整课内容；涉及写入时会先列出执行计划。",
      placeholder: "例如：处理一下当前问题；检查并修复重复题；只重做第 4 题…",
    },
    pre: {
      title: "课前测验",
      welcome: "这里的调整会保存为未发布修改，完成后可由老师发布。",
      placeholder: "例如：增加两道能区分基准理解的题，减少直接记忆题…",
      success: "课前测验题已经生成并保存为未发布修改。",
    },
    review: {
      title: "综合练习",
      welcome: "仅调整综合练习；生成内容先进入草稿。",
      placeholder: "例如：增加两道跨知识点综合题，并拉开难度梯度…",
      success: "综合练习已经生成并保存为未发布修改。",
    },
  };
  return (
    copyByScope[scope] || {
      title: "单点题池",
      welcome: "仅调整单点题池；生成内容先进入草稿。",
      placeholder: "例如：每个知识点补一题进阶问答题，并保留明显难度梯度…",
      success: "单点题池已经生成并保存为未发布修改。",
    }
  );
}

/**
 *
 * @param task
 * @param modules
 * @param publishing
 * @param phase
 */
function lessonPhaseStatus(phase) {
  const statusByPhase = {
    generating: { label: "处理中", tone: "running", running: true },
    validating: { label: "处理中", tone: "running", running: true },
    repairing: { label: "处理中", tone: "running", running: true },
    published: { label: "已发布", tone: "success", running: false },
    dirty: { label: "有修改", tone: "warning", running: false },
    stopped: { label: "已停止", tone: "warning", running: false },
    canceled: { label: "已停止", tone: "warning", running: false },
    cancelled: { label: "已停止", tone: "warning", running: false },
  };
  return statusByPhase[phase] || null;
}

const exceptionalLessonStatuses = {
  publishing: { label: "教师确认发布中", tone: "running", running: true },
  ready: { label: "待教师确认", tone: "warning", running: false },
  failed: { label: "需处理", tone: "danger", running: false },
};

/**
 *
 * @param task
 * @param modules
 * @param publishing
 */
export function lessonAgentStatus(task, modules, publishing) {
  const phase = task?.phase || "idle";
  const hasIssues = Boolean(task?.issues?.length);
  const exceptionalStatus = publishing
    ? exceptionalLessonStatuses.publishing
    : hasIssues
      ? exceptionalLessonStatuses.failed
      : exceptionalLessonStatuses[phase];
  if (exceptionalStatus) return exceptionalStatus;
  const phaseStatus = lessonPhaseStatus(phase);
  if (phaseStatus) return phaseStatus;
  const allReady =
    Boolean(modules?.length) && modules.every((module) => module.complete);
  return allReady
    ? { label: "内容已就绪", tone: "success", running: false }
    : { label: "尚未完成", tone: "muted", running: false };
}

/**
 * @param root0
 * @param root0.planning
 * @param root0.executing
 * @param root0.lessonActionsDisabled
 * @param root0.wholeLesson
 * @param root0.copy
 * @param root0.lessonTask
 * @param root0.generationStatus
 */
export function processingPresentation({
  planning,
  executing,
  lessonActionsDisabled,
  wholeLesson,
  copy,
  lessonTask,
  generationStatus,
}) {
  if (planning) {
    return {
      title: "正在理解你的要求",
      message: "正在结合当前课时、任务状态和最近对话规划下一步…",
    };
  }
  if (executing) {
    return {
      title: "正在执行已确认的计划",
      message: "正在按计划调用已授权工具，结果会保存到草稿或后台任务。",
    };
  }
  return {
    title: processingTitle(lessonActionsDisabled, wholeLesson, copy.title),
    message: processingMessage(
      wholeLesson,
      lessonTask.message,
      generationStatus?.message,
    ),
  };
}

/**
 *
 * @param lessonActionsDisabled
 * @param wholeLesson
 * @param scopeTitle
 */
function processingTitle(lessonActionsDisabled, wholeLesson, scopeTitle) {
  if (lessonActionsDisabled) return "正在按教师确认发布整课内容";
  return wholeLesson ? "正在处理整课内容" : `正在生成${scopeTitle}`;
}

/**
 *
 * @param wholeLesson
 * @param lessonMessage
 * @param generationMessage
 */
function processingMessage(wholeLesson, lessonMessage, generationMessage) {
  if (wholeLesson) return lessonMessage || "正在执行你的要求…";
  return generationMessage || "正在理解你的要求并组织题目…";
}

/**
 * @param root0
 * @param root0.stopLesson
 * @param root0.busy
 * @param root0.blocked
 * @param root0.draft
 * @param root0.placeholder
 */
export function composerPresentation({
  stopLesson,
  busy,
  blocked,
  draft,
  placeholder,
}) {
  if (stopLesson) {
    return {
      label: "停止生成",
      title: "停止生成",
      disabled: false,
      placeholder: "整课任务运行中，停止后可继续输入…",
    };
  }
  if (busy) {
    return {
      label: "正在处理生成要求",
      title: "正在处理",
      disabled: true,
      placeholder: "正在响应，请稍候…",
    };
  }
  if (blocked) {
    return {
      label: "发送生成要求",
      title: "发送（Enter）",
      disabled: true,
      placeholder: "整课任务运行中，停止后可继续输入…",
    };
  }
  return {
    label: "发送生成要求",
    title: "发送（Enter）",
    disabled: !draft.trim(),
    placeholder,
  };
}
