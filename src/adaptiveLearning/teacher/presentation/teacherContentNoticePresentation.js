import { trans } from "../../../utils/i18n";

const PREFIX = "adaptiveLearning.contentNotice";

/**
 * 生成与发布流程统一从这里读取单语言通知。
 * @param key
 * @param replacements
 */
export function teacherContentNoticeText(key, replacements = {}) {
  return trans(`${PREFIX}.${key}`, undefined, replacements);
}
