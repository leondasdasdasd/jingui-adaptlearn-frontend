import { trans } from "../../../utils/i18n";
import {
  isMasteredValue,
  MASTERY_THRESHOLD,
} from "../../shared/domain/masteryPolicy.js";
import { difficultyBadgeTagText } from "../difficulty-badge/presentation";

const copyKeys = Object.freeze({
  summary: "adaptiveLearning.checkpoint.summary",
  questionDetail: "adaptiveLearning.checkpoint.questionDetail",
  questionNavigation: "adaptiveLearning.checkpoint.questionNavigation",
  questionAndAnswer: "adaptiveLearning.checkpoint.questionAndAnswer",
  correctAnswer: "adaptiveLearning.quiz.correctAnswer",
  errorReason: "adaptiveLearning.feedback.errorReason",
  improvement: "adaptiveLearning.feedback.improvement",
  questionEvidence: "adaptiveLearning.checkpoint.questionEvidence",
  masteryChange: "adaptiveLearning.checkpoint.masteryChange",
  settledMastery: "adaptiveLearning.checkpoint.settledMastery",
  confidence: "adaptiveLearning.result.confidence",
  correctStreak: "adaptiveLearning.checkpoint.correctStreak",
  backToSummary: "adaptiveLearning.checkpoint.backToSummary",
  sectionComplete: "adaptiveLearning.checkpoint.sectionComplete",
  sectionTargetReached: "adaptiveLearning.checkpoint.sectionTargetReached",
  currentKnowledgePoint: "adaptiveLearning.checkpoint.currentKnowledgePoint",
  roundPerformance: "adaptiveLearning.checkpoint.roundPerformance",
  roundAnswers: "adaptiveLearning.checkpoint.roundAnswers",
  questionUnit: "adaptiveLearning.result.questionUnit",
  completedLabel: "adaptiveLearning.checkpoint.completedLabel",
  scoreRate: "adaptiveLearning.result.scoreRate",
  masteryRate: "adaptiveLearning.result.masteryRate",
  knowledgeMastery: "adaptiveLearning.feedback.knowledgeMastery",
  roundQuestions: "adaptiveLearning.result.roundQuestions",
  noIncorrectQuestions: "adaptiveLearning.result.noIncorrectQuestions",
  returnToLearningList: "adaptiveLearning.checkpoint.returnToLearningList",
  continueLearning: "adaptiveLearning.quiz.continueLearning",
  pending: "adaptiveLearning.result.pending",
});

/**
 * 返回知识检查点静态文案。
 * @returns {object} 当前语言文案
 */
export function knowledgeCheckpointCopy() {
  return Object.fromEntries(
    Object.entries(copyKeys).map(([name, key]) => [name, trans(key)]),
  );
}

/**
 * 返回带插值的知识检查点文案。
 * @param {string} key 文案后缀
 * @param {object} params 插值参数
 * @returns {string} 当前语言文案
 */
export function knowledgeCheckpointText(key, params = {}) {
  return trans(`adaptiveLearning.checkpoint.${key}`, undefined, params);
}

/**
 * 返回题目导航按钮的完整可访问性文案。
 * @param {object} input 题目展示状态
 * @returns {string} 当前语言的题目说明
 */
export function knowledgeCheckpointQuestionAria(input) {
  return knowledgeCheckpointText("questionAria", {
    ...input,
    difficulty: difficultyBadgeTagText(input.difficulty),
  });
}

/**
 * 使用当前语言的分隔符拼接答案。
 * @param {string[]} values 已映射的答案文本
 * @param {string} emptyKey 无答案时使用的文案后缀
 * @returns {string} 答案展示文本
 */
export function knowledgeCheckpointAnswerText(
  values = [],
  emptyKey = "answerUnavailable",
) {
  return values.join(trans("adaptiveLearning.result.answerSeparator")) ||
    knowledgeCheckpointText(emptyKey);
}

/**
 * 格式化题目导航中的掌握度变化。
 * @param {number | null | undefined} delta 掌握度变化百分点
 * @returns {string} 当前语言的变化描述
 */
export function knowledgeCheckpointMasteryChange(delta) {
  if (delta == null) return knowledgeCheckpointText("masteryChangePending");
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "steady";
  return knowledgeCheckpointText(`masteryChange.${direction}`, {
    value: Math.abs(delta).toFixed(1),
  });
}

/**
 * 优先依据掌握度与连续证据判断下一步提示。
 * @param {object} metrics 本轮学习指标
 * @param {number} metrics.answered 已作答数量
 * @param {number | null | undefined} metrics.masteryAfter 当前掌握度
 * @param {number | null | undefined} metrics.correctStreak 连续答对数量
 * @returns {string} 有明确证据时的提示，否则为空
 */
function masteryEvidenceEncouragement({
  answered,
  masteryAfter,
  correctStreak,
}) {
  if (!answered) return knowledgeCheckpointText("encouragement.start");
  if (!Number.isFinite(Number(masteryAfter))) return "";
  if (!isMasteredValue(masteryAfter)) {
    return knowledgeCheckpointText("encouragement.belowTarget", {
      answered,
      mastery: Math.round(Number(masteryAfter)),
      threshold: MASTERY_THRESHOLD,
    });
  }
  if (Number(correctStreak) >= 2) return "";
  return knowledgeCheckpointText("encouragement.unstableEvidence", {
    threshold: MASTERY_THRESHOLD,
    streak: Math.max(0, Number(correctStreak) || 0),
  });
}

/**
 * 根据本轮证据返回下一步鼓励语。
 * @param {object} metrics 本轮学习指标
 * @param {number} metrics.correctRate 本轮正确率
 * @param {number} metrics.answered 已作答数量
 * @param {number | null | undefined} metrics.masteryAfter 当前掌握度
 * @param {number | null | undefined} metrics.correctStreak 连续答对数量
 * @returns {string} 当前语言鼓励语
 */
export function knowledgeCheckpointEncouragement({
  correctRate,
  answered,
  masteryAfter,
  correctStreak,
}) {
  const evidenceGuidance = masteryEvidenceEncouragement({
    answered,
    masteryAfter,
    correctStreak,
  });
  if (evidenceGuidance) return evidenceGuidance;
  if (correctRate >= 80)
    return knowledgeCheckpointText("encouragement.strong");
  if (correctRate >= 60)
    return knowledgeCheckpointText("encouragement.steady");
  return knowledgeCheckpointText("encouragement.keepGoing");
}
