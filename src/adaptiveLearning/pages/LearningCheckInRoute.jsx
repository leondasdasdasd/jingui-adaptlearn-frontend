import React, { useEffect, useRef, useState } from "react";

import LearningCheckInPage from "../components/LearningCheckInPage";
import { analyzeLearningCheckIn } from "../lib/learningCheckInApi";
import { routes } from "../routes/routePaths";
import { useLocation, useNavigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import {
  diagnosisTargetState,
  transitionTutoringSession,
  tutoringStates,
} from "../shared/domain/tutoringStateMachine";
import { recordLearningEvent } from "../student/data/learningEventRepository";

/**
 *
 */
export default function LearningCheckInRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, setSession } = useLearningSession();
  const cached = session.learningCheckIn || { messages: [], diagnosis: null };
  const messages = cached.messages || [];
  const practiceContext =
    session.practiceIntervention || location.state?.practiceIntervention;
  const tutoringSession =
    session.tutoringSession || location.state?.tutoringSession;
  const hasCompletePracticeContext = Boolean(
    practiceContext?.knowledgePointId &&
    (practiceContext.evidence?.length || 0) >= 3,
  );
  const [sending, setSending] = useState(messages.length === 0);
  const [error, setError] = useState("");
  const started = useRef(false);
  const lesson = {
    id: session.selection.section.id,
    title: session.selection.section.title,
    chapterTitle: session.selection.chapter.title,
  };

  const save = (patch) =>
    setSession((current) => ({
      ...current,
      learningCheckIn: { ...current.learningCheckIn, ...patch },
    }));

  const askTeacher = async (nextMessages) =>
    analyzeLearningCheckIn({
      lesson,
      knowledgePoints: session.selection.knowledgePoints,
      practiceContext,
      tutoringState: tutoringSession?.state || tutoringStates.DIAGNOSING,
      messages: nextMessages.map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      })),
    });

  useEffect(() => {
    if (!hasCompletePracticeContext) {
      setSession((current) => ({
        ...current,
        practiceIntervention: null,
        tutoringSession: null,
        learningCheckIn: { version: 4, messages: [], diagnosis: null },
      }));
      navigate(routes.postAssessment, { replace: true });
      return;
    }
    if (messages.length > 0 || started.current) return;
    started.current = true;
    recordLearningEvent({
      type: "stage_entered",
      stage: "check_in",
      lessonTitle: lesson.title,
    });
    setSending(true);
    askTeacher([])
      .then((diagnosis) => {
        const occurredAt = new Date().toISOString();
        recordLearningEvent({
          type: "ai_tutor_message",
          role: "assistant",
          content: diagnosis.reply,
          occurredAt,
        });
        save({
          messages: [
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: diagnosis.reply,
              occurredAt,
            },
          ],
          diagnosis: null,
        });
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setSending(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (content) => {
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      occurredAt: new Date().toISOString(),
    };
    recordLearningEvent({
      type: "ai_tutor_message",
      role: "user",
      content,
      occurredAt: userMessage.occurredAt,
    });
    const nextMessages = [...messages, userMessage];
    save({ messages: nextMessages, diagnosis: null });
    setSending(true);
    setError("");
    try {
      const diagnosis = await askTeacher(nextMessages);
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: diagnosis.reply,
        occurredAt: new Date().toISOString(),
      };
      recordLearningEvent({
        type: "ai_tutor_message",
        role: "assistant",
        content: diagnosis.reply,
        occurredAt: assistantMessage.occurredAt,
      });
      if (diagnosis.ready) {
        const targetState = diagnosisTargetState(diagnosis);
        const nextTutoring = transitionTutoringSession(
          tutoringSession,
          targetState,
          {
            reasonCode: diagnosis.needsRemediation
              ? "GENUINE_DIFFICULTY"
              : "CAUSE_AND_METHOD_CONFIRMED",
            promptVersion: diagnosis.promptVersion,
            summary: diagnosis.summary,
            causeType: diagnosis.causeType,
            studentTip: diagnosis.studentTip,
            evidenceQuestionIds: diagnosis.reviewedQuestionIds,
          },
        );
        setSession((current) => ({
          ...current,
          tutoringSession: nextTutoring,
          learningCheckIn: {
            ...current.learningCheckIn,
            messages: [...nextMessages, assistantMessage],
            diagnosis,
          },
        }));
        recordLearningEvent({
          type: "tutoring_state_transition",
          stage: "check_in",
          knowledgePointId: nextTutoring.knowledgePointId,
          ...nextTutoring.transitions.at(-1),
        });
      } else {
        save({
          messages: [...nextMessages, assistantMessage],
          diagnosis: null,
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  const continuePractice = () => {
    const nextTutoring = transitionTutoringSession(
      tutoringSession,
      tutoringStates.REVALIDATING,
      {
        reasonCode: "READY_FOR_UNSEEN_QUESTION",
        summary: cached.diagnosis?.summary,
        causeType: cached.diagnosis?.causeType,
        studentTip: cached.diagnosis?.studentTip,
        evidenceQuestionIds: cached.diagnosis?.reviewedQuestionIds,
        promptVersion: cached.diagnosis?.promptVersion,
      },
    );
    setSession((current) => ({
      ...current,
      practiceIntervention: null,
      tutoringSession: nextTutoring,
    }));
    recordLearningEvent({
      type: "tutoring_state_transition",
      stage: "knowledge_practice",
      knowledgePointId: nextTutoring.knowledgePointId,
      ...nextTutoring.transitions.at(-1),
    });
    navigate(routes.postAssessment);
  };

  return (
    <LearningCheckInPage
      lesson={lesson}
      evidence={practiceContext?.evidence || []}
      messages={messages}
      diagnosis={cached.diagnosis}
      sending={sending}
      error={error}
      studentName={session.selection.studentName || "我"}
      onSend={send}
      onGenerateRemediation={() => navigate(routes.remediation)}
      onContinue={continuePractice}
      onBack={() => navigate(routes.directory)}
    />
  );
}
