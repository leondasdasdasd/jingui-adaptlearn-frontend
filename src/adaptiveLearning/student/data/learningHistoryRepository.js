import { storageKeys } from "../../shared/contracts/storageKeys.js";
import {
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";
import { createClientId } from "../../shared/infrastructure/clientId.js";
import {
  historyAnswerValues,
  historyQuestionStem,
  toHistoryAttemptView,
} from "../domain/learningAttemptHistory";

const HISTORY_SCHEMA_VERSION = 1;

/**
 *
 */
function now() {
  return new Date().toISOString();
}

/**
 *
 * @param value
 * @param fallback
 */
function clone(value, fallback) {
  if (value === undefined) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

/**
 *
 * @param key
 * @param value
 */
function persist(key, value) {
  if (!writeJson(key, value))
    throw new Error("浏览器存储空间不足，学习记录未能保存");
  return value;
}

/**
 *
 */
export function readLocalStudentIdentity() {
  const identity = readJson(storageKeys.localStudentIdentity, null);
  if (!identity?.id) return null;
  return identity;
}

/**
 *
 */
export function ensureLocalStudentIdentity() {
  const existing = readLocalStudentIdentity();
  if (existing) return existing;
  const createdAt = now();
  const identity = {
    id: `local-student-${createClientId()}`,
    kind: "local_anonymous",
    createdAt,
  };
  return persist(storageKeys.localStudentIdentity, identity);
}

/**
 *
 */
function readStoredHistory() {
  const stored = readJson(storageKeys.studentLearningHistory, []);
  return Array.isArray(stored) ? stored.filter((item) => item?.historyId) : [];
}

/**
 *
 * @param session
 * @param options
 */
function sourceMetadata(session, options) {
  const classroom = Boolean(
    options.source === "classroom" ||
    session.selection?.classroomAccessToken ||
    session.selection?.learningPeriodId,
  );
  if (classroom) {
    const authoritative = session.resultSource === "authoritative";
    return {
      source: "classroom",
      authority:
        options.authority || (authoritative ? "authoritative" : "preview"),
      syncStatus: options.syncStatus || (authoritative ? "synced" : "pending"),
    };
  }
  return {
    source: "self_study",
    authority: "local_only",
    syncStatus: "local_only",
  };
}

/**
 *
 * @param selection
 */
function lessonSnapshot(selection = {}) {
  const section = selection.section || {};
  const chapter = selection.chapter || {};
  const lesson = selection.lesson || {};
  return {
    id: section.id || lesson.id || selection.lessonId || "",
    title: section.title || lesson.title || selection.lessonTitle || "",
    index: section.index || lesson.index || "",
    chapterId: chapter.id || section.chapterId || "",
    chapterTitle: chapter.title || section.chapterTitle || "",
  };
}

/**
 *
 * @param session
 */
function questionRows(session) {
  const rows = [
    ...(session.preQuestions || []).map((question) => ({
      ...clone(question, {}),
      assessmentMode: "pre",
    })),
    ...(session.postQuestions || []).map((question) => ({
      ...clone(question, {}),
      assessmentMode: "post",
    })),
    ...Object.values(session.publishedContent?.knowledgePracticePools || {})
      .flat()
      .map((question) => ({
        ...clone(question, {}),
        assessmentMode: "post",
      })),
    ...(session.publishedContent?.compositeReviewPool || []).map(
      (question) => ({
        ...clone(question, {}),
        assessmentMode: "post",
      }),
    ),
  ];
  return [
    ...new Map(
      rows.map((question) => [questionKey(question), question]),
    ).values(),
  ];
}

/**
 *
 * @param question
 */
function questionKey(question) {
  return `${question.assessmentMode || ""}:${question.id || ""}`;
}

/**
 *
 * @param session
 * @param questions
 */
function attemptRows(session, questions) {
  const questionByKey = new Map(
    questions.map((question) => [questionKey(question), question]),
  );
  return [
    ["pre", session.preAttempts || {}],
    ["post", session.postAttempts || {}],
  ].flatMap(([assessmentMode, attempts]) =>
    Object.entries(attempts).map(([questionId, attempt]) => {
      const submittedAt = attempt?.submittedAt || "";
      return {
        ...clone(attempt, {}),
        attemptId:
          attempt?.clientSubmissionId ||
          `${assessmentMode}:${questionId}:${submittedAt || "latest"}`,
        assessmentMode,
        questionId,
        questionSnapshot: clone(
          questionByKey.get(`${assessmentMode}:${questionId}`),
          { id: questionId },
        ),
      };
    }),
  );
}

/**
 *
 * @param items
 * @param incoming
 * @param keyFor
 */
function mergeBy(items, incoming, keyFor) {
  const merged = new Map(items.map((item) => [keyFor(item), item]));
  for (const item of incoming) {
    const key = keyFor(item);
    merged.set(key, merged.has(key) ? { ...merged.get(key), ...item } : item);
  }
  return [...merged.values()];
}

/**
 *
 * @param session
 * @param studentId
 * @param lesson
 * @param startedAt
 * @param options
 */
function historyIdFor(session, studentId, lesson, startedAt, options) {
  if (options.historyId) return String(options.historyId);
  if (session.selection?.studentSessionId)
    return String(session.selection.studentSessionId);
  if (lesson.id && startedAt)
    return `learning-session:${studentId}:${lesson.id}:${startedAt}`;
  throw new Error(
    "学习会话缺少 studentSessionId 或课时开始时间，无法建立稳定历史记录",
  );
}

/**
 *
 * @param record
 */
function summaryFor(record) {
  const correctCount = record.attempts.filter(
    (attempt) => attempt.correct === true || Number(attempt.scoreRatio) >= 1,
  ).length;
  return {
    historyId: record.historyId,
    studentId: record.studentId,
    studentName: record.studentName,
    lesson: record.lesson,
    source: record.source,
    authority: record.authority,
    syncStatus: record.syncStatus,
    status: record.status,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    updatedAt: record.updatedAt,
    questionCount: record.questions.length,
    attemptCount: record.attempts.length,
    correctCount,
    contentVersion: record.contentVersion,
    contentVersionId: record.contentVersionId,
    sessionType: record.sessionType,
  };
}

/**
 *
 * @param session
 * @param options
 */
export function upsertLearningSessionSnapshot(session, options = {}) {
  if (!session?.selection) throw new Error("学习会话缺少课时选择信息");
  const identity = ensureLocalStudentIdentity();
  const selection = session.selection;
  const lesson = lessonSnapshot(selection);
  const startedAt = selection.startedAt || options.startedAt || now();
  const historyId = historyIdFor(
    session,
    selection.studentId || identity.id,
    lesson,
    startedAt,
    options,
  );
  const records = readStoredHistory();
  const existingIndex = records.findIndex(
    (item) => item.historyId === historyId,
  );
  const existing = existingIndex >= 0 ? records[existingIndex] : null;
  const questions = mergeBy(
    existing?.questions || [],
    questionRows(session),
    questionKey,
  );
  const attempts = mergeBy(
    existing?.attempts || [],
    attemptRows(session, questions),
    (attempt) => attempt.attemptId,
  );
  const source = sourceMetadata(session, options);
  const updatedAt = options.updatedAt || now();
  const record = {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    historyId,
    studentId: selection.studentId || existing?.studentId || identity.id,
    studentName: selection.studentName || existing?.studentName || "",
    lesson,
    ...source,
    status: options.status || existing?.status || "in_progress",
    startedAt: existing?.startedAt || startedAt,
    completedAt: options.completedAt || existing?.completedAt || null,
    updatedAt,
    contentVersion:
      selection.contentVersion ?? existing?.contentVersion ?? null,
    contentVersionId:
      selection.contentVersionId || existing?.contentVersionId || "",
    sessionType: selection.sessionType || existing?.sessionType || "lesson",
    knowledgePoints: clone(
      selection.knowledgePoints,
      existing?.knowledgePoints || [],
    ),
    questions,
    attempts,
    preAssessment: clone(
      session.preAssessment,
      existing?.preAssessment || null,
    ),
    preMastery: clone(session.preMastery, existing?.preMastery || {}),
    result: clone(session.result, existing?.result || {}),
    resultSource: session.resultSource || existing?.resultSource || "preview",
  };
  if (record.status === "completed" && !record.completedAt)
    record.completedAt = updatedAt;
  if (existingIndex >= 0) records[existingIndex] = record;
  else records.push(record);
  persist(storageKeys.studentLearningHistory, records);
  return clone(record, record);
}

/**
 *
 * @param session
 * @param options
 */
export function settleLearningSessionSnapshot(session, options = {}) {
  const completedAt = options.completedAt || now();
  return upsertLearningSessionSnapshot(session, {
    ...options,
    status: options.status || "completed",
    completedAt,
    updatedAt: options.updatedAt || completedAt,
  });
}

/**
 *
 * @param filters
 */
export function readLearningHistory(filters = {}) {
  return readStoredHistory()
    .filter(
      (record) => !filters.studentId || record.studentId === filters.studentId,
    )
    .filter(
      (record) => !filters.lessonId || record.lesson?.id === filters.lessonId,
    )
    .filter((record) => !filters.source || record.source === filters.source)
    .filter((record) => !filters.status || record.status === filters.status)
    .sort((left, right) =>
      String(
        right.completedAt || right.updatedAt || right.startedAt,
      ).localeCompare(
        String(left.completedAt || left.updatedAt || left.startedAt),
      ),
    )
    .map(summaryFor);
}

/**
 *
 * @param historyId
 */
export function readLearningHistoryDetail(historyId) {
  const record = readStoredHistory().find(
    (item) => item.historyId === historyId,
  );
  return record ? clone(record, record) : null;
}

/**
 *
 * @param attempt
 */
function attemptTypeFor(attempt = {}) {
  if (attempt.assessmentMode === "pre") return "pre";
  if (attempt.questionSnapshot?.phase === "enhancement") return "enhancement";
  if (
    attempt.questionSnapshot?.phase === "review" ||
    attempt.questionSnapshot?.purpose === "POST"
  )
    return "composite";
  return "practice";
}

/**
 *
 * @param attempt
 */
function questionTypeFor(attempt = {}) {
  const rawType =
    attempt.questionSnapshot?.type ||
    attempt.questionSnapshot?.questionType ||
    attempt.questionType ||
    "";
  return String(rawType).trim().toLowerCase().replaceAll("-", "_");
}

/**
 *
 * @param attempt
 */
function attemptRatio(attempt = {}) {
  if (Number.isFinite(Number(attempt.scoreRatio)))
    return Math.max(0, Math.min(1, Number(attempt.scoreRatio)));
  const score = Number(attempt.score);
  const maxScore = Number(attempt.maxScore);
  return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
    ? Math.max(0, Math.min(1, score / maxScore))
    : null;
}

/**
 *
 * @param attempt
 */
function attemptOutcome(attempt = {}) {
  if (attempt.skipped || attempt.disposition === "SKIPPED_DONT_KNOW")
    return "skipped";
  const ratio = attemptRatio(attempt);
  if (ratio == null) return "pending";
  if (ratio >= 0.999) return "correct";
  if (ratio > 0) return "partial";
  return "incorrect";
}

/**
 *
 * @param record
 * @param attempt
 * @param index
 */
function flattenAttempt(record, attempt, index) {
  const snapshot = attempt.questionSnapshot || {};
  const knowledgePointById = Object.fromEntries(
    (record.knowledgePoints || []).map((item) => [item.id, item]),
  );
  const knowledgePointIds = snapshot.knowledgePointIds?.length
    ? snapshot.knowledgePointIds
    : snapshot.knowledgeObjectiveIds?.length
      ? snapshot.knowledgeObjectiveIds
      : snapshot.primaryKnowledgePointId
        ? [snapshot.primaryKnowledgePointId]
        : [];
  return {
    ...clone(attempt, {}),
    historyId: record.historyId,
    studentId: record.studentId,
    studentName: record.studentName,
    lesson: clone(record.lesson, {}),
    source: record.source,
    authority: record.authority,
    syncStatus: record.syncStatus,
    sessionStatus: record.status,
    sessionType: record.sessionType || "lesson",
    contentVersionId: record.contentVersionId || "",
    questionSnapshot: clone(snapshot, {}),
    questionStem: historyQuestionStem(snapshot),
    questionId: attempt.questionId || snapshot.id || `unknown-${index}`,
    attemptType: attemptTypeFor(attempt),
    questionType: questionTypeFor(attempt),
    outcome: attemptOutcome(attempt),
    scoreRatio: attemptRatio(attempt),
    answerValues: historyAnswerValues(
      attempt.answer ?? attempt.answerText ?? attempt.recognizedAnswer,
    ),
    correctAnswerValues: historyAnswerValues(
      attempt.correctAnswer ?? snapshot.answer,
    ),
    analysis: attempt.analysis || snapshot.analysis || "",
    knowledgePointIds,
    knowledgePoints: knowledgePointIds.map(
      (id) => knowledgePointById[id]?.name || id,
    ),
  };
}

/**
 *
 * @param filters
 */
export function readLearningAttempts(filters = {}) {
  const records = readStoredHistory().filter(
    (record) => !filters.studentId || record.studentId === filters.studentId,
  );
  const from = filters.from ? new Date(filters.from).getTime() : null;
  const to = filters.to ? new Date(filters.to).getTime() : null;
  const attempts = records.flatMap((record) =>
    record.attempts.map((attempt, index) =>
      flattenAttempt(record, attempt, index),
    ),
  );
  return attempts
    .filter(
      (attempt) => !filters.lessonId || attempt.lesson?.id === filters.lessonId,
    )
    .filter(
      (attempt) =>
        !filters.knowledgePointId ||
        attempt.knowledgePointIds.includes(filters.knowledgePointId),
    )
    .filter(
      (attempt) =>
        !filters.attemptType || attempt.attemptType === filters.attemptType,
    )
    .filter(
      (attempt) =>
        !filters.questionType || attempt.questionType === filters.questionType,
    )
    .filter(
      (attempt) => !filters.outcome || attempt.outcome === filters.outcome,
    )
    .filter((attempt) => {
      const time = new Date(attempt.submittedAt || 0).getTime();
      return (!from || time >= from) && (!to || time <= to);
    })
    .sort((left, right) =>
      String(right.submittedAt || "").localeCompare(
        String(left.submittedAt || ""),
      ),
    );
}

/**
 * 读取做题记录专用视图，避免通用学习 attempt 的内部字段进入页面。
 * @param {object} filters 查询条件
 * @returns {object[]} 做题记录视图
 */
export function readStudentAttemptHistory(filters = {}) {
  return readLearningAttempts(filters).map((attempt) =>
    toHistoryAttemptView(attempt),
  );
}

/**
 *
 * @param filters
 */
export function readLearningAttemptFacets(filters = {}) {
  const attempts = readLearningAttempts(filters);
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const lessons = unique(attempts.map((attempt) => attempt.lesson?.id)).map(
    (id) => {
      const row = attempts.find((attempt) => attempt.lesson?.id === id);
      return {
        id,
        title: row?.lesson?.title || id,
        index: row?.lesson?.index || "",
      };
    },
  );
  const knowledgePoints = unique(
    attempts.flatMap((attempt) => attempt.knowledgePointIds),
  ).map((id) => {
    const index = attempts.findIndex((attempt) =>
      attempt.knowledgePointIds.includes(id),
    );
    const nameIndex = attempts[index]?.knowledgePointIds.indexOf(id);
    return { id, name: attempts[index]?.knowledgePoints[nameIndex] || id };
  });
  const questionTypes = unique(attempts.map((attempt) => attempt.questionType));
  return { lessons, knowledgePoints, questionTypes };
}
