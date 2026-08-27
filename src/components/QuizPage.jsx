import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenCheck, Lightbulb, Sigma, X } from 'lucide-react';
import AppShell from './AppShell';
import StudentHelpRequest from './StudentHelpRequest';
import DifficultyBadge from './DifficultyBadge';
import QuestionAnswer, { questionTypeLabels } from './QuestionAnswer';
import {
  ChevronLeft, ChevronRight, Clock3, MessageCircle,
} from './Icons';
import QuestionFeedbackCard from './QuestionFeedbackCard';
import QuestionReferenceAnswer from './QuestionReferenceAnswer';
import {
  adjustDifficulty, buildInterventionEvidence, createAdaptiveState, difficultyRank, normalizeDifficulty,
  evaluateKnowledgePoint, questionKnowledgePointId, selectNextAdaptiveQuestion,
} from '../lib/adaptiveDifficulty';
import { gradeAnswerWithFallback } from '../lib/gradingApi';
import { recordLearningEvent } from '../student/data/learningEventRepository';
import { clearQuizDraft, readQuizDraft, writeQuizDraft } from '../student/data/studentSessionRepository';
import { enqueueAnswerSubmission } from '../student/data/classroomSyncRepository';
import { createClientId } from '../shared/infrastructure/clientId';
import { markQuestionSeen } from '../student/data/seenQuestionRepository';
import { clearScratchPaperSession } from '../student/data/scratchPaperSessionRepository';
import { useOptionalLearningSession } from '../session/LearningSessionContext';
import { revalidationDecisionForScore } from '../shared/domain/tutoringStateMachine';
import { MASTERY_THRESHOLD } from '../shared/domain/masteryPolicy.js';
import { assessmentPurposeForQuestion } from '../shared/domain/questionPurpose.js';
import { clampQuizIndex, isQuizSequenceComplete, restoreCurrentQuestionInput } from '../lib/quizNavigation';
import { requiresQuestionRetry } from '../student/domain/questionFeedback';
import { playAnswerFeedbackAudio, prepareAnswerFeedbackAudio } from '../lib/answerFeedbackAudio';
import MathContent from './MathContent';
import ScratchPaper from './ScratchPaper';
import {
  advancePreAssessment,
  calculatePreAssessmentProgress,
  createPreAssessmentState,
  isTerminalPreDiagnosis,
  PRE_ASSESSMENT_STRATEGY_VERSION,
  PRE_DIAGNOSIS_STATUS,
} from '../student/domain/preAssessmentStrategy';
import { masteryFeedbackForQuestion, questionKnowledgePointIds } from '../student/domain/masteryFeedback.js';
import { calculatePostMastery, previewU1Update } from '../lib/mastery.js';
import {
  confirmCorrectionReading,
  correctionReadingGuide,
  correctionAttemptMetadata,
  encouragementForCorrection,
  hasConfirmedCorrectionReading,
  shouldRequestCorrection,
} from '../student/domain/realtimeCorrection.js';
import { isConnectionAnswerComplete } from '../shared/question-platform/questionEditorAdapter.js';
import { canUseQuestionPlatformPlayer } from '../shared/question-platform/legacyQuestionAdapter.js';

const EMPTY_MASTERY = {};
const QUIZ_DRAFT_CONTRACT_VERSION = 10;
const QUESTION_IDLE_SUPPORT_SECONDS = 120;

function emptyAnswerForQuestion(question) {
  if (['multiple_choice', 'ordering', 'text_marker'].includes(question?.type)) return [];
  if (['classification', 'matching', 'line_connect', 'word_builder'].includes(question?.type)) return {};
  return '';
}

function structuredAnswerCount(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  return Object.values(value).reduce((count, item) => (
    count + (Array.isArray(item) ? item.length : String(item || '').trim() ? 1 : 0)
  ), 0);
}

function masteryBaselineSignature(mastery = {}) {
  return JSON.stringify(Object.entries(mastery).sort(([left], [right]) => left.localeCompare(right)).map(([id, item]) => ([
    id,
    Number.isFinite(Number(item?.mastery)) ? Number(item.mastery) : null,
    Number.isFinite(Number(item?.confidence)) ? Number(item.confidence) : null,
    Number.isFinite(Number(item?.correctStreak)) ? Number(item.correctStreak) : null,
    Number.isFinite(Number(item?.evidenceCount)) ? Number(item.evidenceCount) : null,
  ])));
}

function compositeReviewOutcome(questionCount) {
  return {
    status: 'completed',
    title: '综合复习已完成',
    message: `已完成本轮 ${questionCount} 道综合题，接下来查看各知识点的最终掌握度与置信度。`,
  };
}

function displayCorrectAnswer(question, grading) {
  const answer = grading?.correctAnswer;
  const contentById = Object.fromEntries([
    ...(question.categories || []),
    ...(question.items || []),
    ...(question.columns || []).flatMap((column) => column.items || []),
    ...(question.segments || []).filter((segment) => segment.markerId),
  ].map((item) => [String(item.id || item.markerId), String(item.text || '')]));
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    return Object.entries(answer).map(([from, to]) => {
      const targets = Array.isArray(to) ? to : [to];
      return `${contentById[from] || from} → ${targets.map((id) => contentById[id] || id).join('、')}`;
    }).join('；') || '暂无参考答案';
  }
  if (Array.isArray(answer) && answer.some((item) => item && typeof item === 'object')) {
    return answer.map((edge) => {
      const from = edge.leftItemId || edge.fromItemId || '';
      const to = edge.rightItemId || edge.toItemId || '';
      return `${contentById[from] || from} → ${contentById[to] || to}`;
    }).filter((item) => item !== ' → ').join('；') || '暂无参考答案';
  }
  const values = Array.isArray(answer) ? answer : [answer];
  const optionById = Object.fromEntries((question.options || []).map((option) => [
    typeof option === 'string' ? option : option.id,
    typeof option === 'string' ? option : option.text,
  ]));
  return values.filter((value) => value !== undefined && value !== null && value !== '')
    .map((value) => optionById[value] || contentById[value] || value).join('、') || '暂无参考答案';
}

