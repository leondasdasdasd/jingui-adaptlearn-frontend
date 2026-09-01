import { trans } from "../../../utils/i18n";
import { questionResultState } from "../domain/questionResult";

const pendingCopies = Object.freeze({
  pending: ["adaptiveLearning.result.pending", "待补充"],
  unanswered: ["adaptiveLearning.result.unanswered", "未作答"],
  scorePending: ["adaptiveLearning.result.scorePending", "正确率待补充"],
});

const questionTypeCopies = Object.freeze({
  single_choice: ["adaptiveLearning.assessment.type.singleChoice", "单选题"],
  multiple_choice: [
    "adaptiveLearning.assessment.type.multipleChoice",
    "多选题",
  ],
  fill_blank: ["adaptiveLearning.assessment.type.fillBlank", "填空题"],
  short_answer: ["adaptiveLearning.assessment.type.shortAnswer", "问答题"],
  judgement: ["adaptiveLearning.assessment.type.judgement", "判断题"],
  ordering: ["adaptiveLearning.assessment.type.ordering", "排序题"],
  classification: [
    "adaptiveLearning.assessment.type.classification",
    "分类题",
  ],
  matching: ["adaptiveLearning.assessment.type.matching", "匹配题"],
  line_connect: ["adaptiveLearning.assessment.type.lineConnect", "连线题"],
  text_marker: ["adaptiveLearning.assessment.type.textMarker", "文本标记题"],
  word_builder: ["adaptiveLearning.assessment.type.wordBuilder", "组式题"],
});

const questionStateCopies = Object.freeze({
  correct: ["adaptiveLearning.result.correct", "正确"],
  partial: ["adaptiveLearning.result.partial", "部分正确"],
  incorrect: ["adaptiveLearning.result.incorrect", "错误"],
  pending: ["adaptiveLearning.result.pending", "待补充"],
});

function localizedPendingCopy(pendingKind) {
  const copy = pendingCopies[pendingKind] || pendingCopies.pending;
  return trans(copy[0], copy[1]);
}

/**
 * 按当前语言展示平台题型名称。
 * @param {string} questionType 稳定题型标识
 * @returns {string} 本地化题型名称
 */
export function localizedQuestionType(questionType) {
  const copy = questionTypeCopies[questionType];
  return copy
    ? trans(copy[0], copy[1])
    : trans("adaptiveLearning.history.otherQuestionType", "其他题型");
}

/**
 * 按当前语言展示题目结果状态。
 * @param {"correct" | "partial" | "incorrect" | "pending"} state 稳定结果状态
 * @param {"pending" | "unanswered" | "scorePending"} pendingKind 待定文案场景
 * @returns {string} 本地化状态名称
 */
export function localizedQuestionState(state, pendingKind = "pending") {
  if (state === "pending") return localizedPendingCopy(pendingKind);
  const copy = questionStateCopies[state] || questionStateCopies.pending;
  return trans(copy[0], copy[1]);
}

/**
 * 按当前语言格式化稳定题目结果状态。
 * @param {number | string | null | undefined} scoreRatio 得分率
 * @param {"pending" | "unanswered" | "scorePending"} pendingKind 待定文案场景
 * @returns {string} 本地化结果文案
 */
export function localizedQuestionResult(scoreRatio, pendingKind = "pending") {
  const state = questionResultState(scoreRatio);
  if (state === "pending") return localizedPendingCopy(pendingKind);
  if (state === "correct")
    return trans("adaptiveLearning.result.correct", "正确");
  if (state === "incorrect")
    return trans("adaptiveLearning.result.incorrect", "错误");
  return trans(
    "adaptiveLearning.result.correctRateValue",
    "正确率 {$percent}%",
    { percent: Math.round(Number(scoreRatio) * 100) },
  );
}
