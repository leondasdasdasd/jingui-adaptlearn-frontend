import { locale, trans } from "../../../utils/i18n";

const HELP_REASON_COPY = new Map([
  ["CANNOT_UNDERSTAND", ["help.cannotUnderstand", "看不懂题目"]],
  ["CANNOT_START", ["help.cannotStart", "不知道从哪里开始"]],
  ["STUCK", ["help.stuck", "做到一半卡住了"]],
  [
    "CONTENT_OR_DEVICE_ISSUE",
    ["help.contentOrDevice", "题目或设备有问题"],
  ],
]);
const COMPOSITE_PRACTICE_STAGE = ["stage.compositePractice", "综合练习"];

const STAGE_COPY = new Map([
  ["PRE_ASSESSMENT", ["stage.preAssessment", "课前小测"]],
  ["pre_assessment", ["stage.preAssessment", "课前小测"]],
  ["LEARNING", ["stage.interactiveLearning", "互动学习"]],
  ["openmaic_learning", ["stage.interactiveLearning", "互动学习"]],
  ["knowledge_learning", ["stage.knowledgeLearning", "知识点学习"]],
  ["composite_learning", ["stage.lessonLearning", "课时学习"]],
  ["PRACTICE", ["stage.knowledgePractice", "知识点练习"]],
  ["knowledge_practice", ["stage.knowledgePractice", "知识点练习"]],
  ["knowledge_verification", ["stage.verification", "重新验证"]],
  ["CHECK_IN", ["stage.review", "错题回顾"]],
  ["check_in", ["stage.review", "错题回顾"]],
  ["knowledge_checkpoint", ["stage.summary", "学习小结"]],
  ["remediation", ["stage.remediation", "重点讲解"]],
  ["revalidation", ["stage.verification", "重新验证"]],
  ["POST_ASSESSMENT", COMPOSITE_PRACTICE_STAGE],
  ["post_assessment", COMPOSITE_PRACTICE_STAGE],
  ["composite_review", COMPOSITE_PRACTICE_STAGE],
  ["SETTLED", ["stage.ended", "已结束"]],
]);

/** 统一读取实时课堂当前语言文案。 */
export function liveText(key, fallback, replacements = {}) {
  return trans(`adaptiveLearning.live.${key}`, fallback, replacements);
}

/**
 *
 * @param value
 */
export function shortTime(value) {
  if (!value) return liveText("justNow", "刚刚");
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );
  return minutes < 1
    ? liveText("justNow", "刚刚")
    : liveText("waitingMinutes", "等待 {$count} 分钟", { count: minutes });
}

/**
 *
 * @param isoString
 */
export function formatCardTime(isoString) {
  if (!isoString) return liveText("justNow", "刚刚");
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return liveText("justNow", "刚刚");
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMinutes < 1) return liveText("justNow", "刚刚");
  if (diffMinutes < 60)
    return liveText("minutesAgo", "{$count} 分钟前", {
      count: diffMinutes,
    });
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString(locale(), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (isToday) return liveText("todayAt", "今天 {$time}", { time: timeStr });
  return new Intl.DateTimeFormat(locale(), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 *
 * @param value
 */
export function snapshotText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.text || value.stem || value.answer || "";
}

/**
 *
 * @param request
 */
export function supportSourceLabel(request) {
  if (request.learningPeriodId)
    return liveText("source.classroom", "正式课堂");
  if (request.contextType === "PRACTICE")
    return liveText("source.practice", "自主练习");
  if (request.contextType === "ASSESSMENT")
    return liveText("source.assessment", "学习测验");
  if (request.contextType === "LEARNING")
    return liveText("source.learning", "互动学习");
  if (request.contextType === "KNOWLEDGE_MAP")
    return liveText("source.knowledgeMap", "知识图谱");
  return liveText("source.selfStudy", "自主学习");
}

/** 将求助原因代码转换为本地化描述。 */
export function helpReasonLabel(reasonCode) {
  const [key, fallback] = HELP_REASON_COPY.get(reasonCode) || [
    "help.other",
    "需要教师帮助",
  ];
  return liveText(key, fallback);
}

/** 将学生会话阶段码映射为本地化名称。 */
export function liveStageLabel(stageCode) {
  const [key, fallback] = STAGE_COPY.get(stageCode) || [
    "stage.learning",
    "学习中",
  ];
  return liveText(key, fallback);
}

/** 将预警证据映射为当前语言，数值证据保持不变。 */
export function liveWarningLabel(warning) {
  if (warning?.type === "inactive")
    return liveText("warning.inactive", "连续 {$count} 分钟无学习变化", {
      count: warning.minutes,
    });
  if (warning?.type === "slow_question")
    return liveText("warning.slowQuestion", "单题已停留 {$count} 分钟", {
      count: warning.minutes,
    });
  if (warning?.type === "consecutive_errors")
    return liveText("warning.consecutiveErrors", "连续三题未通过");
  return liveText("warning.generic", "需要关注");
}

const CONTENT_FORMATTERS = new Map([
  ["question", (descriptor) => descriptor.text || "—"],
  ["settled", () => liveText("content.settled", "课堂学习已完成")],
  [
    "knowledgeExplanation",
    (descriptor) =>
      liveText("content.knowledgeExplanation", "{$name} · 单点讲解", {
        name: descriptor.name,
      }),
  ],
  [
    "lessonExplanation",
    (descriptor) =>
      liveText("content.lessonExplanation", "{$name} · 综合讲解", {
        name:
          descriptor.name || liveText("defaultTitle", "自适应互动课堂"),
      }),
  ],
  [
    "remediation",
    (descriptor) =>
      liveText("content.remediation", "{$name} · 重点讲解", {
        name: descriptor.name,
      }),
  ],
  [
    "review",
    (descriptor) =>
      liveText("content.review", "{$name} · 错题回顾", {
        name: descriptor.name,
      }),
  ],
  [
    "knowledgeStage",
    (descriptor) =>
      liveText("content.knowledgeStage", "{$name} · {$stage}", {
        name: descriptor.name,
        stage: liveStageLabel(descriptor.stageCode),
      }),
  ],
]);

/** 将稳定内容描述转换为实时表格副标题。 */
export function liveCurrentContent(student) {
  const descriptor = student?.currentContentDescriptor || {};
  const formatter = CONTENT_FORMATTERS.get(descriptor.kind);
  return formatter
    ? formatter(descriptor)
    : liveStageLabel(descriptor.stageCode || student?.stageCode);
}

/**
 *
 * @param error
 */
export function classroomActionError(error) {
  if (error?.message === "Failed to fetch" || error instanceof TypeError) {
    return liveText(
      "serviceUnavailable",
      "无法连接课堂服务，请确认服务已启动后重试",
    );
  }
  return liveText("endFailed", "下课结算失败，请稍后重试");
}
