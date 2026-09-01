function displayText(value) {
  if (value == null) return "";
  if (Array.isArray(value))
    return value.map((item) => displayText(item)).filter(Boolean).join(" ");
  if (["string", "number"].includes(typeof value))
    return String(value).trim();
  if (typeof value !== "object") return "";
  return displayText(value.text ?? value.value ?? value.answer ?? "");
}

function textList(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => displayText(item))
    .filter(Boolean);
}

function textValue(value, fallback = "") {
  return String(value || fallback);
}

function nullableValue(value) {
  return value ?? null;
}

function lessonView(lesson = {}) {
  return {
    id: textValue(lesson.id),
    index: textValue(lesson.index),
    title: textValue(lesson.title),
  };
}

function attemptAnswerSource(attempt) {
  return attempt.answer ?? attempt.answerText ?? attempt.recognizedAnswer;
}

function stableAnswerValues(values, fallback) {
  return Array.isArray(values)
    ? textList(values)
    : historyAnswerValues(fallback);
}

function stableQuestionStem(attempt, snapshot) {
  const explicitStem = displayText(attempt.questionStem);
  return explicitStem || historyQuestionStem(snapshot);
}

/**
 * 将不同来源的答案收敛为历史页面稳定字符串数组。
 * @param {unknown} value 本地或服务端答案值
 * @returns {string[]} 稳定答案片段
 */
export function historyAnswerValues(value) {
  const source = Array.isArray(value) ? value : [value];
  return source.map((item) => displayText(item)).filter(Boolean);
}

/**
 * 在数据映射边界兼容题目快照字段，页面只消费 questionStem。
 * @param {object} snapshot 题目快照
 * @returns {string} 稳定题干文本
 */
export function historyQuestionStem(snapshot = {}) {
  return displayText(
    snapshot.stem ?? snapshot.title ?? snapshot.prompt ?? snapshot.content,
  );
}

/**
 * 将按需加载的参考答案收敛为历史详情展示契约。
 * @param {object | null} item 参考答案服务结果
 * @returns {object | null} 稳定参考答案
 */
export function historyAnswerReview(item) {
  if (!item) return null;
  return {
    correctAnswerValues: historyAnswerValues(item.correctAnswer),
    analysis: displayText(item.analysis),
  };
}

/**
 * 将通用学习 attempt 收敛为做题记录 UI 的唯一输入契约。
 * @param {object} attempt 通用学习作答
 * @returns {object} 做题记录视图数据
 */
export function toHistoryAttemptView(attempt = {}) {
  const snapshot = attempt.questionSnapshot || {};
  return {
    historyId: textValue(attempt.historyId),
    attemptId: textValue(attempt.attemptId),
    studentSessionId: textValue(attempt.studentSessionId),
    contentVersionId: textValue(attempt.contentVersionId),
    questionId: textValue(attempt.questionId),
    attemptType: textValue(attempt.attemptType, "practice"),
    questionType: textValue(attempt.questionType),
    outcome: textValue(attempt.outcome, "pending"),
    scoreRatio: nullableValue(attempt.scoreRatio),
    score: attempt.score,
    maxScore: attempt.maxScore,
    submittedAt: textValue(attempt.submittedAt),
    source: textValue(attempt.source, "self_study"),
    lesson: lessonView(attempt.lesson),
    knowledgePointIds: textList(attempt.knowledgePointIds),
    knowledgePoints: textList(attempt.knowledgePoints),
    questionStem: stableQuestionStem(attempt, snapshot),
    answerValues: stableAnswerValues(
      attempt.answerValues,
      attemptAnswerSource(attempt),
    ),
    correctAnswerValues: stableAnswerValues(
      attempt.correctAnswerValues,
      attempt.correctAnswer ?? snapshot.answer,
    ),
    analysis: displayText(attempt.analysis ?? snapshot.analysis),
    feedbackSource: textValue(attempt.feedbackSource),
    correct: attempt.correct === true,
    answerQuality: textValue(attempt.answerQuality),
    errorReason: displayText(attempt.errorReason),
    improvements: textList(attempt.improvements),
    aiCommentary: displayText(attempt.aiCommentary),
  };
}
