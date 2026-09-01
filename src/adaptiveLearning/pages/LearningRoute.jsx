import React, { useEffect, useMemo, useState } from "react";

import LearningResourceStatePage from "../components/LearningResourceStatePage";
import OpenMaicPage from "../components/OpenMaicPage";
import { createOpenMaicClassroom } from "../lib/openMaicApi";
import { routes } from "../routes/routePaths";
import { Navigate, useNavigate, useParams, useSearchParams } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import { course } from "../shared/domain/courseCatalog";
import {
  markKnowledgePointLearned,
  readKnowledgeProfile,
} from "../student/data/knowledgeProfileRepository";
import { recordLearningEvent } from "../student/data/learningEventRepository";
import {
  readLearningAttempts,
  readLocalStudentIdentity,
} from "../student/data/learningHistoryRepository";
import { loadPublishedLessonContent } from "../student/data/publishedLessonRepository";
import { preferUnseenQuestions } from "../student/data/seenQuestionRepository";
import {
  activeLearningUnit,
  advanceLessonFlow,
  finishTemporaryLearning,
  routeForLearningUnit,
  startDirectLearning,
} from "../student/domain/learningPlan";

/**
 *
 * @param knowledgePointId
 */
function findKnowledgeContext(knowledgePointId) {
  for (const chapter of course.chapters) {
    for (const section of chapter.sections) {
      const knowledgePoint = section.knowledgePoints.find(
        (item) => item.id === knowledgePointId,
      );
      if (knowledgePoint) return { chapter, section, knowledgePoint };
    }
  }
  return null;
}

/**
 *
 * @param content
 * @param unit
 */
function runtimeForUnit(content, unit) {
  if (unit?.kind === "composite_learning")
    return content?.learningContent?.composite || null;
  if (unit?.kind === "knowledge_learning") {
    return (
      content?.learningContent?.knowledgePoints?.find(
        (item) => item.knowledgeObjectiveId === unit.knowledgePointId,
      )?.openMaic || null
    );
  }
  return null;
}

/**
 *
 * @param published
 * @param directContext
 * @param studentScope
 */
function createDirectContext(published, directContext, studentScope = "") {
  const objectiveById = Object.fromEntries(
    published.knowledgeObjectives.map((item) => [item.id, item]),
  );
  const knowledgePoints = directContext.section.knowledgePoints
    .filter((item) => objectiveById[item.id])
    .map((item) => ({ ...item, ...objectiveById[item.id] }));
  const profile = readKnowledgeProfile();
  const preMastery = Object.fromEntries(
    knowledgePoints.map((knowledgePoint) => [
      knowledgePoint.id,
      profile[knowledgePoint.id] || {},
    ]),
  );
  const recentAttemptsByKnowledgePoint = Object.fromEntries(
    knowledgePoints.map((knowledgePoint) => [
      knowledgePoint.id,
      studentScope
        ? readLearningAttempts({
            studentId: studentScope,
            knowledgePointId: knowledgePoint.id,
          }).slice(0, 10)
        : [],
    ]),
  );
  const knowledgePracticePools = Object.fromEntries(
    Object.entries(published.knowledgePracticePools || {}).map(
      ([knowledgePointId, questions]) => [
        knowledgePointId,
        preferUnseenQuestions(questions || [], studentScope),
      ],
    ),
  );
  return {
    selection: {
      chapter: directContext.chapter,
      section: directContext.section,
      knowledgePoints,
      contentVersion: published.version,
      contentVersionId: published.versionId,
      contentStatus: "published",
      studentSessionId: `direct-learning-${Date.now()}`,
      studentId: studentScope,
      startedAt: new Date().toISOString(),
    },
    preQuestions: published.preQuestions,
    postQuestions: preferUnseenQuestions(
      published.postQuestions || [],
      studentScope,
    ),
    preMastery,
    recentAttemptsByKnowledgePoint,
    postAttempts: {},
    result: {},
    publishedContent: {
      learningContent: published.learningContent,
      knowledgePracticePools,
      compositeReviewPool: published.compositeReviewPool,
    },
  };
}

