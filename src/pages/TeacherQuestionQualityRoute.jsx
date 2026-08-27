import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight, CircleDashed, FileSearch2,
  LoaderCircle, Pencil, RefreshCw, SearchCheck, Square, XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TeacherShell from '../components/TeacherShell.jsx';
import {
  cancelQuestionQualityJob, createQuestionQualityJob, getQuestionQualityJob,
  retryQuestionQualityQuestion,
} from '../lib/questionQualityApi.js';
import { curriculumLessons, readTeacherContent } from '../teacher/data/teacherContentRepository.js';
import {
  collectLessonQualityQuestions,
  deriveQuestionQualityProgress,
  filterQuestionQualityRows,
  normalizedResultStatus,
} from '../teacher/domain/questionQualityPresentation.js';
import '../question-quality.css';

const ACTIVE_JOB_STATUSES = new Set(['queued', 'running']);
const JOB_STORAGE_KEY = 'adaptive-learning.question-quality.jobs.v1';
const filters = [
  { id: 'all', label: '全部' },
  { id: 'issues', label: '有问题' },
  { id: 'passed', label: '通过' },
  { id: 'failed', label: '失败' },
];
const issueTypeLabels = {
  factual_error: '事实错误', academic_error: '学术性错误', stem_error: '题干错误',
  option_error: '选项错误', answer_error: '答案错误', analysis_error: '解析错误',
  answer_analysis_mismatch: '答案与解析不符', ambiguity: '题意歧义', missing_condition: '条件缺失',
  non_unique_answer: '答案不唯一', terminology_error: '术语错误', typo: '错别字',
  symbol_or_unit_error: '符号或单位错误', formatting_error: '出版格式错误',
  grade_mismatch: '学段不匹配', other: '其他问题',
};
const severityLabels = { critical: '严重错误', major: '重要错误', minor: '规范问题' };
const certaintyLabels = { confirmed: '确认问题', needs_human_review: '需人工复核' };

function readRememberedJobId(lessonId) {
  try {
    const jobs = JSON.parse(window.sessionStorage.getItem(JOB_STORAGE_KEY) || '{}');
    return String(jobs?.[lessonId] || '');
  } catch {
    return '';
  }
}

function rememberJobId(lessonId, jobId) {
  try {
    const jobs = JSON.parse(window.sessionStorage.getItem(JOB_STORAGE_KEY) || '{}');
    window.sessionStorage.setItem(JOB_STORAGE_KEY, JSON.stringify({ ...jobs, [lessonId]: jobId }));
  } catch {
    // Progress remains available until the page is closed when browser storage is unavailable.
  }
}

function forgetJobId(lessonId) {
  try {
    const jobs = JSON.parse(window.sessionStorage.getItem(JOB_STORAGE_KEY) || '{}');
    delete jobs[lessonId];
    window.sessionStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // There is no stored job to clean up when browser storage is unavailable.
  }
}

function displayQuestionType(type) {
  return ({ single_choice: '单选题', multiple_choice: '多选题', fill_blank: '填空题', short_answer: '主观题' })[type] || '题目';
}

function statusMeta(result, jobActive) {
  const status = normalizedResultStatus(result);
  if (status === 'issues') return { label: '发现问题', tone: 'issues', icon: AlertCircle };
  if (status === 'passed') return { label: '质检通过', tone: 'passed', icon: CheckCircle2 };
  if (status === 'failed') return { label: '质检失败', tone: 'failed', icon: XCircle };
  if (status === 'running') return { label: '正在质检', tone: 'running', icon: LoaderCircle };
  return { label: jobActive ? '等待质检' : '未质检', tone: 'queued', icon: CircleDashed };
}

function jobStatusCopy(status, counts) {
  if (status === 'queued') return '任务已提交，正在分配质检资源';
  if (status === 'running') return `正在逐题精校，已完成 ${counts.completed}/${counts.total}`;
  if (status === 'completed') return counts.issues ? `质检完成，${counts.issues} 题需要修改` : '质检完成，全部题目通过';
  if (status === 'partial') return `质检已完成，${counts.failed} 题失败，可单独重试`;
  if (status === 'failed') return '质检任务失败，请重新发起';
  if (status === 'cancelled' || status === 'canceled') return '质检已取消，已完成结果仍保留';
  return '尚未开始质检';
}

