import { trans } from "../../../utils/i18n";
import { isMasteredValue } from "../../shared/domain/masteryPolicy.js";
import { localizedQuestionState } from "../../shared/presentation/questionResultPresentation";

const copyKeys = Object.freeze({
  resultsAria: "adaptiveLearning.preResult.resultsAria",
  backToMastery: "adaptiveLearning.preResult.backToMastery",
  switchQuestion: "adaptiveLearning.preResult.switchQuestion",
  practiceQuestion: "adaptiveLearning.preResult.practiceQuestion",
  referenceAnswer: "adaptiveLearning.history.referenceAnswer",
  previousQuestion: "adaptiveLearning.preResult.previousQuestion",
  nextQuestion: "adaptiveLearning.preResult.nextQuestion",
  masteryAria: "adaptiveLearning.preResult.masteryAria",
  knowledgePoint: "adaptiveLearning.preResult.knowledgePoint",
  currentMastery: "adaptiveLearning.preResult.currentMastery",
  confidence: "adaptiveLearning.result.confidence",
  pending: "adaptiveLearning.result.pending",
  relatedQuestions: "adaptiveLearning.preResult.relatedQuestions",
  notIncluded: "adaptiveLearning.preResult.notIncluded",
  resultEyebrow: "adaptiveLearning.preResult.resultEyebrow",
  focusEyebrow: "adaptiveLearning.preResult.focusEyebrow",
  diagnosisComplete: "adaptiveLearning.preResult.diagnosisComplete",
  pathReady: "adaptiveLearning.preResult.pathReady",
  overallScoreRate: "adaptiveLearning.preResult.overallScoreRate",
  readyTitle: "adaptiveLearning.preResult.readyTitle",
  readyDescription: "adaptiveLearning.preResult.readyDescription",
  startLearning: "adaptiveLearning.preResult.startLearning",
  errorReason: "adaptiveLearning.feedback.errorReason",
  improvement: "adaptiveLearning.feedback.improvement",
});

const answerStateKeys = Object.freeze({
  correct: "adaptiveLearning.preResult.answer.correct",
  partial: "adaptiveLearning.preResult.answer.partial",
  incorrect: "adaptiveLearning.preResult.answer.incorrect",
  skipped: "adaptiveLearning.preResult.answer.skipped",
  unanswered: "adaptiveLearning.preResult.answer.unanswered",
});

const diagnosticStatusKeys = Object.freeze({
  provisionally_mastered: [
    "adaptiveLearning.preResult.status.provisional",
    "success",
  ],
  needs_learning: ["adaptiveLearning.preResult.status.needsLearning", "warning"],
  uncertain: ["adaptiveLearning.preResult.status.uncertain", "neutral"],
});

const settledStatusKeys = Object.freeze({
  MASTERED: ["adaptiveLearning.preResult.status.mastered", "success"],
  PROVISIONALLY_MASTERED: [
    "adaptiveLearning.preResult.status.provisional",
    "success",
  ],
  NEEDS_LEARNING: [
    "adaptiveLearning.preResult.status.needsLearning",
    "warning",
  ],
  VERIFYING: ["adaptiveLearning.preResult.status.verifying", "neutral"],
  NEEDS_REVALIDATION: [
    "adaptiveLearning.preResult.status.verifying",
    "neutral",
  ],
});

const stopReasonKeys = Object.freeze({
  RECENT_MASTERY_VERIFIED: "adaptiveLearning.preResult.stop.recentVerified",
  TWO_STRONG_RESPONSES: "adaptiveLearning.preResult.stop.strongResponses",
  TWO_CLEAR_GAPS: "adaptiveLearning.preResult.stop.clearGaps",
  CONFLICTING_EVIDENCE_AT_LIMIT:
    "adaptiveLearning.preResult.stop.conflictingEvidence",
});

/**
 * 返回课前诊断结果页当前语言文案。
 * @returns {object} 页面文案
 */
export function preAssessmentResultCopy() {
  return Object.fromEntries(
    Object.entries(copyKeys).map(([name, key]) => [name, trans(key)]),
  );
}

