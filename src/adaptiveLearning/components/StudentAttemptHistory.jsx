import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileQuestion,
  Filter,
  HelpCircle,
  History,
  Layers,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
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
 * 格式化百分比
 * @param value
 */
function percent(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : "—";
}

/**
 * 筛选时间起点计算
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
 * 作答详情侧边抽屉 (Redesigned Attempt Detail Drawer)
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

  const isCorrect = outcome === "correct";
  const isPartial = outcome === "partial";
  const isIncorrect = outcome === "incorrect";

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
        <header className="student-attempt-drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-stage-badge">
              {localizedAttemptType(attempt.attemptType)}
            </div>
            <div className="drawer-title-group">
              <h2 id="student-attempt-title">{copy.detailTitle}</h2>
              <time>
                <Clock3 size={12} />
                {localizedAttemptDate(attempt.submittedAt)}
              </time>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            aria-label={copy.close}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="student-attempt-drawer-body">
          {/* 1. 结果概览胶囊栏 */}
          <div className={`drawer-result-card ${OUTCOME_TONES[outcome]}`}>
            <div className="drawer-result-icon">
              {isCorrect && <CheckCircle2 size={22} />}
              {isPartial && <AlertCircle size={22} />}
              {isIncorrect && <XCircle size={22} />}
              {!isCorrect && !isPartial && !isIncorrect && <HelpCircle size={22} />}
            </div>
            <div className="drawer-result-info">
              <div className="drawer-result-status-line">
                <span className="drawer-outcome-text">
                  {localizedAttemptOutcome(outcome)}
                </span>
                <span className="drawer-score-ratio">
                  得分率{" "}
                  {attempt.outcome === "skipped" || attempt.outcome === "pending"
                    ? localizedAttemptOutcome(attempt.outcome)
                    : localizedQuestionResult(attempt.scoreRatio)}
                </span>
              </div>
              <div className="drawer-result-meta-tags">
                {attempt.questionType && (
                  <span className="drawer-tag">
                    {localizedQuestionType(attempt.questionType)}
                  </span>
                )}
                {attempt.lesson?.title && (
                  <span className="drawer-tag">
                    {attempt.lesson.index ? `${attempt.lesson.index} ` : ""}
                    {attempt.lesson.title}
                  </span>
                )}
                {attempt.knowledgePoints?.map((kp) => (
                  <span key={kp} className="drawer-tag highlight">
                    <BookOpen size={11} />
                    {kp}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 2. 题目内容卡片 */}
          <section className="student-attempt-detail-question">
            <div className="drawer-section-title">
              <BookOpen size={14} />
              <span>{copy.question}</span>
            </div>
            <div className="drawer-question-content">
              <MathContent
                as="div"
                renderKey={localizedAttemptQuestionStem(attempt.questionStem)}
              >
                {localizedAttemptQuestionStem(attempt.questionStem)}
              </MathContent>
            </div>
          </section>

          {/* 3. 作答对比区域：我的作答 VS 标准参考答案 */}
          <section className="student-attempt-comparison-section">
            <div className="drawer-section-title">
              <Target size={14} />
              <span>作答与参考答案对比</span>
            </div>
            <div className="drawer-answers-grid">
              <div className={`drawer-answer-box my-answer ${OUTCOME_TONES[outcome]}`}>
                <div className="answer-box-header">
                  <span>{copy.myAnswer}</span>
                  <span className={`answer-outcome-tag ${OUTCOME_TONES[outcome]}`}>
                    {localizedAttemptOutcome(outcome)}
                  </span>
                </div>
                <div className="answer-box-content">
                  <p>{localizedAttemptAnswer(attempt.answerValues)}</p>
                </div>
              </div>

              <div className="drawer-answer-box reference-answer">
                <div className="answer-box-header">
                  <span>{copy.referenceAnswer}</span>
                  <span className="answer-reference-tag">标准答案</span>
                </div>
                <div className="answer-box-content">
                  <p>{referenceAnswer}</p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. AI 错误诊断与掌握建议 */}
          {errorReason && (
            <section className="student-attempt-feedback-card error-reason">
              <div className="feedback-card-header">
                <AlertTriangle size={15} />
                <strong>{copy.errorReason}</strong>
              </div>
              <p>{errorReason}</p>
            </section>
          )}

          {improvement && (
            <section className="student-attempt-feedback-card improvement">
              <div className="feedback-card-header">
                <Sparkles size={15} />
                <strong>{copy.improvement}</strong>
              </div>
              <p>{improvement}</p>
            </section>
          )}

          {analysis && (
            <section className="student-attempt-feedback-card analysis">
              <div className="feedback-card-header">
                <BookOpen size={15} />
                <strong>{copy.analysis}</strong>
              </div>
              <p>{analysis}</p>
            </section>
          )}

          {/* 5. 作答关键属性列表 */}
          <section className="drawer-facts-card">
            <div className="facts-item">
              <span className="facts-label">{copy.answeredAt}</span>
              <span className="facts-val">{localizedAttemptDate(attempt.submittedAt)}</span>
            </div>
            <div className="facts-item">
              <span className="facts-label">{copy.scoreRate}</span>
              <span className="facts-val">
                {attempt.outcome === "skipped" || attempt.outcome === "pending"
                  ? localizedAttemptOutcome(attempt.outcome)
                  : localizedQuestionResult(attempt.scoreRatio)}
              </span>
            </div>
            <div className="facts-item">
              <span className="facts-label">{copy.recordSource}</span>
              <span className="facts-val">{localizedAttemptSource(attempt.source)}</span>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

/**
 * 提取 facets
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
 * 学生做题记录主组件 (Redesigned Student Attempt History)
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
  
  // 快速预设模式: all | mistakes | correct | practice | pre | enhancement
  const [quickPreset, setQuickPreset] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

  // 应用快速预设与高级筛选
  const attempts = useMemo(() => {
    const from = rangeStart(filters.range);
    const query = searchQuery.trim().toLowerCase();

    return allAttempts
      .filter((attempt) => {
        // 快速预设条件
        if (quickPreset === "mistakes") {
          return ["incorrect", "partial", "skipped"].includes(attempt.outcome);
        }
        if (quickPreset === "correct") {
          return attempt.outcome === "correct";
        }
        if (quickPreset === "practice") {
          return attempt.attemptType === "practice";
        }
        if (quickPreset === "pre") {
          return attempt.attemptType === "pre";
        }
        if (quickPreset === "enhancement") {
          return attempt.attemptType === "enhancement" || attempt.attemptType === "composite";
        }
        return true;
      })
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
      )
      .filter((attempt) => {
        if (!query) return true;
        const stem = String(attempt.questionStem || "").toLowerCase();
        const lesson = String(attempt.lesson?.title || "").toLowerCase();
        const kps = (attempt.knowledgePoints || []).join(" ").toLowerCase();
        const ans = (attempt.answerValues || []).join(" ").toLowerCase();
        return (
          stem.includes(query) ||
          lesson.includes(query) ||
          kps.includes(query) ||
          ans.includes(query)
        );
      });
  }, [allAttempts, filters, quickPreset, searchQuery]);

  // 数据统计
  const stats = useMemo(() => {
    const uniqueQuestions = new Set(
      attempts.map((attempt) => attempt.questionId),
    );
    const evaluated = attempts.filter((attempt) =>
      ["correct", "partial", "incorrect"].includes(attempt.outcome),
    );
    const correctCount = evaluated.filter(
      (attempt) => attempt.outcome === "correct",
    ).length;
    const partialCount = attempts.filter(
      (attempt) => attempt.outcome === "partial",
    ).length;
    const incorrectCount = attempts.filter(
      (attempt) => attempt.outcome === "incorrect",
    ).length;
    const skippedCount = attempts.filter(
      (attempt) => attempt.outcome === "skipped",
    ).length;

    const accuracy =
      evaluated.length > 0 ? (correctCount / evaluated.length) * 100 : null;

    return {
      attempts: attempts.length,
      uniqueQuestions: uniqueQuestions.size,
      accuracy,
      correctCount,
      partialCount,
      incorrectCount,
      skippedCount,
      needReview: attempts.filter((attempt) =>
        ["incorrect", "partial", "skipped"].includes(attempt.outcome),
      ).length,
    };
  }, [attempts]);

  useEffect(() => setVisibleCount(50), [filters, quickPreset, searchQuery, studentId]);

  const setFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const resetFilters = () => {
    setQuickPreset("all");
    setSearchQuery("");
    setFilters({
      lessonId: "",
      knowledgePointId: "",
      attemptType: "",
      questionType: "",
      outcome: "",
      range: "all",
    });
  };

  const hasAdvancedFilters = Object.values(filters).some(
    (value) => value && value !== "all",
  );
  const hasAnyFilters =
    hasAdvancedFilters || quickPreset !== "all" || Boolean(searchQuery.trim());

  return (
    <section
      className="student-attempt-history modern-aesthetic-container"
      role="tabpanel"
      aria-label={copy.title}
    >
      {/* 1. 状态同步提醒 */}
      {loading && (
        <div className="student-progress-sync" role="status">
          <div className="sync-pulse-dot" />
          <span>{copy.syncing}</span>
        </div>
      )}
      {errorKind === "sync_failed" && (
        <div className="student-progress-sync error" role="alert">
          <div className="sync-error-left">
            <AlertCircle size={15} />
            <span>{copy.localFallback}</span>
          </div>
          {onRetry && (
            <button type="button" onClick={onRetry}>
              {copy.retrySync}
            </button>
          )}
        </div>
      )}

      {/* 3. 统计 Bento 卡片组 (4 Core Metrics) */}
      <div className="sah-stats-bento-grid" aria-label={copy.statsAria}>
        {/* 卡片 1: 总作答次数 */}
        <div className="sah-bento-card">
          <div className="bento-card-top">
            <span className="bento-label">{copy.attempts}</span>
            <div className="bento-icon-bubble blue">
              <FileCheck2 size={16} />
            </div>
          </div>
          <div className="bento-value-row">
            <strong className="bento-value">{stats.attempts}</strong>
            <span className="bento-unit">次</span>
          </div>
        </div>

        {/* 卡片 2: 独立题目数 */}
        <div className="sah-bento-card">
          <div className="bento-card-top">
            <span className="bento-label">{copy.uniqueQuestions}</span>
            <div className="bento-icon-bubble sky">
              <Layers size={16} />
            </div>
          </div>
          <div className="bento-value-row">
            <strong className="bento-value">{stats.uniqueQuestions}</strong>
            <span className="bento-unit">道</span>
          </div>
        </div>

        {/* 卡片 3: 综合正确率 */}
        <div className="sah-bento-card">
          <div className="bento-card-top">
            <span className="bento-label">{copy.scoreRate}</span>
            <div className="bento-icon-bubble emerald">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="bento-value-row">
            <strong
              className={`bento-value ${
                stats.accuracy == null
                  ? ""
                  : stats.accuracy >= 80
                  ? "success-val"
                  : stats.accuracy >= 60
                  ? "warning-val"
                  : "danger-val"
              }`}
            >
              {percent(stats.accuracy)}
            </strong>
          </div>
        </div>

        {/* 卡片 4: 待复习错题 */}
        <div
          className={`sah-bento-card ${stats.needReview > 0 ? "highlight-attention clickable" : ""}`}
          onClick={stats.needReview > 0 ? () => setQuickPreset("mistakes") : undefined}
          style={stats.needReview > 0 ? { cursor: "pointer" } : undefined}
        >
          <div className="bento-card-top">
            <span className="bento-label">{copy.needReview}</span>
            <div className="bento-icon-bubble rose">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="bento-value-row">
            <strong
              className={`bento-value ${stats.needReview > 0 ? "danger-val" : ""}`}
            >
              {stats.needReview}
            </strong>
            <span className="bento-unit">道</span>
            {stats.needReview > 0 && (
              <span className="bento-quick-filter-tag">
                筛选错题 <ChevronRight size={11} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 作答结果微缩分布条 */}
      {stats.attempts > 0 && (
        <div
          className="sah-distribution-bar-wrap"
          title={`正确: ${stats.correctCount}，部分正确: ${stats.partialCount}，错误: ${stats.incorrectCount}，跳过: ${stats.skippedCount}`}
        >
          <div
            className="dist-seg correct"
            style={{ width: `${(stats.correctCount / stats.attempts) * 100}%` }}
          />
          <div
            className="dist-seg partial"
            style={{ width: `${(stats.partialCount / stats.attempts) * 100}%` }}
          />
          <div
            className="dist-seg incorrect"
            style={{ width: `${(stats.incorrectCount / stats.attempts) * 100}%` }}
          />
          <div
            className="dist-seg skipped"
            style={{ width: `${(stats.skippedCount / stats.attempts) * 100}%` }}
          />
        </div>
      )}

      {/* 4. 智能搜索与快速筛选控制台 (Filter Console) */}
      <div className="sah-filter-console" aria-label={copy.filtersAria}>
        {/* 上排：关键词搜索框 + 快速预设胶囊群 */}
        <div className="sah-filter-row-top">
          {/* 搜索框 */}
          <div className="sah-search-wrapper">
            <Search className="sah-search-icon" size={15} />
            <input
              type="text"
              className="sah-search-input"
              placeholder="搜索题目内容、知识点、课时或作答..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="sah-search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="清空搜索"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* 快速筛选预设 Pills */}
          <div className="sah-quick-pills-strip" role="radiogroup">
            <button
              type="button"
              className={`sah-quick-pill ${quickPreset === "all" ? "active" : ""}`}
              onClick={() => setQuickPreset("all")}
            >
              <span>全部</span>
              <span className="pill-badge">{allAttempts.length}</span>
            </button>

            <button
              type="button"
              className={`sah-quick-pill mistakes ${quickPreset === "mistakes" ? "active" : ""}`}
              onClick={() =>
                setQuickPreset((prev) => (prev === "mistakes" ? "all" : "mistakes"))
              }
            >
              <span className="pill-dot red" />
              <span>需巩固错题</span>
              {stats.needReview > 0 && (
                <span className="pill-badge red">{stats.needReview}</span>
              )}
            </button>

            <button
              type="button"
              className={`sah-quick-pill correct ${quickPreset === "correct" ? "active" : ""}`}
              onClick={() =>
                setQuickPreset((prev) => (prev === "correct" ? "all" : "correct"))
              }
            >
              <span className="pill-dot green" />
              <span>全部正确</span>
              <span className="pill-badge green">{stats.correctCount}</span>
            </button>

            <button
              type="button"
              className={`sah-quick-pill ${quickPreset === "practice" ? "active" : ""}`}
              onClick={() =>
                setQuickPreset((prev) => (prev === "practice" ? "all" : "practice"))
              }
            >
              <span>自适应巩固</span>
            </button>

            <button
              type="button"
              className={`sah-quick-pill ${quickPreset === "pre" ? "active" : ""}`}
              onClick={() =>
                setQuickPreset((prev) => (prev === "pre" ? "all" : "pre"))
              }
            >
              <span>学前诊断</span>
            </button>

            <button
              type="button"
              className={`sah-quick-pill ${quickPreset === "enhancement" ? "active" : ""}`}
              onClick={() =>
                setQuickPreset((prev) =>
                  prev === "enhancement" ? "all" : "enhancement",
                )
              }
            >
              <span>综合强化</span>
            </button>
          </div>

          {/* 筛选重置按钮与高级筛选折叠开关 */}
          <div className="sah-filter-row-actions">
            {hasAnyFilters && (
              <button
                className="sah-clear-all-btn"
                type="button"
                onClick={resetFilters}
                title="重置所有筛选"
              >
                <RotateCcw size={12} />
                <span>{copy.clearFilters}</span>
              </button>
            )}

            <button
              type="button"
              className={`sah-advanced-toggle-btn ${showAdvancedFilters ? "open" : ""} ${hasAdvancedFilters ? "has-active" : ""}`}
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
            >
              <Filter size={13} />
              <span>精细筛选</span>
              {hasAdvancedFilters && <span className="active-dot" />}
              <ChevronDown size={13} className="arrow" />
            </button>
          </div>
        </div>

        {/* 下排：可展开的高级属性下拉筛选组 */}
        {showAdvancedFilters && (
          <div className="sah-advanced-filters-panel">
            <div className="sah-select-group">
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
                  onChange={(event) =>
                    setFilter("attemptType", event.target.value)
                  }
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
                  onChange={(event) =>
                    setFilter("questionType", event.target.value)
                  }
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
          </div>
        )}
      </div>

      {/* 5. 做题卡片流列表 (Attempt List Stream) */}
      {attempts.length > 0 ? (
        <div className="sah-cards-stream-container">
          <div className="sah-stream-header">
            <span className="stream-count-text">
              找到 <strong>{attempts.length}</strong> 条匹配记录
            </span>
            {hasAnyFilters && (
              <button
                type="button"
                className="stream-reset-link"
                onClick={resetFilters}
              >
                清除所有筛选
              </button>
            )}
          </div>

          <div className="sah-cards-list">
            {attempts.slice(0, visibleCount).map((attempt, index) => {
              const outcome = attempt.outcome;
              const isCorrect = outcome === "correct";
              const isPartial = outcome === "partial";
              const isIncorrect = outcome === "incorrect";

              return (
                <article
                  className={`sah-attempt-card ${OUTCOME_TONES[outcome]}`}
                  key={`${attempt.historyId || "h"}:${attempt.attemptId || index}:${index}`}
                  onClick={() => setSelectedAttempt(attempt)}
                >
                  {/* 左侧作答状态指示区 */}
                  <div className={`sah-card-status-indicator ${OUTCOME_TONES[outcome]}`}>
                    <div className="status-icon-wrap">
                      {isCorrect && <CheckCircle2 size={18} />}
                      {isPartial && <AlertCircle size={18} />}
                      {isIncorrect && <XCircle size={18} />}
                      {!isCorrect && !isPartial && !isIncorrect && (
                        <HelpCircle size={18} />
                      )}
                    </div>
                    <span className="status-label-text">
                      {localizedAttemptOutcome(outcome)}
                    </span>
                  </div>

                  {/* 中间主内容区 */}
                  <div className="sah-card-main-body">
                    {/* 顶部元信息标签条 */}
                    <div className="sah-card-tags-row">
                      <span className="sah-tag stage-tag">
                        {localizedAttemptType(attempt.attemptType)}
                      </span>

                      {attempt.questionType && (
                        <span className="sah-tag qtype-tag">
                          {localizedQuestionType(attempt.questionType)}
                        </span>
                      )}

                      {attempt.knowledgePoints?.map((name) => (
                        <span
                          key={name}
                          className="sah-tag kp-tag"
                          title="所属知识点"
                        >
                          <BookOpen size={10} />
                          {name}
                        </span>
                      ))}

                      <time className="sah-time-badge">
                        <Clock3 size={11} />
                        {localizedAttemptDate(attempt.submittedAt)}
                      </time>
                    </div>

                    {/* 题干内容渲染 */}
                    <div className="sah-question-stem-wrap">
                      <MathContent
                        as="div"
                        className="sah-math-stem"
                        renderKey={localizedAttemptQuestionStem(
                          attempt.questionStem,
                        )}
                      >
                        {localizedAttemptQuestionStem(attempt.questionStem)}
                      </MathContent>
                    </div>

                    {/* 作答对比摘要条 */}
                    <div className="sah-card-answer-preview">
                      <div className={`preview-answer-pill ${OUTCOME_TONES[outcome]}`}>
                        <span className="preview-label">我的作答:</span>
                        <strong className="preview-val">
                          {localizedAttemptAnswer(attempt.answerValues)}
                        </strong>
                      </div>

                      {attempt.correctAnswerValues &&
                        attempt.correctAnswerValues.length > 0 &&
                        !isCorrect && (
                          <div className="preview-reference-pill">
                            <span className="preview-label">参考:</span>
                            <span className="preview-val">
                              {localizedAttemptAnswer(
                                attempt.correctAnswerValues,
                              )}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* 底部所属课时与来源信息 */}
                    <div className="sah-card-footer-row">
                      <div className="sah-lesson-attribution">
                        <BookOpen size={12} />
                        <span>
                          {attempt.lesson?.index ? `${attempt.lesson.index} ` : ""}
                          {attempt.lesson?.title || copy.untitledLesson}
                        </span>
                        <span className="attr-dot">·</span>
                        <span className="attr-source">
                          {localizedAttemptSource(attempt.source)}
                        </span>
                      </div>

                      <button
                        className="sah-detail-action-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAttempt(attempt);
                        }}
                      >
                        <span>{copy.viewDetail}</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* 加载更多 */}
          {attempts.length > visibleCount && (
            <div className="sah-load-more-section">
              <span className="load-more-count-text">
                {studentAttemptHistoryText("visibleCount", {
                  visible: visibleCount,
                  total: attempts.length,
                })}
              </span>
              <button
                className="sah-load-more-btn"
                type="button"
                onClick={() => setVisibleCount((count) => count + 50)}
              >
                <span>{copy.loadMore}</span>
                <ChevronDown size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 空状态展示 */
        <div className="sah-empty-state-card">
          <div className="empty-icon-circle">
            <FileQuestion size={32} />
          </div>
          <h3 className="empty-state-title">
            {hasAnyFilters ? copy.noFilteredRecords : copy.noRecords}
          </h3>
          <p className="empty-state-desc">
            {hasAnyFilters ? copy.clearFiltersHint : copy.noRecordsHint}
          </p>
          {hasAnyFilters && (
            <button
              className="sah-empty-reset-btn"
              type="button"
              onClick={resetFilters}
            >
              <RotateCcw size={13} />
              <span>{copy.clearFilters}</span>
            </button>
          )}
        </div>
      )}

      {/* 6. 详情抽屉 (Slide-over Detail Modal) */}
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