function practiceGateOutcome(decision) {
  const answered = Number(decision?.answered || 0);
  const minimum = 3;
  const target = Number(decision?.targetMastery || MASTERY_THRESHOLD);
  const streak = Number(decision?.correctStreak || 0);
  if (!decision || decision.status === 'continue') {
    if (!decision?.minimumQuestionsMet) {
      return {
        ...decision,
        status: 'continue',
        title: '继续练习',
        message: `本轮已完成 ${answered}/${minimum} 题，至少完成 ${minimum} 题后才会检查退出条件。`,
      };
    }
    if (!decision.targetMasteryReached) {
      return {
        ...decision,
        status: 'continue',
        title: '继续练习',
        message: `当前掌握度还未达到 ${target}%，先继续积累有效证据。最近连续达标 ${streak}/2 题。`,
      };
    }
    return {
      ...decision,
      status: 'continue',
      title: '掌握度已达到，继续确认稳定性',
      message: `当前掌握度已达到 ${target}%，还需要连续达标 ${Math.max(0, 2 - streak)} 题。`,
    };
  }
  if (decision.status === 'mastered'
    && decision.completionReason === 'QUESTION_LIMIT_REACHED_AT_TARGET_UNSTABLE') {
    return {
      ...decision,
      title: '达到掌握线，但证据还不稳定',
      message: `本轮已完成 ${answered} 题，掌握度达到 ${target}%，但连续达标不足2题；已到达本轮上限，建议后续继续巩固。`,
    };
  }
  if (decision.status === 'mastered') {
    return {
      ...decision,
      title: '学得不错，可以继续',
      message: `已完成至少 ${minimum} 题，掌握度达到 ${target}%，并连续达标 ${Math.max(2, streak)} 题。`,
    };
  }
  if (decision.status === 'needs_support'
    && decision.completionReason === 'QUESTION_LIMIT_REACHED') {
    return {
      ...decision,
      title: '本轮先练到这里',
      message: `本轮已完成 ${answered} 题，但掌握度仍未达到 ${target}%；建议二次学习后用新题继续验证。`,
    };
  }
  return decision;
}

