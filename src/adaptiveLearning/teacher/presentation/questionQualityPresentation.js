import { trans } from "../../../utils/i18n";
import { normalizedResultStatus } from "../domain/questionQualityPresentation";

const FILTER_COPY = new Map([
  ["all", ["filter.all", "全部"]],
  ["issues", ["filter.issues", "有问题"]],
  ["passed", ["filter.passed", "通过"]],
  ["failed", ["filter.failed", "失败"]],
]);

const ISSUE_TYPE_COPY = new Map([
  ["factual_error", ["issue.factualError", "事实错误"]],
  ["academic_error", ["issue.academicError", "学术性错误"]],
  ["stem_error", ["issue.stemError", "题干错误"]],
  ["option_error", ["issue.optionError", "选项错误"]],
  ["answer_error", ["issue.answerError", "答案错误"]],
  ["analysis_error", ["issue.analysisError", "解析错误"]],
  ["answer_analysis_mismatch", ["issue.answerAnalysisMismatch", "答案与解析不符"]],
  ["ambiguity", ["issue.ambiguity", "题意歧义"]],
  ["missing_condition", ["issue.missingCondition", "条件缺失"]],
  ["non_unique_answer", ["issue.nonUniqueAnswer", "答案不唯一"]],
  ["terminology_error", ["issue.terminologyError", "术语错误"]],
  ["typo", ["issue.typo", "错别字"]],
  ["symbol_or_unit_error", ["issue.symbolOrUnit", "符号或单位错误"]],
  ["formatting_error", ["issue.formattingError", "出版格式错误"]],
  ["grade_mismatch", ["issue.gradeMismatch", "学段不匹配"]],
  ["other", ["issue.other", "其他问题"]],
]);

const SEVERITY_COPY = new Map([
  ["critical", ["severity.critical", "严重错误"]],
  ["major", ["severity.major", "重要错误"]],
  ["minor", ["severity.minor", "规范问题"]],
]);

const CERTAINTY_COPY = new Map([
  ["confirmed", ["certainty.confirmed", "确认问题"]],
  ["needs_human_review", ["certainty.needsReview", "需人工复核"]],
]);

const QUESTION_TYPE_COPY = new Map([
  ["single_choice", ["type.singleChoice", "单选题"]],
  ["multiple_choice", ["type.multipleChoice", "多选题"]],
  ["fill_blank", ["type.fillBlank", "填空题"]],
  ["short_answer", ["type.shortAnswer", "主观题"]],
]);

const STATUS_COPY = new Map([
  ["issues", ["status.issues", "发现问题"]],
  ["passed", ["status.passed", "质检通过"]],
  ["failed", ["status.failed", "质检失败"]],
  ["running", ["status.running", "正在质检"]],
]);

const JOB_COPY = new Map([
  ["queued", ["job.queued", "任务已提交，正在分配质检资源"]],
  [
    "running",
    ["job.running", "正在逐题精校，已完成 {$completed}/{$total}"],
  ],
  ["failed", ["job.failed", "质检任务失败，请重新发起"]],
  ["cancelled", ["job.cancelled", "质检已取消，已完成结果仍保留"]],
]);

/** 统一读取题目质检当前语言文案。 */
export function qualityText(key, fallback, replacements = {}) {
  return trans(`adaptiveLearning.questionQuality.${key}`, fallback, replacements);
}

const localizedDefinition = (definition, defaultKey, defaultFallback) => {
  const [key, fallback] = definition || [defaultKey, defaultFallback];
  return qualityText(key, fallback);
};

export const questionQualityFilters = () =>
  [...FILTER_COPY.entries()].map(([id, definition]) => ({
    id,
    label: localizedDefinition(definition),
  }));

export const questionQualityIssueTypeLabel = (type) =>
  localizedDefinition(ISSUE_TYPE_COPY.get(type), "issue.other", "其他问题");

export const questionQualitySeverityLabel = (severity) =>
  localizedDefinition(
    SEVERITY_COPY.get(severity),
    "severity.attention",
    "需要关注",
  );

export const questionQualityCertaintyLabel = (certainty) =>
  localizedDefinition(
    CERTAINTY_COPY.get(certainty),
    "certainty.needsReview",
    "需人工复核",
  );

export const questionQualityTypeLabel = (type) =>
  localizedDefinition(QUESTION_TYPE_COPY.get(type), "question", "题目");

export function questionQualityModuleLabel(question) {
  if (question?.module === "pre")
    return qualityText("module.pre", "课前测验");
  if (question?.module === "post" && question?.phase === "review")
    return qualityText("module.review", "综合练习");
  if (question?.module === "post")
    return qualityText("module.post", "课后练习");
  return qualityText("question", "题目");
}

export function questionQualityStatus(result, jobActive) {
  const status = normalizedResultStatus(result);
  const definition = STATUS_COPY.get(status);
  return {
    status,
    tone: status === "queued" ? "queued" : status,
    label: definition
      ? localizedDefinition(definition)
      : jobActive
        ? qualityText("status.waiting", "等待质检")
        : qualityText("status.notStarted", "未质检"),
  };
}

export function questionQualityJobStatus(status, counts) {
  if (status === "completed")
    return counts.issues
      ? qualityText("job.completedWithIssues", "质检完成，{$count} 题需要修改", {
          count: counts.issues,
        })
      : qualityText("job.completed", "质检完成，全部题目通过");
  if (status === "partial")
    return qualityText("job.partial", "质检已完成，{$count} 题失败，可单独重试", {
      count: counts.failed,
    });
  const normalizedStatus = status === "canceled" ? "cancelled" : status;
  const definition = JOB_COPY.get(normalizedStatus);
  if (definition) {
    const [key, fallback] = definition;
    return qualityText(key, fallback, counts);
  }
  return qualityText("job.idle", "尚未开始质检");
}

export const questionQualityError = (key) =>
  qualityText(`error.${key}`, "题目质检暂时不可用，请重试");
