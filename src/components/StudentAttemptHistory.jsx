import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, FileQuestion, XCircle } from 'lucide-react';
import MathContent from './MathContent';
import {
  readLearningAttemptFacets, readLearningAttempts,
} from '../student/data/learningHistoryRepository';
import { mergeLearningAttempts } from '../student/domain/authoritativeLearningProfile';
import { loadAnswerReviews } from '../lib/gradingApi';
import { formatQuestionResult } from '../shared/question-platform/gradingDisplay.js';
import { aiGeneratedErrorReason, aiGeneratedImprovement } from '../student/domain/questionFeedback.js';

const ATTEMPT_TYPE_LABELS = {
  pre: '课前小测', practice: '知识点练习', composite: '综合练习', enhancement: '提升训练',
};
const QUESTION_TYPE_LABELS = {
  single_choice: '单选题', multiple_choice: '多选题', fill_blank: '填空题', short_answer: '问答题',
  judgement: '判断题', ordering: '排序题', classification: '分类题', matching: '匹配题',
  line_connect: '连线题', text_marker: '文本标记题', word_builder: '组式题',
};
const OUTCOME_LABELS = {
  correct: '正确', partial: '部分正确', incorrect: '错误', skipped: '不会做', pending: '待评定',
};
const OUTCOME_TONES = {
  correct: 'success', partial: 'warning', incorrect: 'danger', skipped: 'muted', pending: 'muted',
};

function formatDate(value, withDate = true) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', withDate
    ? { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }
    : { hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replaceAll('/', '-');
}

function percent(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : '—';
}

function answerText(value) {
  if (value == null || value === '') return '未记录';
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return '已作答'; }
  }
  return String(value);
}

function questionStem(attempt) {
  const snapshot = attempt.questionSnapshot || {};
  const value = snapshot.stem || snapshot.title || snapshot.prompt || snapshot.content || '题目内容暂缺';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return '题目内容暂缺'; }
}

function questionTypeLabel(questionType) {
  return QUESTION_TYPE_LABELS[questionType] || '其他题型';
}

function rangeStart(range) {
  if (range === 'all') return '';
  const days = Number(range);
  return Number.isFinite(days) ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : '';
}

