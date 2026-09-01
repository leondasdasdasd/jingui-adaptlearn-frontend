import React, { useEffect } from "react";

import LearningResourceStatePage from "../components/LearningResourceStatePage";
import QuizPage from "../components/QuizPage";
import { routes } from "../routes/routePaths";
import { Navigate, useNavigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import {
  createTutoringSession,
  terminalStateForPracticeDecision,
  transitionTutoringSession,
} from "../shared/domain/tutoringStateMachine";
import { recordLearningEvent } from "../student/data/learningEventRepository";
import {
  readLearningAttempts,
  readLocalStudentIdentity,
} from "../student/data/learningHistoryRepository";
import {
  activeLearningUnit,
  advanceLessonFlow,
  finishTemporaryLearning,
  resolveKnowledgeVerification,
  routeForLearningUnit,
  selectIndependentVerificationQuestion,
  startDirectCheckpoint,
  startRelearning,
} from "../student/domain/learningPlan";
import {
  calculatePracticeRoundMastery,
  currentPracticeMastery,
} from "../student/domain/practiceMastery.js";

/**
 *
 * @param context
 * @param unit
 */
function questionsForUnit(context, unit) {
  if (unit?.kind === "enhancement_training") return context.postQuestions || [];
  if (["knowledge_practice", "knowledge_verification"].includes(unit?.kind)) {
    const pool =
      context.publishedContent?.knowledgePracticePools?.[
        unit.knowledgePointId
      ] || [];
    if (unit.kind === "knowledge_verification") {
      const question = selectIndependentVerificationQuestion(
        pool,
        context.postAttempts,
        unit.knowledgePointId,
      );
      return question ? [question] : [];
    }
    // New versions provide a dedicated 15-question pool.  Keep a safe
    // compatibility fallback for older local publications whose per-KP pool
    // was truncated: the student must not finish simply because that legacy
    // array contains one item.
    const fallback = (context.postQuestions || []).filter(
      (question) =>
        question.phase !== "review" &&
        question.knowledgePointIds?.includes(unit.knowledgePointId),
    );
    const seen = new Set();
    return [...pool, ...fallback].filter((question) => {
      if (!question?.id || seen.has(question.id)) return false;
      seen.add(question.id);
      return true;
    });
  }
  if (unit?.kind === "composite_review")
    return context.publishedContent?.compositeReviewPool || [];
  return context.postQuestions || [];
}

/**
 *
 * @param context
 * @param knowledgePoints
 * @param studentId
 */
function recentAttemptsForKnowledgePoints(
  context,
  knowledgePoints = [],
  studentId = "",
) {
  const currentRows = [
    ["pre", context.preQuestions || [], context.preAttempts || {}],
    ["post", context.postQuestions || [], context.postAttempts || {}],
  ].flatMap(([assessmentMode, questions, attempts]) =>
    questions.flatMap((question) => {
      const attempt = attempts[question.id];
      return attempt
        ? [
            {
              ...attempt,
              assessmentMode,
              questionId: question.id,
              questionSnapshot: question,
            },
          ]
        : [];
    }),
  );

  return Object.fromEntries(
    knowledgePoints.map((knowledgePoint) => {
      const current = currentRows.filter((row) =>
        (row.questionSnapshot?.knowledgePointIds || []).includes(
          knowledgePoint.id,
        ),
      );
      const historical = studentId
        ? readLearningAttempts({
            studentId,
            knowledgePointId: knowledgePoint.id,
          })
        : [];
      const merged = new Map();
      for (const attempt of [...current, ...historical]) {
        const key = `${attempt.questionId || ""}:${attempt.submittedAt || ""}:${attempt.assessmentMode || ""}`;
        if (!merged.has(key)) merged.set(key, attempt);
      }
      const recent = [...merged.values()]
        .sort((left, right) =>
          String(right.submittedAt || "").localeCompare(
            String(left.submittedAt || ""),
          ),
        )
        .slice(0, 10);
      return [knowledgePoint.id, recent];
    }),
  );
}

/**
 *
 */
export default function PostAssessmentRoute() {
  const navigate = useNavigate();
  const { session, setSession } = useLearningSession();
  const flow = session.learningFlow;
  const context = flow?.context || session;
  const unit = activeLearningUnit(flow);
  const selection = context.selection;
  const contentVersionId =
    context.publishedContent?.versionId || selection?.contentVersionId;
  const questions = questionsForUnit(context, unit).map((question) =>
    question.contentVersionId || !contentVersionId
      ? question
      : { ...question, contentVersionId },
  );
  // Every practice/review unit is a new evidence window. Its prior is the
  // latest settlement; only the first unit falls back to the pre-assessment.
  // Historical attempts are already summarized by this baseline and must not
  // be replayed again, especially when a repeated practice reuses question IDs.
  const startingMastery = currentPracticeMastery({
    result: context.result,
    preMastery: context.preMastery,
  });
  const studentScope =
    selection?.studentId || readLocalStudentIdentity()?.id || "";
  const recentAttemptsByKnowledgePoint = recentAttemptsForKnowledgePoints(
    context,
    selection?.knowledgePoints || [],
    studentScope,
  );
  const selectionSeed = `${studentScope}:${selection?.studentSessionId || ""}:${unit?.id || ""}:${Object.keys(context.postAttempts || {}).length}`;

  useEffect(() => {
    if (!selection?.section) return;
    recordLearningEvent({
      type: "stage_entered",
      stage: unit?.kind || "knowledge_practice",
      lessonTitle: selection.section.title,
      knowledgePointId: unit?.knowledgePointId || "",
    });
  }, [unit?.id, unit?.kind, unit?.knowledgePointId, selection?.section?.title]);

  if (
    unit &&
    ![
      "knowledge_practice",
      "knowledge_verification",
      "composite_review",
      "enhancement_training",
    ].includes(unit.kind)
  ) {
    return (
      <Navigate to={routeForLearningUnit(unit, routes.complete)} replace />
    );
  }

  const complete = (attempts) => {
    const mergedAttempts = { ...context.postAttempts, ...attempts };
    const roundResult = calculatePracticeRoundMastery({
      questions,
      attempts,
      knowledgePoints: selection.knowledgePoints,
      baseline: startingMastery,
      preMastery: context.preMastery,
    });
    if (unit?.kind === "knowledge_verification") {
      const verificationAttempt = attempts[questions[0]?.id] || {};
      const resolution = resolveKnowledgeVerification(
        flow,
        verificationAttempt,
        unit.id,
      );
      const nextUnit = activeLearningUnit(resolution.flow);
      setSession((current) => ({
        ...current,
        postAttempts: mergedAttempts,
        result: roundResult,
        resultSource: "preview",
        learningFlow: resolution.flow,
      }));
      if (nextUnit) navigate(routeForLearningUnit(nextUnit, routes.complete));
      else navigate(routes.complete);
      return;
    }
    if (flow?.mode === "enhancement") {
      setSession((current) => ({
        ...current,
        postAttempts: mergedAttempts,
        result: roundResult,
        resultSource: "preview",
        learningFlow: {
          ...current.learningFlow,
          activeUnit: null,
          context: null,
        },
      }));
      navigate(routes.complete);
      return;
    }
    if (flow?.mode === "direct") {
      setSession((current) => ({
        ...current,
        ...(current.learningFlow.context
          ? {}
          : {
              postAttempts: mergedAttempts,
              result: roundResult,
              resultSource: "preview",
            }),
        learningFlow: startDirectCheckpoint({
          ...current.learningFlow,
          context: current.learningFlow.context
            ? {
                ...current.learningFlow.context,
                postAttempts: mergedAttempts,
                result: roundResult,
                resultSource: "preview",
              }
            : null,
        }),
      }));
      navigate(routes.knowledgeCheckpoint);
      return;
    }

    const nextFlow = advanceLessonFlow(flow);
    const nextUnit = activeLearningUnit(nextFlow);
    setSession((current) => ({
      ...current,
      postAttempts: mergedAttempts,
      result: roundResult,
      resultSource: "preview",
      learningFlow: nextFlow,
    }));
    if (nextUnit) navigate(routeForLearningUnit(nextUnit, routes.complete));
    else navigate(routes.complete);
  };

  const intervene = (practiceIntervention) => {
    const tutoringSession = createTutoringSession(practiceIntervention);
    setSession((current) => ({
      ...current,
      practiceIntervention,
      tutoringSession,
      learningCheckIn: { version: 4, messages: [], diagnosis: null },
      remediationOpenMaic: {
        jobId: "",
        status: "idle",
        step: "",
        progress: 0,
        message: "",
        classroomId: "",
        classroomUrl: "",
      },
    }));
    const transition = tutoringSession.transitions[0];
    recordLearningEvent({
      type: "tutoring_state_transition",
      stage: "check_in",
      knowledgePointId: tutoringSession.knowledgePointId,
      ...transition,
    });
    navigate(routes.checkIn, {
      state: { practiceIntervention, tutoringSession },
    });
  };

  const finishRevalidation = (practiceDecision) => {
    const targetState = terminalStateForPracticeDecision(
      session.tutoringSession?.state,
      practiceDecision,
    );
    if (!targetState) return;
    const nextTutoring = transitionTutoringSession(
      session.tutoringSession,
      targetState,
      {
        reasonCode:
          practiceDecision.reason ||
          (targetState === "COMPLETE"
            ? "REVALIDATION_PASSED"
            : "REVALIDATION_NOT_PASSED"),
        evidenceQuestionIds: practiceDecision.questionId
          ? [practiceDecision.questionId]
          : [],
      },
    );
    setSession((current) => ({ ...current, tutoringSession: nextTutoring }));
    recordLearningEvent({
      type: "tutoring_state_transition",
      stage: "knowledge_practice",
      knowledgePointId: nextTutoring.knowledgePointId,
      ...nextTutoring.transitions.at(-1),
    });
  };

  if (!selection) return <Navigate to={routes.directory} replace />;

  if (questions.length === 0) {
    return (
      <LearningResourceStatePage
        lessonTitle={selection.section.title}
        state="unpublished"
        reason="当前学习内容没有可用的巩固练习，请返回学习列表后选择其他已发布内容。"
        onBack={() => navigate(routes.directory)}
      />
    );
  }

  return (
    <QuizPage
      key={unit?.id || "legacy-post"}
      draftId={`post:${selection.contentVersionId || selection.section.id}:${unit?.id || "legacy"}`}
      mode="post"
      lessonTitle={selection.section.title}
      questions={questions}
      knowledgePoints={selection.knowledgePoints}
      startingMastery={startingMastery}
      recentAttemptsByKnowledgePoint={recentAttemptsByKnowledgePoint}
      selectionSeed={selectionSeed}
      studentScope={studentScope}
      masteryQuestions={questions}
      priorAttempts={{}}
      masteryPrior={startingMastery}
      onComplete={complete}
      onIntervention={intervene}
      revalidationKnowledgePointId={
        session.tutoringSession?.state === "REVALIDATING"
          ? session.tutoringSession.knowledgePointId
          : ""
      }
      onRevalidationComplete={finishRevalidation}
      onLearnAgain={
        unit?.kind === "knowledge_practice"
          ? () => {
              setSession((current) => ({
                ...current,
                learningFlow: startRelearning(
                  current.learningFlow,
                  unit.knowledgePointId,
                ),
              }));
              navigate(routes.learning);
            }
          : null
      }
      onExit={() => {
        if (flow?.mode === "direct") {
          const returnTo = flow.returnTo || routes.knowledgeMap;
          setSession((current) => ({
            ...current,
            learningFlow: finishTemporaryLearning(current.learningFlow),
          }));
          navigate(returnTo);
        } else navigate(routes.directory);
      }}
    />
  );
}
