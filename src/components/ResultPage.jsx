import { useState } from 'react';
import AppShell from './AppShell';
import { Check, ChevronLeft } from './Icons';
import MathContent from './MathContent';
import QuestionReviewDisplay from './QuestionReviewDisplay';
import { formatMasteryDelta } from '../student/domain/masteryFeedback.js';
import { aiGeneratedErrorReason, aiGeneratedImprovement } from '../student/domain/questionFeedback.js';
import { formatQuestionResult } from '../shared/question-platform/gradingDisplay.js';
import { scoreStatePresentation } from '../shared/domain/classroomScorePresentation.js';
import '../classroom-assessment.css';

function percent(value) {
  return value == null || !Number.isFinite(Number(value)) ? '—' : `${Math.round(Number(value))}%`;
}

function attemptAccuracy(attempt) {
  if (attempt?.scoreRatio != null) return Math.round(Number(attempt.scoreRatio) * 100);
  const score = Number(attempt?.score);
  const maxScore = Number(attempt?.maxScore);
  return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
    ? Math.round((score / maxScore) * 100)
    : null;
}

function displayAnswer(question, attempt) {
  if (attempt?.answerImageName) return attempt.recognizedAnswer || attempt.answer || '图片作答';
  const values = Array.isArray(attempt?.answer) ? attempt.answer : [attempt?.answer];
  const optionById = Object.fromEntries((question.options || []).map((option) => [
    typeof option === 'string' ? option : option.id,
    typeof option === 'string' ? option : option.text,
  ]));
  return values.filter(Boolean).map((value) => optionById[value] || value).join('、') || '未作答';
}

function displayCorrectAnswer(question, attempt, answerReviewStatus = 'ready') {
  const answer = attempt?.correctAnswer ?? question.answer;
  const values = Array.isArray(answer) ? answer : [answer];
  const optionById = Object.fromEntries((question.options || []).map((option) => [
    typeof option === 'string' ? option : option.id,
    typeof option === 'string' ? option : option.text,
  ]));
  const text = values.filter((value) => value !== undefined && value !== null && value !== '')
    .map((value) => optionById[value] || value).join('、');
  if (text) return text;
  if (answerReviewStatus === 'loading') return '正在加载参考答案…';
  if (answerReviewStatus === 'failed') return '参考答案加载失败，请刷新重试';
  return '暂未获取到参考答案';
}

function phaseLabel(question) {
  if (question.purpose?.toUpperCase() === 'PRE' || question.phase === 'diagnostic') return '课前小测';
  if (question.phase === 'review') return '综合练习';
  return '单点练习';
}

function questionState(attempt) {
  const ratio = attemptAccuracy(attempt);
  if (ratio == null) return 'pending';
  if (ratio >= 100) return 'correct';
  if (ratio > 0) return 'partial';
  return 'incorrect';
}

function ReviewQuestionIndex({ items, selectedIndex, onSelect }) {
  const reviewCount = items.filter(({ attempt }) => questionState(attempt) !== 'correct').length;
  return (
    <section className="result-question-report" aria-label="本轮题目">
      <header>
        <div><h2>本轮题目</h2></div>
        <strong>{reviewCount ? `${reviewCount} 题需要再看` : '本轮没有错题'}</strong>
      </header>
      <div className="result-question-index" role="list" aria-label="题目导航">
        {items.map(({ question, attempt }, index) => {
          const state = questionState(attempt);
          return <button
            key={question.id}
            type="button"
            role="listitem"
            className={`result-question-index-button ${state}${selectedIndex === index ? ' selected' : ''}`}
            aria-label={`第 ${index + 1} 题，${state}`}
            aria-pressed={selectedIndex === index}
            onClick={() => onSelect(index)}
          >{index + 1}</button>;
        })}
      </div>
      <div className="result-question-legend" aria-label="题目状态图例">
        <span><i className="correct" />正确</span>
        <span><i className="partial" />部分正确</span>
        <span><i className="incorrect" />错误</span>
        <span><i className="pending" />未作答</span>
      </div>
    </section>
  );
}

