/* eslint-disable complexity, sonarjs/cognitive-complexity, sonarjs/no-all-duplicated-branches, unicorn/no-array-callback-reference, unicorn/better-regex, regexp/strict -- 编排层保留既有自适应导航条件，提交与生命周期已收敛到单一路径。 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

import { trans } from "../../utils/i18n";
import {
  createAdaptiveState,
  questionKnowledgePointId,
} from "../lib/adaptiveDifficulty";
import { isQuizSequenceComplete } from "../lib/quizNavigation";
import { useOptionalLearningSession } from "../session/LearningSessionContext";
import { createClientId } from "../shared/infrastructure/clientId";
import { isConnectionAnswerComplete } from "../shared/question-platform/questionEditorAdapter.js";
import { enqueueAnswerSubmission } from "../student/data/classroomSyncRepository";
import { recordLearningEvent } from "../student/data/learningEventRepository";
import { clearScratchPaperSession } from "../student/data/scratchPaperSessionRepository";
import { clearQuizDraft } from "../student/data/studentSessionRepository";
import {
  advancePreAssessment,
  calculatePreAssessmentProgress,
  createPreAssessmentState,
} from "../student/domain/preAssessmentStrategy";
import { requiresQuestionRetry } from "../student/domain/questionFeedback";
import { Clock3 } from "./Icons";
import createQuizProgressAction from "./quiz-page/createQuizProgressAction";
import createQuizSubmit from "./quiz-page/createQuizSubmit";
import {
  EMPTY_MASTERY,
  emptyAnswerForQuestion,
  masteryBaselineSignature,
  structuredAnswerCount,
} from "./quiz-page/model";
import {
  quizKnowledgePointPropType,
  quizQuestionPropType,
} from "./quiz-page/propTypes";
import QuizPageView from "./quiz-page/QuizPageView";
import useQuizActions from "./quiz-page/useQuizActions";
import useQuizLifecycle from "./quiz-page/useQuizLifecycle";

/**
 *
 * @param root0
 * @param root0.mode
 * @param root0.draftId
 * @param root0.lessonTitle
 * @param root0.questions
 * @param root0.knowledgePoints
 * @param root0.startingMastery
 * @param root0.recentAttemptsByKnowledgePoint
 * @param root0.selectionSeed
 * @param root0.studentScope
 * @param root0.masteryQuestions
 * @param root0.priorAttempts
 * @param root0.masteryPrior
 * @param root0.onComplete
 * @param root0.onIntervention
 * @param root0.revalidationKnowledgePointId
 * @param root0.onRevalidationComplete
 * @param root0.onLearnAgain
 * @param root0.onExit
 */
