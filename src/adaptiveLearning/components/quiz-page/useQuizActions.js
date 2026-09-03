/* eslint-disable complexity, unicorn/consistent-function-scoping -- 动作闭包共享当前测验状态快照。 */

import { useEffect } from "react";

import { questionKnowledgePointId } from "../../lib/adaptiveDifficulty";
import { writeQuizDraft } from "../../student/data/studentSessionRepository";
import {
  advancePreAssessment,
  isTerminalPreDiagnosis,
  PRE_ASSESSMENT_STRATEGY_VERSION,
  PRE_DIAGNOSIS_STATUS,
} from "../../student/domain/preAssessmentStrategy";
import { confirmCorrectionReading } from "../../student/domain/realtimeCorrection.js";
import { emptyAnswerForQuestion, QUIZ_DRAFT_CONTRACT_VERSION } from "./model";

/**
 *
 * @param context
 */
export default function useQuizActions(context) {
  const {
    adaptiveOutcome,
    answer,
    assessmentComplete,
    attempts,
    completedKpIds,
    correction,
    draftId,
    fillInputModesByQuestion,
    grading,
    image,
    index,
    knowledgePoints,
    liveMasteryByKp,
    masteryFeedback,
    mode,
    onLearnAgain,
    order,
    pendingIntervention,
    promptedQuestionIdsRef,
    question,
    questions,
    recordQuizEvent,
    resetIdleSupport,
    setAnswer,
    setAttempts,
    setCorrection,
    setFillInputModesByQuestion,
    setGrading,
    setGradingError,
    setIdleSupportQuestionId,
    setImage,
    startingMastery,
    startingMasterySignature,
    targetByKp,
  } = context;
  const persistDraft = (
    nextAttempts,
    nextOrder,
    nextTargets,
    nextIndex,
    nextCompleted = completedKpIds,
    currentAnswer = answer,
    currentImage = image,
    runtimeState = {},
  ) => {
    writeQuizDraft(draftId, {
      contractVersion: QUIZ_DRAFT_CONTRACT_VERSION,
      questionIds: questions.map((item) => item.id),
      startingMasterySignature,
      strategyVersion:
        mode === "pre" ? PRE_ASSESSMENT_STRATEGY_VERSION : undefined,
      attempts: nextAttempts,
      order: nextOrder,
      targetByKp: nextTargets,
      completedKpIds: nextCompleted,
      index: nextIndex,
      currentQuestionId: nextOrder[nextIndex] || "",
      currentAnswer,
      currentImage,
      fillInputModesByQuestion: Object.hasOwn(
        runtimeState,
        "fillInputModesByQuestion",
      )
        ? runtimeState.fillInputModesByQuestion
        : fillInputModesByQuestion,
      assessmentComplete: runtimeState.assessmentComplete ?? assessmentComplete,
      pendingIntervention: Object.hasOwn(runtimeState, "pendingIntervention")
        ? runtimeState.pendingIntervention
        : pendingIntervention,
      adaptiveOutcome: Object.hasOwn(runtimeState, "adaptiveOutcome")
        ? runtimeState.adaptiveOutcome
        : adaptiveOutcome,
      masteryFeedback: Object.hasOwn(runtimeState, "masteryFeedback")
        ? runtimeState.masteryFeedback
        : masteryFeedback,
      liveMasteryByKp: Object.hasOwn(runtimeState, "liveMasteryByKp")
        ? runtimeState.liveMasteryByKp
        : liveMasteryByKp,
      correction: Object.hasOwn(runtimeState, "correction")
        ? runtimeState.correction
        : correction,
    });
  };

  const handleImageChange = (nextImage) => {
    resetIdleSupport();
    setImage(nextImage);
    persistDraft(
      attempts,
      order,
      targetByKp,
      index,
      completedKpIds,
      answer,
      nextImage,
    );
  };

  const handleAnswerChange = (nextAnswer) => {
    resetIdleSupport();
    setAnswer(nextAnswer);
    persistDraft(
      attempts,
      order,
      targetByKp,
      index,
      completedKpIds,
      nextAnswer,
      image,
    );
  };

  const handleFillInputModesChange = (nextModes) => {
    const nextModesByQuestion = {
      ...fillInputModesByQuestion,
      [question.id]: nextModes,
    };
    setFillInputModesByQuestion(nextModesByQuestion);
    persistDraft(
      attempts,
      order,
      targetByKp,
      index,
      completedKpIds,
      answer,
      image,
      { fillInputModesByQuestion: nextModesByQuestion },
    );
  };

  const resetCurrentFillInputModes = (
    nextAnswer = emptyAnswerForQuestion(question),
    nextImage = null,
  ) => {
    const nextModesByQuestion = { ...fillInputModesByQuestion };
    delete nextModesByQuestion[question.id];
    setFillInputModesByQuestion(nextModesByQuestion);
    persistDraft(
      attempts,
      order,
      targetByKp,
      index,
      completedKpIds,
      nextAnswer,
      nextImage,
      { fillInputModesByQuestion: nextModesByQuestion },
    );
  };

  const reviewKnowledgePoint = (source) => {
    if (!question?.id || !onLearnAgain) return;
    promptedQuestionIdsRef.current.add(question.id);
    setIdleSupportQuestionId("");
    persistDraft(
      attempts,
      order,
      targetByKp,
      index,
      completedKpIds,
      answer,
      image,
    );
    recordQuizEvent({
      type:
        source === "idle_prompt"
          ? "learning_support_prompt_accepted"
          : "learning_support_review_opened",
      questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question),
      source,
    });
    onLearnAgain();
  };

  const dismissIdleSupport = () => {
    setIdleSupportQuestionId("");
    recordQuizEvent({
      type: "learning_support_prompt_dismissed",
      questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question),
      source: "idle_prompt",
    });
  };

  const confirmReadingAndCorrect = () => {
    const confirmedCorrection = confirmCorrectionReading(correction);
    setCorrection(confirmedCorrection);
    persistDraft(
      attempts,
      order,
      targetByKp,
      index,
      completedKpIds,
      answer,
      image,
      {
        correction: confirmedCorrection,
      },
    );
    recordQuizEvent({
      type: "answer_correction_reading_confirmed",
      questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question),
      confirmedAt:
        confirmedCorrection?.readingConfirmedAt || new Date().toISOString(),
    });
    setGrading(null);
    setGradingError("");
  };

  useEffect(() => {
    const markCurrentAnswerSynced = (event) => {
      const clientSubmissionId = event.detail?.clientSubmissionId;
      if (
        !clientSubmissionId ||
        grading?.clientSubmissionId !== clientSubmissionId
      )
        return;
      const authoritative = event.detail?.answer || {};
      const syncedGrading = {
        ...grading,
        ...authoritative,
        syncStatus: "persisted",
      };
      const syncedAttempts = {
        ...attempts,
        [question.id]: {
          ...(attempts[question.id] || grading),
          ...authoritative,
          syncStatus: "persisted",
        },
      };
      setGrading(syncedGrading);
      setAttempts(syncedAttempts);
      persistDraft(
        syncedAttempts,
        order,
        targetByKp,
        index,
        completedKpIds,
        answer,
        image,
      );
    };
    window.addEventListener(
      "adaptive-classroom-answer-synced",
      markCurrentAnswerSynced,
    );
    return () =>
      window.removeEventListener(
        "adaptive-classroom-answer-synced",
        markCurrentAnswerSynced,
      );
  }, [
    answer,
    attempts,
    completedKpIds,
    grading,
    image,
    index,
    order,
    question.id,
    targetByKp,
  ]);

  const preOutcomeForDecision = (decision) => {
    if (!decision || !isTerminalPreDiagnosis(decision.status)) return null;
    if (decision.status === PRE_DIAGNOSIS_STATUS.PROVISIONALLY_MASTERED) {
      return {
        status: "mastered",
        title: "这个知识点已确认",
        message: "当前证据已经足够，接下来继续确认其他学习重点。",
      };
    }
    if (decision.status === PRE_DIAGNOSIS_STATUS.NEEDS_LEARNING) {
      return {
        status: "needs_support",
        title: "已加入本课学习重点",
        message: "这一部分不再继续追加题目，稍后会安排针对性学习。",
      };
    }
    return {
      status: "needs_support",
      title: "当前证据还不稳定",
      message: "这一部分会安排轻量学习，暂不继续追加题目。",
    };
  };

  const buildPreTransition = (nextAttempts, activeQuestion = question) => {
    const transition = advancePreAssessment({
      questions,
      attempts: nextAttempts,
      knowledgePoints,
      historicalMastery: startingMastery,
      currentQuestion: activeQuestion,
    });
    const nextOrder =
      transition.nextQuestion && !order.includes(transition.nextQuestion.id)
        ? [...order, transition.nextQuestion.id]
        : order;
    const completed = Object.values(transition.diagnosisByKnowledgePoint)
      .filter((item) => isTerminalPreDiagnosis(item.status))
      .map((item) => item.knowledgePointId);
    const currentDecision = transition.currentDecision;

    if (currentDecision && isTerminalPreDiagnosis(currentDecision.status)) {
      recordQuizEvent({
        type: "pre_assessment_kp_decided",
        stage: "pre_assessment",
        strategyVersion: transition.strategyVersion,
        knowledgePointId: currentDecision.knowledgePointId,
        diagnosisStatus: currentDecision.status,
        stopReason: currentDecision.reason,
        confidence: currentDecision.confidence,
        evidenceCount: currentDecision.evidenceCount,
        historicalEvidenceUsed: currentDecision.historicalEvidenceUsed,
      });
    }
    if (transition.nextQuestion) {
      recordQuizEvent({
        type: "pre_assessment_question_selected",
        stage: "pre_assessment",
        strategyVersion: transition.strategyVersion,
        questionId: transition.nextQuestion.id,
        knowledgePointId: questionKnowledgePointId(transition.nextQuestion),
        targetDifficulty: transition.nextQuestion.difficulty,
        selectionReason:
          currentDecision?.status === PRE_DIAGNOSIS_STATUS.ASSESSING
            ? currentDecision.reason
            : "NEXT_UNRESOLVED_KNOWLEDGE_POINT",
      });
    }
    if (transition.assessmentComplete) {
      recordQuizEvent({
        type: "pre_assessment_completed",
        stage: "pre_assessment",
        strategyVersion: transition.strategyVersion,
        answeredQuestionCount: Object.keys(nextAttempts).length,
        resolvedKnowledgePointCount: transition.resolvedKnowledgePointCount,
      });
    }
    return {
      ...transition,
      order: nextOrder,
      completedKnowledgePointIds: completed,
      outcome: preOutcomeForDecision(currentDecision),
    };
  };
  return {
    buildPreTransition,
    confirmReadingAndCorrect,
    dismissIdleSupport,
    handleAnswerChange,
    handleFillInputModesChange,
    handleImageChange,
    persistDraft,
    resetCurrentFillInputModes,
    reviewKnowledgePoint,
  };
}
