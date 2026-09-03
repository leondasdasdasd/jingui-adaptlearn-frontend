import { trans } from "../../../utils/i18n";

const STATUS_COPY = {
  mastered: ["mastered", "已掌握", "strengthen", "强化提升"],
  studying: ["studying", "学习中", "continueLearning", "继续学习"],
  needs_review: ["needsReview", "需要巩固", "review", "去巩固"],
  not_started: ["notStarted", "未开始", "startLearning", "去学习"],
};

const SOURCE_COPY = {
  preview: ["current", "本轮学习"],
  pre_assessment_preview: ["preAssessment", "课前诊断"],
  authoritative: ["authoritative", "学习记录"],
  recommendation: ["recommended", "系统推荐"],
  recommended: ["recommended", "系统推荐"],
};

export const knowledgeMapText = (key, fallback, replacements = {}) =>
  trans(`adaptiveLearning.knowledgeMap.${key}`, fallback, replacements);

/**
 * 将领域状态转换为知识图谱需要的本地化展示文案。
 * @param {string} status 知识点学习状态。
 * @returns {{label:string,actionText:string}} 状态展示文案。
 */
export function knowledgeMapStatusCopy(status) {
  const [labelKey, label, actionKey, actionText] =
    STATUS_COPY[status] || STATUS_COPY.not_started;
  return {
    label: knowledgeMapText(`status.${labelKey}`, label),
    actionText: knowledgeMapText(`action.${actionKey}`, actionText),
  };
}

/**
 * 将掌握度证据来源转换为页面标签，未知来源不展示。
 * @param {string} source 证据来源。
 * @returns {string} 本地化来源标签。
 */
export function knowledgeMapSourceLabel(source) {
  const copy = SOURCE_COPY[source];
  return copy ? knowledgeMapText(`source.${copy[0]}`, copy[1]) : "";
}
