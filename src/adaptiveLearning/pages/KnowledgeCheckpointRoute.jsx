import React, { useEffect, useMemo, useState } from "react";

import AppShell from "../components/AppShell";
import DifficultyBadge from "../components/DifficultyBadge";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "../components/Icons";
import MathContent from "../components/MathContent";
import {
  knowledgeCheckpointAnswerText,
  knowledgeCheckpointCopy,
  knowledgeCheckpointEncouragement,
  knowledgeCheckpointMasteryChange,
  knowledgeCheckpointQuestionAria,
  knowledgeCheckpointText,
} from "../components/knowledge-checkpoint/presentation";
import { localizedFeedbackItems } from "../components/question-feedback/questionFeedbackPresentation";
import QuestionReviewDisplay from "../components/QuestionReviewDisplay";
import { calculatePostMastery } from "../lib/mastery";
import { routes } from "../routes/routePaths";
import { Navigate, useNavigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import { isMasteredValue } from "../shared/domain/masteryPolicy.js";
import { questionResultState } from "../shared/domain/questionResult";
import {
  localizedQuestionResult,
  localizedQuestionState,
  localizedQuestionType,
} from "../shared/presentation/questionResultPresentation";
import { recordLearningEvent } from "../student/data/learningEventRepository";
import {
  activeLearningUnit,
  advanceLessonFlow,
  finishTemporaryLearning,
  routeForLearningUnit,
} from "../student/domain/learningPlan";
import {
  attemptScoreRatioOrNull,
  formatMasteryDelta,
  masteryUpdateFromAttempt,
  normalizeMasteryDelta,
} from "../student/domain/masteryFeedback.js";
import {
  aiGeneratedErrorReason,
  aiGeneratedImprovements,
} from "../student/domain/questionFeedback.js";

/**
 *
 * @param context
 * @param knowledgePointId
 */
function practiceQuestions(context, knowledgePointId) {
  const pool =
    context.publishedContent?.knowledgePracticePools?.[knowledgePointId];
  const fallback = (context.postQuestions || []).filter(
    (question) =>
      question.phase !== "review" &&
      question.knowledgePointIds?.includes(knowledgePointId),
  );
  if (!pool?.length) return fallback;
  const seen = new Set();
  return [...pool, ...fallback].filter((question) => {
    if (!question?.id || seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}

/**
 *
 * @param attempt
 */
function questionState(attempt) {
  return questionResultState(attemptScoreRatioOrNull(attempt));
}

/**
 *
 * @param attempt
 * @param knowledgePointId
 */
function masterySnapshotForAttempt(attempt, knowledgePointId) {
  const snapshot = masteryUpdateFromAttempt(attempt, knowledgePointId);
  if (!snapshot.hasAuthoritativeSnapshot) return null;
  return {
    before: snapshot.before,
    after: snapshot.after,
    delta: snapshot.delta,
    confidence: snapshot.confidence,
    correctStreak: snapshot.correctStreak,
  };
}

/**
 *
 * @param question
 * @param attempt
 */
function displayAnswer(question, attempt) {
  if (attempt?.answerImageName)
    return (
      attempt.recognizedAnswer ||
      attempt.answer ||
      knowledgeCheckpointText("answerImage")
    );
  const values = Array.isArray(attempt?.answer)
    ? attempt.answer
    : [attempt?.answer];
  const optionById = Object.fromEntries(
    (question.options || []).map((option) => [
      typeof option === "string" ? option : option.id,
      typeof option === "string" ? option : option.text,
    ]),
  );
  return knowledgeCheckpointAnswerText(
    values
      .filter((value) => value !== "" && value != null)
      .map((value) => optionById[value] || value),
    "answerUnanswered",
  );
}

/**
 *
 * @param question
 */
function displayCorrectAnswer(question) {
  const values = Array.isArray(question.answer)
    ? question.answer
    : [question.answer];
  const optionById = Object.fromEntries(
    (question.options || []).map((option) => [
      typeof option === "string" ? option : option.id,
      typeof option === "string" ? option : option.text,
    ]),
  );
  return knowledgeCheckpointAnswerText(
    values
      .filter((value) => value !== "" && value != null)
      .map((value) => optionById[value] || value),
  );
}

/**
 *
 * @param root0
 * @param root0.items
 * @param root0.selectedIndex
 * @param root0.onSelect
 */
function QuestionIndex({ items, selectedIndex, onSelect }) {
  const copy = knowledgeCheckpointCopy();
  return (
    <div
      className="knowledge-checkpoint-question-index"
      role="list"
      aria-label={copy.questionNavigation}
    >
      {items.map(({ question, attempt, masterySnapshot }, index) => {
        const state = questionState(attempt);
        const ratio = attemptScoreRatioOrNull(attempt);
        const scoreLabel = localizedQuestionResult(ratio, "unanswered");
        const masteryLabel = knowledgeCheckpointMasteryChange(
          masterySnapshot?.delta,
        );
        return (
          <button
            key={question.id}
            type="button"
            role="listitem"
            className={`question-index-button ${state}${selectedIndex === index ? " selected" : ""}`}
            aria-label={knowledgeCheckpointQuestionAria({
              index: index + 1,
              difficulty: question.difficulty,
              state: localizedQuestionState(state, "unanswered"),
              score: scoreLabel,
              mastery: masteryLabel,
            })}
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

/**
 *
 * @param root0
 * @param root0.items
 * @param root0.index
 * @param root0.onBack
 * @param root0.onSelect
 */
function QuestionDetail({ items, index, onBack, onSelect }) {
  const copy = knowledgeCheckpointCopy();
  const item = items[index];
  if (!item) return null;
  const { question, attempt, masterySnapshot } = item;
  const state = questionState(attempt);
  const ratio = attemptScoreRatioOrNull(attempt);
  const errorReason = aiGeneratedErrorReason(question.type, attempt);
  const improvement = localizedFeedbackItems(
    aiGeneratedImprovements(question.type, attempt),
  );
  return (
    <AppShell
      title={copy.summary}
      eyebrow={question.knowledgePointName || copy.questionDetail}
      onBack={onBack}
      compact
    >
      <div className="knowledge-question-detail">
        <header className="knowledge-question-detail-header">
          <div>
            <span>
              {knowledgeCheckpointText("questionPosition", {
                index: index + 1,
                total: items.length,
              })}
            </span>
            <h1>{localizedQuestionType(question.type)}</h1>
          </div>
          <div className="knowledge-question-detail-meta">
            <DifficultyBadge difficulty={question.difficulty} variant="stars" />
            <strong className={state}>
              {localizedQuestionResult(ratio, "unanswered")}
            </strong>
          </div>
        </header>

        <QuestionIndex
          items={items}
          selectedIndex={index}
          onSelect={onSelect}
        />

        <section
          className="knowledge-question-detail-card"
          aria-label={copy.questionDetail}
        >
          <span className="detail-section-label">{copy.questionAndAnswer}</span>
          <QuestionReviewDisplay
            question={question}
            studentAnswer={attempt?.answer}
            studentAnswerText={displayAnswer(question, attempt)}
            correctAnswer={attempt?.correctAnswer ?? question.answer}
            correctAnswerText={displayCorrectAnswer({
              ...question,
              answer: attempt?.correctAnswer ?? question.answer,
            })}
            correctAnswerLabel={copy.correctAnswer}
            analysis={attempt?.analysis}
          />
          {errorReason && (
            <div className="knowledge-question-feedback error-reason">
              <span>{copy.errorReason}</span>
              <MathContent as="p" renderKey={errorReason}>
                {errorReason}
              </MathContent>
            </div>
          )}
          {improvement && (
            <div className="knowledge-question-feedback">
              <span>{copy.improvement}</span>
              <MathContent as="p" renderKey={improvement}>
                {improvement}
              </MathContent>
            </div>
          )}
          {masterySnapshot && (
            <div
              className="knowledge-question-evidence"
              aria-label={copy.questionEvidence}
            >
              <div>
                <span>{copy.masteryChange}</span>
                <strong
                  className={
                    masterySnapshot.delta == null
                      ? ""
                      : masterySnapshot.delta < 0
                        ? "down"
                        : "up"
                  }
                >
                  {formatMasteryDelta(masterySnapshot.delta, "—")}
                </strong>
              </div>
              <div>
                <span>{copy.settledMastery}</span>
                <strong>
                  {masterySnapshot.after == null
                    ? "—"
                    : `${Math.round(masterySnapshot.after)}%`}
                </strong>
              </div>
              <div>
                <span>{copy.confidence}</span>
                <strong>
                  {masterySnapshot.confidence == null
                    ? "—"
                    : `${Math.round(masterySnapshot.confidence)}%`}
                </strong>
              </div>
              <div>
                <span>{copy.correctStreak}</span>
                <strong>
                  {masterySnapshot.correctStreak == null
                    ? "—"
                    : knowledgeCheckpointText("correctStreakValue", {
                        count: masterySnapshot.correctStreak,
                      })}
                </strong>
              </div>
            </div>
          )}
        </section>

        <div className="knowledge-checkpoint-action knowledge-question-detail-action">
          <button
            className="primary-button large"
            type="button"
            onClick={onBack}
          >
            <ChevronLeft size={18} /> {copy.backToSummary}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

/**
 *
 */
export default function KnowledgeCheckpointRoute() {
  const navigate = useNavigate();
  const { session, setSession } = useLearningSession();
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  const flow = session.learningFlow;
  const context = flow?.context || session;
  const unit = activeLearningUnit(flow);
  const selection = context.selection;
  const knowledgePoint = selection?.knowledgePoints?.find(
    (item) => item.id === unit?.knowledgePointId,
  );
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
        const aTime = Date.parse(a.attempt.submittedAt || "");
        const bTime = Date.parse(b.attempt.submittedAt || "");
        if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime)
          return aTime - bTime;
        return a.poolIndex - b.poolIndex;
      })
      .map((item) => {
        const ratio = attemptScoreRatioOrNull(item.attempt);
        currentCorrectStreak =
          ratio != null && ratio >= 0.8
            ? Math.min(3, currentCorrectStreak + 1)
            : 0;
        const snapshot = masterySnapshotForAttempt(
          item.attempt,
          unit?.knowledgePointId,
        );
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
    const earned = attempts.reduce(
      (sum, attempt) => sum + Number(attempt.score || 0),
      0,
    );
    const possible = attempts.reduce(
      (sum, attempt) => sum + Number(attempt.maxScore || 0),
      0,
    );
    const correct = attempts.filter(
      (attempt) => questionState(attempt) === "correct",
    ).length;
    return {
      items,
      answered: attempts.length,
      correct,
      earned: Math.round(earned * 10) / 10,
      possible: Math.round(possible * 10) / 10,
      scoreRatio: possible > 0 ? Math.round((earned / possible) * 100) : null,
      correctRate:
        attempts.length > 0
          ? Math.round((correct / attempts.length) * 100)
          : null,
      reviewCount: items.filter(
        ({ attempt }) => questionState(attempt) !== "correct",
      ).length,
    };
  }, [context, unit?.knowledgePointId]);
  const mastery = useMemo(() => {
    if (!unit?.knowledgePointId || !knowledgePoint) return null;
    const result =
      context.result?.[unit.knowledgePointId] ||
      calculatePostMastery(
        practiceQuestions(context, unit.knowledgePointId),
        context.postAttempts || {},
        [knowledgePoint],
        context.preMastery || {},
      )[unit.knowledgePointId];
    if (!result || result.mastery == null) return null;
    const before = Number.isFinite(Number(result.preMastery))
      ? Number(result.preMastery)
      : null;
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
  const nextFlow = flow?.mode === "direct" ? null : advanceLessonFlow(flow);
  const nextUnit = activeLearningUnit(nextFlow);

  useEffect(() => {
    if (!selection?.section || !unit?.knowledgePointId) return;
    recordLearningEvent({
      type: "knowledge_checkpoint_viewed",
      stage: "knowledge_checkpoint",
      lessonTitle: selection.section.title,
      knowledgePointId: unit.knowledgePointId,
      answeredCount: metrics.answered,
      scoreRatio: metrics.scoreRatio,
    });
  }, [
    metrics.answered,
    metrics.scoreRatio,
    selection?.section,
    unit?.id,
    unit?.knowledgePointId,
  ]);

  if (!selection) return <Navigate to={routes.directory} replace />;
  if (unit?.kind !== "knowledge_checkpoint") {
    return (
      <Navigate to={routeForLearningUnit(unit, routes.complete)} replace />
    );
  }

  const continueLearning = () => {
    if (flow.mode === "direct") {
      const returnTo = flow.returnTo || routes.knowledgeMap;
      setSession((current) => ({
        ...current,
        ...(current.learningFlow.context
          ? {
              selection:
                current.learningFlow.context.selection || current.selection,
              preQuestions:
                current.learningFlow.context.preQuestions ||
                current.preQuestions,
              postQuestions:
                current.learningFlow.context.postQuestions ||
                current.postQuestions,
              preAttempts:
                current.learningFlow.context.preAttempts || current.preAttempts,
              postAttempts:
                current.learningFlow.context.postAttempts ||
                current.postAttempts,
              preMastery:
                current.learningFlow.context.preMastery || current.preMastery,
              preAssessment:
                current.learningFlow.context.preAssessment ||
                current.preAssessment,
              result: current.learningFlow.context.result || current.result,
              resultSource:
                current.learningFlow.context.resultSource || "preview",
              publishedContent:
                current.learningFlow.context.publishedContent ||
                current.publishedContent,
            }
          : {}),
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

  const finalCorrectStreak =
    metrics.items.at(-1)?.masterySnapshot?.correctStreak || 0;
  const reachedTarget = isMasteredValue(mastery?.after);
  const encouragement = knowledgeCheckpointEncouragement({
    ...metrics,
    masteryAfter: mastery?.after,
    correctStreak: finalCorrectStreak,
  });
  const copy = knowledgeCheckpointCopy();
  const actionLabel =
    flow.mode === "direct"
      ? copy.returnToLearningList
      : copy.continueLearning;
  const before = mastery?.before ?? 0;
  const after = mastery?.after ?? 0;

  return (
    <AppShell
      title={selection.section.title}
      eyebrow={copy.summary}
      progress={null}
      compact
    >
      <div className="knowledge-checkpoint-wrap">
        <section className="knowledge-checkpoint-hero">
          <Sparkles
            className="knowledge-checkpoint-sparkle sparkle-one"
            size={20}
          />
          <Sparkles
            className="knowledge-checkpoint-sparkle sparkle-two"
            size={15}
          />
          <div className="knowledge-checkpoint-mark">
            <Check size={26} />
          </div>
          <div className="knowledge-checkpoint-hero-copy">
            <span>
              {reachedTarget
                ? copy.sectionTargetReached
                : copy.sectionComplete}
            </span>
            <h1>{knowledgePoint?.name || copy.currentKnowledgePoint}</h1>
            <p>{encouragement}</p>
          </div>
          <div className="knowledge-checkpoint-hero-count">
            <strong>{metrics.answered}</strong>
            <span>{copy.completedLabel}</span>
          </div>
        </section>

        <section
          className="knowledge-checkpoint-metrics"
          aria-label={copy.roundPerformance}
        >
          <div>
            <span>{copy.roundAnswers}</span>
            <strong>
              {metrics.answered}
              {" "}
              <small>{copy.questionUnit}</small>
            </strong>
          </div>
          <div>
            <span>{copy.scoreRate}</span>
            <strong>
              {metrics.correctRate == null ? "—" : `${metrics.correctRate}%`}
            </strong>
          </div>
          <div>
            <span>{copy.masteryRate}</span>
            <strong>{mastery ? `${Math.round(after)}%` : "—"}</strong>
          </div>
          <div>
            <span>{copy.confidence}</span>
            <strong>
              {mastery?.confidence == null
                ? "—"
                : `${Math.round(mastery.confidence)}%`}
            </strong>
          </div>
        </section>

        <section
          className="knowledge-checkpoint-mastery"
          aria-label={copy.masteryChange}
        >
          <header>
            <div>
              <span>{copy.knowledgeMastery}</span>
              <h2>{Math.round(after)}%</h2>
            </div>
            {mastery?.delta != null && (
              <strong className={mastery.delta < 0 ? "down" : "up"}>
                {formatMasteryDelta(mastery.delta)}
              </strong>
            )}
          </header>
          <div
            className="knowledge-checkpoint-progress"
            role="img"
            aria-label={knowledgeCheckpointText("masteryProgress", {
              before: Math.round(before),
              after: Math.round(after),
            })}
          >
            <span style={{ width: `${Math.max(0, Math.min(100, after))}%` }} />
            {mastery?.before != null && (
              <i style={{ left: `${Math.max(0, Math.min(100, before))}%` }} />
            )}
          </div>
          <div className="knowledge-checkpoint-progress-labels">
            <span>
              {knowledgeCheckpointText("beforeLearning", {
                value: Math.round(before),
              })}
            </span>
            <span>
              {knowledgeCheckpointText("afterLearning", {
                value: Math.round(after),
                confidence:
                  mastery?.confidence == null
                    ? copy.pending
                    : `${Math.round(mastery.confidence)}%`,
              })}
            </span>
          </div>
        </section>

        <section
          className="knowledge-checkpoint-questions"
          aria-label={knowledgeCheckpointText("questionsAria")}
        >
          <header>
            <div>
              <h2>{copy.roundQuestions}</h2>
            </div>
            <strong>
              {metrics.reviewCount
                ? knowledgeCheckpointText("reviewCount", {
                    count: metrics.reviewCount,
                  })
                : copy.noIncorrectQuestions}
            </strong>
          </header>
          <QuestionIndex
            items={metrics.items}
            selectedIndex={null}
            onSelect={setSelectedQuestionIndex}
          />
          <div className="knowledge-checkpoint-question-legend">
            <span>
              <i className="correct" />
              {localizedQuestionState("correct")}
            </span>
            <span>
              <i className="partial" />
              {localizedQuestionState("partial")}
            </span>
            <span>
              <i className="incorrect" />
              {localizedQuestionState("incorrect")}
            </span>
            <span>
              <i className="pending" />
              {localizedQuestionState("pending", "unanswered")}
            </span>
          </div>
        </section>

        <div className="knowledge-checkpoint-action">
          <button
            className="primary-button large"
            type="button"
            onClick={continueLearning}
          >
            {actionLabel} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
