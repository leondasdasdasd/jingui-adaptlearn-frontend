import React, { useEffect, useMemo, useRef, useState } from "react";

import GeneratingPage from "../components/GeneratingPage";
import QuizPage from "../components/QuizPage";
import { calculatePreMastery } from "../lib/mastery";
import { routes } from "../routes/routePaths";
import { useNavigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import { readKnowledgeProfile } from "../student/data/knowledgeProfileRepository";
import { recordLearningEvent } from "../student/data/learningEventRepository";
import {
  createAutomaticLearningPlan,
  createLessonLearningFlow,
} from "../student/domain/learningPlan";
import {
  advancePreAssessment,
  mergePreAssessmentDiagnosisIntoMastery,
  prepareHistoricalMasteryForPolicy,
} from "../student/domain/preAssessmentStrategy";

/**
 *
 */
export default function PreAssessmentRoute() {
  const navigate = useNavigate();
  const { session, setSession, resetSession } = useLearningSession();
  const [error, setError] = useState("");
  const generationStarted = useRef(false);
  const historicalMastery = useMemo(
    () =>
      prepareHistoricalMasteryForPolicy({
        knowledgePoints: session.selection.knowledgePoints,
        historicalMastery: {
          ...readKnowledgeProfile(),
          ...session.selection.authoritativeMastery,
        },
        generationPolicy: session.selection.generationPolicy,
      }),
    [
      session.selection.contentVersionId,
      session.selection.generationPolicy,
      session.selection.knowledgePoints,
    ],
  );

  const loadQuestions = () =>
    setError("这个已发布课时没有可用的诊断题，请联系老师检查发布内容");

  useEffect(() => {
    recordLearningEvent({
      type: "stage_entered",
      stage: "pre_assessment",
      lessonTitle: session.selection.section.title,
    });
    if (session.preQuestions.length === 0 && !generationStarted.current) {
      const summary = advancePreAssessment({
        questions: [],
        attempts: {},
        knowledgePoints: session.selection.knowledgePoints,
        historicalMastery,
      });
      if (!summary.assessmentComplete) {
        generationStarted.current = true;
        loadQuestions();
      }
    }
    // 学生端只读取教师发布内容，不在课堂现场生成正式测验题。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const complete = (attempts, summary) => {
    if (!summary?.assessmentComplete) return;
    const calculatedMastery = calculatePreMastery(
      session.preQuestions,
      attempts,
      session.selection.knowledgePoints,
    );
    const preMastery = mergePreAssessmentDiagnosisIntoMastery(
      calculatedMastery,
      summary.diagnosisByKnowledgePoint,
      historicalMastery,
    );
    const learningPlan = createAutomaticLearningPlan(
      session.selection.knowledgePoints,
      preMastery,
      session.selection.generationPolicy,
    );
    setSession((current) => ({
      ...current,
      preAttempts: attempts,
      preMastery,
      preAssessment: summary,
      learningFlow: createLessonLearningFlow(learningPlan),
    }));
    navigate(routes.preResult);
  };

  useEffect(() => {
    if (session.preAssessment?.completedAt || generationStarted.current) return;
    const summary = advancePreAssessment({
      questions: session.preQuestions,
      attempts: {},
      knowledgePoints: session.selection.knowledgePoints,
      historicalMastery,
    });
    if (!summary.assessmentComplete || summary.nextQuestion) return;
    generationStarted.current = true;
    complete(
      {},
      {
        strategyVersion: summary.strategyVersion,
        assessmentComplete: summary.assessmentComplete,
        completedAt: new Date().toISOString(),
        administeredQuestionIds: [],
        diagnosisByKnowledgePoint: summary.diagnosisByKnowledgePoint,
        resolvedKnowledgePointCount: summary.resolvedKnowledgePointCount,
        totalKnowledgePointCount: summary.totalKnowledgePointCount,
      },
    );
  }, [
    historicalMastery,
    session.preAssessment?.completedAt,
    session.preQuestions,
  ]);

  if (error) {
    return (
      <GeneratingPage
        lessonTitle={session.selection.section.title}
        phase="pre"
        error={error}
        generationStatus={null}
        onRetry={() => {
          generationStarted.current = true;
          loadQuestions();
        }}
        onBack={() => {
          resetSession();
          navigate(routes.directory);
        }}
      />
    );
  }

  if (session.preQuestions.length === 0) return null;

  return (
    <QuizPage
      draftId={`pre:${session.selection.contentVersionId || session.selection.section.id}`}
      mode="pre"
      lessonTitle={session.selection.section.title}
      questions={session.preQuestions}
      knowledgePoints={session.selection.knowledgePoints}
      startingMastery={historicalMastery}
      studentScope={
        session.selection.studentId || session.selection.studentSessionId || ""
      }
      onComplete={complete}
      onExit={() => navigate(routes.directory)}
    />
  );
}