/**
 * 返回带插值的课前诊断结果文案。
 * @param {string} key 文案后缀
 * @param {object} params 插值参数
 * @returns {string} 本地化文案
 */
export function preAssessmentResultText(key, params = {}) {
  return trans(`adaptiveLearning.preResult.${key}`, undefined, params);
}

/**
 * 使用当前语言的分隔符拼接答案展示文本。
 * @param {string[]} values 已映射为展示文本的答案
 * @returns {string} 本地化后的答案文本
 */
export function preAssessmentAnswerText(values = []) {
  return values.join(preAssessmentResultText("answerSeparator"));
}

/**
 * 返回题目状态长短文案。
 * @param {string} state 题目状态
 * @returns {{label: string, shortLabel: string}} 状态文案
 */
export function preAssessmentAnswerStateMeta(state) {
  const key = answerStateKeys[state] || answerStateKeys.unanswered;
  return {
    label: trans(key),
    shortLabel:
      state === "skipped"
        ? trans("adaptiveLearning.preResult.answer.skippedShort")
        : localizedQuestionState(
            state === "unanswered" ? "pending" : state,
            "unanswered",
          ),
  };
}

function statusMeta(statusTuple) {
  return statusTuple
    ? { label: trans(statusTuple[0]), tone: statusTuple[1] }
    : null;
}

/**
 * 将稳定诊断枚举映射为当前语言状态。
 * @param {object} item 掌握度诊断结果
 * @param {boolean} covered 本轮是否覆盖
 * @returns {{label: string, tone: string}} 状态展示
 */
export function preAssessmentDiagnosticStatus(item = {}, covered) {
  if (item.diagnosisReason === "QUESTION_POOL_EXHAUSTED")
    return { label: "", tone: "neutral" };
  const diagnostic = statusMeta(diagnosticStatusKeys[item.diagnosisStatus]);
  if (diagnostic) return diagnostic;
  const settled = statusMeta(settledStatusKeys[item.status]);
  if (settled) return settled;
  if (!covered)
    return {
      label: trans("adaptiveLearning.preResult.status.notCovered"),
      tone: "neutral",
    };
  return isMasteredValue(item.mastery)
    ? {
        label: trans("adaptiveLearning.preResult.status.mastered"),
        tone: "success",
      }
    : {
        label: trans("adaptiveLearning.preResult.status.needsConsolidation"),
        tone: "warning",
      };
}

/**
 * 返回诊断停止原因。
 * @param {string} reason 稳定停止原因
 * @returns {string} 本地化原因
 */
export function preAssessmentStopReason(reason) {
  const key = stopReasonKeys[reason];
  return key ? trans(key) : "";
}

/**
 * 返回稳定下一步类型对应文案。
 * @param {string} kind 下一步类型
 * @returns {{title: string, description: string, actionLabel: string}} 下一步文案
 */
export function preAssessmentNextStep(kind) {
  const prefix = `adaptiveLearning.preResult.nextStep.${kind || "learning"}`;
  return {
    title: trans(`${prefix}.title`),
    description: trans(`${prefix}.description`),
    actionLabel: trans("adaptiveLearning.preResult.nextStep.continue"),
  };
}

/**
 * 返回课前诊断摘要。
 * @param {object} input 摘要计数与状态
 * @returns {{heading: string, description: string}} 摘要文案
 */
export function preAssessmentSummary(input) {
  const { hasQuestions, questionCount, knowledgeCount, confirmedCount, correctCount, focusCount } = input;
  if (!hasQuestions)
    return {
      heading: preAssessmentResultText("organizedKnowledge", {
        count: knowledgeCount,
      }),
      description: preAssessmentResultText("focusOnly", { count: focusCount }),
    };
  const heading = preAssessmentResultText("completedQuestions", {
    count: questionCount,
  });
  const description = preAssessmentResultText(
    focusCount === 0 ? "stableSummary" : "focusSummary",
    { confirmed: confirmedCount, correct: correctCount, focus: focusCount },
  );
  return { heading, description };
}
