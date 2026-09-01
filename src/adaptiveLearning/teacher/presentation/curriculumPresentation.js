import { trans } from "../../../utils/i18n";

const CONTENT_STATUS = new Map([
  ["published", ["content.published", "已发布", "success"]],
  ["unpublished", ["content.unpublished", "未发布", "warning"]],
  ["empty", ["content.empty", "未生成", "muted"]],
]);

const GENERATION_STATUS = new Map([
  ["idle", ["generation.idle", "暂无任务", "muted"]],
  ["queued", ["generation.queued", "排队中", "info"]],
  ["generating", ["generation.generating", "并行生成", "info"]],
  ["partial", ["generation.partial", "已保存部分内容", "info"]],
  ["reconnecting", ["generation.reconnecting", "正在重连", "warning"]],
  ["validating", ["generation.validating", "规则与 AI 质检", "info"]],
  ["repairing", ["generation.repairing", "定向返修", "warning"]],
  ["publishing", ["generation.publishing", "教师确认发布中", "info"]],
  ["completed", ["generation.completed", "已完成", "success"]],
  ["canceled", ["generation.canceled", "已取消", "muted"]],
  ["failed", ["generation.failed", "需重试", "error"]],
]);

const CATALOG_KEYS = new Map([
  ["subject:math", ["catalog.subject.math", "数学"]],
  ["subject:chinese", ["catalog.subject.chinese", "语文"]],
  ["subject:english", ["catalog.subject.english", "英语"]],
  ["subject:physics", ["catalog.subject.physics", "物理与科学"]],
  ["subject:chemistry", ["catalog.subject.chemistry", "化学"]],
  ["subject:biology", ["catalog.subject.biology", "生物"]],
  ["subject:history", ["catalog.subject.history", "历史与道法"]],
  ["grade:grade7-up", ["catalog.grade.grade7Up", "七年级上册"]],
  ["grade:grade7-down", ["catalog.grade.grade7Down", "七年级下册"]],
  ["grade:grade8-up", ["catalog.grade.grade8Up", "八年级上册"]],
  ["grade:grade8-down", ["catalog.grade.grade8Down", "八年级下册"]],
  ["grade:grade9-up", ["catalog.grade.grade9Up", "九年级上册"]],
  ["grade:grade9-down", ["catalog.grade.grade9Down", "九年级下册"]],
  ["publisher:zhejiang", ["catalog.publisher.zhejiang", "浙教版"]],
  ["publisher:pep", ["catalog.publisher.pep", "人教版"]],
  ["publisher:bnup", ["catalog.publisher.bnup", "北师大版"]],
  ["publisher:sukeh", ["catalog.publisher.sukeh", "苏科版"]],
  ["publisher:ecnu", ["catalog.publisher.ecnu", "华师大版"]],
]);

/**
 * 读取教师课程页当前语言文案。
 * @param {string} key 文案键
 * @param {string} fallback 中文缺省文案
 * @param {object} replacements 插值字段
 * @returns {string} 当前语言文案
 */
export const curriculumText = (key, fallback, replacements = {}) =>
  trans(`adaptiveLearning.curriculum.${key}`, fallback, replacements);

/**
 * @param {string} status 内容状态
 * @returns {{label: string, tone: string}} 内容状态展示模型
 */
export function curriculumContentStatus(status) {
  const [key, fallback, tone] =
    CONTENT_STATUS.get(status) || CONTENT_STATUS.get("empty");
  return { label: curriculumText(key, fallback), tone };
}

/**
 * @param {string} status 生成状态
 * @returns {{label: string, tone: string}} 生成状态展示模型
 */
export function curriculumGenerationStatus(status) {
  const [key, fallback, tone] =
    GENERATION_STATUS.get(status) || GENERATION_STATUS.get("idle");
  return { label: curriculumText(key, fallback), tone };
}

/**
 * @param {string} type 元数据类型
 * @param {string} id 元数据标识
 * @param {string} fallback 缺省名称
 * @returns {string} 当前语言的目录元数据名称
 */
export function curriculumCatalogLabel(type, id, fallback = "") {
  const copy = CATALOG_KEYS.get(`${type}:${id}`);
  return copy ? curriculumText(copy[0], copy[1]) : fallback;
}

/**
 * @param {string} operation 操作类型
 * @returns {string} 不暴露传输细节的操作错误
 */
export function curriculumOperationError(operation) {
  if (operation === "cancel")
    return curriculumText(
      "notice.cancelFailed",
      "取消生成任务失败，请稍后重试。",
    );
  return curriculumText(
    "notice.startFailed",
    "启动生成任务失败，请稍后重试。",
  );
}
