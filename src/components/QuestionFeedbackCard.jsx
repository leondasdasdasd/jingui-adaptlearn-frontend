import { useEffect, useState } from 'react';
import {
  CheckCircle2, CircleDot, CircleX, Lightbulb, Sparkles, Target, TrendingDown, TrendingUp, Trophy,
} from 'lucide-react';
import { buildQuestionFeedback } from '../student/domain/questionFeedback';
import { MASTERY_THRESHOLD } from '../shared/domain/masteryPolicy.js';
import MathContent from './MathContent';
import '../question-feedback.css';

const stateIcons = {
  correct: CheckCircle2,
  partial: CircleDot,
  incorrect: Target,
  retry: Lightbulb,
  correction: Sparkles,
  recorded: CheckCircle2,
};

export default function QuestionFeedbackCard(props) {
  const feedback = buildQuestionFeedback(props);
  if (!feedback) return null;
  const Icon = props.outcomeTone === 'correct'
    ? CheckCircle2
    : props.outcomeTone === 'incorrect'
      ? CircleX
      : stateIcons[feedback.state] || CircleDot;
  const showAchieved = feedback.state !== 'correct' && feedback.achieved.length > 0;
  const showErrorReason = Boolean(feedback.errorReason);
  const showImprovement = Boolean(feedback.improvement);
  return (
    <>
      <section className={`question-feedback-card ${feedback.state}${props.outcomeTone ? ` answer-outcome-${props.outcomeTone}` : ''}`} role="status" aria-live="polite" aria-atomic="true">
        <header>
          <span className="question-feedback-icon" aria-hidden="true"><Icon size={20} /></span>
          <div><strong>{feedback.title}</strong>{feedback.scoreText && <b>{feedback.scoreText}</b>}
            {props.grading?.syncStatus === 'unpersisted' && <small>未同步预览</small>}
          </div>
        </header>
        {feedback.recognizedAnswer && (
          <div className="question-feedback-row recognized">
            <span>AI 已识别</span>
            <MathContent as="p" renderKey={feedback.recognizedAnswer}>{feedback.recognizedAnswer}</MathContent>
          </div>
        )}
        {showAchieved && <div className="question-feedback-row achieved"><span>你已做到</span><MathContent as="p" renderKey={feedback.achieved.join('；')}>{feedback.achieved.join('；')}</MathContent></div>}
        {showErrorReason && <div className="question-feedback-row error-reason"><span>错误原因</span><MathContent as="p" renderKey={feedback.errorReason}>{feedback.errorReason}</MathContent></div>}
        {showImprovement && <div className="question-feedback-row improvement"><span>修改建议</span><MathContent as="p" renderKey={feedback.improvement}>{feedback.improvement}</MathContent></div>}
        {feedback.adaptiveCue?.tone === 'support' && (
          <div className="question-feedback-adaptive support">
            <strong>{feedback.adaptiveCue.title}</strong>
            <span>{feedback.adaptiveCue.detail}</span>
          </div>
        )}
      </section>
      {props.masteryFeedback?.length > 0 && <MasteryFeedback
        updates={props.masteryFeedback}
        summary={props.practiceSummary}
        practiceGate={props.practiceGate}
      />}
    </>
  );
}

