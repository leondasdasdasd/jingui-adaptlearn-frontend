import { useState } from 'react';
import AppShell from './AppShell';
import {
  Check, ChevronLeft, ChevronRight, Sparkles, X,
} from './Icons';
import { isMasteredValue, masteryStatus } from '../shared/domain/masteryPolicy.js';
import MathContent from './MathContent';
import QuestionReviewDisplay from './QuestionReviewDisplay';
import {
  evidenceRowsForKnowledgePoint, overallAttemptCorrectRate, normalizeConfidence,
} from '../student/domain/masteryFeedback.js';
import { formatQuestionResult } from '../shared/question-platform/gradingDisplay.js';
import { aiGeneratedErrorReason, aiGeneratedImprovement } from '../student/domain/questionFeedback.js';

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

const ANSWER_STATE_META = {
  correct: { label: '回答正确', shortLabel: '正确' },
  partial: { label: '部分正确', shortLabel: '部分正确' },
  incorrect: { label: '回答错误', shortLabel: '错误' },
  skipped: { label: '已选择不会做', shortLabel: '不会做' },
  unanswered: { label: '未作答', shortLabel: '未作答' },
};

function diagnosis(value, covered) {
  if (!covered) return { label: '本次未覆盖', tone: 'neutral' };
  const label = masteryStatus(value);
  return label === '需要巩固'
    ? { label, tone: 'warning' }
    : { label, tone: 'success' };
}

function diagnosticStatus(item = {}, covered) {
  if (item.diagnosisReason === 'QUESTION_POOL_EXHAUSTED') return { label: '', tone: 'neutral' };
  if (item.diagnosisStatus === 'provisionally_mastered') return { label: '暂定掌握', tone: 'success' };
  if (item.diagnosisStatus === 'needs_learning') return { label: '需要学习', tone: 'warning' };
  if (item.diagnosisStatus === 'uncertain') return { label: '暂不确定', tone: 'neutral' };
  if (item.status === 'MASTERED' || item.status === 'PROVISIONALLY_MASTERED') return { label: item.status === 'MASTERED' ? '正式掌握' : '暂定掌握', tone: 'success' };
  if (item.status === 'NEEDS_LEARNING') return { label: '需要学习', tone: 'warning' };
  if (item.status === 'VERIFYING' || item.status === 'NEEDS_REVALIDATION') return { label: '继续验证', tone: 'neutral' };
  return diagnosis(item.mastery, covered);
}

const STOP_REASON_LABELS = {
  RECENT_MASTERY_VERIFIED: '近期掌握记录已通过当前题验证',
  TWO_STRONG_RESPONSES: '连续两题达到要求，停止追加题目',
  TWO_CLEAR_GAPS: '连续两题未达到要求，已加入学习重点',
  CONFLICTING_EVIDENCE_AT_LIMIT: '3 题后结果仍不稳定',
};

function answerState(attempt) {
  if (!attempt) return 'unanswered';
  if (attempt.skipped || attempt.disposition === 'SKIPPED_DONT_KNOW') return 'skipped';
  if (attempt.correct) return 'correct';
  if (Number(attempt.scoreRatio || 0) > 0) return 'partial';
  return 'incorrect';
}

function optionText(question, value) {
  const option = (question.options || []).find((item) => (
    (typeof item === 'string' ? item : item.id) === value
  ));
  return typeof option === 'string' ? option : option?.text || value;
}

function displayAnswer(question, attempt) {
  if (attempt?.skipped || attempt?.disposition === 'SKIPPED_DONT_KNOW') return '我不会做（已跳过）';
  if (attempt?.answerImageName) {
    const recognized = attempt.recognizedAnswer || attempt.answer;
    return recognized ? `图片作答：${recognized}` : `图片作答：${attempt.answerImageName}`;
  }
  const values = Array.isArray(attempt?.answer) ? attempt.answer : [attempt?.answer];
  return values.filter(Boolean).map((value) => optionText(question, value)).join('、') || '未作答';
}

function displayCorrectAnswer(question, attempt, answerReviewStatus = 'ready') {
  const answer = attempt?.correctAnswer ?? question.answer;
  const values = Array.isArray(answer) ? answer : [answer];
  const text = values.filter((value) => value !== undefined && value !== null && value !== '')
    .map((value) => optionText(question, value)).join('、');
  if (text) return text;
  if (answerReviewStatus === 'loading') return '正在加载参考答案…';
  if (answerReviewStatus === 'failed') return '参考答案加载失败，请刷新重试';
  return '暂未获取到参考答案';
}

function QuestionStateIcon({ state }) {
  if (state === 'correct') return <Check size={18} aria-hidden="true" />;
  if (state === 'incorrect') return <X size={18} aria-hidden="true" />;
  if (state === 'partial') return <span aria-hidden="true">½</span>;
  if (state === 'skipped') return <span aria-hidden="true">?</span>;
  return <span aria-hidden="true">—</span>;
}