export default function QuizPage({
  mode,
  draftId = mode,
  lessonTitle,
  questions,
  knowledgePoints = [],
  startingMastery = EMPTY_MASTERY,
  recentAttemptsByKnowledgePoint = EMPTY_MASTERY,
  selectionSeed = '',
  studentScope = '',
  masteryQuestions = questions,
  priorAttempts = EMPTY_MASTERY,
  masteryPrior = startingMastery,
  onComplete,
  onIntervention,
  revalidationKnowledgePointId = '',
  onRevalidationComplete,
  onLearnAgain,
  onExit,
}) {
  const learningSessionContext = useOptionalLearningSession();
  const syncSelection = learningSessionContext?.session?.selection || {};
  const syncCredentials = useMemo(() => ({
    sessionId: syncSelection.studentSessionId,
    accessToken: syncSelection.classroomAccessToken,
  }), [syncSelection.classroomAccessToken, syncSelection.studentSessionId]);
  const recordQuizEvent = useCallback(
    (event) => recordLearningEvent(event, syncSelection),
    [syncSelection],
  );
  const initialAdaptive = useMemo(
    () => mode === 'pre'
      ? createPreAssessmentState({ questions, knowledgePoints, historicalMastery: startingMastery })
      : createAdaptiveState(questions, mode, startingMastery, recentAttemptsByKnowledgePoint, selectionSeed),
    [questions, knowledgePoints, mode, recentAttemptsByKnowledgePoint, selectionSeed, startingMastery],
  );
  const startingMasterySignature = useMemo(
    () => masteryBaselineSignature(startingMastery),
    [startingMastery],
  );
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState(initialAdaptive.order);
  const [targetByKp, setTargetByKp] = useState(initialAdaptive.targetByKp);
  const [answer, setAnswer] = useState('');
  const [fillInputModesByQuestion, setFillInputModesByQuestion] = useState({});
  const [formulaTargeting, setFormulaTargeting] = useState(false);
  const [image, setImage] = useState(null);
  const [attempts, setAttempts] = useState({});
  const [grading, setGrading] = useState(null);
  const [feedbackOutcome, setFeedbackOutcome] = useState(null);
  const [correction, setCorrection] = useState(null);
  const [gradingError, setGradingError] = useState('');
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
  const [idleSupportQuestionId, setIdleSupportQuestionId] = useState('');
  const [scratchPaperResetKey, setScratchPaperResetKey] = useState(0);
  const presentedQuestions = useRef(new Set());
  const presentedAtByQuestion = useRef({});
  const promptedQuestionIdsRef = useRef(new Set());
  const historyResume = useRef(null);
  const interventionButtonRef = useRef(null);
  const question = questions.find((item) => item.id === order[index]) || questions[index];
  const isPost = mode === 'post';
  const scratchPaperScope = `${syncSelection.studentSessionId || studentScope || 'local'}:${draftId}`;
  const isReview = question?.phase === 'review';
  const reviewQuestions = questions.filter((item) => item.phase === 'review');
  const reviewOnly = questions.length > 0 && reviewQuestions.length === questions.length;
  const hasCompleteIntervention = Boolean(
    pendingIntervention?.knowledgePointId && (pendingIntervention.evidence?.length || 0) >= 3,
  );
  const knowledgePointCount = new Set(
    questions.filter((item) => item.phase !== 'review').map(questionKnowledgePointId),
  ).size;
  const reviewAnswered = reviewQuestions.filter((item) => attempts[item.id]).length;
  const preRuntime = useMemo(() => mode === 'pre' ? advancePreAssessment({
    questions,
    attempts,
    knowledgePoints,
    historicalMastery: startingMastery,
    currentQuestion: question,
  }) : null, [attempts, knowledgePoints, mode, question, questions, startingMastery]);
  const progress = isPost
    ? reviewOnly
      ? Math.min(100, Math.round((reviewAnswered / Math.max(1, reviewQuestions.length)) * 100))
      : Math.min(100, Math.round(
        (completedKpIds.length / Math.max(1, knowledgePointCount)) * (reviewQuestions.length ? 80 : 100)
        + (reviewAnswered / Math.max(1, reviewQuestions.length)) * (reviewQuestions.length ? 20 : 0),
      ))
    : calculatePreAssessmentProgress(preRuntime);
  const knowledgePointName = isReview
    ? '综合练习'
    : knowledgePoints.find((item) => item.id === questionKnowledgePointId(question))?.name || '当前内容';

  useEffect(() => {
    if (!question?.id || presentedQuestions.current.has(question.id)) return;
    presentedQuestions.current.add(question.id);
    presentedAtByQuestion.current[question.id] = new Date().toISOString();
    if (studentScope) markQuestionSeen(studentScope, question);
    const initialDecision = initialAdaptive.targetDecisions?.[questionKnowledgePointId(question)];
      recordQuizEvent({
        type: 'question_presented', mode, lessonTitle, questionId: question.id,
        knowledgePointId: questionKnowledgePointId(question), stem: question.stem,
        knowledgePointIds: question.knowledgePointIds || [],
        knowledgePointWeights: question.knowledgePointWeights || {},
        difficulty: question.difficulty, questionType: question.type,
        purpose: assessmentPurposeForQuestion(question, mode),
        blueprintSlotId: question.blueprintSlotId || question.preAssessmentSlotId || '',
        targetDifficulty: initialDecision?.targetDifficulty || targetByKp[questionKnowledgePointId(question)] || '',
        targetDifficultyReason: initialDecision?.reason || '',
        recentAttemptCount: initialDecision?.recentAttemptCount ?? null,
        recentCorrectRate: initialDecision?.recentCorrectRate ?? null,
      });
  }, [initialAdaptive, mode, lessonTitle, question, recordQuizEvent, studentScope, targetByKp]);

  useEffect(() => {
    setElapsedSeconds(0);
    setFormulaTargeting(false);
  }, [question?.id]);

  useEffect(() => {
    if (!formulaTargeting) return undefined;
    const cancelFormulaTargeting = (event) => {
      if (event.key === 'Escape') setFormulaTargeting(false);
    };
    window.addEventListener('keydown', cancelFormulaTargeting);
    return () => window.removeEventListener('keydown', cancelFormulaTargeting);
  }, [formulaTargeting]);

  useEffect(() => {
    if (grading || submitting || viewingHistory) setFormulaTargeting(false);
  }, [grading, submitting, viewingHistory]);

  const resetIdleSupport = useCallback(() => {
    setIdleSupportSeconds(0);
    setIdleSupportQuestionId('');
  }, []);

  useEffect(() => {
    resetIdleSupport();
  }, [question?.id, resetIdleSupport]);

  const idleSupportEligible = Boolean(
    isPost
    && onLearnAgain
    && question?.id
    && !isReview
    && !grading
    && !viewingHistory
    && !submitting
    && correction?.questionId !== question.id,
  );

  useEffect(() => {
    if (!idleSupportEligible) {
      setIdleSupportSeconds(0);
      setIdleSupportQuestionId('');
      return undefined;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setIdleSupportSeconds((currentSeconds) => {
        if (promptedQuestionIdsRef.current.has(question.id)) return currentSeconds;
        return currentSeconds + 1;
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [idleSupportEligible, question]);

  useEffect(() => {
    if (
      !idleSupportEligible
      || idleSupportSeconds < QUESTION_IDLE_SUPPORT_SECONDS
      || promptedQuestionIdsRef.current.has(question.id)
    ) return;
    promptedQuestionIdsRef.current.add(question.id);
    setIdleSupportQuestionId(question.id);
    recordQuizEvent({
      type: 'learning_support_prompt_shown',
      questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question),
      idleSeconds: QUESTION_IDLE_SUPPORT_SECONDS,
      trigger: 'effective_inactivity',
    });
  }, [idleSupportEligible, idleSupportSeconds, question, recordQuizEvent]);

  useEffect(() => {
    if (!difficultyToast) return undefined;
    const timeout = window.setTimeout(() => setDifficultyToast(null), 2_000);
    return () => window.clearTimeout(timeout);
  }, [difficultyToast]);

  useEffect(() => {
    if (!question?.id || grading || viewingHistory) return undefined;
    const tick = () => {
      const presentedAt = presentedAtByQuestion.current[question.id];
      if (!presentedAt) return;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(presentedAt).getTime()) / 1000)));
    };
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [question?.id, grading, viewingHistory]);

  useEffect(() => {
    if (grading && hasCompleteIntervention && !viewingHistory) {
      interventionButtonRef.current?.focus();
    }
  }, [grading, hasCompleteIntervention, viewingHistory]);

  useEffect(() => {
    const parsed = readQuizDraft(draftId);
    if (!Object.keys(parsed).length) return;
    try {
      const strategyMatches = mode !== 'pre'
        || parsed.strategyVersion === PRE_ASSESSMENT_STRATEGY_VERSION;
      const baselineMatches = parsed.startingMasterySignature === startingMasterySignature;
      const contractMatches = parsed.contractVersion === QUIZ_DRAFT_CONTRACT_VERSION;
      if (strategyMatches && baselineMatches && contractMatches && parsed.questionIds?.join(',') === questions.map((item) => item.id).join(',')) {
        const restoredAttempts = parsed.attempts || {};
        const restoredOrder = parsed.order?.length ? parsed.order : initialAdaptive.order;
        const restoredIndex = clampQuizIndex(parsed.index, restoredOrder.length, questions.length);
        const restoredQuestionId = restoredOrder[restoredIndex];
        const restoredAttempt = restoredAttempts[restoredQuestionId];
        const restoredInput = restoreCurrentQuestionInput(parsed, restoredQuestionId, restoredAttempt);
        const restoredCorrection = parsed.correction?.questionId === restoredQuestionId
          ? parsed.correction : null;
        setAttempts(restoredAttempts);
        setOrder(restoredOrder);
        setTargetByKp(parsed.targetByKp || initialAdaptive.targetByKp);
        setCompletedKpIds(parsed.completedKpIds || []);
        setIndex(restoredIndex);
        setAnswer(restoredInput.answer);
        setFillInputModesByQuestion(parsed.fillInputModesByQuestion || {});
        setImage(restoredInput.image);
        setGrading(restoredAttempt || (restoredCorrection && !hasConfirmedCorrectionReading(restoredCorrection) ? {
          correct: false,
          answerQuality: 'valid',
          correctionRequired: true,
          encouragement: restoredCorrection.encouragement,
        } : null));
        setCorrection(restoredCorrection);
        const restoredAssessmentComplete = Boolean(parsed.assessmentComplete);
        setAssessmentComplete(restoredAssessmentComplete);
        setPendingIntervention(parsed.pendingIntervention || null);
        setAdaptiveOutcome(reviewOnly && restoredAssessmentComplete
          ? compositeReviewOutcome(reviewQuestions.length)
          : parsed.adaptiveOutcome || null);
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
  }, [draftId, questions, initialAdaptive, mode, reviewOnly, reviewQuestions.length, scratchPaperScope, startingMastery, startingMasterySignature]);

  const canSubmit = question.type === 'fill_blank' && Array.isArray(question.answer)
    ? Array.isArray(answer) && answer.length === question.answer.length && answer.every((item) => String(item).trim())
    : question.type === 'multiple_choice'
    ? Array.isArray(answer) && answer.length > 0
    : question.type === 'ordering'
      ? Array.isArray(answer) && answer.length === (question.options || []).length
    : question.type === 'text_marker'
      ? Array.isArray(answer) && answer.length > 0
    : question.type === 'classification'
      ? structuredAnswerCount(answer) === (question.items || []).length
    : question.type === 'matching'
      ? isConnectionAnswerComplete(answer, question.columns, { oneToOne: true })
    : question.type === 'line_connect'
      ? isConnectionAnswerComplete(answer, question.columns)
    : question.type === 'word_builder'
      ? structuredAnswerCount(answer) === (String(question.template || '').match(/\{\{B[1-9][0-9]*\}\}/g) || []).length
    : question.type === 'short_answer'
      ? Boolean(String(answer).trim() || image)
      : Boolean(String(answer).trim());

  const persistDraft = (
    nextAttempts, nextOrder, nextTargets, nextIndex, nextCompleted = completedKpIds,
    currentAnswer = answer, currentImage = image, runtimeState = {},
  ) => {
    writeQuizDraft(draftId, {
      contractVersion: QUIZ_DRAFT_CONTRACT_VERSION,
      questionIds: questions.map((item) => item.id),
      startingMasterySignature,
      strategyVersion: mode === 'pre' ? PRE_ASSESSMENT_STRATEGY_VERSION : undefined,
      attempts: nextAttempts,
      order: nextOrder,
      targetByKp: nextTargets,
      completedKpIds: nextCompleted,
      index: nextIndex,
      currentQuestionId: nextOrder[nextIndex] || '',
      currentAnswer,
      currentImage,
      fillInputModesByQuestion: Object.hasOwn(runtimeState, 'fillInputModesByQuestion')
        ? runtimeState.fillInputModesByQuestion : fillInputModesByQuestion,
      assessmentComplete: runtimeState.assessmentComplete ?? assessmentComplete,
      pendingIntervention: Object.hasOwn(runtimeState, 'pendingIntervention')
        ? runtimeState.pendingIntervention : pendingIntervention,
      adaptiveOutcome: Object.hasOwn(runtimeState, 'adaptiveOutcome')
        ? runtimeState.adaptiveOutcome : adaptiveOutcome,
      masteryFeedback: Object.hasOwn(runtimeState, 'masteryFeedback')
        ? runtimeState.masteryFeedback : masteryFeedback,
      liveMasteryByKp: Object.hasOwn(runtimeState, 'liveMasteryByKp')
        ? runtimeState.liveMasteryByKp : liveMasteryByKp,
      correction: Object.hasOwn(runtimeState, 'correction')
        ? runtimeState.correction : correction,
    });
  };

  const handleImageChange = (nextImage) => {
    resetIdleSupport();
    setImage(nextImage);
    persistDraft(
      attempts, order, targetByKp, index, completedKpIds,
      answer, nextImage,
    );
  };

  const handleAnswerChange = (nextAnswer) => {
    resetIdleSupport();
    setAnswer(nextAnswer);
    persistDraft(
      attempts, order, targetByKp, index, completedKpIds,
      nextAnswer, image,
    );
  };

  const handleFillInputModesChange = (nextModes) => {
    const nextModesByQuestion = { ...fillInputModesByQuestion, [question.id]: nextModes };
    setFillInputModesByQuestion(nextModesByQuestion);
    persistDraft(
      attempts, order, targetByKp, index, completedKpIds, answer, image,
      { fillInputModesByQuestion: nextModesByQuestion },
    );
  };

  const resetCurrentFillInputModes = (nextAnswer = emptyAnswerForQuestion(question), nextImage = null) => {
    const nextModesByQuestion = { ...fillInputModesByQuestion };
    delete nextModesByQuestion[question.id];
    setFillInputModesByQuestion(nextModesByQuestion);
    persistDraft(
      attempts, order, targetByKp, index, completedKpIds, nextAnswer, nextImage,
      { fillInputModesByQuestion: nextModesByQuestion },
    );
  };

  const reviewKnowledgePoint = (source) => {
    if (!question?.id || !onLearnAgain) return;
    promptedQuestionIdsRef.current.add(question.id);
    setIdleSupportQuestionId('');
    persistDraft(attempts, order, targetByKp, index, completedKpIds, answer, image);
    recordQuizEvent({
      type: source === 'idle_prompt'
        ? 'learning_support_prompt_accepted'
        : 'learning_support_review_opened',
      questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question),
      source,
    });
    onLearnAgain();
  };

  const dismissIdleSupport = () => {
    setIdleSupportQuestionId('');
    recordQuizEvent({
      type: 'learning_support_prompt_dismissed',
      questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question),
      source: 'idle_prompt',
    });
  };

  const confirmReadingAndCorrect = () => {
    const confirmedCorrection = confirmCorrectionReading(correction);
    setCorrection(confirmedCorrection);
    persistDraft(attempts, order, targetByKp, index, completedKpIds, answer, image, {
      correction: confirmedCorrection,
    });
    recordQuizEvent({
      type: 'answer_correction_reading_confirmed',
      questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question),
      confirmedAt: confirmedCorrection?.readingConfirmedAt || new Date().toISOString(),
    });
    setGrading(null);
    setGradingError('');
  };

  useEffect(() => {
    const markCurrentAnswerSynced = (event) => {
      const clientSubmissionId = event.detail?.clientSubmissionId;
      if (!clientSubmissionId || grading?.clientSubmissionId !== clientSubmissionId) return;
      const authoritative = event.detail?.answer || {};
      const syncedGrading = { ...grading, ...authoritative, syncStatus: 'persisted' };
      const syncedAttempts = {
        ...attempts,
        [question.id]: { ...(attempts[question.id] || grading), ...authoritative, syncStatus: 'persisted' },
      };
      setGrading(syncedGrading);
      setAttempts(syncedAttempts);
      persistDraft(syncedAttempts, order, targetByKp, index, completedKpIds, answer, image);
    };
    window.addEventListener('adaptive-classroom-answer-synced', markCurrentAnswerSynced);
    return () => window.removeEventListener('adaptive-classroom-answer-synced', markCurrentAnswerSynced);
  }, [answer, attempts, completedKpIds, grading, image, index, order, question.id, targetByKp]);

  const preOutcomeForDecision = (decision) => {
    if (!decision || !isTerminalPreDiagnosis(decision.status)) return null;
    if (decision.status === PRE_DIAGNOSIS_STATUS.PROVISIONALLY_MASTERED) {
      return {
        status: 'mastered',
        title: '这个知识点已确认',
        message: '当前证据已经足够，接下来继续确认其他学习重点。',
      };
    }
    if (decision.status === PRE_DIAGNOSIS_STATUS.NEEDS_LEARNING) {
      return {
        status: 'needs_support',
        title: '已加入本课学习重点',
        message: '这一部分不再继续追加题目，稍后会安排针对性学习。',
      };
    }
    return {
      status: 'needs_support',
      title: '当前证据还不稳定',
      message: '这一部分会安排轻量学习，暂不继续追加题目。',
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
    const nextOrder = transition.nextQuestion && !order.includes(transition.nextQuestion.id)
      ? [...order, transition.nextQuestion.id]
      : order;
    const completed = Object.values(transition.diagnosisByKnowledgePoint)
      .filter((item) => isTerminalPreDiagnosis(item.status))
      .map((item) => item.knowledgePointId);
    const currentDecision = transition.currentDecision;

    if (currentDecision && isTerminalPreDiagnosis(currentDecision.status)) {
      recordQuizEvent({
        type: 'pre_assessment_kp_decided',
        stage: 'pre_assessment',
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
        type: 'pre_assessment_question_selected',
        stage: 'pre_assessment',
        strategyVersion: transition.strategyVersion,
        questionId: transition.nextQuestion.id,
        knowledgePointId: questionKnowledgePointId(transition.nextQuestion),
        targetDifficulty: transition.nextQuestion.difficulty,
        selectionReason: currentDecision?.status === PRE_DIAGNOSIS_STATUS.ASSESSING
          ? currentDecision.reason : 'NEXT_UNRESOLVED_KNOWLEDGE_POINT',
      });
    }
    if (transition.assessmentComplete) {
      recordQuizEvent({
        type: 'pre_assessment_completed',
        stage: 'pre_assessment',
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

  const submit = async () => {
    if (!canSubmit || submitting) return;
    prepareAnswerFeedbackAudio();
    setFeedbackOutcome(null);
    setSubmitting(true);
    setGradingError('');
    try {
      const correctingCurrentQuestion = correction?.questionId === question.id;
      const rawGrade = await gradeAnswerWithFallback({
        question,
        contentVersionId: question.contentVersionId,
        answerText: answer,
        imageDataUrl: image?.dataUrl || '',
        attemptStage: correctingCurrentQuestion ? 'correction' : 'initial',
        priorFormalGradeReceipt: correctingCurrentQuestion
          ? correction.initialFormalGradeReceipt || '' : '',
      });
      const grade = {
        ...rawGrade,
        showAnswer: Boolean(correctingCurrentQuestion && !rawGrade.correct && rawGrade.correctAnswer !== undefined),
      };
      const revalidatingCurrentQuestion = Boolean(revalidationKnowledgePointId
        && revalidationKnowledgePointId === questionKnowledgePointId(question));
      if (grade.gradingStatus === 'unresolved' || grade.evidenceEligible === false) {
        setGrading(grade);
        setDifficultyChange(null);
        setDifficultyToast(null);
        setAdaptiveOutcome(null);
        setPendingIntervention(null);
        return;
      }
      if (requiresQuestionRetry(grade)) {
        if (grade.answerQuality === 'off_task') {
          recordQuizEvent({
            type: 'off_task_answer', mode, lessonTitle, questionId: question.id,
            knowledgePointId: questionKnowledgePointId(question), stem: question.stem,
            answer: image ? '[图片作答]' : answer, score: grade.score, maxScore: grade.maxScore,
            feedback: grade.feedback,
            offTaskConfidence: Number(grade.confidence ?? grade.itemConfidence ?? 0.9),
            reasonCode: grade.reasonCode || 'ANSWER_NOT_RELEVANT',
            questionSnapshot: {
              id: question.id, stem: question.stem, type: question.type, difficulty: question.difficulty,
            },
            answerSnapshot: {
              text: image ? grade.recognizedAnswer || '[图片作答]' : Array.isArray(answer) ? answer.join('、') : String(answer || ''),
              imageName: image?.name || '',
            },
          });
        }
        setGrading(grade);
        setDifficultyChange(null);
        setDifficultyToast(null);
        setAdaptiveOutcome(null);
        setPendingIntervention(null);
        return;
      }
      if (shouldRequestCorrection({ mode, grading: grade, correction, revalidation: revalidatingCurrentQuestion })) {
        setFeedbackOutcome('incorrect');
        void playAnswerFeedbackAudio(false);
        const nextCorrection = {
          questionId: question.id,
          requestedAt: new Date().toISOString(),
          initialAnswer: answer,
          initialRecognizedAnswer: grade.recognizedAnswer || '',
          initialScore: grade.score,
          initialMaxScore: grade.maxScore,
          initialScoreRatio: grade.scoreRatio,
          initialFormalGradeReceipt: grade.formalGradeReceipt || '',
          encouragement: encouragementForCorrection(question.id),
        };
        setCorrection(nextCorrection);
        setGrading({
          ...grade,
          correctAnswer: undefined,
          analysis: undefined,
          showAnswer: false,
          correctionRequired: true,
          encouragement: nextCorrection.encouragement,
        });
        setDifficultyChange(null);
        setDifficultyToast(null);
        setAdaptiveOutcome(null);
        setPendingIntervention(null);
        setMasteryFeedback([]);
        persistDraft(attempts, order, targetByKp, index, completedKpIds, answer, image, {
          correction: nextCorrection,
        });
        recordQuizEvent({
          type: 'answer_correction_requested', mode, lessonTitle, questionId: question.id,
          knowledgePointId: questionKnowledgePointId(question),
          score: grade.score, maxScore: grade.maxScore, scoreRatio: grade.scoreRatio,
          answerQuality: grade.answerQuality,
        });
        return;
      }
      let attempt = {
        clientSubmissionId: createClientId(),
        answer,
        answerImageName: image?.name || '',
        submittedAt: new Date().toISOString(),
        ...grade,
        ...correctionAttemptMetadata(
          correctingCurrentQuestion ? correction : null,
          answer,
          grade,
        ),
      };
      setFeedbackOutcome(grade.correct === true ? 'correct' : 'incorrect');
      void playAnswerFeedbackAudio(grade.correct === true);
      if (isPost) {
        const candidateAttempts = { ...attempts, [question.id]: attempt };
        const replayQuestions = [...masteryQuestions, ...questions].filter((item, itemIndex, list) => (
          item?.id && list.findIndex((candidate) => candidate.id === item.id) === itemIndex
        ));
        const recalculatedMastery = calculatePostMastery(
          replayQuestions,
          { ...priorAttempts, ...candidateAttempts },
          knowledgePoints,
          masteryPrior,
        );
        const previewByKnowledgePoint = Object.fromEntries(
          questionKnowledgePointIds(question).map((knowledgePointId) => {
            const result = recalculatedMastery[knowledgePointId];
            const trace = [...(result?.trace || [])].reverse()
              .find((item) => item.questionId === question.id);
            const preview = trace ? {
              ...trace,
              masteryAfter: result.mastery,
              confidenceAfter: result.confidence,
              lowerBound: result.lowerBound,
              upperBound: result.upperBound,
              correctStreak: result.correctStreak,
              algorithmVersion: result.algorithmVersion,
              isPreview: true,
            } : previewU1Update({
              question,
              attempt,
              previous: liveMasteryByKp[knowledgePointId] || {},
              knowledgePointId,
            });
            return [knowledgePointId, preview];
          }),
        );
        attempt = { ...attempt, u1Preview: previewByKnowledgePoint };
      }
      const nextAttempts = { ...attempts, [question.id]: attempt };
      let nextMasteryFeedback = isPost ? masteryFeedbackForQuestion({
        question,
        attempt,
        knowledgePoints,
        previousMastery: liveMasteryByKp,
        initialMastery: startingMastery,
      }) : [];
      let nextLiveMasteryByKp = liveMasteryByKp;
      enqueueAnswerSubmission({ question, attempt, mode, image, credentials: syncCredentials });
      recordQuizEvent({
        type: 'answer_submitted', mode, lessonTitle, questionId: question.id,
        knowledgePointId: questionKnowledgePointId(question), stem: question.stem,
        answer: image ? `[图片] ${answer || ''}`.trim() : answer,
        score: grade.score, maxScore: grade.maxScore, scoreRatio: grade.scoreRatio,
        correct: grade.correct, feedback: grade.feedback,
        correctionAttempted: Boolean(attempt.correctionAttempted),
        correctionSucceeded: attempt.correctionSucceeded,
        initialScoreRatio: attempt.initialScoreRatio,
        difficulty: question.difficulty,
        knowledgePointIds: question.knowledgePointIds || [],
        knowledgePointWeights: question.knowledgePointWeights || {},
        sourceType: assessmentPurposeForQuestion(question, mode),
        hintUsed: Boolean(attempt.hintUsed || question.hintUsed),
        novelty: attempt.novelty || question.novelty || 'NEW',
        itemQuality: attempt.itemQuality ?? question.itemQuality ?? 1,
        gradingConfidence: attempt.gradingConfidence ?? attempt.confidence ?? 0.9,
        blueprintSlotId: question.blueprintSlotId || question.preAssessmentSlotId || '',
        questionSnapshot: {
          id: question.id, stem: question.stem, type: question.type,
          difficulty: question.difficulty, phase: question.phase,
        },
        revalidation: Boolean(revalidationKnowledgePointId
          && revalidationKnowledgePointId === questionKnowledgePointId(question)),
      });
      let nextOrder = order;
      let nextTargets = targetByKp;
      let nextCompleted = completedKpIds;
      let change = null;
      let outcome = null;
      let intervention = null;
      let completeAfterCurrent = false;

      if (isPost) {
        const kpId = questionKnowledgePointId(question);
        const currentTarget = targetByKp[kpId] || question.difficulty || 'D3';
        const isRevalidation = revalidationKnowledgePointId === kpId;
        const nextTarget = isReview ? currentTarget : adjustDifficulty(currentTarget, grade.scoreRatio);
        let decision = null;
        nextTargets = isReview ? targetByKp : { ...targetByKp, [kpId]: nextTarget };
        if (!isReview) {
          const latestMastery = nextMasteryFeedback
            .find((item) => item.knowledgePointId === kpId)?.after;
          decision = isRevalidation
            ? revalidationDecisionForScore(grade.scoreRatio, latestMastery)
            : evaluateKnowledgePoint({
              questions,
              attempts: nextAttempts,
              knowledgePointId: kpId,
              mastery: latestMastery,
            });
          // The U1 preview can carry a historical streak from the starting
          // mastery snapshot. Practice stability is a current-round gate, so
          // show the streak from this round's ordered attempts instead.
          nextMasteryFeedback = nextMasteryFeedback.map((item) => (
            item.knowledgePointId === kpId
              ? { ...item, correctStreak: decision.correctStreak }
              : item
          ));
          outcome = practiceGateOutcome(decision);
          if (decision.status !== 'continue') {
            if (decision.status !== 'needs_intervention') {
              nextCompleted = [...new Set([...completedKpIds, kpId])];
            }
            if (decision.status === 'needs_intervention') {
              outcome = {
                ...decision,
                title: '先停一下，回顾思路',
                message: '连续几题还没有达到要求，先和老师一起看看问题出在哪里。',
              };
            }
            if (decision.status === 'needs_intervention') {
              const evidence = buildInterventionEvidence({
                questions, attempts: nextAttempts, knowledgePointId: kpId,
              });
              intervention = {
                trigger: 'three_consecutive_not_passed',
                triggeredAt: new Date().toISOString(),
                knowledgePointId: kpId,
                knowledgePointName,
                evidence,
              };
            }
          }
        }
        const nextQuestion = selectNextAdaptiveQuestion({
          questions,
          attempts: nextAttempts,
          currentQuestion: question,
          targetByKp: nextTargets,
          completedKnowledgePointIds: nextCompleted,
          selectionSeed,
        });
        if (nextQuestion && !nextOrder.includes(nextQuestion.id)) {
          nextOrder = [...nextOrder, nextQuestion.id];
          if (intervention && questionKnowledgePointId(nextQuestion) === kpId) {
            intervention = { ...intervention, revalidationQuestionId: nextQuestion.id };
          }
          const actualFrom = normalizeDifficulty(question.difficulty || currentTarget);
          const actualTo = normalizeDifficulty(nextQuestion.difficulty || nextTarget);
          const actualFromRank = difficultyRank(actualFrom);
          const actualToRank = difficultyRank(actualTo);
          const sameKnowledgePoint = questionKnowledgePointId(nextQuestion) === kpId;
          const expectedDirection = grade.scoreRatio >= 0.8 ? 'up' : grade.scoreRatio < 0.5 ? 'down' : 'same';
          const actualDirection = actualToRank > actualFromRank ? 'up' : actualToRank < actualFromRank ? 'down' : 'same';
          if (
            !isReview
            && nextQuestion.phase !== 'review'
            && sameKnowledgePoint
            && actualToRank !== actualFromRank
            && actualDirection === expectedDirection
          ) {
            change = {
              from: actualFrom,
              to: actualTo,
              direction: actualToRank > actualFromRank ? 'up' : 'down',
              reason: actualToRank > actualFromRank
                ? '下一题增加一点挑战'
                : '下一题先回到基础',
            };
          }
        } else if (!nextQuestion) {
          // A depleted/legacy pool must not be reported as mastered merely
          // because there is no next item.  The U1 target is the only stop
          // condition; if the pool runs out first, surface support instead.
          completeAfterCurrent = true;
          if (isReview) {
            outcome = compositeReviewOutcome(reviewQuestions.length);
          } else if (!decision || decision.status === 'continue') {
            outcome = {
              status: 'needs_support',
              title: '题目已用完，还没有达到掌握目标',
              message: `本轮题目已经完成，但统一掌握度还未达到 ${MASTERY_THRESHOLD}%；请补充练习题后继续。`,
            };
          }
        }
        if (isRevalidation && decision && ['mastered', 'needs_support'].includes(decision.status)) {
          onRevalidationComplete?.({
            ...decision, questionId: question.id,
            reason: decision.status === 'mastered' ? 'REVALIDATION_PASSED' : (decision.reason || 'REVALIDATION_NOT_PASSED'),
          });
        }
      } else {
        const transition = buildPreTransition(nextAttempts);
        nextOrder = transition.order;
        nextCompleted = transition.completedKnowledgePointIds;
        outcome = transition.outcome;
        completeAfterCurrent = transition.assessmentComplete;
        if (
          transition.nextQuestion
          && questionKnowledgePointId(transition.nextQuestion) === questionKnowledgePointId(question)
          && difficultyRank(transition.nextQuestion.difficulty) !== difficultyRank(question.difficulty)
        ) {
          const from = normalizeDifficulty(question.difficulty);
          const to = normalizeDifficulty(transition.nextQuestion.difficulty);
          const fromRank = difficultyRank(from);
          const toRank = difficultyRank(to);
          change = {
            from,
            to,
            direction: toRank > fromRank ? 'up' : 'down',
            reason: toRank > fromRank ? '下一题确认迁移表现' : '下一题先检查基础',
          };
        }
      }

      if (isPost) {
        nextLiveMasteryByKp = nextMasteryFeedback.reduce((result, item) => ({
          ...result,
          [item.knowledgePointId]: {
            ...(result[item.knowledgePointId] || {}),
            ...(item.after == null ? {} : { mastery: item.after }),
            ...(item.confidence == null ? {} : { confidence: item.confidence }),
            ...(item.correctStreak == null ? {} : { correctStreak: item.correctStreak }),
          },
        }), liveMasteryByKp);
      }

      setAttempts(nextAttempts);
      setOrder(nextOrder);
      setTargetByKp(nextTargets);
      setCompletedKpIds(nextCompleted);
        setGrading(attempt);
        setDifficultyChange(change);
        setDifficultyToast(change);
      setAdaptiveOutcome(outcome);
      setAssessmentComplete(completeAfterCurrent);
      setPendingIntervention(intervention);
      setMasteryFeedback(nextMasteryFeedback);
      setLiveMasteryByKp(nextLiveMasteryByKp);
      setCorrection(null);
      persistDraft(nextAttempts, nextOrder, nextTargets, index, nextCompleted, answer, image, {
        assessmentComplete: completeAfterCurrent,
        pendingIntervention: intervention,
        adaptiveOutcome: outcome,
        masteryFeedback: nextMasteryFeedback,
        liveMasteryByKp: nextLiveMasteryByKp,
        correction: null,
      });

    } catch (error) {
      setGradingError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const skipPreAssessmentQuestion = () => {
    if (isPost || canSubmit || grading || submitting) return;
    const attempt = {
      clientSubmissionId: createClientId(),
      answer: '',
      recognizedAnswer: '',
      answerImageName: '',
      submittedAt: new Date().toISOString(),
      score: 0,
      maxScore: Number(question.maxScore || 1),
      scoreRatio: 0,
      correct: false,
      skipped: true,
      disposition: 'SKIPPED_DONT_KNOW',
      answerQuality: 'skipped',
      feedback: '已标记为“我不会做”，本题按未通过计入课前测验。',
      strengths: [],
      improvements: [],
      gradedBy: 'student_skip',
    };
    const nextAttempts = { ...attempts, [question.id]: attempt };
    enqueueAnswerSubmission({ question, attempt, mode, credentials: syncCredentials });
    recordQuizEvent({
      type: 'answer_submitted', mode, lessonTitle, questionId: question.id,
      knowledgePointId: questionKnowledgePointId(question), stem: question.stem,
      answer: '', score: 0, maxScore: attempt.maxScore, scoreRatio: 0,
      correct: false, skipped: true, disposition: attempt.disposition,
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
      nextAttempts, transition.order, targetByKp, index,
      transition.completedKnowledgePointIds, '', null,
      { assessmentComplete: transition.assessmentComplete, adaptiveOutcome: transition.outcome },
    );
  };

  const goNext = (nextAttempts = attempts, nextOrder = order, nextTargets = targetByKp) => {
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
          administeredQuestionIds: nextOrder.filter((questionId) => nextAttempts[questionId]),
          diagnosisByKnowledgePoint: summary.diagnosisByKnowledgePoint,
          resolvedKnowledgePointCount: summary.resolvedKnowledgePointCount,
          totalKnowledgePointCount: summary.totalKnowledgePointCount,
        });
      }
      return;
    }
    const nextIndex = index + 1;
    const nextQuestion = questions.find((item) => item.id === nextOrder[nextIndex]) || questions[nextIndex];
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
    setGradingError('');
    persistDraft(
      nextAttempts, nextOrder, nextTargets, nextIndex, completedKpIds,
      emptyAnswerForQuestion(nextQuestion), null,
      { assessmentComplete: false, pendingIntervention: null, adaptiveOutcome: null, correction: null },
    );
  };

  const showHistoricalQuestion = (nextIndex) => {
    const nextQuestionId = order[nextIndex];
    const nextQuestion = questions.find((item) => item.id === nextQuestionId) || questions[nextIndex];
    const nextAttempt = nextQuestion ? attempts[nextQuestion.id] : null;
    if (!nextQuestion || !nextAttempt) return;
    setIndex(nextIndex);
    setAnswer(nextAttempt.answer ?? '');
    setImage(null);
    setGrading(nextAttempt);
    setFeedbackOutcome(null);
    setCorrection(null);
    setGradingError('');
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
        index, answer, image, grading, gradingError, difficultyChange,
        adaptiveOutcome, assessmentComplete, pendingIntervention,
        masteryFeedback, correction,
      };
      persistDraft(attempts, order, targetByKp, index, completedKpIds, answer, image);
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
  const sequenceComplete = Boolean(grading)
    && !retryRequired
    && !correctionRequired
    && !hasCompleteIntervention
    && isQuizSequenceComplete({ assessmentComplete, index, order });
  const formattedElapsed = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  const postHeaderActions = isPost ? (
    <div className="quiz-header-meta" aria-label="当前作答信息">
      <span>第 {index + 1} 题</span>
      <span className="question-timer" title="本题作答用时"><Clock3 size={15} /> {formattedElapsed}</span>
      <strong>进度 {progress}%</strong>
    </div>
  ) : undefined;
  const preAssessmentKnowledgePointCount = new Set(questions.map((item) => (
    item.primaryKnowledgePointId || item.knowledgePointIds?.[0]
  )).filter(Boolean)).size;
  const preAssessmentMaximum = Math.min(
    questions.length,
    Math.max(1, preAssessmentKnowledgePointCount) * 3,
  );
  const preAssessmentCompleted = Object.values(attempts)
    .filter((attempt) => attempt?.submittedAt).length;
  const preHeaderActions = !isPost ? (
    <span className="pre-assessment-header-estimate">
      已完成 {preAssessmentCompleted} 题 · 最多 {preAssessmentMaximum} 题
    </span>
  ) : undefined;
  const helpContext = isPost ? {
    question,
    answer,
    image,
    lessonTitle,
    knowledgePointName,
    presentedAt: presentedAtByQuestion.current[question.id] || new Date().toISOString(),
  } : undefined;

  return (
    <AppShell
      title={isPost ? `${lessonTitle} · ${knowledgePointName}` : lessonTitle}
      eyebrow={isPost ? undefined : '课前小测'}
      actions={isPost ? postHeaderActions : preHeaderActions}
      progress={!isPost ? progress : undefined}
      onBack={onExit}
      headerClassName={`quiz-page-header${isPost ? ' quiz-header' : ''}`}
      compact
    >
      <div className="quiz-wrap">
        {difficultyToast && (
          <div className={`adaptive-difficulty-toast ${difficultyToast.direction === 'up' ? 'up' : 'down'}`} role="status" aria-live="polite">
            <strong>{difficultyToast.from} <span aria-hidden="true">→</span> {difficultyToast.to}</strong>
            <span>{difficultyToast.direction === 'up' ? '下一题增加一点挑战' : '下一题先巩固关键步骤'}</span>
          </div>
        )}
        <article className={`question-card${question.type === 'short_answer' ? ' subjective-question-card' : ''}${grading ? ' is-graded' : ''}`}>
          <div className="question-card-heading">
            <div className="question-card-identity">
              <span className="question-number-badge">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{questionTypeLabels[question.type] || '题目'}</strong>
              </div>
            </div>
            <div className="question-heading-actions">
              <DifficultyBadge difficulty={question.difficulty} variant="stars" />
              <div className="question-work-tools" aria-label="答题工具">
                <ScratchPaper
                  key={`${scratchPaperScope}:${scratchPaperResetKey}`}
                  sessionScope={scratchPaperScope}
                  onActivity={resetIdleSupport}
                  triggerVariant="inline"
                />
                {question.type === 'fill_blank' && (
                  <button
                    className="question-work-tool"
                    type="button"
                    aria-pressed={formulaTargeting}
                    disabled={Boolean(grading) || submitting || viewingHistory}
                    onClick={() => setFormulaTargeting((current) => !current)}
                    title={formulaTargeting ? '取消选择公式空格' : '选择空格输入公式'}
                  >
                    <Sigma size={17} aria-hidden="true" />
                    <span>公式</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          {formulaTargeting && (
            <p className="formula-targeting-hint" role="status">请选择要输入公式的空格</p>
          )}
          {question.type === 'short_answer' && !canUseQuestionPlatformPlayer(question) && (
            <MathContent as="h1" renderKey={question.stem}>{question.stem}</MathContent>
          )}
          <QuestionAnswer
            question={question}
            value={answer}
            onChange={handleAnswerChange}
            fillInputModes={fillInputModesByQuestion[question.id] || []}
            onFillInputModesChange={handleFillInputModesChange}
            formulaTargeting={formulaTargeting}
            onFormulaTargeted={() => setFormulaTargeting(false)}
            image={image}
            onImageChange={handleImageChange}
            disabled={Boolean(grading) || submitting}
            grading={isPost ? grading : null}
          />
          {correction?.questionId === question.id
            && hasConfirmedCorrectionReading(correction)
            && !grading && (
              <p className="correction-reading-reminder" role="status">
                <BookOpenCheck size={16} aria-hidden="true" />
                {correctionReadingGuide.reminder}
              </p>
          )}

          {gradingError && <div className="feedback error" role="alert"><strong>暂时没能完成批改</strong><p>{gradingError}</p></div>}
          {grading && <QuestionFeedbackCard
            grading={grading}
            questionType={question.type}
            outcomeTone={feedbackOutcome}
            diagnostic={!isPost}
            difficultyChange={difficultyChange}
            adaptiveOutcome={adaptiveOutcome}
            needsIntervention={hasCompleteIntervention}
            masteryFeedback={isPost ? masteryFeedback : []}
            practiceGate={isPost && !isReview ? adaptiveOutcome : null}
            practiceSummary={isPost && sequenceComplete}
          />}
          {correctionRequired && correction?.questionId === question.id
            && !hasConfirmedCorrectionReading(correction) && (
              <section className="correction-reading-card" aria-labelledby="correction-reading-title">
                <span className="correction-reading-icon" aria-hidden="true">
                  <BookOpenCheck size={20} />
                </span>
                <div>
                  <h2 id="correction-reading-title">{correctionReadingGuide.title}</h2>
                  <p>{correctionReadingGuide.description}</p>
                </div>
              </section>
          )}
          {grading?.showAnswer && isPost && !grading.correct && <QuestionReferenceAnswer
            question={question}
            correctAnswer={grading.correctAnswer}
            correctAnswerText={displayCorrectAnswer(question, grading)}
            correctAnswerLabel="正确答案"
            analysis={grading.analysis || '暂无解析'}
          />}

        </article>

        <div className="quiz-action">
          <div className="quiz-action-start">
            {isPost && <StudentHelpRequest context={helpContext} />}
            {viewingHistory && <span>正在查看第 {index + 1} 题的作答记录</span>}
          </div>
          <div className="quiz-action-secondary">
            {index > 0 && (
              <button className="neutral-button" type="button" onClick={viewPreviousQuestion}>
                <ChevronLeft size={17} /> 上一题
              </button>
            )}
            {isPost && onLearnAgain && !grading && !viewingHistory && (
              <button
                className="neutral-button"
                type="button"
                onClick={() => reviewKnowledgePoint('permanent_action')}
              >回顾这个知识点</button>
            )}
            {!isPost && !grading && !viewingHistory && !canSubmit && (
              <button
                className="neutral-button"
                type="button"
                disabled={submitting}
                onClick={skipPreAssessmentQuestion}
              >我不会做，跳过本题</button>
            )}
          </div>
          {viewingHistory ? (
            <button className="primary-button large" type="button" onClick={moveForwardFromHistory}>
              {index + 1 < historyResume.current?.index ? '下一题' : '返回当前题'} <ChevronRight size={17} />
            </button>
          ) : !grading ? (
            <button className="primary-button large" type="button" aria-busy={submitting} disabled={!canSubmit || submitting} onClick={submit}>
              {submitting ? '正在批改…' : '提交答案'}
            </button>
          ) : (
            <button
              className="primary-button large"
              type="button"
              onClick={() => {
                if (correctionRequired) {
                  confirmReadingAndCorrect();
                  return;
                }
                if (retryRequired) {
                  if (grading?.answerQuality !== 'pending_review') {
                    setAnswer(emptyAnswerForQuestion(question));
                    setImage(null);
                    resetCurrentFillInputModes();
                  }
                  setGrading(null);
                  return;
                }
                goNext();
              }}
            >
              {correctionRequired
                ? correctionReadingGuide.confirmLabel
                : retryRequired
                ? grading?.answerQuality === 'pending_review' ? '重新提交' : '重新作答'
                : hasCompleteIntervention
                ? '一起看看问题在哪'
                : sequenceComplete
                  ? '继续学习'
                  : adaptiveOutcome
                    ? '继续'
                    : '下一题'} <ChevronRight size={17} />
            </button>
          )}
        </div>

        {idleSupportQuestionId === question.id && idleSupportEligible && (
          <aside className="question-idle-support" role="region" aria-labelledby="question-idle-support-title">
            <span className="question-idle-support-icon" aria-hidden="true">
              <Lightbulb size={20} />
            </span>
            <div className="question-idle-support-copy">
              <strong id="question-idle-support-title">这题卡住了吗？</strong>
              <span>可以先回顾「{knowledgePointName}」的关键方法，当前答案会为你保留。</span>
            </div>
            <div className="question-idle-support-actions">
              <button className="primary-button" type="button" onClick={() => reviewKnowledgePoint('idle_prompt')}>
                回顾这个知识点
              </button>
              <button className="neutral-button" type="button" onClick={dismissIdleSupport}>我再想想</button>
            </div>
            <button
              className="question-idle-support-close"
              type="button"
              aria-label="关闭提示"
              onClick={dismissIdleSupport}
            >
              <X size={18} />
            </button>
          </aside>
        )}

        {grading && hasCompleteIntervention && !viewingHistory && (
          <div
            className="practice-intervention-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-intervention-title"
            aria-describedby="practice-intervention-description"
          >
            <div className="practice-intervention-mask" aria-hidden="true" />
            <section>
              <header>
                <span aria-hidden="true"><MessageCircle size={22} /></span>
                <div>
                  <small>本轮练习暂停</small>
                  <h2 id="practice-intervention-title">先回顾一下解题思路</h2>
                </div>
              </header>
              <div className="practice-intervention-body">
                <p id="practice-intervention-description">
                  最近 3 题还没有达到要求。接下来和老师一起找出共同问题，再回来完成一道新题验证。
                </p>
                <div>
                  <span>回顾内容</span>
                  <strong>{knowledgePointName}</strong>
                </div>
              </div>
              <footer>
                <button
                  ref={interventionButtonRef}
                  className="primary-button"
                  type="button"
                  onClick={() => goNext()}
                >
                  进入错题回顾 <ChevronRight size={16} />
                </button>
              </footer>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
