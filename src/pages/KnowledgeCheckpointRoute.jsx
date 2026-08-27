import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import DifficultyBadge from '../components/DifficultyBadge';
import { Check, ChevronLeft, ChevronRight, Sparkles } from '../components/Icons';
import { routes } from '../routes/routePaths';
import { useLearningSession } from '../session/LearningSessionContext';
import {
  activeLearningUnit, advanceLessonFlow, finishTemporaryLearning, routeForLearningUnit,
} from '../student/domain/learningPlan';
import { recordLearningEvent } from '../student/data/learningEventRepository';
import MathContent from '../components/MathContent';
import QuestionReviewDisplay from '../components/QuestionReviewDisplay';
import { calculatePostMastery } from '../lib/mastery';
import { formatMasteryDelta, normalizeMasteryDelta } from '../student/domain/masteryFeedback.js';
import { aiGeneratedErrorReason, aiGeneratedImprovement } from '../student/domain/questionFeedback.js';
import { formatQuestionResult } from '../shared/question-platform/gradingDisplay.js';
import { MASTERY_THRESHOLD, isMasteredValue } from '../shared/domain/masteryPolicy.js';

const QUESTION_STATE_LABELS = {
  correct: '正确',
  partial: '部分正确',
  incorrect: '错误',
  pending: '未作答',
};

const QUESTION_TYPE_LABELS = {
  single_choice: '单项选择题',
  multiple_choice: '多项选择题',
  fill_blank: '题干内填空',
  short_answer: '问答题',
  judgement: '判断题',
  ordering: '排序题',
  classification: '分类题', matching: '匹配题', line_connect: '连线题',
  text_marker: '文本标记题', word_builder: '组式题',
};

