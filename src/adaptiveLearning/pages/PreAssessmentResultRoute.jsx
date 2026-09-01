import React, { useMemo } from "react";

import PreAssessmentResultPage from "../components/PreAssessmentResultPage";
import { calculatePreMastery, isPreAssessmentComplete } from "../lib/mastery";
import { routes } from "../routes/routePaths";
import { Navigate, useNavigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import { useScopedAnswerReviews } from "../student/application/useScopedAnswerReviews";
import {
  activeLearningUnit,
  routeForLearningUnit,
} from "../student/domain/learningPlan";

/**
 *
 */
export default function PreAssessmentResultRoute() {
  const navigate = useNavigate();
  const { session } = useLearningSession();
  const adaptiveCompleted = Boolean(session.preAssessment?.completedAt);
  const completed =
    adaptiveCompleted ||
    isPreAssessmentComplete(session.preQuestions, session.preAttempts);

  const mastery =
    Object.keys(session.preMastery || {}).length > 0
      ? session.preMastery
      : calculatePreMastery(
          session.preQuestions,
          session.preAttempts,
          session.selection.knowledgePoints,
        );
  const administeredQuestionIds =
    session.preAssessment?.administeredQuestionIds ||
    session.preQuestions
      .filter((question) => session.preAttempts[question.id])
      .map((question) => question.id);
  const questionsById = Object.fromEntries(
    session.preQuestions.map((question) => [question.id, question]),
  );
  const administeredQuestions = administeredQuestionIds
    .map((id) => questionsById[id])
    .filter(Boolean);
  const administeredQuestionSignature = administeredQuestionIds.join(",");
  const {
    items: answerReviews,
    status: answerReviewStatus,
  } = useScopedAnswerReviews({
    contentVersionId: session.selection.contentVersionId,
    questionIds: administeredQuestionIds,
    questionIdsSignature: administeredQuestionSignature,
    studentSessionId: session.selection.studentSessionId,
    accessToken: session.selection.classroomAccessToken,
  });
  const reviewedQuestions = useMemo(
    () =>
      administeredQuestions.map((question) => {
        const review = answerReviews[question.id];
        return review
          ? {
              ...question,
              answer: review.correctAnswer,
              analysis: review.analysis || question.analysis,
            }
          : question;
      }),
    [administeredQuestions, answerReviews],
  );
  if (!completed) return <Navigate to={routes.preAssessment} replace />;
  const nextUnit = activeLearningUnit(session.learningFlow);
  const nextStepKind =
    nextUnit?.kind === "composite_review"
      ? "verification_composite"
      : nextUnit?.kind === "knowledge_verification"
        ? "verification_new"
        : "learning";

  return (
    <PreAssessmentResultPage
      lesson={{
        id: session.selection.section.id,
        title: session.selection.section.title,
      }}
      knowledgePoints={session.selection.knowledgePoints}
      mastery={mastery}
      questions={reviewedQuestions}
      attempts={session.preAttempts}
      answerReviewStatus={answerReviewStatus}
      diagnosticSummary={session.preAssessment}
      nextStepKind={nextStepKind}
      onContinue={() =>
        navigate(routeForLearningUnit(nextUnit, routes.complete))
      }
    />
  );
}
