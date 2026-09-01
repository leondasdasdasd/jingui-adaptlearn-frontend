import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  FileSearch2,
  LoaderCircle,
  Pencil,
  RefreshCw,
  SearchCheck,
  Square,
  XCircle,
} from "lucide-react";

import QualityIssue from "../components/question-quality/QualityIssue";
import TeacherShell from "../components/TeacherShell.jsx";
import {
  cancelQuestionQualityJob,
  createQuestionQualityJob,
  getQuestionQualityJob,
  retryQuestionQualityQuestion,
} from "../lib/questionQualityApi.js";
import { useNavigate } from "../routing";
import {
  curriculumLessons,
  readTeacherContent,
} from "../teacher/data/teacherContentRepository.js";
import {
  collectLessonQualityQuestions,
  deriveQuestionQualityProgress,
  filterQuestionQualityRows,
  normalizedResultStatus,
} from "../teacher/domain/questionQualityPresentation.js";
import {
  qualityText,
  questionQualityError,
  questionQualityFilters,
  questionQualityJobStatus,
  questionQualityModuleLabel,
  questionQualityStatus,
  questionQualityTypeLabel,
} from "../teacher/presentation/questionQualityPresentation";

import "../question-quality.css";

const ACTIVE_JOB_STATUSES = new Set(["queued", "running"]);
const JOB_STORAGE_KEY = "adaptive-learning.question-quality.jobs.v1";
const STATUS_ICONS = new Map([
  ["issues", AlertCircle],
  ["passed", CheckCircle2],
  ["failed", XCircle],
  ["running", LoaderCircle],
  ["queued", CircleDashed],
]);

/**
 *
 * @param lessonId
 */
function readRememberedJobId(lessonId) {
  try {
    const jobs = JSON.parse(
      window.sessionStorage.getItem(JOB_STORAGE_KEY) || "{}",
    );
    return String(jobs?.[lessonId] || "");
  } catch {
    return "";
  }
}

/**
 *
 * @param lessonId
 * @param jobId
 */
function rememberJobId(lessonId, jobId) {
  try {
    const jobs = JSON.parse(
      window.sessionStorage.getItem(JOB_STORAGE_KEY) || "{}",
    );
    window.sessionStorage.setItem(
      JOB_STORAGE_KEY,
      JSON.stringify({ ...jobs, [lessonId]: jobId }),
    );
  } catch {
    // Progress remains available until the page is closed when browser storage is unavailable.
  }
}

/**
 *
 * @param lessonId
 */
function forgetJobId(lessonId) {
  try {
    const jobs = JSON.parse(
      window.sessionStorage.getItem(JOB_STORAGE_KEY) || "{}",
    );
    delete jobs[lessonId];
    window.sessionStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // There is no stored job to clean up when browser storage is unavailable.
  }
}

/**
 *
 */
