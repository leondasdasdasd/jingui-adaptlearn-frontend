import { trans } from "../../../utils/i18n";

const QUESTION_TYPE_KEYS = new Map([
  ["single_choice", "singleChoice"],
  ["multiple_choice", "multipleChoice"],
  ["fill_blank", "fillBlank"],
  ["short_answer", "shortAnswer"],
  ["judgement", "judgement"],
  ["ordering", "ordering"],
  ["classification", "classification"],
  ["matching", "matching"],
  ["line_connect", "lineConnect"],
  ["text_marker", "textMarker"],
  ["word_builder", "wordBuilder"],
]);

/**
 * 返回练习页本地化题型名称。
 * @param questionType
 */
export function quizQuestionTypeLabel(questionType) {
  const key = QUESTION_TYPE_KEYS.get(questionType);
  return key
    ? trans(`adaptiveLearning.assessment.type.${key}`, "题目")
    : trans("adaptiveLearning.assessment.question", "题目");
}

/** 返回订正前重新读题的本地化引导。 */
export function correctionReadingGuideCopy() {
  return {
    title: trans(
      "adaptiveLearning.quiz.correctionReadingTitle",
      "先重新读题，再订正",
    ),
    description: trans(
      "adaptiveLearning.quiz.correctionReadingDescription",
      "重新读一遍题目，先找出“已知条件”和“问题要求”，再注意表示数量关系、范围和正负号的关键词。",
    ),
    reminder: trans(
      "adaptiveLearning.quiz.correctionReadingReminder",
      "已知条件是什么？题目最终要求什么？",
    ),
    confirmLabel: trans(
      "adaptiveLearning.quiz.correctionReadingConfirm",
      "我已读题，开始订正",
    ),
  };
}

/**
 * 返回自适应难度调整说明。
 * @param direction
 */
export function difficultyAdjustmentLabel(direction) {
  return direction === "up"
    ? trans("adaptiveLearning.quiz.difficultyUp", "下一题增加一点挑战")
    : trans("adaptiveLearning.quiz.difficultyDown", "下一题先巩固关键步骤");
}

/**
 * 返回历史作答浏览的下一步动作。
 * @param index
 * @param resumeIndex
 */
export function historyNavigationLabel(index, resumeIndex) {
  return index + 1 < Number(resumeIndex || 0)
    ? trans("adaptiveLearning.quiz.nextQuestion", "下一题")
    : trans("adaptiveLearning.quiz.returnCurrentQuestion", "返回当前题");
}

/**
 * 根据提交链路的权威状态返回主操作文案。
 * @param {object} state 提交中与批改失败状态。
 * @param {boolean} state.submitting 是否正在提交。
 * @param {string | boolean | null} state.gradingError 批改错误状态。
 * @returns {string} 当前主操作文案。
 */
export function quizSubmitLabel({ submitting, gradingError }) {
  if (submitting) {
    return trans("adaptiveLearning.quiz.grading", "正在批改…");
  }
  if (gradingError) {
    return trans("adaptiveLearning.quiz.retryGrading", "重新提交批改");
  }
  return trans("adaptiveLearning.quiz.submitAnswer", "提交答案");
}

const PROGRESS_ACTION_COPY = new Map([
  ["resubmit", ["adaptiveLearning.quiz.resubmit", "重新提交"]],
  ["retry-answer", ["adaptiveLearning.quiz.retryAnswer", "重新作答"]],
  [
    "review-problem",
    ["adaptiveLearning.quiz.reviewProblemTogether", "一起看看问题在哪"],
  ],
  ["continue-learning", ["adaptiveLearning.quiz.continueLearning", "继续学习"]],
  ["continue", ["adaptiveLearning.quiz.continue", "继续"]],
  ["next-question", ["adaptiveLearning.quiz.nextQuestion", "下一题"]],
]);

/**
 * 将 application 提供的主命令语义转换为本地化文案。
 * @param kind
 * @param correctionConfirmLabel
 */
export function quizProgressActionLabel(kind, correctionConfirmLabel) {
  if (kind === "confirm-correction") return correctionConfirmLabel;
  const copy =
    PROGRESS_ACTION_COPY.get(kind) || PROGRESS_ACTION_COPY.get("next-question");
  return trans(copy[0], copy[1]);
}
