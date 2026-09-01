import React, { useEffect, useRef, useState } from "react";

import OpenMaicPage from "../components/OpenMaicPage";
import OpenMaicPreparingPage from "../components/OpenMaicPreparingPage";
import { createOpenMaicClassroom, getOpenMaicJob } from "../lib/openMaicApi";
import { routes } from "../routes/routePaths";
import { useNavigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import {
  transitionTutoringSession,
  tutoringStates,
} from "../shared/domain/tutoringStateMachine";
import { recordLearningEvent } from "../student/data/learningEventRepository";

const emptyRuntime = {
  jobId: "",
  status: "idle",
  step: "",
  progress: 0,
  message: "",
  classroomId: "",
  classroomUrl: "",
};

/**
 *
 */
export default function RemediationRoute() {
  const navigate = useNavigate();
  const { session, setSession } = useLearningSession();
  const [error, setError] = useState("");
  const started = useRef(false);
  const diagnosis = session.learningCheckIn?.diagnosis;
  const lesson = {
    id: session.selection.section.id,
    title: session.selection.section.title,
    chapterTitle: session.selection.chapter.title,
  };
  const runtime = session.remediationOpenMaic || emptyRuntime;
  const selectedIds = new Set(diagnosis?.knowledgePointIds || []);
  const knowledgePoints = session.selection.knowledgePoints.filter((kp) =>
    selectedIds.has(kp.id),
  );
  const scopedKnowledgePoints =
    knowledgePoints.length > 0
      ? knowledgePoints
      : session.selection.knowledgePoints;

  const saveRuntime = (patch) =>
    setSession((current) => ({
      ...current,
      remediationOpenMaic: {
        ...(current.remediationOpenMaic || emptyRuntime),
        ...patch,
      },
    }));

  const pollJob = async (jobId) => {
    while (true) {
      const job = await getOpenMaicJob(jobId);
      saveRuntime({
        jobId,
        status: job.status,
        step: job.step,
        progress: job.progress,
        message: job.message,
      });
      if (job.status === "succeeded") {
        saveRuntime({
          status: "succeeded",
          progress: 100,
          classroomId: job.result.classroomId,
          classroomUrl: job.result.url,
        });
        return;
      }
      if (job.status === "failed")
        throw new Error(job.error || "重点讲解准备失败");
      await new Promise((resolve) =>
        window.setTimeout(resolve, job.pollIntervalMs || 3000),
      );
    }
  };

  const createClassroom = async () => {
    started.current = true;
    setError("");
    saveRuntime({
      ...emptyRuntime,
      status: "queued",
      step: "queued",
      progress: 2,
    });
    try {
      const response = await createOpenMaicClassroom({
        lesson,
        knowledgePoints: scopedKnowledgePoints,
        generationMode: "remediation",
        studentContext: diagnosis,
      });
      if (response.status === "succeeded" && response.result?.classroomId) {
        saveRuntime({
          status: "succeeded",
          step: "completed",
          progress: 100,
          classroomId: response.result.classroomId,
          classroomUrl: response.result.url,
        });
        return;
      }
      saveRuntime({
        jobId: response.jobId,
        status: response.status,
        step: response.step,
      });
      await pollJob(response.jobId);
    } catch (requestError) {
      setError(requestError.message);
      saveRuntime({ status: "failed" });
    }
  };

  const finishRemediation = () => {
    const nextTutoring = transitionTutoringSession(
      session.tutoringSession,
      tutoringStates.REVALIDATING,
      {
        reasonCode: "REMEDIATION_COMPLETED",
        summary: diagnosis?.summary,
        causeType: diagnosis?.causeType,
        studentTip: diagnosis?.studentTip,
        evidenceQuestionIds: diagnosis?.reviewedQuestionIds,
        promptVersion: diagnosis?.promptVersion,
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

  useEffect(() => {
    if (!diagnosis?.needsRemediation) {
      navigate(routes.checkIn, { replace: true });
      return;
    }
    if (started.current || runtime.status === "succeeded") return;
    started.current = true;
    if (runtime.jobId && ["queued", "running"].includes(runtime.status)) {
      pollJob(runtime.jobId).catch((requestError) => {
        setError(requestError.message);
        saveRuntime({ status: "failed" });
      });
    } else createClassroom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (runtime.status !== "succeeded" || !runtime.classroomUrl) {
    return (
      <OpenMaicPreparingPage
        lessonTitle={`${lesson.title} · 重点讲解`}
        job={runtime}
        error={error}
        onRetry={createClassroom}
        onBack={() => navigate(routes.checkIn)}
      />
    );
  }

  return (
    <OpenMaicPage
      lesson={{ ...lesson, title: `${lesson.title} · 重点讲解` }}
      runtimeUrl={runtime.classroomUrl}
      runtimeCredentials={
        session.selection?.studentSessionId &&
        session.selection?.classroomAccessToken
          ? {
              sessionId: session.selection.studentSessionId,
              accessToken: session.selection.classroomAccessToken,
            }
          : null
      }
      completeLabel="完成讲解，用新题验证"
      actionLabel="开始验证"
      onComplete={finishRemediation}
    />
  );
}