export default function QuizPage({
  mode,
  draftId = mode,
  lessonTitle,
  questions,
  knowledgePoints = [],
  startingMastery = EMPTY_MASTERY,
  recentAttemptsByKnowledgePoint = EMPTY_MASTERY,
  selectionSeed = "",
  studentScope = "",
  masteryQuestions = questions,
  priorAttempts = EMPTY_MASTERY,
  masteryPrior = startingMastery,
  onComplete,
  onIntervention,
  revalidationKnowledgePointId = "",
  onRevalidationComplete,
  onLearnAgain,
  onExit,
}) {
  const learningSessionContext = useOptionalLearningSession();
  const syncSelection = learningSessionContext?.session?.selection || {};
  const syncCredentials = useMemo(
    () => ({
      sessionId: syncSelection.studentSessionId,
      accessToken: syncSelection.classroomAccessToken,
    }),
    [syncSelection.classroomAccessToken, syncSelection.studentSessionId],
  );
  const recordQuizEvent = useCallback(
    (event) => recordLearningEvent(event, syncSelection),
    [syncSelection],
  );
  const initialAdaptive = useMemo(
    () =>
      mode === "pre"
        ? createPreAssessmentState({
            questions,
            knowledgePoints,
            historicalMastery: startingMastery,
          })
        : createAdaptiveState(
            questions,
            mode,
            startingMastery,
            recentAttemptsByKnowledgePoint,
            selectionSeed,
          ),
    [
      questions,
      knowledgePoints,
      mode,
      recentAttemptsByKnowledgePoint,
      selectionSeed,
      startingMastery,
    ],
  );
  const startingMasterySignature = useMemo(
    () => masteryBaselineSignature(startingMastery),
    [startingMastery],
  );
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState(initialAdaptive.order);
  const [targetByKp, setTargetByKp] = useState(initialAdaptive.targetByKp);
  const [answer, setAnswer] = useState("");
  const [fillInputModesByQuestion, setFillInputModesByQuestion] = useState({});
  const [formulaTargeting, setFormulaTargeting] = useState(false);
  const [image, setImage] = useState(null);
  const [attempts, setAttempts] = useState({});
  const [grading, setGrading] = useState(null);
  const [feedbackOutcome, setFeedbackOutcome] = useState(null);
  const [correction, setCorrection] = useState(null);
  const [gradingError, setGradingError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [difficultyChange, setDifficultyChange] = useState(null);
  const [difficultyToast, setDifficultyToast] = useState(null);
  const [completedKpIds, setCompletedKpIds] = useState([]);
  const [adaptiveOutcome, setAdaptiveOutcome] = useState(null);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [pendingIntervention, setPendingIntervention] = useState(null);
  const [masteryFeedback, setMasteryFeedback] = useState([]);
  const [liveMasteryByKp, setLiveMasteryByKp] = useState(startingMastery);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [idleSupportSeconds, setIdleSupportSeconds] = useState(0);
  const [idleSupportQuestionId, setIdleSupportQuestionId] = useState("");
  const [scratchPaperResetKey, setScratchPaperResetKey] = useState(0);
  const presentedQuestions = useRef(new Set());
  const presentedAtByQuestion = useRef({});
  const promptedQuestionIdsRef = useRef(new Set());
  const historyResume = useRef(null);
  const interventionButtonRef = useRef(null);
  const question =
    questions.find((item) => item.id === order[index]) || questions[index];
  const isPost = mode === "post";
  const scratchPaperScope = `${syncSelection.studentSessionId || studentScope || "local"}:${draftId}`;
  const isReview = question?.phase === "review";
  const reviewQuestions = questions.filter((item) => item.phase === "review");
  const reviewOnly =
    questions.length > 0 && reviewQuestions.length === questions.length;
  const hasCompleteIntervention = Boolean(
    pendingIntervention?.knowledgePointId &&
    (pendingIntervention.evidence?.length || 0) >= 3,
  );
  const knowledgePointCount = new Set(
    questions
      .filter((item) => item.phase !== "review")
      .map(questionKnowledgePointId),
  ).size;
  const reviewAnswered = reviewQuestions.filter(
    (item) => attempts[item.id],
  ).length;
  const preRuntime = useMemo(
    () =>
      mode === "pre"
        ? advancePreAssessment({
            questions,
            attempts,
            knowledgePoints,
            historicalMastery: startingMastery,
            currentQuestion: question,
          })
        : null,
    [attempts, knowledgePoints, mode, question, questions, startingMastery],
  );
  const progress = isPost
    ? reviewOnly
      ? Math.min(
          100,
          Math.round(
            (reviewAnswered / Math.max(1, reviewQuestions.length)) * 100,
          ),
        )
      : Math.min(
          100,
          Math.round(
            (completedKpIds.length / Math.max(1, knowledgePointCount)) *
              (reviewQuestions.length > 0 ? 80 : 100) +
              (reviewAnswered / Math.max(1, reviewQuestions.length)) *
                (reviewQuestions.length > 0 ? 20 : 0),
          ),
        )
    : calculatePreAssessmentProgress(preRuntime);
  const knowledgePointName = isReview
    ? trans("adaptiveLearning.quiz.compositePractice", "综合练习")
    : knowledgePoints.find(
        (item) => item.id === questionKnowledgePointId(question),
      )?.name || trans("adaptiveLearning.quiz.currentContent", "当前内容");

  const { idleSupportEligible, resetIdleSupport } = useQuizLifecycle({
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
  });

  const canSubmit =
    question.type === "fill_blank" && Array.isArray(question.answer)
      ? Array.isArray(answer) &&
        answer.length === question.answer.length &&
        answer.every((item) => String(item).trim())
      : question.type === "multiple_choice"
        ? Array.isArray(answer) && answer.length > 0
        : question.type === "ordering"
          ? Array.isArray(answer) &&
            answer.length === (question.options || []).length
          : question.type === "text_marker"
            ? Array.isArray(answer) && answer.length > 0
            : question.type === "classification"
              ? structuredAnswerCount(answer) === (question.items || []).length
              : question.type === "matching"
                ? isConnectionAnswerComplete(answer, question.columns, {
                    oneToOne: true,
                  })
                : question.type === "line_connect"
                  ? isConnectionAnswerComplete(answer, question.columns)
                  : question.type === "word_builder"
                    ? structuredAnswerCount(answer) ===
                      (
                        String(question.template || "").match(
                          /\{{B[1-9]\d*\}}/g,
                        ) || []
                      ).length
                    : question.type === "short_answer"
                      ? Boolean(String(answer).trim() || image)
                      : Boolean(String(answer).trim());

  const {
    buildPreTransition,
    confirmReadingAndCorrect,
    dismissIdleSupport,
    handleAnswerChange,
    handleFillInputModesChange,
    handleImageChange,
    persistDraft,
    resetCurrentFillInputModes,
    reviewKnowledgePoint,
  } = useQuizActions({
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
  });
  const submit = createQuizSubmit({
    answer,
    attempts,
    buildPreTransition,
    canSubmit,
    completedKpIds,
    correction,
    image,
    index,
    isPost,
    isReview,
    knowledgePointName,
    knowledgePoints,
    lessonTitle,
    liveMasteryByKp,
    masteryPrior,
    masteryQuestions,
    mode,
    onRevalidationComplete,
    order,
    persistDraft,
    priorAttempts,
    question,
    questions,
    recordQuizEvent,
    revalidationKnowledgePointId,
    reviewQuestions,
    selectionSeed,
    setAdaptiveOutcome,
    setAssessmentComplete,
    setAttempts,
    setCompletedKpIds,
    setCorrection,
    setDifficultyChange,
    setDifficultyToast,
    setFeedbackOutcome,
    setGrading,
    setGradingError,
    setLiveMasteryByKp,
    setMasteryFeedback,
    setOrder,
    setPendingIntervention,
    setSubmitting,
    setTargetByKp,
    startingMastery,
    submitting,
    syncCredentials,
    targetByKp,
  });

  const skipPreAssessmentQuestion = () => {
    if (isPost || canSubmit || grading || submitting) return;
    const attempt = {
      clientSubmissionId: createClientId(),
      answer: "",
      recognizedAnswer: "",
      answerImageName: "",
      submittedAt: new Date().toISOString(),
      score: 0,
      maxScore: Number(question.maxScore || 1),
      scoreRatio: 0,
      correct: false,
      skipped: true,
      disposition: "SKIPPED_DONT_KNOW",
      answerQuality: "skipped",
      feedback: trans(
        "adaptiveLearning.quiz.skippedFeedback",
        "已标记为“我不会做”，本题按未通过计入课前测验。",
      ),
      strengths: [],
      improvements: [],
      gradedBy: "student_skip",
    };
    const nextAttempts = { ...attempts, [question.id]: attempt };
    enqueueAnswerSubmission({
      question,
      attempt,
      mode,
      credentials: syncCredentials,
    });
    recordQuizEvent({
      type: "answer_submitted",
      mode,
      lessonTitle,
      questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question),
      stem: question.stem,
      answer: "",
      score: 0,
      maxScore: attempt.maxScore,
      scoreRatio: 0,
      correct: false,
      skipped: true,
      disposition: attempt.disposition,
    });
    const transition = buildPreTransition(nextAttempts);
    setAttempts(nextAttempts);
    setOrder(transition.order);
    setCompletedKpIds(transition.completedKnowledgePointIds);
    setGrading(attempt);
    setFeedbackOutcome(null);
    setDifficultyChange(null);
    setDifficultyToast(null);
    setAdaptiveOutcome(transition.outcome);
    setAssessmentComplete(transition.assessmentComplete);
    setPendingIntervention(null);
    setMasteryFeedback([]);
    persistDraft(
      nextAttempts,
      transition.order,
      targetByKp,
      index,
      transition.completedKnowledgePointIds,
      "",
      null,
      {
        assessmentComplete: transition.assessmentComplete,
        adaptiveOutcome: transition.outcome,
      },
    );
  };

  const goNext = (
    nextAttempts = attempts,
    nextOrder = order,
    nextTargets = targetByKp,
  ) => {
    if (hasCompleteIntervention && onIntervention) {
      const nextIndex = index + 1;
      persistDraft(nextAttempts, nextOrder, nextTargets, nextIndex);
      onIntervention(pendingIntervention);
      return;
    }
    const complete = isPost
      ? isQuizSequenceComplete({ assessmentComplete, index, order: nextOrder })
      : isQuizSequenceComplete({ assessmentComplete, index, order: nextOrder });
    if (complete) {
      void clearScratchPaperSession(scratchPaperScope);
      clearQuizDraft(draftId);
      if (isPost) {
        onComplete(nextAttempts);
      } else {
        const summary = advancePreAssessment({
          questions,
          attempts: nextAttempts,
          knowledgePoints,
          historicalMastery: startingMastery,
          currentQuestion: question,
        });
        onComplete(nextAttempts, {
          strategyVersion: summary.strategyVersion,
          assessmentComplete: summary.assessmentComplete,
          completedAt: new Date().toISOString(),
          administeredQuestionIds: nextOrder.filter(
            (questionId) => nextAttempts[questionId],
          ),
          diagnosisByKnowledgePoint: summary.diagnosisByKnowledgePoint,
          resolvedKnowledgePointCount: summary.resolvedKnowledgePointCount,
          totalKnowledgePointCount: summary.totalKnowledgePointCount,
        });
      }
      return;
    }
    const nextIndex = index + 1;
    const nextQuestion =
      questions.find((item) => item.id === nextOrder[nextIndex]) ||
      questions[nextIndex];
    setViewingHistory(false);
    historyResume.current = null;
    setIndex(nextIndex);
    setAnswer(emptyAnswerForQuestion(nextQuestion));
    setImage(null);
    setGrading(null);
    setFeedbackOutcome(null);
    setCorrection(null);
    setDifficultyChange(null);
    setDifficultyToast(null);
    setAdaptiveOutcome(null);
    setPendingIntervention(null);
    setMasteryFeedback([]);
    setGradingError("");
    persistDraft(
      nextAttempts,
      nextOrder,
      nextTargets,
      nextIndex,
      completedKpIds,
      emptyAnswerForQuestion(nextQuestion),
      null,
      {
        assessmentComplete: false,
        pendingIntervention: null,
        adaptiveOutcome: null,
        correction: null,
      },
    );
  };

  const showHistoricalQuestion = (nextIndex) => {
    const nextQuestionId = order[nextIndex];
    const nextQuestion =
      questions.find((item) => item.id === nextQuestionId) ||
      questions[nextIndex];
    const nextAttempt = nextQuestion ? attempts[nextQuestion.id] : null;
    if (!nextQuestion || !nextAttempt) return;
    setIndex(nextIndex);
    setAnswer(nextAttempt.answer ?? "");
    setImage(null);
    setGrading(nextAttempt);
    setFeedbackOutcome(null);
    setCorrection(null);
    setGradingError("");
    setDifficultyChange(null);
    setDifficultyToast(null);
    setAdaptiveOutcome(null);
    setPendingIntervention(null);
    setMasteryFeedback([]);
  };

  const viewPreviousQuestion = () => {
    if (index <= 0) return;
    if (!viewingHistory) {
      historyResume.current = {
        index,
        answer,
        image,
        grading,
        hasCompleteIntervention,
        gradingError,
        difficultyChange,
        adaptiveOutcome,
        assessmentComplete,
        pendingIntervention,
        masteryFeedback,
        correction,
      };
      persistDraft(
        attempts,
        order,
        targetByKp,
        index,
        completedKpIds,
        answer,
        image,
      );
      setViewingHistory(true);
    }
    showHistoricalQuestion(index - 1);
  };

  const moveForwardFromHistory = () => {
    const resume = historyResume.current;
    if (!resume) return;
    if (index + 1 < resume.index) {
      showHistoricalQuestion(index + 1);
      return;
    }
    setIndex(resume.index);
    setAnswer(resume.answer);
    setImage(resume.image);
    setGrading(resume.grading);
    setFeedbackOutcome(null);
    setCorrection(resume.correction || null);
    setGradingError(resume.gradingError);
    setDifficultyChange(resume.difficultyChange);
    setDifficultyToast(null);
    setAdaptiveOutcome(resume.adaptiveOutcome);
    setAssessmentComplete(resume.assessmentComplete);
    setPendingIntervention(resume.pendingIntervention);
    setMasteryFeedback(resume.masteryFeedback || []);
    setViewingHistory(false);
    historyResume.current = null;
  };

  const retryRequired = requiresQuestionRetry(grading);
  const correctionRequired = Boolean(grading?.correctionRequired);
  const sequenceComplete =
    Boolean(grading) &&
    !retryRequired &&
    !correctionRequired &&
    !hasCompleteIntervention &&
    isQuizSequenceComplete({ assessmentComplete, index, order });
  const progressAction = createQuizProgressAction({
    correctionRequired,
    onConfirmCorrection: confirmReadingAndCorrect,
    retryRequired,
    answerQuality: grading?.answerQuality,
    onRetry: () => {
      if (grading?.answerQuality !== "pending_review") {
        setAnswer(emptyAnswerForQuestion(question));
        setImage(null);
        resetCurrentFillInputModes();
      }
      setGrading(null);
    },
    hasCompleteIntervention,
    sequenceComplete,
    adaptiveOutcome,
    onContinue: goNext,
  });
  const formattedElapsed = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const postHeaderActions = isPost ? (
    <div
      className="quiz-header-meta"
      aria-label={trans(
        "adaptiveLearning.quiz.currentAnswerInfo",
        "当前作答信息",
      )}
    >
      <span>
        {trans("adaptiveLearning.quiz.questionNumber", "第 {$index} 题", {
          index: index + 1,
        })}
      </span>
      <span
        className="question-timer"
        title={trans("adaptiveLearning.quiz.answerElapsedTime", "本题作答用时")}
      >
        <Clock3 size={15} /> {formattedElapsed}
      </span>
      <strong>
        {trans("adaptiveLearning.quiz.progress", "进度 {$progress}%", {
          progress,
        })}
      </strong>
    </div>
  ) : undefined;
  const preAssessmentKnowledgePointCount = new Set(
    questions
      .map(
        (item) => item.primaryKnowledgePointId || item.knowledgePointIds?.[0],
      )
      .filter(Boolean),
  ).size;
  const preAssessmentMaximum = Math.min(
    questions.length,
    Math.max(1, preAssessmentKnowledgePointCount) * 3,
  );
  const preAssessmentCompleted = Object.values(attempts).filter(
    (attempt) => attempt?.submittedAt,
  ).length;
  const preHeaderActions = isPost ? undefined : (
    <span className="pre-assessment-header-estimate">
      {trans(
        "adaptiveLearning.quiz.preAssessmentProgress",
        "已完成 {$completed} 题 · 最多 {$maximum} 题",
        {
          completed: preAssessmentCompleted,
          maximum: preAssessmentMaximum,
        },
      )}
    </span>
  );
  const helpContext = isPost
    ? {
        question,
        answer,
        image,
        lessonTitle,
        knowledgePointName,
        presentedAt:
          presentedAtByQuestion.current[question.id] ||
          new Date().toISOString(),
      }
    : undefined;

  return (
    <QuizPageView
      viewModel={{
        adaptiveOutcome,
        answer,
        canSubmit,
        correction,
        correctionRequired,
        difficultyChange,
        difficultyToast,
        dismissIdleSupport,
        feedbackOutcome,
        fillInputModesByQuestion,
        formulaTargeting,
        goNext,
        grading,
        gradingError,
        handleAnswerChange,
        handleFillInputModesChange,
        handleImageChange,
        helpContext,
        historyResume,
        idleSupportEligible,
        idleSupportQuestionId,
        image,
        index,
        interventionButtonRef,
        isPost,
        isReview,
        knowledgePointName,
        lessonTitle,
        masteryFeedback,
        moveForwardFromHistory,
        onExit,
        onLearnAgain,
        postHeaderActions,
        preHeaderActions,
        progress,
        progressAction,
        question,
        resetIdleSupport,
        reviewKnowledgePoint,
        scratchPaperResetKey,
        scratchPaperScope,
        sequenceComplete,
        setFormulaTargeting,
        skipPreAssessmentQuestion,
        submit,
        submitting,
        viewPreviousQuestion,
        viewingHistory,
      }}
    />
  );
}

QuizPage.propTypes = {
  mode: PropTypes.string.isRequired,
  draftId: PropTypes.string,
  lessonTitle: PropTypes.string.isRequired,
  questions: PropTypes.arrayOf(quizQuestionPropType).isRequired,
  knowledgePoints: PropTypes.arrayOf(quizKnowledgePointPropType),
  startingMastery: PropTypes.object,
  recentAttemptsByKnowledgePoint: PropTypes.object,
  selectionSeed: PropTypes.string,
  studentScope: PropTypes.string,
  masteryQuestions: PropTypes.arrayOf(quizQuestionPropType),
  priorAttempts: PropTypes.object,
  masteryPrior: PropTypes.object,
  onComplete: PropTypes.func.isRequired,
  onIntervention: PropTypes.func,
  revalidationKnowledgePointId: PropTypes.string,
  onRevalidationComplete: PropTypes.func,
  onLearnAgain: PropTypes.func,
  onExit: PropTypes.func.isRequired,
};
