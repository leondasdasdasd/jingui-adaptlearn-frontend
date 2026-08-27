import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PreAssessmentResultPage from '../components/PreAssessmentResultPage';
import { calculatePreMastery, isPreAssessmentComplete } from '../lib/mastery';
import { loadAnswerReviews } from '../lib/gradingApi';
import { routes } from '../routes/routePaths';
import { useLearningSession } from '../session/LearningSessionContext';
import { activeLearningUnit, routeForLearningUnit } from '../student/domain/learningPlan';

export default function PreAssessmentResultRoute() {
  const navigate = useNavigate();
  const { session } = useLearningSession();
  const [answerReviews, setAnswerReviews] = useState({});
  const [answerReviewStatus, setAnswerReviewStatus] = useState('idle');
  const adaptiveCompleted = Boolean(session.preAssessment?.completedAt);
  const completed = adaptiveCompleted
    || isPreAssessmentComplete(session.preQuestions, session.preAttempts);

  const mastery = Object.keys(session.preMastery || {}).length
    ? session.preMastery
    : calculatePreMastery(
      session.preQuestions,
      session.preAttempts,
      session.selection.knowledgePoints,
    );
  const administeredQuestionIds = session.preAssessment?.administeredQuestionIds
    || session.preQuestions.filter((question) => session.preAttempts[question.id]).map((question) => question.id);
  const questionsById = Object.fromEntries(session.preQuestions.map((question) => [question.id, question]));
  const administeredQuestions = administeredQuestionIds.map((id) => questionsById[id]).filter(Boolean);
  const administeredQuestionSignature = administeredQuestionIds.join(',');
  useEffect(() => {
    if (!session.selection.contentVersionId || !session.selection.studentSessionId
        || !session.selection.classroomAccessToken || !administeredQuestionIds.length) return undefined;
    let cancelled = false;
    setAnswerReviewStatus('loading');
    loadAnswerReviews(session.selection.contentVersionId, administeredQuestionIds, {
      studentSessionId: session.selection.studentSessionId,
      accessToken: session.selection.classroomAccessToken,
    })
      .then((items) => { if (!cancelled) { setAnswerReviews(items); setAnswerReviewStatus('ready'); } })
      .catch(() => { if (!cancelled) setAnswerReviewStatus('failed'); });
    return () => { cancelled = true; };
  // The signature changes only when the adaptive assessment administered a different set.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.selection.classroomAccessToken, session.selection.contentVersionId,
    session.selection.studentSessionId, administeredQuestionSignature]);
  const reviewedQuestions = useMemo(() => administeredQuestions.map((question) => {
    const review = answerReviews[question.id];
    return review ? { ...question, answer: review.correctAnswer, analysis: review.analysis || question.analysis } : question;
  }), [administeredQuestions, answerReviews]);
  if (!completed) return <Navigate to={routes.preAssessment} replace />;
  const nextUnit = activeLearningUnit(session.learningFlow);
  const nextStep = ['knowledge_verification', 'composite_review'].includes(nextUnit?.kind)
    ? {
        tone: 'verification',
        title: '基础诊断表现稳定',
        description: nextUnit.kind === 'composite_review'
          ? '跳过重复讲解，直接进入综合练习确认掌握'
          : '跳过重复讲解，先用未见新题完成独立验证',
        actionLabel: '继续学习',
      }
    : {
        tone: 'learning',
        title: '学习重点已准备',
        description: '接下来只学习需要加强的知识点',
        actionLabel: '继续学习',
      };

  return (
    <PreAssessmentResultPage
      lesson={{ id: session.selection.section.id, title: session.selection.section.title }}
      knowledgePoints={session.selection.knowledgePoints}
      mastery={mastery}
      questions={reviewedQuestions}
      attempts={session.preAttempts}
      answerReviewStatus={answerReviewStatus}
      diagnosticSummary={session.preAssessment}
      nextStep={nextStep}
      onContinue={() => navigate(routeForLearningUnit(nextUnit, routes.complete))}
    />
  );
}
