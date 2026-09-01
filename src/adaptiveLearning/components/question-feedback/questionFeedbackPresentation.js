import { trans } from "../../../utils/i18n";
import { MASTERY_THRESHOLD } from "../../shared/domain/masteryPolicy";

const feedbackTitleCopies = Object.freeze({
  diagnosticSkipped: [
    "adaptiveLearning.feedback.diagnosticSkipped",
    "已记录为不会做",
  ],
  diagnosticRecorded: [
    "adaptiveLearning.feedback.diagnosticRecorded",
    "已记录",
  ],
  offTaskRecognized: [
    "adaptiveLearning.feedback.offTaskRecognized",
    "已识别作答，但还不能用于判断",
  ],
  offTask: [
    "adaptiveLearning.feedback.offTask",
    "这次答案还不能用于判断",
  ],
  noAttempt: [
    "adaptiveLearning.feedback.noAttempt",
    "不会也可以从第一步开始",
  ],
  pendingReview: [
    "adaptiveLearning.feedback.pendingReview",
    "这次答案暂未完成判定",
  ],
  incorrect: ["adaptiveLearning.feedback.incorrect", "错误"],
  correctionRequired: [
    "adaptiveLearning.feedback.correctionRequired",
    "先别到下一题，订正一下",
  ],
  correct: ["adaptiveLearning.feedback.correct", "答对了，方法有效"],
  partial: ["adaptiveLearning.feedback.partial", "已经做对一部分"],
  partialIncomplete: [
    "adaptiveLearning.feedback.partialIncomplete",
    "再补一步就完整了",
  ],
  incorrectCareless: [
    "adaptiveLearning.feedback.incorrectCareless",
    "方法基本对，检查一个细节",
  ],
  "score.correct": ["adaptiveLearning.feedback.scoreCorrect", "正确"],
  "score.partial": [
    "adaptiveLearning.feedback.scorePartial",
    "正确率 {$percent}%",
  ],
  "score.incorrect": ["adaptiveLearning.feedback.scoreIncorrect", "错误"],
});

const adaptiveCueCopies = Object.freeze({
  continuePractice: [
    "adaptiveLearning.feedback.continuePractice",
    "继续练习",
  ],
  interventionTitle: [
    "adaptiveLearning.feedback.interventionTitle",
    "先停一下，找出共同卡点",
  ],
  interventionDetail: [
    "adaptiveLearning.feedback.interventionDetail",
    "回顾后再用一道未见题验证。",
  ],
});

function translateCopy(copy, params) {
  return copy ? trans(copy[0], copy[1], params) : "";
}

function scorePercent(scoreRatio) {
  return Math.round(Math.max(0, Math.min(1, Number(scoreRatio) || 0)) * 100);
}

export function questionFeedbackTitle(feedback) {
  return translateCopy(feedbackTitleCopies[feedback?.titleId], {
    percent: scorePercent(feedback?.scoreRatio),
  });
}

export function questionFeedbackScore(feedback) {
  if (!feedback?.showScore) return "";
  const titleId = `score.${feedback.state}`;
  return translateCopy(feedbackTitleCopies[titleId], {
    percent: scorePercent(feedback.scoreRatio),
  });
}

export function localizedFeedbackItems(items = []) {
  return items.filter(Boolean).join(questionFeedbackCopy().listSeparator);
}

export function adaptiveCueTitle(cue) {
  return cue?.titleText || translateCopy(adaptiveCueCopies[cue?.titleId]);
}

export function adaptiveCueDetail(cue) {
  return cue?.detailText || translateCopy(adaptiveCueCopies[cue?.detailId]);
}

export function questionFeedbackCopy() {
  return {
    unsyncedPreview: trans(
      "adaptiveLearning.feedback.unsyncedPreview",
      "未同步预览",
    ),
    aiRecognized: trans("adaptiveLearning.feedback.aiRecognized", "AI 已识别"),
    achieved: trans("adaptiveLearning.feedback.achieved", "你已做到"),
    errorReason: trans("adaptiveLearning.feedback.errorReason", "错误原因"),
    improvement: trans("adaptiveLearning.feedback.improvement", "修改建议"),
    listSeparator: trans("adaptiveLearning.feedback.listSeparator", "；"),
  };
}

export function masteryFeedbackCopy(summary) {
  return {
    ariaLabel: summary
      ? trans(
          "adaptiveLearning.feedback.roundMasteryAria",
          "本轮知识点掌握度",
        )
      : trans(
          "adaptiveLearning.feedback.masteryChangeAria",
          "知识点掌握度变化",
        ),
    title: summary
      ? trans("adaptiveLearning.feedback.roundMastery", "本轮掌握度")
      : trans("adaptiveLearning.feedback.knowledgeMastery", "知识点掌握度"),
    confidence: trans("adaptiveLearning.feedback.confidence", "置信度"),
    awaitingSettlement: trans(
      "adaptiveLearning.feedback.awaitingSettlement",
      "等待结算",
    ),
    masteryPending: trans(
      "adaptiveLearning.feedback.masteryPending",
      "掌握度将在统一算法返回后显示",
    ),
    currentMastery: trans(
      "adaptiveLearning.feedback.currentMastery",
      "当前掌握度",
    ),
    masteryThreshold: trans(
      "adaptiveLearning.feedback.masteryThreshold",
      "掌握线 {$threshold}%",
      { threshold: MASTERY_THRESHOLD },
    ),
  };
}

export function masteryChangeLabel({ breakthrough, direction, deltaLabel }) {
  if (breakthrough)
    return trans(
      "adaptiveLearning.feedback.masteryBreakthrough",
      "突破掌握线 {$delta}",
      { delta: deltaLabel },
    );
  if (direction === "up")
    return trans(
      "adaptiveLearning.feedback.masteryImproved",
      "掌握提升 {$delta}",
      { delta: deltaLabel },
    );
  return trans(
    "adaptiveLearning.feedback.masteryUpdated",
    "模型更新 {$delta}",
    { delta: deltaLabel },
  );
}

export function masteryProgressAria(before, after) {
  return trans(
    "adaptiveLearning.feedback.masteryProgressAria",
    "掌握度从 {$before}% 变化到 {$after}%",
    { before: before.toFixed(2), after: after.toFixed(2) },
  );
}