function ResultQuestionDetail({ lesson, items, index, masteryTraceByQuestionId, onBack, onSelect, answerReviewStatus }) {
  const item = items[index];
  if (!item) return null;
  const { question, attempt } = item;
  const ratio = attemptAccuracy(attempt);
  const state = questionState(attempt);
  const traces = masteryTraceByQuestionId[question.id] || [];
  const errorReason = aiGeneratedErrorReason(question.type, attempt);
  const improvement = aiGeneratedImprovement(question.type, attempt);
  return (
    <AppShell title={lesson.title} eyebrow="作答详情" onBack={onBack} compact>
      <div className="result-detail-wrap">
        <header className="result-detail-header">
          <div><span>第 {index + 1} 题 / 共 {items.length} 题 · {phaseLabel(question)}</span><h1>作答详情</h1></div>
          <strong className={state}>{formatQuestionResult(ratio == null ? null : ratio / 100, '未作答')}</strong>
        </header>
        <ReviewQuestionIndex items={items} selectedIndex={index} onSelect={onSelect} />
        <section className="result-detail-card" aria-label="题目与答案详情">
          <span className="detail-section-label">题目与作答</span>
          <QuestionReviewDisplay
            question={question}
            studentAnswer={attempt?.answer}
            studentAnswerText={displayAnswer(question, attempt)}
            correctAnswer={attempt?.correctAnswer ?? question.answer}
            correctAnswerText={displayCorrectAnswer(question, attempt, answerReviewStatus)}
            analysis={attempt?.analysis}
          />
          {errorReason && <div className="result-detail-feedback error-reason"><span>错误原因</span><MathContent as="p" renderKey={errorReason}>{errorReason}</MathContent></div>}
          {improvement && <div className="result-detail-feedback"><span>修改建议</span><MathContent as="p" renderKey={improvement}>{improvement}</MathContent></div>}
          {traces.length > 0 && <div className="result-detail-evidence">{traces.map((trace) => {
            const delta = trace.masteryDelta != null ? Number(trace.masteryDelta) : Number(trace.masteryAfter) - Number(trace.masteryBefore);
            const confidence = Number(trace.confidenceAfter);
            return <div key={trace.knowledgePointId}><span>{trace.knowledgePointName || trace.knowledgePointId}</span><strong className={delta < 0 ? 'down' : 'up'}>{formatMasteryDelta(delta, '—')}</strong><small>{Number.isFinite(Number(trace.masteryAfter)) ? `掌握度 ${Math.round(Number(trace.masteryAfter))}%` : '掌握度待补充'}{Number.isFinite(confidence) ? ` · 置信度 ${Math.round(confidence)}%` : ''}</small></div>;
          })}</div>}
        </section>
        <div className="result-detail-action"><button className="primary-button large" type="button" onClick={onBack}><ChevronLeft size={18} /> 返回学习报告</button></div>
      </div>
    </AppShell>
  );
}

