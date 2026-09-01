/* eslint-disable complexity, sonarjs/cognitive-complexity -- 生命周期集中恢复草稿、计时和空闲提示。 */

import { useCallback, useEffect } from "react";

import { questionKnowledgePointId } from "../../lib/adaptiveDifficulty";
import {
  clampQuizIndex,
  restoreCurrentQuestionInput,
} from "../../lib/quizNavigation";
import { assessmentPurposeForQuestion } from "../../shared/domain/questionPurpose.js";
import { clearScratchPaperSession } from "../../student/data/scratchPaperSessionRepository";
import { markQuestionSeen } from "../../student/data/seenQuestionRepository";
import {
  clearQuizDraft,
  readQuizDraft,
} from "../../student/data/studentSessionRepository";
import { PRE_ASSESSMENT_STRATEGY_VERSION } from "../../student/domain/preAssessmentStrategy";
import { hasConfirmedCorrectionReading } from "../../student/domain/realtimeCorrection.js";
import {
  compositeReviewOutcome,
  QUESTION_IDLE_SUPPORT_SECONDS,
  QUIZ_DRAFT_CONTRACT_VERSION,
} from "./model";

/**
 *
 * @param context
 */
export default function useQuizLifecycle(context) {
  const {
    correction,
    difficultyToast,
    draftId,
    formulaTargeting,
    grading,
    hasCompleteIntervention,
    idleSupportSeconds,
    initialAdaptive,
    interventionButtonRef,
    isPost,
    isReview,
    lessonTitle,
    mode,
    onLearnAgain,
    presentedAtByQuestion,
    presentedQuestions,
    promptedQuestionIdsRef,
    question,
    questions,
    recordQuizEvent,
    reviewOnly,
    reviewQuestions,
    scratchPaperScope,
    setAdaptiveOutcome,
    setAnswer,
    setAssessmentComplete,
    setAttempts,
    setCompletedKpIds,
    setCorrection,
    setDifficultyToast,
    setElapsedSeconds,
    setFillInputModesByQuestion,
    setFormulaTargeting,
    setGrading,
    setIdleSupportQuestionId,
    setIdleSupportSeconds,
    setImage,
    setIndex,
    setLiveMasteryByKp,
    setMasteryFeedback,
    setOrder,
    setPendingIntervention,
    setScratchPaperResetKey,
    setTargetByKp,
    startingMastery,
    startingMasterySignature,
    studentScope,
    submitting,
    targetByKp,
    viewingHistory,
  } = context;
  useEffect(() => {
    if (!question?.id || presentedQuestions.current.has(question.id)) return;
    presentedQuestions.current.add(question.id);
    presentedAtByQuestion.current[question.id] = new Date().toISOString();
    if (studentScope) markQuestionSeen(studentScope, question);
    const initialDecision =
      initialAdaptive.targetDecisions?.[questionKnowledgePointId(question)];
    recordQuizEvent({
      type: "question_presented",
      mode,
      lessonTitle,
      questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question),
      stem: question.stem,
      knowledgePointIds: question.knowledgePointIds || [],
      knowledgePointWeights: question.knowledgePointWeights || {},
      difficulty: question.difficulty,
      questionType: question.type,
      purpose: assessmentPurposeForQuestion(question, mode),
      blueprintSlotId:
        question.blueprintSlotId || question.preAssessmentSlotId || "",
      targetDifficulty:
        initialDecision?.targetDifficulty ||
        targetByKp[questionKnowledgePointId(question)] ||
        "",
      targetDifficultyReason: initialDecision?.reason || "",
      recentAttemptCount: initialDecision?.recentAttemptCount ?? null,
      recentCorrectRate: initialDecision?.recentCorrectRate ?? null,
    });
  }, [
    initialAdaptive,
    mode,
    lessonTitle,
    question,
    recordQuizEvent,
    studentScope,
    targetByKp,
  ]);

  useEffect(() => {
    setElapsedSeconds(0);
    setFormulaTargeting(false);
  }, [question?.id]);

  useEffect(() => {
    if (!formulaTargeting) return;
    const cancelFormulaTargeting = (event) => {
      if (event.key === "Escape") setFormulaTargeting(false);
    };
    window.addEventListener("keydown", cancelFormulaTargeting);
    return () => window.removeEventListener("keydown", cancelFormulaTargeting);
  }, [formulaTargeting]);

  useEffect(() => {
    if (grading || submitting || viewingHistory) setFormulaTargeting(false);
  }, [grading, submitting, viewingHistory]);

  const resetIdleSupport = useCallback(() => {
    setIdleSupportSeconds(0);
    setIdleSupportQuestionId("");
  }, []);

  useEffect(() => {
    resetIdleSupport();
  }, [question?.id, resetIdleSupport]);

  const idleSupportEligible = Boolean(
    isPost &&
    onLearnAgain &&
    question?.id &&
    !isReview &&
    !grading &&
    !viewingHistory &&
    !submitting &&
    correction?.questionId !== question.id,
  );

  useEffect(() => {
    if (!idleSupportEligible) {
      setIdleSupportSeconds(0);
      setIdleSupportQuestionId("");
      return;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setIdleSupportSeconds((currentSeconds) => {
        if (promptedQuestionIdsRef.current.has(question.id))
          return currentSeconds;
        return currentSeconds + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [idleSupportEligible, question]);

  useEffect(() => {
    if (
      !idleSupportEligible ||
      idleSupportSeconds < QUESTION_IDLE_SUPPORT_SECONDS ||
      promptedQuestionIdsRef.current.has(question.id)
    )
      return;
    promptedQuestionIdsRef.current.add(question.id);
    setIdleSupportQuestionId(question.id);
    recordQuizEvent({
      type: "learning_support_prompt_shown",
      questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question),
      idleSeconds: QUESTION_IDLE_SUPPORT_SECONDS,
      trigger: "effective_inactivity",
    });
  }, [idleSupportEligible, idleSupportSeconds, question, recordQuizEvent]);

  useEffect(() => {
    if (!difficultyToast) return;
    const timeout = window.setTimeout(() => setDifficultyToast(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [difficultyToast]);

  useEffect(() => {
    if (!question?.id || grading || viewingHistory) return;
    const tick = () => {
      const presentedAt = presentedAtByQuestion.current[question.id];
      if (!presentedAt) return;
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - new Date(presentedAt).getTime()) / 1000),
        ),
      );
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [question?.id, grading, viewingHistory]);

  useEffect(() => {
    if (grading && hasCompleteIntervention && !viewingHistory) {
      interventionButtonRef.current?.focus();
    }
  }, [grading, hasCompleteIntervention, viewingHistory]);

  useEffect(() => {
    const parsed = readQuizDraft(draftId);
    if (Object.keys(parsed).length === 0) return;
    try {
      const strategyMatches =
        mode !== "pre" ||
        parsed.strategyVersion === PRE_ASSESSMENT_STRATEGY_VERSION;
      const baselineMatches =
        parsed.startingMasterySignature === startingMasterySignature;
      const contractMatches =
        parsed.contractVersion === QUIZ_DRAFT_CONTRACT_VERSION;
      if (
        strategyMatches &&
        baselineMatches &&
        contractMatches &&
        parsed.questionIds?.join(",") ===
          questions.map((item) => item.id).join(",")
      ) {
        const restoredAttempts = parsed.attempts || {};
        const restoredOrder = parsed.order?.length
          ? parsed.order
          : initialAdaptive.order;
        const restoredIndex = clampQuizIndex(
          parsed.index,
          restoredOrder.length,
          questions.length,
        );
        const restoredQuestionId = restoredOrder[restoredIndex];
        const restoredAttempt = restoredAttempts[restoredQuestionId];
        const restoredInput = restoreCurrentQuestionInput(
          parsed,
          restoredQuestionId,
          restoredAttempt,
        );
        const restoredCorrection =
          parsed.correction?.questionId === restoredQuestionId
            ? parsed.correction
            : null;
        setAttempts(restoredAttempts);
        setOrder(restoredOrder);
        setTargetByKp(parsed.targetByKp || initialAdaptive.targetByKp);
        setCompletedKpIds(parsed.completedKpIds || []);
        setIndex(restoredIndex);
        setAnswer(restoredInput.answer);
        setFillInputModesByQuestion(parsed.fillInputModesByQuestion || {});
        setImage(restoredInput.image);
        setGrading(
          restoredAttempt ||
            (restoredCorrection &&
            !hasConfirmedCorrectionReading(restoredCorrection)
              ? {
                  correct: false,
                  answerQuality: "valid",
                  correctionRequired: true,
                }
              : null),
        );
        setCorrection(restoredCorrection);
        const restoredAssessmentComplete = Boolean(parsed.assessmentComplete);
        setAssessmentComplete(restoredAssessmentComplete);
        setPendingIntervention(parsed.pendingIntervention || null);
        setAdaptiveOutcome(
          reviewOnly && restoredAssessmentComplete
            ? compositeReviewOutcome(reviewQuestions.length)
            : parsed.adaptiveOutcome || null,
        );
        setMasteryFeedback(parsed.masteryFeedback || []);
        setLiveMasteryByKp(parsed.liveMasteryByKp || startingMastery);
      } else {
        void clearScratchPaperSession(scratchPaperScope);
        clearQuizDraft(draftId);
        setScratchPaperResetKey((current) => current + 1);
      }
    } catch {
      void clearScratchPaperSession(scratchPaperScope);
      clearQuizDraft(draftId);
      setScratchPaperResetKey((current) => current + 1);
    }
  }, [
    draftId,
    questions,
    initialAdaptive,
    mode,
    reviewOnly,
    reviewQuestions.length,
    scratchPaperScope,
    startingMastery,
    startingMasterySignature,
  ]);
  return { idleSupportEligible, resetIdleSupport };
}