/**
 *
 * @param error
 * @param fallback
 */
function readableResourceError(error, fallback) {
  const original = String(error?.message || "").trim();
  if (original === "Failed to fetch" || error instanceof TypeError) {
    return "无法连接学习内容服务（网络请求失败）";
  }
  return original || fallback;
}

/**
 *
 */
export default function LearningRoute() {
  const navigate = useNavigate();
  const { knowledgePointId } = useParams();
  const [searchParams] = useSearchParams();
  const { session, setSession } = useLearningSession();
  const [loadingError, setLoadingError] = useState("");
  const [contentLoadAttempt, setContentLoadAttempt] = useState(0);
  const [preparedRuntime, setPreparedRuntime] = useState(null);
  const [runtimeResolution, setRuntimeResolution] = useState("idle");
  const [runtimeError, setRuntimeError] = useState("");
  const [runtimeLoadAttempt, setRuntimeLoadAttempt] = useState(0);
  const directContext = useMemo(
    () => (knowledgePointId ? findKnowledgeContext(knowledgePointId) : null),
    [knowledgePointId],
  );
  const requestedReturnTo = searchParams.get("returnTo");
  const studentScope =
    session.selection?.studentId || readLocalStudentIdentity()?.id || "";
  const directReturnTo = [
    routes.directory,
    routes.knowledgeMap,
    routes.preResult,
    routes.postAssessment,
  ].includes(requestedReturnTo)
    ? requestedReturnTo
    : routes.knowledgeMap;
  const flow = session.learningFlow;
  const context = flow?.context || session;
  const directPending =
    Boolean(knowledgePointId) &&
    !(
      flow?.mode === "direct" &&
      flow.activeUnit?.knowledgePointId === knowledgePointId
    );
  const unit = directPending
    ? {
        id: `direct-learn-${knowledgePointId}`,
        kind: "knowledge_learning",
        knowledgePointId,
      }
    : activeLearningUnit(flow);
  const selection =
    directPending &&
    session.selection?.section?.id !== directContext?.section.id
      ? null
      : context.selection;
  const lesson =
    directPending && directContext
      ? {
          id: directContext.section.id,
          title: directContext.section.title,
          chapterTitle: directContext.chapter.title,
        }
      : selection?.section
        ? {
            id: selection.section.id,
            title: selection.section.title,
            chapterTitle: selection.chapter.title,
          }
        : { id: "", title: "知识点学习", chapterTitle: "" };
  const currentKnowledgePoint = directPending
    ? directContext?.knowledgePoint
    : selection?.knowledgePoints?.find(
        (item) => item.id === unit?.knowledgePointId,
      );
  const publishedRuntime = runtimeForUnit(context.publishedContent, unit);
  const runtime =
    publishedRuntime?.classroomUrl && publishedRuntime.status === "READY"
      ? publishedRuntime
      : preparedRuntime;

  useEffect(() => {
    if (!directContext) return;
    if (
      flow?.mode === "direct" &&
      flow.activeUnit?.knowledgePointId === directContext.knowledgePoint.id
    )
      return;
    let active = true;
    setLoadingError("");
    loadPublishedLessonContent(directContext.section.id)
      .then((published) => {
        if (!active) return;
        if (!published) throw new Error("老师还没有发布这个知识点的学习内容");
        const sameLesson =
          session.selection?.section?.id === directContext.section.id &&
          session.publishedContent;
        const loadedContext = sameLesson
          ? null
          : createDirectContext(published, directContext, studentScope);
        setSession((current) => ({
          ...current,
          learningFlow: startDirectLearning(
            current.learningFlow,
            directContext.knowledgePoint.id,
            loadedContext,
            directReturnTo,
          ),
        }));
      })
      .catch((error) => {
        if (active)
          setLoadingError(
            readableResourceError(error, "暂时无法读取老师发布的学习内容"),
          );
      });
    return () => {
      active = false;
    };
  }, [
    contentLoadAttempt,
    directContext,
    directReturnTo,
    flow?.mode,
    flow?.activeUnit?.knowledgePointId,
    session.selection?.section?.id,
    session.publishedContent,
    setSession,
    studentScope,
  ]);

  useEffect(() => {
    setPreparedRuntime(null);
    setRuntimeResolution("idle");
    setRuntimeError("");
  }, [unit?.id]);

  useEffect(() => {
    if (
      !unit ||
      !["composite_learning", "knowledge_learning"].includes(unit.kind)
    )
      return;
    if (publishedRuntime?.classroomUrl && publishedRuntime.status === "READY") {
      setRuntimeResolution("ready");
      setRuntimeError("");
      return;
    }
    const knowledgePoints =
      unit.kind === "composite_learning"
        ? selection?.knowledgePoints || []
        : currentKnowledgePoint
          ? [currentKnowledgePoint]
          : [];
    if (!lesson.id || knowledgePoints.length === 0) return;
    let active = true;
    setRuntimeResolution("loading");
    setRuntimeError("");
    createOpenMaicClassroom({
      lesson,
      knowledgePoints,
      generationMode: "deep",
      cacheOnly: true,
      teacherInstruction: "",
    })
      .then((response) => {
        if (!active) return;
        if (
          response.status !== "succeeded" ||
          !response.result?.classroomId ||
          !response.result?.url
        ) {
          const preparingMessage =
            response.status === "running"
              ? `互动课堂正在准备中${Number.isFinite(response.progress) ? `，当前进度 ${response.progress}%` : ""}`
              : "互动课堂尚未准备完成";
          setRuntimeError(response.message || preparingMessage);
          setRuntimeResolution("missing");
          return;
        }
        setPreparedRuntime({
          status: "READY",
          classroomId: response.result.classroomId,
          classroomUrl: response.result.url,
          scenesCount: response.result.scenesCount,
        });
        setRuntimeResolution("ready");
      })
      .catch((error) => {
        if (!active) return;
        setRuntimeError(
          readableResourceError(error, "暂时无法读取互动学习资源"),
        );
        setRuntimeResolution("missing");
      });
    return () => {
      active = false;
    };
  }, [
    currentKnowledgePoint,
    lesson.id,
    lesson.title,
    lesson.chapterTitle,
    publishedRuntime?.classroomUrl,
    publishedRuntime?.status,
    runtimeLoadAttempt,
    selection?.knowledgePoints,
    unit?.id,
    unit?.kind,
    unit?.knowledgePointId,
  ]);

  useEffect(() => {
    if (!unit || !runtime?.classroomId) return;
    recordLearningEvent({
      type: "stage_entered",
      stage: unit.kind,
      lessonTitle: lesson.title,
      knowledgePointId: unit.knowledgePointId || "",
      classroomId: runtime.classroomId,
    });
  }, [
    unit?.id,
    unit?.kind,
    unit?.knowledgePointId,
    runtime?.classroomId,
    lesson.title,
  ]);

  if (
    !unit ||
    !["composite_learning", "knowledge_learning"].includes(unit.kind)
  ) {
    return (
      <Navigate to={routeForLearningUnit(unit, routes.complete)} replace />
    );
  }

  const statePageTitle = currentKnowledgePoint?.name || lesson.title;
  const returnToLearningList = () =>
    navigate(directPending ? directReturnTo : routes.directory);

  if (knowledgePointId && !directContext) {
    return (
      <LearningResourceStatePage
        lessonTitle="知识点学习"
        state="invalid"
        reason="当前课程目录中不存在这个知识点"
        onBack={() => navigate(directReturnTo)}
      />
    );
  }

  if (directPending && loadingError) {
    const unpublished = loadingError === "老师还没有发布这个知识点的学习内容";
    return (
      <LearningResourceStatePage
        lessonTitle={statePageTitle}
        state={unpublished ? "unpublished" : "unavailable"}
        reason={
          unpublished
            ? `老师还没有发布「${statePageTitle}」的学习内容`
            : loadingError
        }
        onRetry={() => setContentLoadAttempt((value) => value + 1)}
        onBack={returnToLearningList}
      />
    );
  }

  if (
    directPending ||
    runtimeResolution === "idle" ||
    runtimeResolution === "loading"
  ) {
    return (
      <LearningResourceStatePage
        lessonTitle={statePageTitle}
        state="loading"
        onBack={returnToLearningList}
      />
    );
  }

  if (runtimeResolution === "missing") {
    return (
      <LearningResourceStatePage
        lessonTitle={statePageTitle}
        state="unavailable"
        reason={runtimeError || "互动课堂尚未准备完成"}
        onRetry={() => setRuntimeLoadAttempt((value) => value + 1)}
        onBack={returnToLearningList}
      />
    );
  }

  if (!runtime?.classroomUrl || runtime.status !== "READY") {
    return (
      <LearningResourceStatePage
        lessonTitle={statePageTitle}
        state="unavailable"
        reason="学习资源状态异常，暂时无法打开"
        onRetry={() => setRuntimeLoadAttempt((value) => value + 1)}
        onBack={returnToLearningList}
      />
    );
  }

  const complete = () => {
    recordLearningEvent({
      type: "openmaic_completed",
      progress: 100,
      classroomId: runtime.classroomId,
      lessonTitle: lesson.title,
      knowledgePointId: unit.knowledgePointId || "",
      review: flow?.mode === "direct",
    });
    if (flow?.mode === "direct") {
      const returnTo = flow.returnTo || routes.knowledgeMap;
      markKnowledgePointLearned(
        currentKnowledgePoint,
        selection?.section?.id || "",
      );
      setSession((current) => ({
        ...current,
        learningFlow: finishTemporaryLearning(current.learningFlow),
      }));
      navigate(returnTo);
      return;
    }
    if (flow?.mode === "relearn") {
      setSession((current) => ({
        ...current,
        learningFlow: finishTemporaryLearning(current.learningFlow),
      }));
      navigate(routes.postAssessment);
      return;
    }
    const nextFlow = advanceLessonFlow(flow);
    const nextUnit = activeLearningUnit(nextFlow);
    setSession((current) => ({ ...current, learningFlow: nextFlow }));
    navigate(routeForLearningUnit(nextUnit, routes.complete));
  };

  return (
    <OpenMaicPage
      lesson={{ ...lesson, title: currentKnowledgePoint?.name || lesson.title }}
      runtimeUrl={runtime.classroomUrl}
      runtimeCredentials={
        selection?.studentSessionId && selection?.classroomAccessToken
          ? {
              sessionId: selection.studentSessionId,
              accessToken: selection.classroomAccessToken,
            }
          : null
      }
      completeLabel={
        flow?.mode === "direct"
          ? "完成学习并返回"
          : unit.kind === "knowledge_learning"
            ? "完成学习，开始练习"
            : "完成学习，逐点练习"
      }
      actionLabel={
        flow?.mode === "direct"
          ? "完成学习"
          : unit.kind === "knowledge_learning"
            ? "开始练习"
            : "逐点练习"
      }
      onRuntimeEvent={(event) => {
        recordLearningEvent({
          type: `openmaic_${event.type}`,
          classroomId: runtime.classroomId,
          sceneId: event.sceneId || "",
          progress: event.progress,
          lessonTitle: lesson.title,
          knowledgePointId: unit.knowledgePointId || "",
        });
      }}
      onComplete={complete}
    />
  );
}