function issueValue(issue, ...keys) {
  const key = keys.find((item) => issue?.[item]);
  return key ? String(issue[key]) : '';
}

function QualityIssue({ issue, index }) {
  const field = issueValue(issue, 'field', 'location') || '题目内容';
  const location = issueValue(issue, 'location');
  const original = issueValue(issue, 'originalText', 'original', 'excerpt');
  const reason = issueValue(issue, 'reason', 'message');
  const evidence = issueValue(issue, 'evidence');
  const revision = issueValue(issue, 'suggestedRevision', 'suggestion', 'correction');
  const corrected = issueValue(issue, 'correctedValue');
  const severity = issueValue(issue, 'severity');
  const type = issueValue(issue, 'type');
  const certainty = issueValue(issue, 'certainty');
  return (
    <article className="qq-issue">
      <header>
        <strong>问题 {index + 1}</strong>
        <span>{field}</span>
        {location && location !== field && <span>{location}</span>}
        {type && <span>{issueTypeLabels[type] || '其他问题'}</span>}
        {severity && <span className={`qq-severity ${severity}`}>{severityLabels[severity] || '需要关注'}</span>}
        {certainty && <span className={`qq-certainty ${certainty}`}>{certaintyLabels[certainty] || '需人工复核'}</span>}
      </header>
      <dl>
        {original && <><dt>原文</dt><dd>{original}</dd></>}
        {reason && <><dt>错误说明</dt><dd>{reason}</dd></>}
        {evidence && <><dt>判断依据</dt><dd>{evidence}</dd></>}
        {revision && <><dt>修改建议</dt><dd>{revision}</dd></>}
        {corrected && <><dt>建议改为</dt><dd className="qq-corrected">{corrected}</dd></>}
      </dl>
    </article>
  );
}

