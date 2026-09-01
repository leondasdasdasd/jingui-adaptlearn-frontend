import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  FileQuestion,
  XCircle,
} from "lucide-react";

import { loadAnswerReviews } from "../lib/gradingApi";
import {
  localizedQuestionResult,
  localizedQuestionType,
} from "../shared/presentation/questionResultPresentation";
import {
  readLearningAttemptFacets,
  readStudentAttemptHistory,
} from "../student/data/learningHistoryRepository";
import { mergeLearningAttempts } from "../student/domain/authoritativeLearningProfile";
import { historyAnswerReview } from "../student/domain/learningAttemptHistory";
import {
  aiGeneratedErrorReason,
  aiGeneratedImprovements,
} from "../student/domain/questionFeedback.js";
import MathContent from "./MathContent";
import { localizedFeedbackItems } from "./question-feedback/questionFeedbackPresentation";
import {
  attemptTypeValues,
  localizedAttemptAnswer,
  localizedAttemptDate,
  localizedAttemptOutcome,
  localizedAttemptQuestionStem,
  localizedAttemptSource,
  localizedAttemptType,
  studentAttemptHistoryCopy,
  studentAttemptHistoryText,
} from "./student-attempt-history/presentation";

const OUTCOME_TONES = {
  correct: "success",
  partial: "warning",
  incorrect: "danger",
  skipped: "muted",
  pending: "muted",
};

/**
 *
 * @param value
 */
function percent(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : "—";
}

/**
 *
 * @param range
 */
function rangeStart(range) {
  if (range === "all") return "";
  const days = Number(range);
  return Number.isFinite(days)
    ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    : "";
}

/**
 *
 * @param root0
 * @param root0.attempt
 * @param root0.onClose
 * @param root0.reviewCredentials
 */