export default function TeacherQuestionQualityRoute() {
  const navigate = useNavigate();
  const lessons = useMemo(() => curriculumLessons(), []);
  const contents = useMemo(() => readTeacherContent(), []);
  const initialLessonId =
    lessons.find(
      (lesson) => collectLessonQualityQuestions(contents[lesson.id]).length,
    )?.id ||
    lessons[0]?.id ||
    "";
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [restoringJob, setRestoringJob] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [retryingIds, setRetryingIds] = useState(() => new Set());
  const [filter, setFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const pollAbortRef = useRef(null);
  const selectedLesson =
    lessons.find((lesson) => lesson.id === lessonId) || lessons[0];
  const questions = useMemo(
    () => collectLessonQualityQuestions(contents[lessonId]),
    [contents, lessonId],
  );
  const jobActive = ACTIVE_JOB_STATUSES.has(job?.status);
  const counts = deriveQuestionQualityProgress(job, questions.length);
  const filters = questionQualityFilters();

  const refreshJob = useCallback(async (jobId, signal) => {
    const nextJob = await getQuestionQualityJob(jobId, { signal });
    setJob(nextJob);
    return nextJob;
  }, []);

  useEffect(() => {
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
        else setError(questionQualityError("restore"));
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
        setError(questionQualityError("refresh"));
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
    // A report belongs to the immutable server snapshot. The current draft may
    // change after "去修改"; keep the historical report bound to its own questions.
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
    if (!selectedLesson || questions.length === 0 || submitting) return;
    pollAbortRef.current?.abort();
    setSubmitting(true);
    setError("");
    setFilter("all");
    setExpandedIds(new Set());
    try {
      const nextJob = await createQuestionQualityJob({
        lesson: {
          id: selectedLesson.id,
          title: selectedLesson.title,
          index: selectedLesson.index,
          grade: selectedLesson.grade,
          subject: selectedLesson.subject,
          knowledgePoints: selectedLesson.knowledgePoints,
        },
        questions,
      });
      setJob(nextJob);
    } catch {
      setError(questionQualityError("start"));
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
    } catch {
      setError(questionQualityError("cancel"));
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
    } catch {
      setError(questionQualityError("retry"));
    } finally {
      setRetryingIds((current) => {
        const next = new Set(current);
        next.delete(questionId);
        return next;
      });
    }
  };

  const changeLesson = (event) => {
    setLessonId(event.target.value);
    setJob(null);
    setError("");
    setFilter("all");
    setExpandedIds(new Set());
  };

  const toggleExpanded = (questionId) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });

  const headerActions = jobActive ? (
    <button
      className="teacher-neutral"
      type="button"
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
      {cancelling
        ? qualityText("action.cancelling", "正在取消")
        : qualityText("action.cancel", "取消质检")}
    </button>
  ) : (
    <button
      className="teacher-primary"
      type="button"
      disabled={questions.length === 0 || submitting || restoringJob}
      onClick={() => {
        void startQualityInspection();
      }}
    >
      {submitting || restoringJob ? (
        <LoaderCircle size={15} className="qq-spin" />
      ) : (
        <SearchCheck size={16} />
      )}
      {restoringJob
        ? qualityText("action.restoring", "正在恢复进度")
        : submitting
          ? qualityText("action.creating", "正在创建任务")
          : job
            ? qualityText("action.restart", "重新质检")
            : qualityText("action.start", "开始质检")}
    </button>
  );

  return (
    <TeacherShell
      hideGlobalHeader
      title={qualityText("title", "题目质检")}
      actions={headerActions}
    >
      <div className="question-quality-page">
        <section
          className="qq-context"
          aria-label={qualityText("lesson", "质检课时")}
        >
          <label>
            <span>{qualityText("lesson", "质检课时")}</span>
            <span className="qq-select-wrap">
              <select
                value={lessonId}
                onChange={changeLesson}
                disabled={jobActive}
              >
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.index} {lesson.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <div className="qq-lesson-meta">
            <strong>
              {selectedLesson?.grade} · {selectedLesson?.subject}
            </strong>
            <span>
              {job
                ? qualityText("draftQuestions", "当前草稿 {$count} 题", {
                    count: questions.length,
                  })
                : qualityText("pendingQuestions", "{$count} 题待质检", {
                    count: questions.length,
                  })}
            </span>
            <span>
              {qualityText("knowledgeCount", "{$count} 个知识点", {
                count: selectedLesson?.knowledgePoints?.length || 0,
              })}
            </span>
          </div>
        </section>

        {error && (
          <div className="qq-notice error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
            {job?.id && (
              <button
                type="button"
                onClick={() => {
                  void refreshJob(job.id).catch(() =>
                    setError(questionQualityError("refresh")),
                  );
                }}
              >
                <RefreshCw size={14} />
                {qualityText("action.refresh", "刷新")}
              </button>
            )}
          </div>
        )}

        {questions.length === 0 ? (
          <section className="qq-empty">
            <FileSearch2 size={30} />
            <h2>
              {qualityText("empty.title", "这个课时还没有可质检的题目")}
            </h2>
            <p>
              {qualityText(
                "empty.description",
                "请先在教材课时内容中补充课前测验或课后练习。",
              )}
            </p>
            <button
              className="teacher-primary"
              type="button"
              onClick={() =>
                navigate(
                  `/adaptive-learning/teacher/textbook-lessons/${lessonId}/content`,
                )
              }
            >
              <Pencil size={15} />
              {qualityText("action.editLesson", "去编辑课时")}
            </button>
          </section>
        ) : (
          <>
            <section
              className={`qq-progress-panel ${job?.status || "idle"}`}
              aria-live="polite"
              aria-busy={jobActive}
            >
              <div className="qq-progress-heading">
                <div>
                  {jobActive ? (
                    <LoaderCircle size={19} className="qq-spin" />
                  ) : job ? (
                    <CheckCircle2 size={19} />
                  ) : (
                    <SearchCheck size={19} />
                  )}
                  <div>
                    <strong>
                      {questionQualityJobStatus(job?.status, counts)}
                    </strong>
                    <span>
                      {job
                        ? qualityText(
                            "snapshotDescription",
                            "本报告基于启动时的 {$count} 题快照，已完成结果会实时保留",
                            { count: counts.total },
                          )
                        : qualityText(
                            "inspectionDescription",
                            "将逐题检查事实、答案、解析、表述和学术规范",
                          )}
                    </span>
                  </div>
                </div>
                <b>{counts.percent}%</b>
              </div>
              <div
                className="qq-progress-track"
                role="progressbar"
                aria-label={qualityText("progress", "题目质检进度")}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={counts.percent}
              >
                <span style={{ width: `${counts.percent}%` }} />
              </div>
              <div className="qq-counts">
                <span>
                  <small>{qualityText("count.total", "总题数")}</small>
                  <strong>{counts.total}</strong>
                </span>
                <span>
                  <small>{qualityText("count.running", "正在质检")}</small>
                  <strong>{counts.running}</strong>
                </span>
                <span>
                  <small>{qualityText("count.completed", "已完成")}</small>
                  <strong>{counts.completed}</strong>
                </span>
                <span className={counts.issues ? "has-issues" : ""}>
                  <small>{qualityText("count.issues", "检出问题题数")}</small>
                  <strong>{counts.issues}</strong>
                </span>
              </div>
            </section>

            <section
              className="qq-results"
              aria-label={qualityText("results", "逐题质检结果")}
            >
              <header className="qq-results-toolbar">
                <div>
                  <h2>{qualityText("resultTitle", "逐题结果")}</h2>
                  <span>
                    {job
                      ? qualityText(
                          "visibleQuestions",
                          "已显示 {$visible}/{$total} 题",
                          { visible: visibleRows.length, total: rows.length },
                        )
                      : qualityText(
                          "resultHint",
                          "开始质检后在此查看结果",
                        )}
                  </span>
                </div>
                <div
                  className="qq-filters"
                  role="group"
                  aria-label={qualityText("filterLabel", "筛选质检结果")}
                >
                  {filters.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </header>
              <div className="qq-question-list">
                {visibleRows.length === 0 ? (
                  <div className="qq-filter-empty">
                    {qualityText("filterEmpty", "当前筛选下没有题目")}
                  </div>
                ) : (
                  visibleRows.map(({ question, result, index }) => {
                    const meta = questionQualityStatus(result, jobActive);
                    const StatusIcon = STATUS_ICONS.get(meta.status);
                    const resultStatus = normalizedResultStatus(result);
                    const issues = Array.isArray(result?.issues)
                      ? result.issues
                      : [];
                    const expandable = Boolean(
                      result &&
                      (issues.length > 0 ||
                        result.summary ||
                        result.conclusion ||
                        result.error),
                    );
                    const expanded =
                      expandedIds.has(question.id) || resultStatus === "issues";
                    return (
                      <article
                        className={`qq-question-row ${meta.tone}`}
                        key={question.id}
                      >
                        <button
                          className="qq-question-summary"
                          type="button"
                          disabled={!expandable}
                          aria-expanded={expandable ? expanded : undefined}
                          onClick={() =>
                            expandable && toggleExpanded(question.id)
                          }
                        >
                          <span className="qq-question-number">
                            {index + 1}
                          </span>
                          <span className="qq-question-copy">
                            <span className="qq-question-tags">
                              <span>
                                {questionQualityModuleLabel(question)}
                              </span>
                              <span>
                                {questionQualityTypeLabel(question.type)}
                              </span>
                            </span>
                            <strong>
                              {question.stem ||
                                qualityText("missingStem", "未填写题干")}
                            </strong>
                          </span>
                          <span className={`qq-status ${meta.tone}`}>
                            <StatusIcon
                              size={15}
                              className={
                                meta.tone === "running" ? "qq-spin" : ""
                              }
                            />
                            {meta.label}
                          </span>
                          {expandable && (
                            <ChevronRight
                              className={`qq-expand-icon${expanded ? " expanded" : ""}`}
                              size={17}
                            />
                          )}
                        </button>
                        {expanded && result && (
                          <div className="qq-question-detail">
                            {resultStatus === "passed" && (
                              <div className="qq-pass-message">
                                <CheckCircle2 size={17} />
                                <div>
                                  <strong>
                                    {qualityText("passedTitle", "没有发现问题")}
                                  </strong>
                                  <span>
                                    {result.conclusion ||
                                      result.summary ||
                                      qualityText(
                                        "passedDescription",
                                        "题干、答案与解析一致，符合当前学段教学要求。",
                                      )}
                                  </span>
                                </div>
                              </div>
                            )}
                            {resultStatus === "failed" && (
                              <div className="qq-failed-message">
                                <XCircle size={17} />
                                <div>
                                  <strong>
                                    {qualityText("failedTitle", "本题质检失败")}
                                  </strong>
                                  <span>
                                    {qualityText(
                                      "failedDescription",
                                      "质检服务暂时未返回有效结果，请单独重试。",
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                            {resultStatus === "issues" && result.summary && (
                              <p className="qq-result-summary">
                                {result.summary}
                              </p>
                            )}
                            {issues.map((issue, issueIndex) => (
                              <QualityIssue
                                key={`${question.id}-${issueIndex}`}
                                issue={issue}
                                index={issueIndex}
                              />
                            ))}
                            {resultStatus === "issues" &&
                              issues.length === 0 &&
                              !result.summary && (
                                <p className="qq-result-summary">
                                  {qualityText(
                                    "needsReview",
                                    "发现需要教师复核的问题。",
                                  )}
                                </p>
                              )}
                            <footer>
                              {resultStatus === "failed" &&
                                !["cancelled", "canceled"].includes(
                                  job?.status,
                                ) && (
                                  <button
                                    className="teacher-neutral"
                                    type="button"
                                    disabled={retryingIds.has(question.id)}
                                    onClick={() => {
                                      void retryQuestion(question.id);
                                    }}
                                  >
                                    {retryingIds.has(question.id) ? (
                                      <LoaderCircle
                                        size={14}
                                        className="qq-spin"
                                      />
                                    ) : (
                                      <RefreshCw size={14} />
                                    )}
                                    {qualityText("action.retry", "重试本题")}
                                  </button>
                                )}
                              <button
                                className="teacher-neutral"
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/adaptive-learning/teacher/textbook-lessons/${lessonId}/content`,
                                  )
                                }
                              >
                                <Pencil size={14} />
                                {qualityText("action.edit", "去修改")}
                              </button>
                            </footer>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </TeacherShell>
  );
}