export default function TeacherQuestionQualityRoute() {
  const navigate = useNavigate();
  const lessons = useMemo(() => curriculumLessons(), []);
  const contents = useMemo(() => readTeacherContent(), []);
  const initialLessonId = lessons.find((lesson) => collectLessonQualityQuestions(contents[lesson.id]).length)?.id || lessons[0]?.id || '';
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [restoringJob, setRestoringJob] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [retryingIds, setRetryingIds] = useState(() => new Set());
  const [filter, setFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const pollAbortRef = useRef(null);
  const selectedLesson = lessons.find((lesson) => lesson.id === lessonId) || lessons[0];
  const questions = useMemo(() => collectLessonQualityQuestions(contents[lessonId]), [contents, lessonId]);
  const jobActive = ACTIVE_JOB_STATUSES.has(job?.status);
  const counts = deriveQuestionQualityProgress(job, questions.length);

  const refreshJob = useCallback(async (jobId, signal) => {
    const nextJob = await getQuestionQualityJob(jobId, { signal });
    setJob(nextJob);
    return nextJob;
  }, []);

  useEffect(() => {
    const rememberedJobId = readRememberedJobId(lessonId);
    if (!rememberedJobId) return undefined;
    const controller = new AbortController();
    let active = true;
    setRestoringJob(true);
    getQuestionQualityJob(rememberedJobId, { signal: controller.signal }).then((rememberedJob) => {
      if (!active) return;
      if (String(rememberedJob?.lessonId || rememberedJob?.lesson?.id || '') !== String(lessonId)) {
        forgetJobId(lessonId);
        return;
      }
      setJob(rememberedJob);
    }).catch((restoreError) => {
      if (!active) return;
      if (restoreError?.name === 'AbortError') return;
      if (restoreError?.status === 404) forgetJobId(lessonId);
      else setError(restoreError.message || '暂时无法恢复质检进度');
    }).finally(() => { if (active) setRestoringJob(false); });
    return () => {
      active = false;
      controller.abort();
    };
  }, [lessonId]);

  useEffect(() => {
    if (job?.id && lessonId) rememberJobId(lessonId, job.id);
  }, [job?.id, lessonId]);

  useEffect(() => {
    if (!job?.id || !jobActive) return undefined;
    const controller = new AbortController();
    pollAbortRef.current?.abort();
    pollAbortRef.current = controller;
    let timer;
    const poll = async () => {
      try {
        const nextJob = await refreshJob(job.id, controller.signal);
        setError('');
        if (ACTIVE_JOB_STATUSES.has(nextJob?.status)) {
          timer = window.setTimeout(poll, Math.max(800, Number(nextJob.pollIntervalMs || 1500)));
        }
      } catch (pollError) {
        if (pollError?.name === 'AbortError') return;
        setError(pollError.message || '暂时无法更新质检进度');
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
    const resultsById = new Map(results.map((result) => [String(result.questionId || result.question?.id || ''), result]));
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
  const visibleRows = useMemo(() => filterQuestionQualityRows(rows, filter), [rows, filter]);

  const startQualityInspection = async () => {
    if (!selectedLesson || !questions.length || submitting) return;
    pollAbortRef.current?.abort();
    setSubmitting(true);
    setError('');
    setFilter('all');
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
    } catch (startError) {
      setError(startError.message || '暂时无法开始题目质检');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelJob = async () => {
    if (!job?.id || cancelling) return;
    setCancelling(true);
    setError('');
    try {
      const nextJob = await cancelQuestionQualityJob(job.id);
      setJob(nextJob);
    } catch (cancelError) {
      setError(cancelError.message || '取消质检失败');
    } finally {
      setCancelling(false);
    }
  };

  const retryQuestion = async (questionId) => {
    if (!job?.id || retryingIds.has(questionId)) return;
    setRetryingIds((current) => new Set(current).add(questionId));
    setError('');
    try {
      const nextJob = await retryQuestionQualityQuestion(job.id, questionId);
      setJob(nextJob || await getQuestionQualityJob(job.id));
    } catch (retryError) {
      setError(retryError.message || '单题重试失败');
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
    setError('');
    setFilter('all');
    setExpandedIds(new Set());
  };

  const toggleExpanded = (questionId) => setExpandedIds((current) => {
    const next = new Set(current);
    if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
    return next;
  });

  const headerActions = jobActive ? (
    <button className="teacher-neutral" type="button" disabled={cancelling} onClick={() => { void cancelJob(); }}>
      {cancelling ? <LoaderCircle size={15} className="qq-spin" /> : <Square size={14} />}
      {cancelling ? '正在取消' : '取消质检'}
    </button>
  ) : (
    <button className="teacher-primary" type="button" disabled={!questions.length || submitting || restoringJob} onClick={() => { void startQualityInspection(); }}>
      {submitting || restoringJob ? <LoaderCircle size={15} className="qq-spin" /> : <SearchCheck size={16} />}
      {restoringJob ? '正在恢复进度' : submitting ? '正在创建任务' : job ? '重新质检' : '开始质检'}
    </button>
  );

  return (
    <TeacherShell title="题目质检" subtitle="按教辅出版标准逐题精校，质检结果需由教师确认" actions={headerActions}>
      <div className="question-quality-page">
        <section className="qq-context" aria-label="质检课时">
          <label>
            <span>质检课时</span>
            <span className="qq-select-wrap">
              <select value={lessonId} onChange={changeLesson} disabled={jobActive}>
                {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.index} {lesson.title}</option>)}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <div className="qq-lesson-meta">
            <strong>{selectedLesson?.grade} · {selectedLesson?.subject}</strong>
            <span>{job ? `当前草稿 ${questions.length} 题` : `${questions.length} 题待质检`}</span>
            <span>{selectedLesson?.knowledgePoints?.length || 0} 个知识点</span>
          </div>
        </section>

        {error && <div className="qq-notice error" role="alert"><AlertCircle size={17} /><span>{error}</span>{job?.id && <button type="button" onClick={() => { void refreshJob(job.id).catch((refreshError) => setError(refreshError.message)); }}><RefreshCw size={14} />刷新</button>}</div>}

        {!questions.length ? (
          <section className="qq-empty">
            <FileSearch2 size={30} />
            <h2>这个课时还没有可质检的题目</h2>
            <p>请先在教材课时内容中补充课前测验或课后练习。</p>
            <button className="teacher-primary" type="button" onClick={() => navigate(`/adaptive-learning/teacher/textbook-lessons/${lessonId}/content`)}><Pencil size={15} />去编辑课时</button>
          </section>
        ) : (
          <>
            <section className={`qq-progress-panel ${job?.status || 'idle'}`} aria-live="polite" aria-busy={jobActive}>
              <div className="qq-progress-heading">
                <div>
                  {jobActive ? <LoaderCircle size={19} className="qq-spin" /> : job ? <CheckCircle2 size={19} /> : <SearchCheck size={19} />}
                  <div><strong>{jobStatusCopy(job?.status, counts)}</strong><span>{job ? `本报告基于启动时的 ${counts.total} 题快照，已完成结果会实时保留` : '将逐题检查事实、答案、解析、表述和学术规范'}</span></div>
                </div>
                <b>{counts.percent}%</b>
              </div>
              <div className="qq-progress-track" role="progressbar" aria-label="题目质检进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow={counts.percent}><span style={{ width: `${counts.percent}%` }} /></div>
              <div className="qq-counts">
                <span><small>总题数</small><strong>{counts.total}</strong></span>
                <span><small>正在质检</small><strong>{counts.running}</strong></span>
                <span><small>已完成</small><strong>{counts.completed}</strong></span>
                <span className={counts.issues ? 'has-issues' : ''}><small>检出问题题数</small><strong>{counts.issues}</strong></span>
              </div>
            </section>

            <section className="qq-results" aria-label="逐题质检结果">
              <header className="qq-results-toolbar">
                <div><h2>逐题结果</h2><span>{job ? `已显示 ${visibleRows.length}/${rows.length} 题` : '开始质检后在此查看结果'}</span></div>
                <div className="qq-filters" role="group" aria-label="筛选质检结果">
                  {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
                </div>
              </header>
              <div className="qq-question-list">
                {visibleRows.length === 0 ? <div className="qq-filter-empty">当前筛选下没有题目</div> : visibleRows.map(({ question, result, index }) => {
                  const meta = statusMeta(result, jobActive);
                  const StatusIcon = meta.icon;
                  const resultStatus = normalizedResultStatus(result);
                  const issues = Array.isArray(result?.issues) ? result.issues : [];
                  const expandable = Boolean(result && (issues.length || result.summary || result.conclusion || result.error));
                  const expanded = expandedIds.has(question.id) || resultStatus === 'issues';
                  return (
                    <article className={`qq-question-row ${meta.tone}`} key={question.id}>
                      <button className="qq-question-summary" type="button" disabled={!expandable} aria-expanded={expandable ? expanded : undefined} onClick={() => expandable && toggleExpanded(question.id)}>
                        <span className="qq-question-number">{index + 1}</span>
                        <span className="qq-question-copy">
                          <span className="qq-question-tags"><span>{question.moduleLabel || '题目'}</span><span>{displayQuestionType(question.type)}</span></span>
                          <strong>{question.stem || '未填写题干'}</strong>
                        </span>
                        <span className={`qq-status ${meta.tone}`}><StatusIcon size={15} className={meta.tone === 'running' ? 'qq-spin' : ''} />{meta.label}</span>
                        {expandable && <ChevronRight className={`qq-expand-icon${expanded ? ' expanded' : ''}`} size={17} />}
                      </button>
                      {expanded && result && (
                        <div className="qq-question-detail">
                          {resultStatus === 'passed' && <div className="qq-pass-message"><CheckCircle2 size={17} /><div><strong>没有发现问题</strong><span>{result.conclusion || result.summary || '题干、答案与解析一致，符合当前学段教学要求。'}</span></div></div>}
                          {resultStatus === 'failed' && <div className="qq-failed-message"><XCircle size={17} /><div><strong>本题质检失败</strong><span>{result.error || '质检服务暂时未返回有效结果，请单独重试。'}</span></div></div>}
                          {resultStatus === 'issues' && result.summary && <p className="qq-result-summary">{result.summary}</p>}
                          {issues.map((issue, issueIndex) => <QualityIssue key={`${question.id}-${issueIndex}`} issue={issue} index={issueIndex} />)}
                          {resultStatus === 'issues' && !issues.length && !result.summary && <p className="qq-result-summary">发现需要教师复核的问题。</p>}
                          <footer>
                            {resultStatus === 'failed' && !['cancelled', 'canceled'].includes(job?.status) && <button className="teacher-neutral" type="button" disabled={retryingIds.has(question.id)} onClick={() => { void retryQuestion(question.id); }}>{retryingIds.has(question.id) ? <LoaderCircle size={14} className="qq-spin" /> : <RefreshCw size={14} />}重试本题</button>}
                            <button className="teacher-neutral" type="button" onClick={() => navigate(`/adaptive-learning/teacher/textbook-lessons/${lessonId}/content`)}><Pencil size={14} />去修改</button>
                          </footer>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </TeacherShell>
  );
}