export default function ResultPage({
  lesson, knowledgePoints, result, resultMode = 'offline_preview', questions = [], attempts = {},
  masteryTraceByQuestionId = {}, reportError = '', sessionType = 'lesson', onRestart,
  answerReviewStatus = 'ready', pendingSyncCount = 0, score = null,
}) {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  const determined = Object.values(result || {}).filter((item) => item?.mastery != null);
  const overall = determined.length ? Math.round(determined.reduce((sum, item) => sum + Number(item.mastery), 0) / determined.length) : null;
  const confidenceValues = determined.map((item) => Number(item.confidence)).filter(Number.isFinite);
  const overallConfidence = confidenceValues.length
    ? Math.round(confidenceValues.reduce((sum, value) => sum + (value <= 1 ? value * 100 : value), 0) / confidenceValues.length)
    : null;
  const answeredQuestions = questions.filter((question, index, list) => (
    attempts[question.id] && list.findIndex((item) => item.id === question.id) === index
  ));
  const orderedQuestions = [...answeredQuestions].sort((a, b) => {
    const aTime = Date.parse(attempts[a.id]?.submittedAt || '');
    const bTime = Date.parse(attempts[b.id]?.submittedAt || '');
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return aTime - bTime;
    return questions.indexOf(a) - questions.indexOf(b);
  });
  const validAccuracies = answeredQuestions
    .map((question) => attemptAccuracy(attempts[question.id]))
    .filter((value) => value != null);
  const overallCorrectRate = validAccuracies.length
    ? Math.round(validAccuracies.reduce((sum, value) => sum + value, 0) / validAccuracies.length)
    : null;
  const overallBeforeValues = determined.map((item) => Number(item.preMastery)).filter(Number.isFinite);
  const overallBefore = overallBeforeValues.length ? Math.round(overallBeforeValues.reduce((sum, value) => sum + value, 0) / overallBeforeValues.length) : null;
  const overallDelta = overall != null && overallBefore != null ? overall - overallBefore : null;
  const isAuthoritative = resultMode === 'authoritative';
  const scoreState = scoreStatePresentation(score, resultMode);
  const pendingReview = isAuthoritative && score?.status === 'READY' && score?.reviewStatus !== 'PUBLISHED';
  const showResultValues = !pendingReview;
  const resultLabel = isAuthoritative
    ? pendingReview ? '结论待确认' : scoreState.published ? '已正式结算 · 已发布' : '已正式结算'
    : '未同步预览';

  if (selectedQuestionIndex != null) {
    return <ResultQuestionDetail
      lesson={lesson}
      items={orderedQuestions.map((question) => ({ question, attempt: attempts[question.id] }))}
      index={selectedQuestionIndex}
      masteryTraceByQuestionId={masteryTraceByQuestionId}
      answerReviewStatus={answerReviewStatus}
      onBack={() => setSelectedQuestionIndex(null)}
      onSelect={setSelectedQuestionIndex}
    />;
  }

  return (
    <AppShell title={lesson.title} eyebrow={sessionType === 'enhancement_training' ? '提升训练完成' : '学习完成'} compact>
      <div className="result-wrap">
        <section className="result-report-hero">
          <div className="complete-mark"><Check size={24} /></div>
          <div className="result-report-hero-copy"><span>{sessionType === 'enhancement_training' ? '这一轮提升训练完成' : '这一课完成了'}</span><h1>{lesson.title}</h1><p>{overall == null ? '本轮还需要更多有效作答。' : sessionType === 'enhancement_training' ? '这次训练用于巩固变式与迁移能力。' : '你已经完成一次有效学习，复习错题会更稳。'}</p></div>
          <div className="result-report-hero-count"><strong>{orderedQuestions.length}</strong><span>题已完成</span></div>
        </section>

        <section className={`method-note result-authority-note ${isAuthoritative ? 'authoritative' : 'preview'}`} role="status">
          <strong>{resultLabel}{pendingReview ? ` · ${scoreState.label}` : ''}</strong>
          <p>{pendingReview
            ? scoreState.title
            : isAuthoritative
              ? '正式批改、掌握证据和结算结果均来自服务端，学生端与教师端结果一致。'
              : `当前结果只是本机未同步预览，不会写入长期掌握记录。${pendingSyncCount > 0 ? `还有 ${pendingSyncCount} 道记录正在同步。` : '正在等待服务端结算。'}`}</p>
        </section>

        <section className="result-report-metrics" aria-label="整课学习表现">
          <div><span>本次作答</span><strong>{orderedQuestions.length}<small>题</small></strong></div>
          <div><span>得分率</span><strong>{showResultValues ? percent(overallCorrectRate) : '—'}</strong></div>
          <div><span>掌握率</span><strong>{showResultValues ? percent(overall) : '—'}</strong></div>
          <div><span>置信度</span><strong>{showResultValues ? percent(overallConfidence) : '—'}</strong></div>
        </section>

        {showResultValues && <section className="result-report-mastery" aria-label="整课掌握度变化">
          <header><div><span>整课掌握度</span><h2>{percent(overall)}</h2></div>{overallDelta != null && <strong className={overallDelta < 0 ? 'down' : ''}>{overallDelta >= 0 ? '+' : ''}{overallDelta.toFixed(1)}%</strong>}</header>
          <div className="result-report-progress"><span style={{ width: `${Math.max(0, Math.min(100, overall || 0))}%` }} />{overallBefore != null && <i style={{ left: `${Math.max(0, Math.min(100, overallBefore))}%` }} />}</div>
          <div className="result-report-progress-labels"><span>学习前 {percent(overallBefore)}</span><span>学习后 {percent(overall)}</span></div>
        </section>}

        <section className="result-list result-report-knowledge-points">
          <div className="result-list-heading">
            <h1>掌握变化</h1>
            <span>课前小测 → 本次学习</span>
          </div>
          {knowledgePoints.map((kp) => {
            const item = result[kp.id];
            return (
              <div className="result-row" key={kp.id}>
                <div className="result-name">
                  <strong>{kp.name}</strong>
                  <small>{item?.mastery == null
                    ? '掌握度待补充 · 置信度待补充'
                    : showResultValues ? `掌握度 ${item.mastery}% · ${isAuthoritative ? `有效证据 ${item.evidenceCount || 0} · ` : ''}置信度 ${item.confidence == null ? '待补充' : `${Math.round(Number(item.confidence) <= 1 ? Number(item.confidence) * 100 : Number(item.confidence))}%`}` : '等待老师确认后展示'}</small>
                </div>
                <div className="mastery-before">{item?.preMastery == null ? '—' : `${item.preMastery}%`}</div>
                <div className="result-arrow">→</div>
                <div className="mastery-after">{!showResultValues || item?.mastery == null ? '—' : `${item.mastery}%`}</div>
                <div className={item?.improvement >= 0 ? 'improvement positive' : 'improvement'}>
                  {!showResultValues || item?.improvement == null ? '—' : `${item.improvement >= 0 ? '+' : ''}${item.improvement}`}
                </div>
              </div>
            );
          })}
        </section>

        {reportError && <p className="result-sync-warning result-report-sync-warning">{reportError}</p>}

        <ReviewQuestionIndex items={orderedQuestions.map((question) => ({ question, attempt: attempts[question.id] }))} selectedIndex={null} onSelect={setSelectedQuestionIndex} />

        <div className="result-action">
          <button className="secondary-button large" type="button" onClick={onRestart}>返回课时目录</button>
        </div>
      </div>
    </AppShell>
  );
}
