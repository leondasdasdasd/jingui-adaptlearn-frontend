import { locale, trans } from "../../../utils/i18n";

/**
 * @param {string} key 花名册文案键
 * @param {string} fallback 中文缺省文案
 * @param {object} replacements 插值字段
 * @returns {string} 当前语言的花名册文案
 */
export const classRosterText = (key, fallback, replacements = {}) =>
  trans(`adaptiveLearning.classRoster.${key}`, fallback, replacements);

/**
 * @param {unknown} value 最近活动时间
 * @returns {string} 当前语言的时间文案
 */
export function classRosterTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale(), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * @param {string} status 凭证状态
 * @returns {{tone: string, label: string}} 状态展示模型
 */
export function classRosterCredentialStatus(status) {
  if (status === "ACTIVE")
    return {
      tone: "info",
      label: classRosterText("credential.active", "链接有效"),
    };
  if (status === "REVOKED")
    return {
      tone: "muted",
      label: classRosterText("credential.revoked", "已停用"),
    };
  return {
    tone: "muted",
    label: classRosterText("credential.notIssued", "未生成"),
  };
}

/**
 * @param {string} operation 操作类型
 * @returns {string} 对用户安全的失败文案
 */
export function classRosterOperationFailed(operation) {
  const copy = new Map([
    ["rotate", ["notice.rotateFailed", "链接生成失败，请稍后重试。"]],
    [
      "rotateAll",
      ["notice.rotateAllFailed", "全班链接生成失败，请稍后重试。"],
    ],
    ["revoke", ["notice.revokeFailed", "链接停用失败，请稍后重试。"]],
  ]);
  const [key, fallback] = copy.get(operation) || copy.get("rotate");
  return classRosterText(key, fallback);
}
