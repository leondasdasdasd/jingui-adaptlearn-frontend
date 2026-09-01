import React, { useState } from "react";

import { isMasteredValue } from "../shared/domain/masteryPolicy.js";
import { questionResultState } from "../shared/domain/questionResult";
import {
  localizedQuestionResult,
  localizedQuestionType,
} from "../shared/presentation/questionResultPresentation";
import {
  evidenceRowsForKnowledgePoint,
  normalizeConfidence,
  overallAttemptCorrectRate,
} from "../student/domain/masteryFeedback.js";
import {
  aiGeneratedErrorReason,
  aiGeneratedImprovements,
} from "../student/domain/questionFeedback.js";
import AppShell from "./AppShell";
import { Check, ChevronLeft, ChevronRight, Sparkles, X } from "./Icons";
import MathContent from "./MathContent";
import {
  preAssessmentAnswerStateMeta,
  preAssessmentAnswerText,
  preAssessmentDiagnosticStatus,
  preAssessmentNextStep,
  preAssessmentResultCopy,
  preAssessmentResultText,
  preAssessmentStopReason,
  preAssessmentSummary,
} from "./pre-assessment-result/presentation";
import { localizedFeedbackItems } from "./question-feedback/questionFeedbackPresentation";
import QuestionReviewDisplay from "./QuestionReviewDisplay";

/**
 *
 * @param attempt
 */
function answerState(attempt) {
  if (!attempt) return "unanswered";
  if (attempt.skipped || attempt.disposition === "SKIPPED_DONT_KNOW")
    return "skipped";
  const ratio =
    attempt.scoreRatio ??
    (typeof attempt.correct === "boolean" ? Number(attempt.correct) : null);
  const state = questionResultState(ratio);
  return state === "pending" ? "unanswered" : state;
}

/**
 *
 * @param question
 * @param value
 */
function optionText(question, value) {
  const option = (question.options || []).find(
    (item) => (typeof item === "string" ? item : item.id) === value,
  );
  return typeof option === "string" ? option : option?.text || value;
}

/**
 *
 * @param question
 * @param attempt
 */
function displayAnswer(question, attempt) {
  if (attempt?.skipped || attempt?.disposition === "SKIPPED_DONT_KNOW")
    return preAssessmentResultText("skippedAnswer");
  if (attempt?.answerImageName) {
    const recognized = attempt.recognizedAnswer || attempt.answer;
    return preAssessmentResultText("imageAnswer", {
      answer: recognized || attempt.answerImageName,
    });
  }
  const values = Array.isArray(attempt?.answer)
    ? attempt.answer
    : [attempt?.answer];
  return (
    preAssessmentAnswerText(
      values.filter(Boolean).map((value) => optionText(question, value)),
    ) || preAssessmentResultText("answer.unanswered")
  );
}

/**
 *
 * @param question
 * @param attempt
 * @param answerReviewStatus
 */
function displayCorrectAnswer(question, attempt, answerReviewStatus = "ready") {
  const answer = attempt?.correctAnswer ?? question.answer;
  const values = Array.isArray(answer) ? answer : [answer];
  const text = preAssessmentAnswerText(
    values
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map((value) => optionText(question, value)),
  );
  if (text) return text;
  if (answerReviewStatus === "loading")
    return preAssessmentResultText("answerLoading");
  if (answerReviewStatus === "failed")
    return preAssessmentResultText("answerLoadFailed");
  return preAssessmentResultText("answerUnavailable");
}

/**
 *
 * @param root0
 * @param root0.state
 */
