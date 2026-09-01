import { formatDateTime, trans } from "../../../utils/i18n";
import { localizedQuestionState } from "../../shared/presentation/questionResultPresentation";

const attemptTypeKeys = Object.freeze({
  pre: "adaptiveLearning.history.type.pre",
  practice: "adaptiveLearning.history.type.practice",
  composite: "adaptiveLearning.history.type.composite",
  enhancement: "adaptiveLearning.history.type.enhancement",
});

const QUESTION_UNAVAILABLE_KEY =
  "adaptiveLearning.history.questionUnavailable";

const copyKeys = Object.freeze({
  title: "adaptiveLearning.history.title",
  clearFilters: "adaptiveLearning.history.clearFilters",
  syncing: "adaptiveLearning.history.syncing",
  localFallback: "adaptiveLearning.history.localFallback",
  retrySync: "adaptiveLearning.history.retrySync",
  filtersAria: "adaptiveLearning.history.filtersAria",
  lesson: "adaptiveLearning.history.lesson",
  allLessons: "adaptiveLearning.history.allLessons",
  knowledgePoint: "adaptiveLearning.history.knowledgePoint",
  allKnowledgePoints: "adaptiveLearning.history.allKnowledgePoints",
  type: "adaptiveLearning.history.type",
  allTypes: "adaptiveLearning.history.allTypes",
  questionType: "adaptiveLearning.history.questionType",
  allQuestionTypes: "adaptiveLearning.history.allQuestionTypes",
  result: "adaptiveLearning.history.result",
  allResults: "adaptiveLearning.history.allResults",
  time: "adaptiveLearning.history.time",
  allTime: "adaptiveLearning.history.allTime",
  last7Days: "adaptiveLearning.history.last7Days",
  last30Days: "adaptiveLearning.history.last30Days",
  statsAria: "adaptiveLearning.history.statsAria",
  attempts: "adaptiveLearning.history.attempts",
  uniqueQuestions: "adaptiveLearning.history.uniqueQuestions",
  scoreRate: "adaptiveLearning.history.scoreRate",
  needReview: "adaptiveLearning.history.needReview",
  myAnswer: "adaptiveLearning.history.myAnswer",
  myAnswerPrefix: "adaptiveLearning.history.myAnswerPrefix",
  untitledLesson: "adaptiveLearning.history.untitledLesson",
  classroomSource: "adaptiveLearning.history.classroomSource",
  localSource: "adaptiveLearning.history.localSource",
  viewDetail: "adaptiveLearning.history.viewDetail",
  visibleCount: "adaptiveLearning.history.visibleCount",
  loadMore: "adaptiveLearning.history.loadMore",
  noFilteredRecords: "adaptiveLearning.history.noFilteredRecords",
  noRecords: "adaptiveLearning.history.noRecords",
  clearFiltersHint: "adaptiveLearning.history.clearFiltersHint",
  noRecordsHint: "adaptiveLearning.history.noRecordsHint",
  closeDetail: "adaptiveLearning.history.closeDetail",
  close: "global.close",
  detailTitle: "adaptiveLearning.history.detailTitle",
  question: "adaptiveLearning.history.question",
  referenceAnswer: "adaptiveLearning.history.referenceAnswer",
  errorReason: "adaptiveLearning.feedback.errorReason",
  improvement: "adaptiveLearning.feedback.improvement",
  analysis: "adaptiveLearning.history.analysis",
  answeredAt: "adaptiveLearning.history.answeredAt",
  recordSource: "adaptiveLearning.history.recordSource",
  unanswered: "adaptiveLearning.history.unanswered",
  questionUnavailable: QUESTION_UNAVAILABLE_KEY,
  answerLoading: "adaptiveLearning.result.answerLoading",
  answerLoadFailed: "adaptiveLearning.result.answerLoadFailed",
  answerUnavailable: "adaptiveLearning.result.answerUnavailable",
  skipped: "adaptiveLearning.history.skipped",
  pending: "adaptiveLearning.history.pending",
});

/**
 * 返回做题记录页面当前语言的完整文案。
 * @param {object} params 插值参数
 * @returns {object} 本地化页面文案
 */
export function studentAttemptHistoryCopy(params = {}) {
  return Object.fromEntries(
    Object.entries(copyKeys).map(([name, key]) => [name, trans(key, key, params)]),
  );
}

/**
 * 返回单条可插值的做题记录文案。
 * @param {string} name 文案名称
 * @param {object} params 插值参数
 * @returns {string} 本地化文案
 */
export function studentAttemptHistoryText(name, params = {}) {
  const key = copyKeys[name];
  return key ? trans(key, key, params) : "";
}

/**
 * 返回当前语言的作答阶段名称。
 * @param {string} attemptType 作答阶段标识
 * @returns {string} 本地化阶段名称
 */
export function localizedAttemptType(attemptType) {
  const key = attemptTypeKeys[attemptType];
  return key ? trans(key, key) : trans("adaptiveLearning.history.type.other");
}

/**
 * 格式化作答时间并遵循当前界面语言。
 * @param {string | number | Date} value 时间值
 * @returns {string} 本地化日期时间
 */
export function localizedAttemptDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : formatDateTime(date);
}

/**
 * 将稳定来源标识转换为当前语言文案。
 * @param {string} source 作答来源
 * @returns {string} 本地化来源
 */
export function localizedAttemptSource(source) {
  return source === "classroom"
    ? trans("adaptiveLearning.history.classroomSource")
    : trans("adaptiveLearning.history.localSource");
}

/**
 * 返回当前语言的作答结果名称。
 * @param {string} outcome 稳定作答结果
 * @returns {string} 本地化结果名称
 */
export function localizedAttemptOutcome(outcome) {
  if (outcome === "skipped") return trans("adaptiveLearning.history.skipped");
  if (outcome === "pending") return trans("adaptiveLearning.history.pending");
  return localizedQuestionState(outcome);
}

/**
 * 将答案快照转换成可展示文本。
 * @param {string[]} values 稳定答案片段
 * @returns {string} 可展示答案
 */
export function localizedAttemptAnswer(values = []) {
  return values.length > 0
    ? values.join(trans("adaptiveLearning.result.answerSeparator", "、"))
    : trans("adaptiveLearning.history.unanswered");
}

/**
 * 从作答快照读取题干，失败时返回当前语言空态。
 * @param {string} questionStem 稳定题干文本
 * @returns {string} 题干文本
 */
export function localizedAttemptQuestionStem(questionStem) {
  return questionStem || trans(QUESTION_UNAVAILABLE_KEY);
}

export const attemptTypeValues = Object.freeze(Object.keys(attemptTypeKeys));