function AttemptDetailDrawer({ attempt, onClose, reviewCredentials }) {
  const copy = studentAttemptHistoryCopy();
  const existingAnswerValues = attempt.correctAnswerValues || [];
  const hasExistingAnswer = existingAnswerValues.length > 0;
  const reviewStudentSessionId = reviewCredentials?.studentSessionId || "";
  const reviewAccessToken = reviewCredentials?.accessToken || "";
  const [reviewState, setReviewState] = useState({
    status: hasExistingAnswer ? "ready" : "idle",
    item: null,
  });
  useEffect(() => {
    const attemptSession = attempt.studentSessionId || attempt.historyId || "";
    if (
      hasExistingAnswer ||
      !attempt.contentVersionId ||
      !attempt.questionId ||
      !reviewStudentSessionId ||
      attemptSession !== reviewStudentSessionId ||
      !reviewAccessToken
    )
      return;
    let cancelled = false;
    setReviewState({ status: "loading", item: null });
    loadAnswerReviews(attempt.contentVersionId, [attempt.questionId], {
      studentSessionId: reviewStudentSessionId,
      accessToken: reviewAccessToken,
    })
      .then((items) => {
        if (!cancelled)
          setReviewState({
            status: "ready",
            item: historyAnswerReview(items[attempt.questionId]),
          });
      })
      .catch(() => {
        if (!cancelled) setReviewState({ status: "failed", item: null });
      });
    return () => {
      cancelled = true;
    };
  }, [
    attempt.contentVersionId,
    attempt.historyId,
    attempt.questionId,
    attempt.studentSessionId,
    hasExistingAnswer,
    reviewAccessToken,
    reviewStudentSessionId,
  ]);
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  if (!attempt) return null;
  const outcome = attempt.outcome;
  const reviewAnswerValues = hasExistingAnswer
    ? existingAnswerValues
    : reviewState.item?.correctAnswerValues || [];
  const referenceAnswer =
    reviewAnswerValues.length === 0
      ? reviewState.status === "loading"
        ? copy.answerLoading
        : reviewState.status === "failed"
          ? copy.answerLoadFailed
          : copy.answerUnavailable
      : localizedAttemptAnswer(reviewAnswerValues);
  const errorReason = aiGeneratedErrorReason(attempt.questionType, attempt);
  const improvement = localizedFeedbackItems(
    aiGeneratedImprovements(attempt.questionType, attempt),
  );
  const analysis = attempt.analysis || reviewState.item?.analysis;
  return (
    <div className="student-attempt-drawer" role="presentation">
      <button
        className="student-attempt-drawer-mask"
        type="button"
        aria-label={copy.closeDetail}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-attempt-title"
      >
        <header>
          <div>
            <span>
              {localizedAttemptType(attempt.attemptType)} ·{" "}
              {localizedAttemptDate(attempt.submittedAt)}
            </span>
            <h2 id="student-attempt-title">{copy.detailTitle}</h2>
          </div>
          <button type="button" aria-label={copy.close} onClick={onClose}>
            <XCircle size={19} />
          </button>
        </header>
        <div className="student-attempt-drawer-body">
          <div className="student-attempt-drawer-meta">
            <span
              className={`student-attempt-outcome ${OUTCOME_TONES[outcome]}`}
            >
              {localizedAttemptOutcome(outcome)}
            </span>
            {attempt.questionType && (
              <span>{localizedQuestionType(attempt.questionType)}</span>
            )}
            <span>
              {attempt.lesson?.index ? `${attempt.lesson.index} ` : ""}
              {attempt.lesson?.title || copy.untitledLesson}
            </span>
            {attempt.knowledgePoints?.length > 0 && (
              <span>{attempt.knowledgePoints.join(" · ")}</span>
            )}
          </div>
          <section className="student-attempt-detail-question">
            <span>{copy.question}</span>
            <MathContent
              as="div"
              renderKey={localizedAttemptQuestionStem(attempt.questionStem)}
            >
              {localizedAttemptQuestionStem(attempt.questionStem)}
            </MathContent>
          </section>
          <section className="student-attempt-detail-grid">
            <div>
              <span>{copy.myAnswer}</span>
              <p>
                {localizedAttemptAnswer(attempt.answerValues)}
              </p>
            </div>
            <div>
              <span>{copy.referenceAnswer}</span>
              <p>{referenceAnswer}</p>
            </div>
          </section>
          {errorReason && (
            <section className="student-attempt-detail-feedback error-reason">
              <span>{copy.errorReason}</span>
              <p>{errorReason}</p>
            </section>
          )}
          {improvement && (
            <section className="student-attempt-detail-feedback">
              <span>{copy.improvement}</span>
              <p>{improvement}</p>
            </section>
          )}
          {analysis && (
            <section className="student-attempt-detail-feedback">
              <span>{copy.analysis}</span>
              <p>{analysis}</p>
            </section>
          )}
          <dl className="student-attempt-detail-facts">
            <div>
              <dt>{copy.answeredAt}</dt>
              <dd>{localizedAttemptDate(attempt.submittedAt)}</dd>
            </div>
            <div>
              <dt>{copy.scoreRate}</dt>
              <dd>
                {attempt.outcome === "skipped" || attempt.outcome === "pending"
                  ? localizedAttemptOutcome(attempt.outcome)
                  : localizedQuestionResult(attempt.scoreRatio)}
              </dd>
            </div>
            <div>
              <dt>{copy.recordSource}</dt>
              <dd>{localizedAttemptSource(attempt.source)}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}

/**
 *
 * @param attempts
 */
function facetsFromAttempts(attempts) {
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
    attempts.flatMap((attempt) => attempt.knowledgePointIds || []),
  ).map((id) => {
    const row = attempts.find((attempt) =>
      attempt.knowledgePointIds?.includes(id),
    );
    const index = row?.knowledgePointIds.indexOf(id) ?? -1;
    return { id, name: row?.knowledgePoints?.[index] || id };
  });
  return {
    lessons,
    knowledgePoints,
    questionTypes: unique(attempts.map((attempt) => attempt.questionType)),
  };
}

/**
 *
 * @param root0
 * @param root0.studentId
 * @param root0.refreshKey
 * @param root0.authoritativeAttempts
 * @param root0.loading
 * @param root0.errorKind
 * @param root0.onRetry
 * @param root0.reviewCredentials
 */
