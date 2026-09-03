import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileCheck,
  FileSearch,
  Filter,
  HelpCircle,
  LoaderCircle,
  Pencil,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Square,
  Wand2,
  XCircle,
} from "lucide-react";

import {
  cancelQuestionQualityJob,
  createQuestionQualityJob,
  getQuestionQualityJob,
  retryQuestionQualityQuestion,
} from "../lib/questionQualityApi.js";
import {
  collectLessonQualityQuestions,
  deriveQuestionQualityProgress,
  filterQuestionQualityRows,
  normalizedResultStatus,
} from "../teacher/domain/questionQualityPresentation.js";

const ACTIVE_JOB_STATUSES = new Set(["queued", "running"]);
const JOB_STORAGE_KEY = "adaptive-learning.question-quality.jobs.v1";

/**
 *
 * @param lessonId
 */
function readRememberedJobId(lessonId) {
  try {
    const raw = localStorage.getItem(JOB_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[lessonId] || null;
  } catch {
    return null;
  }
}

/**
 *
 * @param lessonId
 * @param jobId
 */
function rememberJobId(lessonId, jobId) {
  try {
    const raw = localStorage.getItem(JOB_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[lessonId] = jobId;
    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage failures
  }
}

/**
 *
 * @param lessonId
 */
function forgetJobId(lessonId) {
  try {
    const raw = localStorage.getItem(JOB_STORAGE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    delete map[lessonId];
    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage failures
  }
}

const SEVERITY_MAP = {
  CRITICAL: { label: "严重错误", tone: "danger" },
  HIGH: { label: "高风险", tone: "danger" },
  MEDIUM: { label: "需复核", tone: "warning" },
  LOW: { label: "表述优化", tone: "info" },
};

const CATEGORY_MAP = {
  FACTUAL_ERROR: "事实与科学错误",
  ANSWER_MISMATCH: "答案不一致",
  ANALYSIS_DEFECT: "解析缺陷",
  EXPRESSION_ISSUE: "语言规范问题",
  FORMAT_ERROR: "格式或排版错误",
  LATEX_ERROR: "公式符号错误",
  UNCERTAIN: "待人工复核",
};

const TYPE_MAP = {
  SINGLE_CHOICE: "单选题",
  MULTIPLE_CHOICE: "多选题",
  FILL_IN_BLANK: "填空题",
  FILL_BLANK: "填空题",
  SUBJECTIVE: "主观解答题",
  JUDGEMENT: "判断题",
};

/**
 *
 * @param root0
 * @param root0.lesson
 * @param root0.content
 * @param root0.onNavigateToSection
 */
export default function TeacherLessonQuestionQuality({
  lesson,
  content,
  onNavigateToSection,
}) {
  const [job, setJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [retryingIds, setRetryingIds] = useState(() => new Set());
  const [error, setError] = useState("");
  const [restoringJob, setRestoringJob] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const pollAbortRef = useRef(null);

  const lessonId = lesson?.id || "";
  const questions = useMemo(
    () => collectLessonQualityQuestions(content),
    [content],
  );
  const jobActive = ACTIVE_JOB_STATUSES.has(job?.status);
  const counts = deriveQuestionQualityProgress(job, questions.length);

  const refreshJob = useCallback(async (jobId, signal) => {
    const nextJob = await getQuestionQualityJob(jobId, { signal });
    setJob(nextJob);
    return nextJob;
  }, []);

  // Restore remembered job for this lesson
  useEffect(() => {
    if (!lessonId) return;
    const rememberedJobId = readRememberedJobId(lessonId);
    if (!rememberedJobId) return;
    const controller = new AbortController();
    let active = true;
    setRestoringJob(true);
    getQuestionQualityJob(rememberedJobId, { signal: controller.signal })
      .then((rememberedJob) => {
        if (!active) return;
        if (
          String(rememberedJob?.lessonId || rememberedJob?.lesson?.id || "") !==
          String(lessonId)
        ) {
          forgetJobId(lessonId);
          return;
        }
        setJob(rememberedJob);
      })
      .catch((restoreError) => {
        if (!active) return;
        if (restoreError?.name === "AbortError") return;
        if (restoreError?.status === 404) forgetJobId(lessonId);
        else setError(restoreError.message || "暂时无法恢复质检进度");
      })
      .finally(() => {
        if (active) setRestoringJob(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [lessonId]);

  useEffect(() => {
    if (job?.id && lessonId) rememberJobId(lessonId, job.id);
  }, [job?.id, lessonId]);

  // Polling loop
  useEffect(() => {
    if (!job?.id || !jobActive) return;
    const controller = new AbortController();
    pollAbortRef.current?.abort();
    pollAbortRef.current = controller;
    let timer;
    const poll = async () => {
      try {
        const nextJob = await refreshJob(job.id, controller.signal);
        setError("");
        if (ACTIVE_JOB_STATUSES.has(nextJob?.status)) {
          timer = window.setTimeout(
            poll,
            Math.max(800, Number(nextJob.pollIntervalMs || 1500)),
          );
        }
      } catch (pollError) {
        if (pollError?.name === "AbortError") return;
        setError(pollError.message || "暂时无法更新质检进度");
        timer = window.setTimeout(poll, 3000);
      }
    };
    timer = window.setTimeout(poll, 800);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [job?.id, jobActive, refreshJob]);

  useEffect(() => () => pollAbortRef.current?.abort(), []);

  const rows = useMemo(() => {
    const results = Array.isArray(job?.results) ? job.results : [];
    const resultsById = new Map(
      results.map((result) => [
        String(result.questionId || result.question?.id || ""),
        result,
      ]),
    );
    const sourceQuestions = job
      ? results.map((result) => result.question).filter(Boolean)
      : questions;
    return sourceQuestions.map((question, index) => ({
      question,
      index,
      result: resultsById.get(String(question.id)) || null,
    }));
  }, [job?.results, questions]);

  const visibleRows = useMemo(
    () => filterQuestionQualityRows(rows, filter),
    [rows, filter],
  );

  const startQualityInspection = async () => {
    if (!lesson || questions.length === 0 || submitting) return;
    pollAbortRef.current?.abort();
    setSubmitting(true);
    setError("");
    setFilter("all");
    setExpandedIds(new Set());
    try {
      const nextJob = await createQuestionQualityJob({
        lesson: {
          id: lesson.id,
          title: lesson.title,
          index: lesson.index,
          grade: lesson.grade,
          subject: lesson.subject,
          knowledgePoints: lesson.knowledgePoints,
        },
        questions,
      });
      setJob(nextJob);
    } catch (startError) {
      setError(startError.message || "暂时无法开始题目质检");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelJob = async () => {
    if (!job?.id || cancelling) return;
    setCancelling(true);
    setError("");
    try {
      const nextJob = await cancelQuestionQualityJob(job.id);
      setJob(nextJob);
    } catch (cancelError) {
      setError(cancelError.message || "取消质检失败");
    } finally {
      setCancelling(false);
    }
  };

  const retryQuestion = async (questionId) => {
    if (!job?.id || retryingIds.has(questionId)) return;
    setRetryingIds((current) => new Set(current).add(questionId));
    setError("");
    try {
      const nextJob = await retryQuestionQualityQuestion(job.id, questionId);
      setJob(nextJob || (await getQuestionQualityJob(job.id)));
    } catch (retryError) {
      setError(retryError.message || "单题重试失败");
    } finally {
      setRetryingIds((current) => {
        const next = new Set(current);
        next.delete(questionId);
        return next;
      });
    }
  };

  const toggleExpanded = (questionId) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleEditQuestion = (question) => {
    if (!onNavigateToSection) return;
    // determine target tab based on question stage/source
    const stage = question?.stage || question?.section;
    if (stage === "pre") {
      onNavigateToSection("pre", question.id);
    } else if (stage === "post" || stage === "review") {
      onNavigateToSection("review", question.id);
    } else {
      onNavigateToSection("practice", question.id);
    }
  };

  return (
    <div className="lesson-quality-container">
      {/* Top Action & Metrics Bar */}
      <div className="lesson-quality-header-card">
        <div className="lesson-quality-overview-stats">
          <div className="lesson-quality-stat-item">
            <span className="lesson-quality-stat-label">待质检总数</span>
            <strong className="lesson-quality-stat-value">
              {questions.length} 题
            </strong>
          </div>
          <div className="lesson-quality-stat-divider" />
          <div className="lesson-quality-stat-item success">
            <span className="lesson-quality-stat-label">已通过</span>
            <strong className="lesson-quality-stat-value">
              {counts.passed} 题
            </strong>
          </div>
          <div className="lesson-quality-stat-divider" />
          <div className="lesson-quality-stat-item warning">
            <span className="lesson-quality-stat-label">发现问题</span>
            <strong className="lesson-quality-stat-value">
              {counts.hasIssue} 题
            </strong>
          </div>
          <div className="lesson-quality-stat-divider" />
          <div className="lesson-quality-stat-item info">
            <span className="lesson-quality-stat-label">质检进度</span>
            <strong className="lesson-quality-stat-value">
              {job ? `${counts.percent}%` : "未开始"}
            </strong>
          </div>
        </div>

        <div className="lesson-quality-actions">
          {jobActive ? (
            <button
              type="button"
              className="teacher-neutral"
              disabled={cancelling}
              onClick={() => {
                void cancelJob();
              }}
            >
              {cancelling ? (
                <LoaderCircle size={15} className="qq-spin" />
              ) : (
                <Square size={14} />
              )}
              <span>{cancelling ? "正在取消" : "中止质检"}</span>
            </button>
          ) : (
            <button
              type="button"
              className="teacher-primary"
              disabled={questions.length === 0 || submitting || restoringJob}
              onClick={() => {
                void startQualityInspection();
              }}
            >
              {submitting || restoringJob ? (
                <LoaderCircle size={15} className="qq-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              <span>
                {restoringJob
                  ? "恢复进度中"
                  : submitting
                    ? "正在启动"
                    : job
                      ? "重新质检本课时"
                      : "一键质检全部题目"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Realtime Progress Strip */}
      {jobActive && (
        <div className="lesson-quality-progress-strip">
          <div className="lesson-quality-progress-info">
            <LoaderCircle size={16} className="qq-spin text-primary" />
            <span>
              AI 精校质检进行中，正在校验题干、选项、解析及公式科学性...
            </span>
            <strong>
              {counts.done} / {counts.total} 题
            </strong>
          </div>
          <div className="lesson-quality-progress-track">
            <div
              className="lesson-quality-progress-bar"
              style={{ width: `${counts.percent}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="lesson-quality-notice error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          {job?.id && (
            <button
              type="button"
              className="lesson-quality-refresh-btn"
              onClick={() => {
                void refreshJob(job.id).catch((error_) =>
                  setError(error_.message),
                );
              }}
            >
              <RefreshCw size={13} />
              刷新状态
            </button>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="lesson-quality-filter-bar">
        <div className="lesson-quality-filter-tabs">
          <button
            type="button"
            className={`lesson-quality-filter-tab${filter === "all" ? " active" : ""}`}
            onClick={() => setFilter("all")}
          >
            全部 ({rows.length})
          </button>
          <button
            type="button"
            className={`lesson-quality-filter-tab warning${filter === "issues" ? " active" : ""}`}
            onClick={() => setFilter("issues")}
          >
            有问题 ({counts.hasIssue})
          </button>
          <button
            type="button"
            className={`lesson-quality-filter-tab success${filter === "passed" ? " active" : ""}`}
            onClick={() => setFilter("passed")}
          >
            已通过 ({counts.passed})
          </button>
          {counts.failed > 0 && (
            <button
              type="button"
              className={`lesson-quality-filter-tab danger${filter === "failed" ? " active" : ""}`}
              onClick={() => setFilter("failed")}
            >
              失败 ({counts.failed})
            </button>
          )}
        </div>

        <div className="lesson-quality-filter-hint">
          {job
            ? `基于启动时 ${counts.total} 题快照分析`
            : "点击“一键质检全部题目”开始自动审查"}
        </div>
      </div>

      {/* Empty State */}
      {questions.length === 0 ? (
        <div className="lesson-quality-empty">
          <FileSearch size={36} />
          <h3>当前课时还没有题目内容</h3>
          <p>请先在课前测验、单点题池或综合练习中添加或生成题目。</p>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="lesson-quality-empty">
          <CheckCircle2 size={36} />
          <h3>没有匹配筛选条件的题目</h3>
          <p>当前分类下暂无相关题目，可切换筛选查看。</p>
        </div>
      ) : (
        <div className="lesson-quality-list">
          {visibleRows.map(({ question, index, result }) => {
            const isRetrying = retryingIds.has(question.id);
            const isExpanded = expandedIds.has(question.id);
            const hasIssue =
              result?.status === "ISSUE" ||
              (result?.issues && result.issues.length > 0);
            const isPassed = result?.status === "PASSED";
            const isRunning = result?.status === "RUNNING" || isRetrying;
            const issues = result?.issues || [];

            return (
              <div
                key={question.id || index}
                className={`lesson-quality-item-card${hasIssue ? " has-issue" : ""}${isPassed ? " is-passed" : ""}`}
              >
                <div className="lesson-quality-item-main">
                  <div className="lesson-quality-item-badge-col">
                    <span className="lesson-quality-num-pill">
                      #{index + 1}
                    </span>
                    <span className="lesson-quality-type-pill">
                      {TYPE_MAP[question.type] || question.type || "单选题"}
                    </span>
                    {question.stage && (
                      <span className="lesson-quality-stage-pill">
                        {question.stage === "pre"
                          ? "课前"
                          : question.stage === "post" ||
                              question.stage === "review"
                            ? "综合"
                            : "单点"}
                      </span>
                    )}
                  </div>

                  <div className="lesson-quality-item-body">
                    <div className="lesson-quality-stem-text">
                      {question.stem ||
                        question.questionText ||
                        question.title ||
                        "（未命名题目）"}
                    </div>

                    {/* Quality Status Tag */}
                    <div className="lesson-quality-status-row">
                      {isRunning ? (
                        <span className="lesson-quality-badge running">
                          <LoaderCircle size={13} className="qq-spin" />
                          <span>正在质检</span>
                        </span>
                      ) : isPassed ? (
                        <span className="lesson-quality-badge passed">
                          <Check size={13} />
                          <span>质检通过 · 无科学或格式问题</span>
                        </span>
                      ) : hasIssue ? (
                        <span className="lesson-quality-badge issue">
                          <AlertTriangle size={13} />
                          <span>发现 {issues.length || 1} 处需关注问题</span>
                        </span>
                      ) : (
                        <span className="lesson-quality-badge pending">
                          <Clock size={13} />
                          <span>等待质检</span>
                        </span>
                      )}

                      {/* Knowledge Point */}
                      {question.knowledgePointTitle && (
                        <span className="lesson-quality-kp-tag">
                          {question.knowledgePointTitle}
                        </span>
                      )}
                    </div>

                    {/* Issues List when present */}
                    {hasIssue && issues.length > 0 && (
                      <div className="lesson-quality-issues-box">
                        {issues.map((issue, issueIdx) => {
                          const severity =
                            SEVERITY_MAP[issue.severity] || SEVERITY_MAP.MEDIUM;
                          const categoryName =
                            CATEGORY_MAP[issue.category] ||
                            issue.category ||
                            "题目问题";
                          return (
                            <div
                              key={issueIdx}
                              className="lesson-quality-issue-row"
                            >
                              <div className="lesson-quality-issue-header">
                                <span
                                  className={`lesson-quality-severity-tag ${severity.tone}`}
                                >
                                  {severity.label}
                                </span>
                                <span className="lesson-quality-category-tag">
                                  {categoryName}
                                </span>
                                {issue.summary && (
                                  <strong className="lesson-quality-issue-title">
                                    {issue.summary}
                                  </strong>
                                )}
                              </div>

                              <p className="lesson-quality-issue-desc">
                                {issue.description}
                              </p>

                              {issue.originalSnippet && (
                                <div className="lesson-quality-snippet-box">
                                  <span className="lesson-quality-snippet-label">
                                    原文出处：
                                  </span>
                                  <code>{issue.originalSnippet}</code>
                                </div>
                              )}

                              {issue.suggestedFix && (
                                <div className="lesson-quality-fix-box">
                                  <span className="lesson-quality-fix-label">
                                    修改建议：
                                  </span>
                                  <span>{issue.suggestedFix}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="lesson-quality-item-actions">
                    {onNavigateToSection && (
                      <button
                        type="button"
                        className="lesson-quality-action-btn edit"
                        onClick={() => handleEditQuestion(question)}
                        title="在编辑区定位此题"
                      >
                        <Pencil size={14} />
                        <span>去修改</span>
                      </button>
                    )}

                    {job?.id && !jobActive && (
                      <button
                        type="button"
                        className="lesson-quality-action-btn retry"
                        disabled={isRetrying}
                        onClick={() => {
                          void retryQuestion(question.id);
                        }}
                        title="重新单独校验此题"
                      >
                        <RefreshCw
                          size={14}
                          className={isRetrying ? "qq-spin" : ""}
                        />
                        <span>重试</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