function MasteryFeedback({ updates = [], summary = false, practiceGate = null }) {
  return (
    <section className="question-feedback-mastery" aria-label={summary ? '本轮知识点掌握度' : '知识点掌握度变化'}>
      <header><span>{summary ? '本轮掌握度' : '知识点掌握度'}</span></header>
      <div className="question-feedback-mastery-list">
        {updates.map((item) => {
          const delta = item.delta;
          const normalizedDelta = delta == null ? null : Number(delta);
          const deltaLabel = Number.isFinite(normalizedDelta)
            ? `${normalizedDelta > 0 ? '+' : ''}${normalizedDelta.toFixed(2)}%`
            : '等待结算';
          const mastery = item.after == null ? null : Number(item.after);
          // Keep the visible percentage consistent with the authoritative
          // stop gate. A value just below the target can otherwise round up and
          // look complete while the practice gate correctly asks the student to
          // continue” message. Once the gate is met, the real rounded value
          // is shown normally.
          const displayMastery = !Number.isFinite(mastery)
            ? null
            : practiceGate?.targetMasteryReached === false && mastery >= MASTERY_THRESHOLD
              ? MASTERY_THRESHOLD - 0.01
              : mastery;
          const before = Number(item.before);
          const displayBefore = Number.isFinite(before)
            ? before
            : Number.isFinite(displayMastery) && Number.isFinite(normalizedDelta)
              ? displayMastery - normalizedDelta
              : displayMastery;
          const changed = Number.isFinite(normalizedDelta) && Math.abs(normalizedDelta) >= 0.05;
          return (
            <div className={`question-feedback-mastery-item${changed ? normalizedDelta > 0 ? ' is-up' : ' is-down' : ''}`} key={item.knowledgePointId}>
              <div className="question-feedback-mastery-heading">
                <strong>{item.knowledgePointName}</strong>
                <small>置信度 <b>{item.confidence == null ? '—' : `${Math.round(item.confidence)}%`}</b></small>
              </div>
              {displayMastery == null
                ? <small className="question-feedback-mastery-pending">掌握度将在统一算法返回后显示</small>
                : <MasteryProgress
                    before={displayBefore}
                    after={displayMastery}
                    delta={normalizedDelta}
                    deltaLabel={deltaLabel}
                    changed={changed}
                  />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MasteryProgress({ before, after, delta, deltaLabel, changed }) {
  const normalizedAfter = clampProgress(after);
  const normalizedBefore = clampProgress(before ?? after);
  const [animatedValue, setAnimatedValue] = useState(normalizedBefore);

  useEffect(() => {
    if (!changed) {
      setAnimatedValue(normalizedAfter);
      return undefined;
    }
    setAnimatedValue(normalizedBefore);
    let innerFrame;
    const frame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setAnimatedValue(normalizedAfter));
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(innerFrame);
    };
  }, [changed, normalizedAfter, normalizedBefore]);

  const direction = changed ? Number(delta) < 0 ? 'down' : 'up' : 'steady';
  const breakthrough = changed
    && normalizedBefore < MASTERY_THRESHOLD && normalizedAfter >= MASTERY_THRESHOLD;
  const TrendIcon = breakthrough ? Trophy : direction === 'down' ? TrendingDown : TrendingUp;
  const changeLabel = breakthrough
    ? `突破掌握线 ${deltaLabel}`
    : direction === 'up'
      ? `掌握提升 ${deltaLabel}`
      : `模型更新 ${deltaLabel}`;
  return (
    <div className={`question-feedback-mastery-progress ${direction}${breakthrough ? ' breakthrough' : ''}`}>
      <div className="question-feedback-mastery-score">
        <div>
          <span>当前掌握度</span>
          <strong><AnimatedMasteryValue from={normalizedBefore} to={normalizedAfter} animate={changed} /><small>%</small></strong>
        </div>
        {changed && <span className="question-feedback-mastery-delta"><TrendIcon size={16} aria-hidden="true" />{changeLabel}</span>}
      </div>
      <div
        className="question-feedback-mastery-track"
        role="progressbar"
        aria-label={`掌握度从 ${normalizedBefore.toFixed(2)}% 变化到 ${normalizedAfter.toFixed(2)}%`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Number(normalizedAfter.toFixed(2))}
      >
        <span className="question-feedback-mastery-base" style={{ width: `${animatedValue}%` }} />
        {changed && direction === 'up' && <span
          className="question-feedback-mastery-change"
          style={{
            left: `${Math.min(normalizedBefore, normalizedAfter)}%`,
            width: `${Math.abs(normalizedAfter - normalizedBefore)}%`,
          }}
        />}
        <span className="question-feedback-mastery-fill" style={{ width: `${animatedValue}%` }} />
        {changed && <i className="question-feedback-mastery-before" style={{ left: `${normalizedBefore}%` }} aria-hidden="true" />}
        <i className="question-feedback-mastery-target" aria-hidden="true" />
        <i className="question-feedback-mastery-endpoint" style={{ left: `${animatedValue}%` }} aria-hidden="true">
          {changed && <Sparkles size={15} />}
        </i>
      </div>
      <div className="question-feedback-mastery-scale" aria-hidden="true">
        <span>0%</span>
        <span>掌握线 {MASTERY_THRESHOLD}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function AnimatedMasteryValue({ from, to, animate }) {
  const [value, setValue] = useState(animate ? from : to);

  useEffect(() => {
    if (!animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(to);
      return undefined;
    }
    let frame;
    const duration = 900;
    const startedAt = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      setValue(from + ((to - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, from, to]);

  return Number(value).toFixed(2);
}

function clampProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}