export default function StudentAttemptHistory({
  studentId,
  refreshKey,
  authoritativeAttempts = [],
  loading = false,
  errorKind = "",
  onRetry,
  reviewCredentials = null,
}) {
  const copy = studentAttemptHistoryCopy();
  const [filters, setFilters] = useState({
    lessonId: "",
    knowledgePointId: "",
    attemptType: "",
    questionType: "",
    outcome: "",
    range: "all",
  });
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const allAttempts = useMemo(
    () =>
      mergeLearningAttempts(
        readStudentAttemptHistory({ studentId }),
        authoritativeAttempts,
      ),
    [authoritativeAttempts, refreshKey, studentId],
  );
  const facets = useMemo(() => {
    if (authoritativeAttempts.length === 0)
      return readLearningAttemptFacets({ studentId });
    return facetsFromAttempts(allAttempts);
  }, [allAttempts, authoritativeAttempts.length, refreshKey, studentId]);
  const attempts = useMemo(() => {
    const from = rangeStart(filters.range);
    return allAttempts
      .filter(
        (attempt) =>
          !filters.lessonId || attempt.lesson?.id === filters.lessonId,
      )
      .filter(
        (attempt) =>
          !filters.knowledgePointId ||
          attempt.knowledgePointIds?.includes(filters.knowledgePointId),
      )
      .filter(
        (attempt) =>
          !filters.attemptType || attempt.attemptType === filters.attemptType,
      )
      .filter(
        (attempt) =>
          !filters.questionType ||
          attempt.questionType === filters.questionType,
      )
      .filter(
        (attempt) => !filters.outcome || attempt.outcome === filters.outcome,
      )
      .filter(
        (attempt) =>
          !from ||
          new Date(attempt.submittedAt || 0).getTime() >=
            new Date(from).getTime(),
      );
  }, [allAttempts, filters]);
  const stats = useMemo(() => {
    const uniqueQuestions = new Set(
      attempts.map((attempt) => attempt.questionId),
    );
    const evaluated = attempts.filter((attempt) =>
      ["correct", "partial", "incorrect"].includes(attempt.outcome),
    );
    const correct = evaluated.filter(
      (attempt) => attempt.outcome === "correct",
    ).length;
    return {
      attempts: attempts.length,
      uniqueQuestions: uniqueQuestions.size,
      accuracy:
        evaluated.length > 0 ? (correct / evaluated.length) * 100 : null,
      needReview: attempts.filter((attempt) =>
        ["incorrect", "partial", "skipped"].includes(attempt.outcome),
      ).length,
    };
  }, [attempts]);
  useEffect(() => setVisibleCount(50), [filters, studentId]);
  const setFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () =>
    setFilters({
      lessonId: "",
      knowledgePointId: "",
      attemptType: "",
      questionType: "",
      outcome: "",
      range: "all",
    });
  const hasFilters = Object.values(filters).some(
    (value) => value && value !== "all",
  );

  return (
    <section
      className="student-attempt-history"
      role="tabpanel"
      aria-label={copy.title}
    >
      <header className="student-attempt-history-heading">
        <div>
          <div className="student-attempt-history-icon">
            <BarChart3 size={18} />
          </div>
          <h2>{copy.title}</h2>
        </div>
        {hasFilters && (
          <button
            className="student-attempt-clear-filter"
            type="button"
            onClick={resetFilters}
          >
            {copy.clearFilters}
          </button>
        )}
      </header>

      {loading && (
        <div className="student-progress-sync" role="status">
          {copy.syncing}
        </div>
      )}
      {errorKind === "sync_failed" && (
        <div className="student-progress-sync error" role="alert">
          <span>{copy.localFallback}</span>
          {onRetry && (
            <button type="button" onClick={onRetry}>
              {copy.retrySync}
            </button>
          )}
        </div>
      )}

      <div className="student-attempt-toolbar" aria-label={copy.filtersAria}>
        <label>
          <span>{copy.lesson}</span>
          <select
            value={filters.lessonId}
            onChange={(event) => setFilter("lessonId", event.target.value)}
          >
            <option value="">{copy.allLessons}</option>
            {facets.lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.index ? `${lesson.index} ` : ""}
                {lesson.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.knowledgePoint}</span>
          <select
            value={filters.knowledgePointId}
            onChange={(event) =>
              setFilter("knowledgePointId", event.target.value)
            }
          >
            <option value="">{copy.allKnowledgePoints}</option>
            {facets.knowledgePoints.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.type}</span>
          <select
            value={filters.attemptType}
            onChange={(event) => setFilter("attemptType", event.target.value)}
          >
            <option value="">{copy.allTypes}</option>
            {attemptTypeValues.map((value) => (
              <option key={value} value={value}>
                {localizedAttemptType(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.questionType}</span>
          <select
            value={filters.questionType}
            onChange={(event) => setFilter("questionType", event.target.value)}
          >
            <option value="">{copy.allQuestionTypes}</option>
            {facets.questionTypes.map((value) => (
              <option key={value} value={value}>
                {localizedQuestionType(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.result}</span>
          <select
            value={filters.outcome}
            onChange={(event) => setFilter("outcome", event.target.value)}
          >
            <option value="">{copy.allResults}</option>
            {Object.keys(OUTCOME_TONES).map((value) => (
              <option key={value} value={value}>
                {localizedAttemptOutcome(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.time}</span>
          <select
            value={filters.range}
            onChange={(event) => setFilter("range", event.target.value)}
          >
            <option value="all">{copy.allTime}</option>
            <option value="7">{copy.last7Days}</option>
            <option value="30">{copy.last30Days}</option>
          </select>
        </label>
      </div>

      <div className="student-attempt-stats" aria-label={copy.statsAria}>
        <div>
          <span>{copy.attempts}</span>
          <strong>{stats.attempts}</strong>
        </div>
        <div>
          <span>{copy.uniqueQuestions}</span>
          <strong>{stats.uniqueQuestions}</strong>
        </div>
        <div>
          <span>{copy.scoreRate}</span>
          <strong>{percent(stats.accuracy)}</strong>
        </div>
        <div>
          <span>{copy.needReview}</span>
          <strong>{stats.needReview}</strong>
        </div>
      </div>

      {attempts.length > 0 ? (
        <div className="student-attempt-list">
          {attempts.slice(0, visibleCount).map((attempt) => (
            <article
              className="student-attempt-row"
              key={`${attempt.historyId}:${attempt.attemptId}`}
            >
              <div
                className={`student-attempt-state ${OUTCOME_TONES[attempt.outcome]}`}
              >
                <span>{localizedAttemptOutcome(attempt.outcome)}</span>
              </div>
              <div className="student-attempt-main">
                <div className="student-attempt-labels">
                  <span>{localizedAttemptType(attempt.attemptType)}</span>
                  {attempt.questionType && (
                    <span className="student-attempt-question-type">
                      {localizedQuestionType(attempt.questionType)}
                    </span>
                  )}
                  {attempt.knowledgePoints?.map((name) => (
                    <span key={name}>{name}</span>
                  ))}
                  <time>
                    <Clock3 size={13} />
                    {localizedAttemptDate(attempt.submittedAt)}
                  </time>
                </div>
                <MathContent
                  as="h3"
                  renderKey={localizedAttemptQuestionStem(
                    attempt.questionStem,
                  )}
                >
                  {localizedAttemptQuestionStem(attempt.questionStem)}
                </MathContent>
                <p>
                  {copy.myAnswerPrefix}
                  {localizedAttemptAnswer(attempt.answerValues)}
                </p>
                <small>
                  {attempt.lesson?.index ? `${attempt.lesson.index} ` : ""}
                  {attempt.lesson?.title || copy.untitledLesson} ·{" "}
                  {localizedAttemptSource(attempt.source)}
                </small>
              </div>
              <button
                className="student-attempt-detail-button"
                type="button"
                onClick={() => setSelectedAttempt(attempt)}
              >
                {copy.viewDetail}
              </button>
            </article>
          ))}
          {attempts.length > visibleCount && (
            <div className="student-attempt-load-more">
              <span>
                {studentAttemptHistoryText("visibleCount", {
                  visible: visibleCount,
                  total: attempts.length,
                })}
              </span>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setVisibleCount((count) => count + 50)}
              >
                {copy.loadMore}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="student-attempt-empty">
          <FileQuestion size={28} />
          <strong>
            {hasFilters ? copy.noFilteredRecords : copy.noRecords}
          </strong>
          <span>
            {hasFilters
              ? copy.clearFiltersHint
              : copy.noRecordsHint}
          </span>
          {hasFilters && (
            <button
              className="secondary-button"
              type="button"
              onClick={resetFilters}
            >
              {copy.clearFilters}
            </button>
          )}
        </div>
      )}
      {selectedAttempt && (
        <AttemptDetailDrawer
          attempt={selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
          reviewCredentials={reviewCredentials}
        />
      )}
    </section>
  );
}