function QuestionStateIcon({ state }) {
  if (state === "correct") return <Check size={18} aria-hidden="true" />;
  if (state === "incorrect") return <X size={18} aria-hidden="true" />;
  if (state === "partial") return <span aria-hidden="true">½</span>;
  if (state === "skipped") return <span aria-hidden="true">?</span>;
  return <span aria-hidden="true">—</span>;
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.activeIndex
 * @param root0.onSelect
 * @param root0.compact
 * @param root0.questionIndices
 */
function QuestionNumberGrid({
  questions,
  attempts,
  activeIndex = null,
  onSelect,
  compact = false,
  questionIndices = null,
}) {
  const copy = preAssessmentResultCopy();
  const indices = questionIndices || questions.map((_, index) => index);
  return (
    <div
      className={`pre-question-grid${compact ? " compact" : ""}`}
      aria-label={copy.resultsAria}
    >
      {indices.map((index) => {
        const question = questions[index];
        const state = answerState(attempts[question.id]);
        const meta = preAssessmentAnswerStateMeta(state);
        return (
          <button
            className={`pre-question-number ${state}`}
            type="button"
            key={question.id}
            aria-label={preAssessmentResultText("questionAria", {
              index: index + 1,
              state: meta.label,
            })}
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

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.index
 * @param root0.onBack
 * @param root0.onSelect
 * @param root0.answerReviewStatus
 */
function AnswerDetail({
  questions,
  attempts,
  index,
  onBack,
  onSelect,
  answerReviewStatus,
}) {
  const copy = preAssessmentResultCopy();
  const question = questions[index];
  const attempt = attempts[question.id];
  const state = answerState(attempt);
  const meta = preAssessmentAnswerStateMeta(state);
  const accuracy =
    attempt?.scoreRatio == null
      ? null
      : Math.round(Number(attempt.scoreRatio) * 100);
  const errorReason = aiGeneratedErrorReason(question.type, attempt);
  const improvement = localizedFeedbackItems(
    aiGeneratedImprovements(question.type, attempt),
  );
  const analysis = attempt?.analysis || question.analysis;

  return (
    <section className="pre-answer-detail">
      <button className="pre-answer-detail-back" type="button" onClick={onBack}>
        <ChevronLeft size={17} />
        <span>{copy.backToMastery}</span>
      </button>

      <div className="pre-answer-detail-switcher">
        <div>
          <span>{copy.switchQuestion}</span>
          <strong>
            {preAssessmentResultText("questionPosition", {
              index: index + 1,
              total: questions.length,
            })}
          </strong>
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
            <span>
              {question.type
                ? localizedQuestionType(question.type)
                : copy.practiceQuestion}
            </span>
            <h2>
              {preAssessmentResultText("questionNumber", {
                index: index + 1,
              })}
            </h2>
          </div>
          <strong className="pre-answer-detail-status">
            <QuestionStateIcon state={state} />
            <span>{meta.label}</span>
            {state === "partial" && (
              <small>
                {localizedQuestionResult(
                  accuracy == null ? null : accuracy / 100,
                  "scorePending",
                )}
              </small>
            )}
          </strong>
        </header>

        <QuestionReviewDisplay
          question={question}
          studentAnswer={attempt?.answer}
          studentAnswerText={displayAnswer(question, attempt)}
          correctAnswer={attempt?.correctAnswer ?? question.answer}
          correctAnswerText={displayCorrectAnswer(
            question,
            attempt,
            answerReviewStatus,
          )}
          correctAnswerLabel={copy.referenceAnswer}
          analysis={analysis}
        />

        {errorReason && (
          <div className="pre-answer-detail-feedback error-reason">
            <Sparkles size={18} aria-hidden="true" />
            <div>
              <span>{copy.errorReason}</span>
              <MathContent as="p" renderKey={errorReason}>
                {errorReason}
              </MathContent>
            </div>
          </div>
        )}
        {improvement && (
          <div className="pre-answer-detail-feedback">
            <Sparkles size={18} aria-hidden="true" />
            <div>
              <span>{copy.improvement}</span>
              <MathContent as="p" renderKey={improvement}>
                {improvement}
              </MathContent>
            </div>
          </div>
        )}
      </article>

      <div className="pre-answer-detail-pager">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onSelect(index - 1)}
        >
          <ChevronLeft size={17} />
          <span>{copy.previousQuestion}</span>
        </button>
        <button
          type="button"
          disabled={index === questions.length - 1}
          onClick={() => onSelect(index + 1)}
        >
          <span>{copy.nextQuestion}</span>
          <ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
}

/**
 *
 * @param root0
 * @param root0.knowledgePoints
 * @param root0.mastery
 * @param root0.questions
 * @param root0.attempts
 * @param root0.onSelectQuestion
 */
function MasteryOverview({
  knowledgePoints,
  mastery,
  questions,
  attempts,
  onSelectQuestion,
}) {
  const copy = preAssessmentResultCopy();
  return (
    <section className="pre-mastery-page" aria-label={copy.masteryAria}>
      <div className="pre-mastery-list">
        {knowledgePoints.map((kp) => {
          const item = mastery[kp.id] || { mastery: null, evidenceCount: 0 };
          const covered =
            Number(item.evidenceCount || 0) > 0 && item.mastery != null;
          const meta = preAssessmentDiagnosticStatus(item, covered);
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
                  <span>{copy.knowledgePoint}</span>
                  <h3>{kp.name}</h3>
                  {preAssessmentStopReason(item.diagnosisReason) && (
                    <small className="pre-mastery-stop-reason">
                      {preAssessmentStopReason(item.diagnosisReason)}
                    </small>
                  )}
                </div>
              </header>
              <div className="pre-mastery-metric">
                <div className="pre-mastery-metric-head">
                  <div className="pre-mastery-value">
                    <span>{copy.currentMastery}</span>
                    <strong>
                      {covered ? value : "—"}
                      <small>{covered ? "%" : ""}</small>
                    </strong>
                  </div>
                  {meta.label && (
                    <span className="pre-mastery-status">{meta.label}</span>
                  )}
                </div>
                <div
                  className="pre-mastery-progress"
                  aria-label={
                    covered
                      ? preAssessmentResultText("progressCovered", {
                          name: kp.name,
                          value,
                        })
                      : preAssessmentResultText("progressUncovered", {
                          name: kp.name,
                        })
                  }
                >
                  <span style={{ width: `${value}%` }} />
                </div>
                <div className="pre-mastery-confidence">
                  <span>{copy.confidence}</span>
                  <strong>
                    {confidence == null
                      ? copy.pending
                      : `${Math.round(confidence)}%`}
                  </strong>
                </div>
              </div>
              <div className="pre-mastery-questions">
                <span>{copy.relatedQuestions}</span>
                {relatedQuestionIndices.length > 0 ? (
                  <QuestionNumberGrid
                    questions={questions}
                    attempts={attempts}
                    questionIndices={relatedQuestionIndices}
                    onSelect={onSelectQuestion}
                    compact
                  />
                ) : (
                  <small>{copy.notIncluded}</small>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/**
 *
 * @param root0
 * @param root0.lesson
 * @param root0.knowledgePoints
 * @param root0.mastery
 * @param root0.questions
 * @param root0.attempts
 * @param root0.diagnosticSummary
 * @param root0.nextStepKind
 * @param root0.onContinue
 * @param root0.answerReviewStatus
 */
export default function PreAssessmentResultPage({
  lesson,
  knowledgePoints,
  mastery,
  questions = [],
  attempts = {},
  diagnosticSummary,
  nextStepKind,
  onContinue,
  answerReviewStatus = "ready",
}) {
  const copy = preAssessmentResultCopy();
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  const correctCount = questions.filter(
    (question) => answerState(attempts[question.id]) === "correct",
  ).length;
  const overallCorrectRate = overallAttemptCorrectRate(questions, attempts);
  const focusCount = knowledgePoints.filter((item) => {
    const result = mastery[item.id] || {};
    return result.diagnosisStatus
      ? result.diagnosisStatus !== "provisionally_mastered"
      : !(
          Number(result.evidenceCount || 0) >= 3 &&
          isMasteredValue(result.mastery)
        );
  }).length;
  const confirmedCount = Number(
    diagnosticSummary?.resolvedKnowledgePointCount ?? knowledgePoints.length,
  );
  const hasAdministeredQuestions = questions.length > 0;
  const summary = preAssessmentSummary({
    hasQuestions: hasAdministeredQuestions,
    questionCount: questions.length,
    knowledgeCount: knowledgePoints.length,
    confirmedCount,
    correctCount,
    focusCount,
  });
  const nextStepCopy = preAssessmentNextStep(nextStepKind);

  return (
    <AppShell
      title={lesson.title}
      eyebrow={hasAdministeredQuestions ? copy.resultEyebrow : copy.focusEyebrow}
      compact
    >
      <div className="result-wrap pre-result-wrap">
        <section className="pre-result-summary">
          <div className="pre-result-summary-icon">
            <Check size={28} />
          </div>
          <div className="pre-result-summary-copy">
            <span>
              {hasAdministeredQuestions
                ? copy.diagnosisComplete
                : copy.pathReady}
            </span>
            <h1>{summary.heading}</h1>
            <p>{summary.description}</p>
          </div>
          <div className="pre-result-summary-score">
            <span>{copy.overallScoreRate}</span>
            <strong>
              {overallCorrectRate == null ? "—" : overallCorrectRate}
              <small>{overallCorrectRate == null ? "" : "%"}</small>
            </strong>
            <small className="pre-result-focus-count">
              {preAssessmentResultText("focusCount", { count: focusCount })}
            </small>
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
            <strong>{nextStepCopy.title || copy.readyTitle}</strong>
            <span>{nextStepCopy.description || copy.readyDescription}</span>
          </div>
          <button
            className="primary-button large"
            type="button"
            onClick={onContinue}
          >
            <span>{nextStepCopy.actionLabel || copy.startLearning}</span>
            <ChevronRight size={17} />
          </button>
        </div>
      </footer>
    </AppShell>
  );
}
