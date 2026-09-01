import { trans } from "../../../utils/i18n";

const liveText = (key, fallback, replacements = {}) =>
  trans(`adaptiveLearning.live.${key}`, fallback, replacements);

export function shortTime(value) {
  if (!value) return liveText("justNow", "刚刚");
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return minutes < 1 ? liveText("justNow", "刚刚") : liveText("waitingMinutes", "等待 {$count} 分钟", { count: minutes });
}

export function snapshotText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.text || value.stem || value.answer || "";
}

export function supportSourceLabel(request) {
  if (request.learningPeriodId) return liveText("source.classroom", "正式课堂");
  if (request.contextType === "PRACTICE") return liveText("source.practice", "自主练习");
  if (request.contextType === "ASSESSMENT") return liveText("source.assessment", "学习测验");
  return liveText("source.selfStudy", "自主学习");
}

export function helpReasonLabel(reasonCode) {
  return reasonCode === "CUSTOM"
    ? liveText("help.custom", "需要教师帮助")
    : liveText("help.other", "需要教师帮助");
}