function AttemptDetailDrawer({ attempt, onClose, reviewCredentials }) {
  const existingAnswer = attempt.correctAnswer ?? attempt.questionSnapshot?.answer;
  const reviewStudentSessionId = reviewCredentials?.studentSessionId || '';
  const reviewAccessToken = reviewCredentials?.accessToken || '';
  const [reviewState, setReviewState] = useState({ status: existingAnswer != null ? 'ready' : 'idle', item: null });
  useEffect(() => {
    const attemptSession = attempt.studentSessionId || attempt.historyId || '';
    if (existingAnswer != null || !attempt.contentVersionId || !attempt.questionId
        || !reviewStudentSessionId || attemptSession !== reviewStudentSessionId || !reviewAccessToken) return undefined;
    let cancelled = false;
    setReviewState({ status: 'loading', item: null });
    loadAnswerReviews(attempt.contentVersionId, [attempt.questionId], {
      studentSessionId: reviewStudentSessionId,
      accessToken: reviewAccessToken,
    })
      .then((items) => { if (!cancelled) setReviewState({ status: 'ready', item: items[attempt.questionId] || null }); })
      .catch(() => { if (!cancelled) setReviewState({ status: 'failed', item: null }); });
    return () => { cancelled = true; };
  }, [attempt.contentVersionId, attempt.historyId, attempt.questionId, attempt.studentSessionId,
    existingAnswer, reviewAccessToken, reviewStudentSessionId]);
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  if (!attempt) return null;
  const outcome = attempt.outcome;
  const snapshot = attempt.questionSnapshot || {};
  const reviewAnswer = existingAnswer ?? reviewState.item?.correctAnswer;
  const referenceAnswer = reviewAnswer != null
    ? answerText(reviewAnswer)
    : reviewState.status === 'loading'
      ? '正在加载参考答案…'
      : reviewState.status === 'failed'
        ? '参考答案加载失败，请刷新重试'
        : '暂未获取到参考答案';
  const errorReason = aiGeneratedErrorReason(attempt.questionType, attempt);
  const improvement = aiGeneratedImprovement(attempt.questionType, attempt);
  const analysis = attempt.analysis || reviewState.item?.analysis || snapshot.analysis;
  return (
    <div className="student-attempt-drawer" role="presentation">
      <button className="student-attempt-drawer-mask" type="button" aria-label="关闭题目详情" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="student-attempt-title">
        <header>
          <div><span>{ATTEMPT_TYPE_LABELS[attempt.attemptType]} · {formatDate(attempt.submittedAt)}</span><h2 id="student-attempt-title">作答详情</h2></div>
          <button type="button" aria-label="关闭" onClick={onClose}><XCircle size={19} /></button>
        </header>
        <div className="student-attempt-drawer-body">
          <div className="student-attempt-drawer-meta">
            <span className={`student-attempt-outcome ${OUTCOME_TONES[outcome]}`}>{OUTCOME_LABELS[outcome]}</span>
            {attempt.questionType && <span>{questionTypeLabel(attempt.questionType)}</span>}
            <span>{attempt.lesson?.index ? `${attempt.lesson.index} ` : ''}{attempt.lesson?.title || '未命名课时'}</span>
            {attempt.knowledgePoints?.length > 0 && <span>{attempt.knowledgePoints.join(' · ')}</span>}
          </div>
          <section className="student-attempt-detail-question">
            <span>题目</span>
            <MathContent as="div" renderKey={questionStem(attempt)}>{questionStem(attempt)}</MathContent>
          </section>
          <section className="student-attempt-detail-grid">
            <div><span>我的答案</span><p>{answerText(attempt.answer ?? attempt.answerText ?? attempt.recognizedAnswer)}</p></div>
            <div><span>参考答案</span><p>{referenceAnswer}</p></div>
          </section>
          {errorReason && (
            <section className="student-attempt-detail-feedback error-reason"><span>错误原因</span><p>{errorReason}</p></section>
          )}
          {improvement && (
            <section className="student-attempt-detail-feedback"><span>修改建议</span><p>{improvement}</p></section>
          )}
          {analysis && (
            <section className="student-attempt-detail-feedback"><span>答案解析</span><p>{analysis}</p></section>
          )}
          <dl className="student-attempt-detail-facts">
            <div><dt>作答时间</dt><dd>{formatDate(attempt.submittedAt)}</dd></div>
            <div><dt>得分率</dt><dd>{attempt.outcome === 'skipped' || attempt.outcome === 'pending'
              ? OUTCOME_LABELS[attempt.outcome]
              : formatQuestionResult(attempt.scoreRatio)}</dd></div>
            <div><dt>记录来源</dt><dd>{attempt.source === 'classroom' ? '课堂同步' : '当前设备'}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}

function facetsFromAttempts(attempts) {
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const lessons = unique(attempts.map((attempt) => attempt.lesson?.id)).map((id) => {
    const row = attempts.find((attempt) => attempt.lesson?.id === id);
    return { id, title: row?.lesson?.title || id, index: row?.lesson?.index || '' };
  });
  const knowledgePoints = unique(attempts.flatMap((attempt) => attempt.knowledgePointIds || [])).map((id) => {
    const row = attempts.find((attempt) => attempt.knowledgePointIds?.includes(id));
    const index = row?.knowledgePointIds.indexOf(id) ?? -1;
    return { id, name: row?.knowledgePoints?.[index] || id };
  });
  return { lessons, knowledgePoints, questionTypes: unique(attempts.map((attempt) => attempt.questionType)) };
}

export default function StudentAttemptHistory({
  studentId, refreshKey, authoritativeAttempts = [], loading = false, error = '', onRetry,
  reviewCredentials = null,
}) {
  const [filters, setFilters] = useState({ lessonId: '', knowledgePointId: '', attemptType: '', questionType: '', outcome: '', range: 'all' });
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const allAttempts = useMemo(() => mergeLearningAttempts(
    readLearningAttempts({ studentId }), authoritativeAttempts,
  ), [authoritativeAttempts, refreshKey, studentId]);
  const facets = useMemo(() => {
    if (!authoritativeAttempts.length) return readLearningAttemptFacets({ studentId });
    return facetsFromAttempts(allAttempts);
  }, [allAttempts, authoritativeAttempts.length, refreshKey, studentId]);
  const attempts = useMemo(() => {
    const from = rangeStart(filters.range);
    return allAttempts
      .filter((attempt) => !filters.lessonId || attempt.lesson?.id === filters.lessonId)
      .filter((attempt) => !filters.knowledgePointId || attempt.knowledgePointIds?.includes(filters.knowledgePointId))
      .filter((attempt) => !filters.attemptType || attempt.attemptType === filters.attemptType)
      .filter((attempt) => !filters.questionType || attempt.questionType === filters.questionType)
      .filter((attempt) => !filters.outcome || attempt.outcome === filters.outcome)
      .filter((attempt) => !from || new Date(attempt.submittedAt || 0).getTime() >= new Date(from).getTime());
  }, [allAttempts, filters]);
  const stats = useMemo(() => {
    const uniqueQuestions = new Set(attempts.map((attempt) => attempt.questionId));
    const evaluated = attempts.filter((attempt) => ['correct', 'partial', 'incorrect'].includes(attempt.outcome));
    const correct = evaluated.filter((attempt) => attempt.outcome === 'correct').length;
    return {
      attempts: attempts.length,
      uniqueQuestions: uniqueQuestions.size,
      accuracy: evaluated.length ? (correct / evaluated.length) * 100 : null,
      needReview: attempts.filter((attempt) => ['incorrect', 'partial', 'skipped'].includes(attempt.outcome)).length,
    };
  }, [attempts]);
  useEffect(() => setVisibleCount(50), [filters, studentId]);
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () => setFilters({ lessonId: '', knowledgePointId: '', attemptType: '', questionType: '', outcome: '', range: 'all' });
  const hasFilters = Object.values(filters).some((value) => value && value !== 'all');

  return (
    <section className="student-attempt-history" role="tabpanel" aria-label="做题记录">
      <header className="student-attempt-history-heading">
        <div><div className="student-attempt-history-icon"><BarChart3 size={18} /></div><h2>做题记录</h2></div>
        {hasFilters && <button className="student-attempt-clear-filter" type="button" onClick={resetFilters}>清除筛选</button>}
      </header>

      {loading && <div className="student-progress-sync" role="status">正在同步服务端做题记录…</div>}
      {error && <div className="student-progress-sync error" role="alert"><span>{error}，当前显示本机记录。</span>{onRetry && <button type="button" onClick={onRetry}>重新同步</button>}</div>}

      <div className="student-attempt-toolbar" aria-label="做题记录筛选">
        <label><span>课时</span><select value={filters.lessonId} onChange={(event) => setFilter('lessonId', event.target.value)}><option value="">全部课时</option>{facets.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.index ? `${lesson.index} ` : ''}{lesson.title}</option>)}</select></label>
        <label><span>知识点</span><select value={filters.knowledgePointId} onChange={(event) => setFilter('knowledgePointId', event.target.value)}><option value="">全部知识点</option>{facets.knowledgePoints.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>类型</span><select value={filters.attemptType} onChange={(event) => setFilter('attemptType', event.target.value)}><option value="">全部类型</option>{Object.entries(ATTEMPT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>题型</span><select value={filters.questionType} onChange={(event) => setFilter('questionType', event.target.value)}><option value="">全部题型</option>{facets.questionTypes.map((value) => <option key={value} value={value}>{questionTypeLabel(value)}</option>)}</select></label>
        <label><span>结果</span><select value={filters.outcome} onChange={(event) => setFilter('outcome', event.target.value)}><option value="">全部结果</option>{Object.entries(OUTCOME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>时间</span><select value={filters.range} onChange={(event) => setFilter('range', event.target.value)}><option value="all">全部时间</option><option value="7">最近7天</option><option value="30">最近30天</option></select></label>
      </div>

      <div className="student-attempt-stats" aria-label="当前筛选统计">
        <div><span>作答次数</span><strong>{stats.attempts}</strong></div>
        <div><span>涉及题目</span><strong>{stats.uniqueQuestions}</strong></div>
        <div><span>作答得分率</span><strong>{percent(stats.accuracy)}</strong></div>
        <div><span>待巩固记录</span><strong>{stats.needReview}</strong></div>
      </div>

      {attempts.length ? (
        <div className="student-attempt-list">
          {attempts.slice(0, visibleCount).map((attempt) => (
            <article className="student-attempt-row" key={`${attempt.historyId}:${attempt.attemptId}`}>
              <div className={`student-attempt-state ${OUTCOME_TONES[attempt.outcome]}`}><span>{OUTCOME_LABELS[attempt.outcome]}</span></div>
              <div className="student-attempt-main">
                <div className="student-attempt-labels"><span>{ATTEMPT_TYPE_LABELS[attempt.attemptType]}</span>{attempt.questionType && <span className="student-attempt-question-type">{questionTypeLabel(attempt.questionType)}</span>}{attempt.knowledgePoints?.map((name) => <span key={name}>{name}</span>)}<time><Clock3 size={13} />{formatDate(attempt.submittedAt)}</time></div>
                <MathContent as="h3" renderKey={questionStem(attempt)}>{questionStem(attempt)}</MathContent>
                <p>我的答案：{answerText(attempt.answer ?? attempt.answerText ?? attempt.recognizedAnswer)}</p>
                <small>{attempt.lesson?.index ? `${attempt.lesson.index} ` : ''}{attempt.lesson?.title || '未命名课时'} · {attempt.source === 'classroom' ? '课堂同步' : '当前设备'}</small>
              </div>
              <button className="student-attempt-detail-button" type="button" onClick={() => setSelectedAttempt(attempt)}>查看详情</button>
            </article>
          ))}
          {attempts.length > visibleCount && <div className="student-attempt-load-more"><span>已显示 {visibleCount} / {attempts.length} 条</span><button className="secondary-button" type="button" onClick={() => setVisibleCount((count) => count + 50)}>加载更多</button></div>}
        </div>
      ) : (
        <div className="student-attempt-empty"><FileQuestion size={28} /><strong>{hasFilters ? '没有符合条件的作答记录' : '还没有做题记录'}</strong><span>{hasFilters ? '可以清除筛选，看看全部作答。' : '完成一次课前小测或练习后，记录会显示在这里。'}</span>{hasFilters && <button className="secondary-button" type="button" onClick={resetFilters}>清除筛选</button>}</div>
      )}
      {selectedAttempt && <AttemptDetailDrawer
        attempt={selectedAttempt}
        onClose={() => setSelectedAttempt(null)}
        reviewCredentials={reviewCredentials}
      />}
    </section>
  );
}