function QuestionNumberGrid({
  questions, attempts, activeIndex = null, onSelect, compact = false, questionIndices = null,
}) {
  const indices = questionIndices || questions.map((_, index) => index);
  return (
    <div className={`pre-question-grid${compact ? ' compact' : ''}`} aria-label="题目批改结果">
      {indices.map((index) => {
        const question = questions[index];
        const state = answerState(attempts[question.id]);
        const meta = ANSWER_STATE_META[state];
        return (
          <button
            className={`pre-question-number ${state}`}
            type="button"
            key={question.id}
            aria-label={`第 ${index + 1} 题，${meta.label}，查看详情`}
            aria-pressed={activeIndex === index}
            onClick={() => onSelect(index)}
          >
            <span className="pre-question-number-value">{index + 1}</span>
            <span className="pre-question-number-state">
              <QuestionStateIcon state={state} />
              <span>{meta.shortLabel}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AnswerDetail({ questions, attempts, index, onBack, onSelect, answerReviewStatus }) {
  const question = questions[index];
  const attempt = attempts[question.id];
  const state = answerState(attempt);
  const meta = ANSWER_STATE_META[state];
  const accuracy = attempt?.scoreRatio == null ? null : Math.round(Number(attempt.scoreRatio) * 100);
  const errorReason = aiGeneratedErrorReason(question.type, attempt);
  const improvement = aiGeneratedImprovement(question.type, attempt);
  const analysis = attempt?.analysis || question.analysis;

  return (
    <section className="pre-answer-detail">
      <button className="pre-answer-detail-back" type="button" onClick={onBack}>
        <ChevronLeft size={17} />
        <span>返回知识点掌握</span>
      </button>

      <div className="pre-answer-detail-switcher">
        <div>
          <span>切换题目</span>
          <strong>第 {index + 1} 题 / 共 {questions.length} 题</strong>
        </div>
        <QuestionNumberGrid
          questions={questions}
          attempts={attempts}
          activeIndex={index}
          onSelect={onSelect}
          compact
        />
      </div>

      <article className={`pre-answer-detail-card ${state}`}>
        <header>
          <div>
            <span>{QUESTION_TYPE_LABELS[question.type] || '练习题'}</span>
            <h2>第 {index + 1} 题</h2>
          </div>
          <strong className="pre-answer-detail-status">
            <QuestionStateIcon state={state} />
            <span>{meta.label}</span>
            {state === 'partial' && <small>{formatQuestionResult(accuracy == null ? null : accuracy / 100, '正确率待补充')}</small>}
          </strong>
        </header>

        <QuestionReviewDisplay
          question={question}
          studentAnswer={attempt?.answer}
          studentAnswerText={displayAnswer(question, attempt)}
          correctAnswer={attempt?.correctAnswer ?? question.answer}
          correctAnswerText={displayCorrectAnswer(question, attempt, answerReviewStatus)}
          correctAnswerLabel="参考答案"
          analysis={analysis}
        />

        {errorReason && (
          <div className="pre-answer-detail-feedback error-reason">
            <Sparkles size={18} aria-hidden="true" />
            <div>
              <span>错误原因</span>
              <MathContent as="p" renderKey={errorReason}>{errorReason}</MathContent>
            </div>
          </div>
        )}
        {improvement && (
          <div className="pre-answer-detail-feedback">
            <Sparkles size={18} aria-hidden="true" />
            <div>
              <span>修改建议</span>
              <MathContent as="p" renderKey={improvement}>{improvement}</MathContent>
            </div>
          </div>
        )}
      </article>

      <div className="pre-answer-detail-pager">
        <button type="button" disabled={index === 0} onClick={() => onSelect(index - 1)}>
          <ChevronLeft size={17} /><span>上一题</span>
        </button>
        <button type="button" disabled={index === questions.length - 1} onClick={() => onSelect(index + 1)}>
          <span>下一题</span><ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
}

function MasteryOverview({ knowledgePoints, mastery, questions, attempts, onSelectQuestion }) {
  return (
    <section className="pre-mastery-page" aria-label="知识点掌握情况">
      <div className="pre-mastery-list">
        {knowledgePoints.map((kp) => {
          const item = mastery[kp.id] || { mastery: null, evidenceCount: 0 };
          const covered = Number(item.evidenceCount || 0) > 0 && item.mastery != null;
          const meta = diagnosticStatus(item, covered);
          const value = covered ? item.mastery : 0;
          const relatedQuestionIndices = evidenceRowsForKnowledgePoint({
            questions,
            attempts,
            knowledgePointId: kp.id,
          }).map(({ index }) => index);
          const confidence = normalizeConfidence(item.confidence);
          return (
            <article className={`pre-mastery-card ${meta.tone}`} key={kp.id}>
              <header className="pre-mastery-identity">
                <div>
                  <span>知识点</span>
                  <h3>{kp.name}</h3>
                  {STOP_REASON_LABELS[item.diagnosisReason] && (
                    <small className="pre-mastery-stop-reason">
                      {STOP_REASON_LABELS[item.diagnosisReason]}
                    </small>
                  )}
                </div>
              </header>
              <div className="pre-mastery-metric">
                <div className="pre-mastery-metric-head">
                  <div className="pre-mastery-value">
                    <span>本次掌握度</span>
                    <strong>{covered ? value : '—'}<small>{covered ? '%' : ''}</small></strong>
                  </div>
                  {meta.label && <span className="pre-mastery-status">{meta.label}</span>}
                </div>
                <div className="pre-mastery-progress" aria-label={covered ? `${kp.name}本次诊断 ${value}%` : `${kp.name}本次测验未覆盖`}>
                  <span style={{ width: `${value}%` }} />
                </div>
                <div className="pre-mastery-confidence">
                  <span>置信度</span>
                  <strong>{confidence == null ? '待补充' : `${Math.round(confidence)}%`}</strong>
                </div>
              </div>
              <div className="pre-mastery-questions">
                <span>涉及题目</span>
                {relatedQuestionIndices.length > 0 ? <QuestionNumberGrid
                  questions={questions}
                  attempts={attempts}
                  questionIndices={relatedQuestionIndices}
                  onSelect={onSelectQuestion}
                  compact
                /> : <small>本次未涉及</small>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function PreAssessmentResultPage({
  lesson, knowledgePoints, mastery, questions = [], attempts = {}, diagnosticSummary, nextStep, onContinue,
  answerReviewStatus = 'ready',
}) {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  const correctCount = questions.filter((question) => answerState(attempts[question.id]) === 'correct').length;
  const overallCorrectRate = overallAttemptCorrectRate(questions, attempts);
  const focusCount = knowledgePoints.filter((item) => {
    const result = mastery[item.id] || {};
    return result.diagnosisStatus
      ? result.diagnosisStatus !== 'provisionally_mastered'
      : !(Number(result.evidenceCount || 0) >= 3 && isMasteredValue(result.mastery));
  }).length;
  const confirmedCount = Number(diagnosticSummary?.resolvedKnowledgePointCount ?? knowledgePoints.length);
  const hasAdministeredQuestions = questions.length > 0;

  return (
    <AppShell title={lesson.title} eyebrow={hasAdministeredQuestions ? '课前小测结果' : '学习重点'} compact>
      <div className="result-wrap pre-result-wrap">
        <section className="pre-result-summary">
          <div className="pre-result-summary-icon"><Check size={28} /></div>
          <div className="pre-result-summary-copy">
            <span>{hasAdministeredQuestions ? '本次课前诊断已完成' : '本课学习路径已准备'}</span>
            <h1>{hasAdministeredQuestions ? `你完成了 ${questions.length} 道动态诊断题` : `已整理 ${knowledgePoints.length} 个知识点`}</h1>
            <p>{hasAdministeredQuestions
              ? focusCount === 0
                ? `已确认 ${confirmedCount} 个知识点，答对 ${correctCount} 道；基础表现稳定，将直接进行独立验证。`
                : `已确认 ${confirmedCount} 个知识点，答对 ${correctCount} 道；其中 ${focusCount} 个将优先学习。`
              : `其中 ${focusCount} 个知识点将优先学习。`}</p>
          </div>
          <div className="pre-result-summary-score">
            <span>整场得分率</span>
            <strong>{overallCorrectRate == null ? '—' : overallCorrectRate}<small>{overallCorrectRate == null ? '' : '%'}</small></strong>
            <small className="pre-result-focus-count">学习重点 {focusCount} 项</small>
          </div>
        </section>

        {selectedQuestionIndex != null && (
          <AnswerDetail
            questions={questions}
            attempts={attempts}
            index={selectedQuestionIndex}
            onBack={() => setSelectedQuestionIndex(null)}
            onSelect={setSelectedQuestionIndex}
            answerReviewStatus={answerReviewStatus}
          />
        )}
        {selectedQuestionIndex == null && (
          <MasteryOverview
            knowledgePoints={knowledgePoints}
            mastery={mastery}
            questions={questions}
            attempts={attempts}
            onSelectQuestion={setSelectedQuestionIndex}
          />
        )}
      </div>

      <footer className="pre-result-fixed-action">
        <div>
          <div className="pre-result-fixed-copy">
            <strong>{nextStep?.title || '准备好了吗？'}</strong>
            <span>{nextStep?.description || '开始进入本课学习'}</span>
          </div>
          <button className="primary-button large" type="button" onClick={onContinue}>
            <span>{nextStep?.actionLabel || '开始学习'}</span><ChevronRight size={17} />
          </button>
        </div>
      </footer>
    </AppShell>
  );
}