function practiceQuestions(context, knowledgePointId) {
  const pool = context.publishedContent?.knowledgePracticePools?.[knowledgePointId];
  const fallback = (context.postQuestions || []).filter((question) => (
    question.phase !== 'review' && question.knowledgePointIds?.includes(knowledgePointId)
  ));
  if (!pool?.length) return fallback;
  const seen = new Set();
  return [...pool, ...fallback].filter((question) => {
    if (!question?.id || seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}

function scoreRatioForAttempt(attempt) {
  if (attempt?.scoreRatio != null) return Math.max(0, Math.min(1, Number(attempt.scoreRatio) || 0));
  const score = Number(attempt?.score);
  const maxScore = Number(attempt?.maxScore);
  return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
    ? Math.max(0, Math.min(1, score / maxScore))
    : null;
}

function questionState(attempt) {
  if (!attempt) return 'pending';
  const ratio = scoreRatioForAttempt(attempt);
  if (ratio == null) return 'pending';
  if (ratio >= 0.999) return 'correct';
  if (ratio > 0) return 'partial';
  return 'incorrect';
}

function masterySnapshotForAttempt(attempt, knowledgePointId) {
  const candidate = attempt?.u1Preview?.[knowledgePointId]
    || attempt?.unifiedMastery?.[knowledgePointId]
    || attempt?.masteryUpdate?.[knowledgePointId]
    || null;
  if (!candidate) return null;
  const before = Number(candidate.masteryBefore ?? candidate.before);
  const after = Number(candidate.masteryAfter ?? candidate.after ?? candidate.mastery);
  const confidence = Number(candidate.confidenceAfter ?? candidate.confidence);
  const correctStreak = Number(candidate.correctStreak ?? candidate.streak);
  return {
    before: Number.isFinite(before) ? before : null,
    after: Number.isFinite(after) ? after : null,
    delta: Number.isFinite(before) && Number.isFinite(after)
      ? normalizeMasteryDelta(after - before) : null,
    confidence: Number.isFinite(confidence) ? (confidence <= 1 ? confidence * 100 : confidence) : null,
    correctStreak: Number.isFinite(correctStreak) ? correctStreak : null,
  };
}

function displayAnswer(question, attempt) {
  if (attempt?.answerImageName) return attempt.recognizedAnswer || attempt.answer || '图片作答';
  const values = Array.isArray(attempt?.answer) ? attempt.answer : [attempt?.answer];
  const optionById = Object.fromEntries((question.options || []).map((option) => [
    typeof option === 'string' ? option : option.id,
    typeof option === 'string' ? option : option.text,
  ]));
  return values.filter((value) => value !== '' && value != null)
    .map((value) => optionById[value] || value).join('、') || '未作答';
}

function displayCorrectAnswer(question) {
  const values = Array.isArray(question.answer) ? question.answer : [question.answer];
  const optionById = Object.fromEntries((question.options || []).map((option) => [
    typeof option === 'string' ? option : option.id,
    typeof option === 'string' ? option : option.text,
  ]));
  return values.filter((value) => value !== '' && value != null)
    .map((value) => optionById[value] || value).join('、') || '暂未提供';
}

function encouragementFor({ correctRate, answered, masteryAfter, correctStreak }) {
  if (!answered) return '先从第一题开始，完成一次有效尝试。';
  if (Number.isFinite(Number(masteryAfter)) && !isMasteredValue(masteryAfter)) {
    return `本轮已完成 ${answered} 题，当前掌握度 ${Math.round(Number(masteryAfter))}%，还未达到${MASTERY_THRESHOLD}%掌握线。继续针对薄弱点学习，并用新题验证。`;
  }
  if (Number.isFinite(Number(masteryAfter)) && Number(correctStreak) < 2) {
    return `当前掌握度已达到${MASTERY_THRESHOLD}%，但连续达标证据还不稳定（${Math.max(0, Number(correctStreak) || 0)}/2）。后续练习继续巩固。`;
  }
  if (correctRate >= 80) return '做得很稳！你已经把这一部分的关键方法练熟了。';
  if (correctRate >= 60) return '你已经完成一次有效练习，再看几题就会更稳。';
  return '你已经迈出关键一步，接下来把容易混淆的地方练稳。';
}

function QuestionIndex({ items, selectedIndex, onSelect }) {
  return (
    <div className="knowledge-checkpoint-question-index" role="list" aria-label="本轮题目导航">
      {items.map(({ question, attempt, masterySnapshot }, index) => {
        const state = questionState(attempt);
        const ratio = scoreRatioForAttempt(attempt);
        const scoreLabel = formatQuestionResult(ratio, '未作答');
        const masteryLabel = masterySnapshot?.delta == null
          ? '掌握度变化待补充'
          : `掌握度${masterySnapshot.delta > 0 ? '提升' : masterySnapshot.delta < 0 ? '下降' : '无明显变化'} ${Math.abs(masterySnapshot.delta).toFixed(1)}%`;
        return (
          <button
            key={question.id}
            type="button"
            role="listitem"
            className={`question-index-button ${state}${selectedIndex === index ? ' selected' : ''}`}
            aria-label={`第 ${index + 1} 题，${question.difficulty}，${QUESTION_STATE_LABELS[state]}，${scoreLabel}，${masteryLabel}`}
            aria-pressed={selectedIndex === index}
            onClick={() => onSelect(index)}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}

function QuestionDetail({ items, index, onBack, onSelect }) {
  const item = items[index];
  if (!item) return null;
  const { question, attempt, masterySnapshot } = item;
  const state = questionState(attempt);
  const ratio = scoreRatioForAttempt(attempt);
  const errorReason = aiGeneratedErrorReason(question.type, attempt);
  const improvement = aiGeneratedImprovement(question.type, attempt);
  return (
    <AppShell
      title="学习小结"
      eyebrow={question.knowledgePointName || '题目详情'}
      onBack={onBack}
      compact
    >
      <div className="knowledge-question-detail">
        <header className="knowledge-question-detail-header">
          <div>
            <span>第 {index + 1} 题 / 共 {items.length} 题</span>
            <h1>{QUESTION_TYPE_LABELS[question.type] || '练习题'}</h1>
          </div>
          <div className="knowledge-question-detail-meta">
            <DifficultyBadge difficulty={question.difficulty} variant="stars" />
            <strong className={state}>{formatQuestionResult(ratio, '未作答')}</strong>
          </div>
        </header>

        <QuestionIndex items={items} selectedIndex={index} onSelect={onSelect} />

        <section className="knowledge-question-detail-card" aria-label="题目详情">
          <span className="detail-section-label">题目与作答</span>
          <QuestionReviewDisplay
            question={question}
            studentAnswer={attempt?.answer}
            studentAnswerText={displayAnswer(question, attempt)}
            correctAnswer={attempt?.correctAnswer ?? question.answer}
            correctAnswerText={displayCorrectAnswer({ ...question, answer: attempt?.correctAnswer ?? question.answer })}
            correctAnswerLabel="正确答案"
            analysis={attempt?.analysis}
          />
          {errorReason && <div className="knowledge-question-feedback error-reason"><span>错误原因</span><MathContent as="p" renderKey={errorReason}>{errorReason}</MathContent></div>}
          {improvement && <div className="knowledge-question-feedback"><span>修改建议</span><MathContent as="p" renderKey={improvement}>{improvement}</MathContent></div>}
          {masterySnapshot && <div className="knowledge-question-evidence" aria-label="本题掌握度证据">
            <div><span>掌握度变化</span><strong className={masterySnapshot.delta == null ? '' : masterySnapshot.delta < 0 ? 'down' : 'up'}>{formatMasteryDelta(masterySnapshot.delta, '—')}</strong></div>
            <div><span>结算掌握度</span><strong>{masterySnapshot.after == null ? '—' : `${Math.round(masterySnapshot.after)}%`}</strong></div>
            <div><span>置信度</span><strong>{masterySnapshot.confidence == null ? '—' : `${Math.round(masterySnapshot.confidence)}%`}</strong></div>
            <div><span>连续答对</span><strong>{masterySnapshot.correctStreak == null ? '—' : `${masterySnapshot.correctStreak} 题`}</strong></div>
          </div>}
        </section>

        <div className="knowledge-checkpoint-action knowledge-question-detail-action">
          <button className="primary-button large" type="button" onClick={onBack}>
            <ChevronLeft size={18} /> 返回学习小结
          </button>
        </div>
      </div>
    </AppShell>
  );
}

export default function KnowledgeCheckpointRoute() {
  const navigate = useNavigate();
  const { session, setSession } = useLearningSession();
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  const flow = session.learningFlow;
  const context = flow?.context || session;
  const unit = activeLearningUnit(flow);
  const selection = context.selection;
  const knowledgePoint = selection?.knowledgePoints?.find((item) => item.id === unit?.knowledgePointId);
  const metrics = useMemo(() => {
    const questions = practiceQuestions(context, unit?.knowledgePointId);
    let currentCorrectStreak = 0;
    const items = questions
      .map((question, poolIndex) => ({
        question,
        poolIndex,
        attempt: context.postAttempts?.[question.id],
      }))
      .filter(({ attempt }) => Boolean(attempt))
      .sort((a, b) => {
        const aTime = Date.parse(a.attempt.submittedAt || '');
        const bTime = Date.parse(b.attempt.submittedAt || '');
        if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return aTime - bTime;
        return a.poolIndex - b.poolIndex;
      })
      .map((item) => {
        const ratio = scoreRatioForAttempt(item.attempt);
        currentCorrectStreak = ratio != null && ratio >= 0.8
          ? Math.min(3, currentCorrectStreak + 1) : 0;
        const snapshot = masterySnapshotForAttempt(item.attempt, unit?.knowledgePointId);
        return {
          ...item,
          // The checkpoint is a current-round explanation.  Do not expose
          // the historical prior streak that U1 uses internally for evidence
          // weighting; the exit gate is based on this round's submissions.
          masterySnapshot: snapshot
            ? { ...snapshot, correctStreak: currentCorrectStreak }
            : snapshot,
        };
      });
    const attempts = items.map(({ attempt }) => attempt);
    const earned = attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0);
    const possible = attempts.reduce((sum, attempt) => sum + Number(attempt.maxScore || 0), 0);
    const correct = attempts.filter((attempt) => Number(attempt.scoreRatio || 0) >= 0.999).length;
    return {
      items,
      answered: attempts.length,
      correct,
      earned: Math.round(earned * 10) / 10,
      possible: Math.round(possible * 10) / 10,
      scoreRatio: possible > 0 ? Math.round((earned / possible) * 100) : null,
      correctRate: attempts.length ? Math.round((correct / attempts.length) * 100) : null,
      reviewCount: items.filter(({ attempt }) => questionState(attempt) !== 'correct').length,
    };
  }, [context, unit?.knowledgePointId]);
  const mastery = useMemo(() => {
    if (!unit?.knowledgePointId || !knowledgePoint) return null;
    const result = context.result?.[unit.knowledgePointId]
      || calculatePostMastery(
        practiceQuestions(context, unit.knowledgePointId),
        context.postAttempts || {},
        [knowledgePoint],
        context.preMastery || {},
      )[unit.knowledgePointId];
    if (!result || result.mastery == null) return null;
    const before = Number.isFinite(Number(result.preMastery)) ? Number(result.preMastery) : null;
    const after = Number(result.mastery);
    return {
      before,
      after,
      delta: before == null ? null : normalizeMasteryDelta(after - before),
      confidence: Number(result.confidence),
      evidenceCount: Number(result.evidenceCount || 0),
      status: result.status,
    };
  }, [context, knowledgePoint, unit?.knowledgePointId]);
  const nextFlow = flow?.mode === 'direct' ? null : advanceLessonFlow(flow);
  const nextUnit = activeLearningUnit(nextFlow);

  useEffect(() => {
    if (!selection?.section || !unit?.knowledgePointId) return;
    recordLearningEvent({
      type: 'knowledge_checkpoint_viewed',
      stage: 'knowledge_checkpoint',
      lessonTitle: selection.section.title,
      knowledgePointId: unit.knowledgePointId,
      answeredCount: metrics.answered,
      scoreRatio: metrics.scoreRatio,
    });
  }, [metrics.answered, metrics.scoreRatio, selection?.section, unit?.id, unit?.knowledgePointId]);

  if (!selection) return <Navigate to={routes.directory} replace />;
  if (unit?.kind !== 'knowledge_checkpoint') {
    return <Navigate to={routeForLearningUnit(unit, routes.complete)} replace />;
  }

  const continueLearning = () => {
    if (flow.mode === 'direct') {
      const returnTo = flow.returnTo || routes.knowledgeMap;
      setSession((current) => ({
        ...current,
        ...(current.learningFlow.context ? {
          selection: current.learningFlow.context.selection || current.selection,
          preQuestions: current.learningFlow.context.preQuestions || current.preQuestions,
          postQuestions: current.learningFlow.context.postQuestions || current.postQuestions,
          preAttempts: current.learningFlow.context.preAttempts || current.preAttempts,
          postAttempts: current.learningFlow.context.postAttempts || current.postAttempts,
          preMastery: current.learningFlow.context.preMastery || current.preMastery,
          preAssessment: current.learningFlow.context.preAssessment || current.preAssessment,
          result: current.learningFlow.context.result || current.result,
          resultSource: current.learningFlow.context.resultSource || 'preview',
          publishedContent: current.learningFlow.context.publishedContent || current.publishedContent,
        } : {}),
        learningFlow: finishTemporaryLearning(current.learningFlow),
      }));
      navigate(returnTo);
      return;
    }
    setSession((current) => ({ ...current, learningFlow: nextFlow }));
    navigate(routeForLearningUnit(nextUnit, routes.complete));
  };

  if (selectedQuestionIndex != null) {
    return (
      <QuestionDetail
        items={metrics.items}
        index={selectedQuestionIndex}
        onBack={() => setSelectedQuestionIndex(null)}
        onSelect={setSelectedQuestionIndex}
      />
    );
  }

  const finalCorrectStreak = metrics.items.at(-1)?.masterySnapshot?.correctStreak || 0;
  const reachedTarget = isMasteredValue(mastery?.after);
  const encouragement = encouragementFor({
    ...metrics,
    masteryAfter: mastery?.after,
    correctStreak: finalCorrectStreak,
  });
  const actionLabel = flow.mode === 'direct' ? '返回学习列表' : '继续学习';
  const before = mastery?.before ?? 0;
  const after = mastery?.after ?? 0;

  return (
    <AppShell title={selection.section.title} eyebrow="学习小结" progress={null} compact>
      <div className="knowledge-checkpoint-wrap">
        <section className="knowledge-checkpoint-hero">
          <Sparkles className="knowledge-checkpoint-sparkle sparkle-one" size={20} />
          <Sparkles className="knowledge-checkpoint-sparkle sparkle-two" size={15} />
          <div className="knowledge-checkpoint-mark"><Check size={26} /></div>
          <div className="knowledge-checkpoint-hero-copy">
            <span>{reachedTarget ? '这一部分完成了' : '这一部分已完成'}</span>
            <h1>{knowledgePoint?.name || '当前知识点'}</h1>
            <p>{encouragement}</p>
          </div>
          <div className="knowledge-checkpoint-hero-count"><strong>{metrics.answered}</strong><span>题已完成</span></div>
        </section>

        <section className="knowledge-checkpoint-metrics" aria-label="本轮学习表现">
          <div><span>本轮作答</span><strong>{metrics.answered}<small>题</small></strong></div>
          <div><span>得分率</span><strong>{metrics.correctRate == null ? '—' : `${metrics.correctRate}%`}</strong></div>
          <div><span>掌握率</span><strong>{mastery ? `${Math.round(after)}%` : '—'}</strong></div>
          <div><span>置信度</span><strong>{mastery?.confidence == null ? '—' : `${Math.round(mastery.confidence)}%`}</strong></div>
        </section>

        <section className="knowledge-checkpoint-mastery" aria-label="知识点掌握度变化">
          <header>
            <div><span>知识点掌握度</span><h2>{Math.round(after)}%</h2></div>
            {mastery?.delta != null && <strong className={mastery.delta < 0 ? 'down' : 'up'}>{formatMasteryDelta(mastery.delta)}</strong>}
          </header>
          <div className="knowledge-checkpoint-progress" role="img" aria-label={`掌握度从 ${Math.round(before)}% 变化到 ${Math.round(after)}%`}>
            <span style={{ width: `${Math.max(0, Math.min(100, after))}%` }} />
            {mastery?.before != null && <i style={{ left: `${Math.max(0, Math.min(100, before))}%` }} />}
          </div>
          <div className="knowledge-checkpoint-progress-labels"><span>学习前 {Math.round(before)}%</span><span>学习后 {Math.round(after)}% · 置信度 {mastery?.confidence == null ? '待补充' : `${Math.round(mastery.confidence)}%`}</span></div>
        </section>

        <section className="knowledge-checkpoint-questions" aria-label="本轮题目">
          <header>
            <div><h2>本轮题目</h2></div>
            <strong>{metrics.reviewCount ? `${metrics.reviewCount} 题需要再看` : '本轮没有错题'}</strong>
          </header>
          <QuestionIndex items={metrics.items} selectedIndex={null} onSelect={setSelectedQuestionIndex} />
          <div className="knowledge-checkpoint-question-legend">
            <span><i className="correct" />正确</span><span><i className="partial" />部分正确</span><span><i className="incorrect" />错误</span><span><i className="pending" />未作答</span>
          </div>
        </section>

        <div className="knowledge-checkpoint-action">
          <button className="primary-button large" type="button" onClick={continueLearning}>
            {actionLabel} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
