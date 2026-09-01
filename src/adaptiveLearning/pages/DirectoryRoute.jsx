import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import DirectoryPage from "../components/DirectoryPage";
import { isPreAssessmentComplete } from "../lib/mastery";
import { routes } from "../routes/routePaths";
import { useNavigate, useSearchParams } from "../routing";
import {
  emptySession,
  useLearningSession,
} from "../session/LearningSessionContext";
import { storageKeys } from "../shared/contracts/storageKeys";
import { course } from "../shared/domain/courseCatalog";
import { isMasteredValue } from "../shared/domain/masteryPolicy";
import { writeJson } from "../shared/infrastructure/browserStorage";
import {
  createSelfStudySession,
  getStudentLearningPeriods,
  getStudentSessionContent,
  startStudentSession,
} from "../shared/infrastructure/classroomApi";
import { flushClassroomOutbox } from "../student/data/classroomSyncRepository";
import { readClassStudentIdentity } from "../student/data/classStudentIdentityRepository";
import { ensureLocalStudentIdentity } from "../student/data/learningHistoryRepository";
import { restorePersistentStudentState } from "../student/data/persistentStudentStateRepository";
import {
  loadPublishedLessonContent,
  mapContentVersionToStudentLesson,
} from "../student/data/publishedLessonRepository";
import { preferUnseenPublishedContent } from "../student/data/seenQuestionRepository";
import { loadSessionSnapshot } from "../student/data/sessionSnapshotRepository";
import {
  clearAllQuizDrafts,
  restoreQuizDrafts,
} from "../student/data/studentSessionRepository";
import {
  activeLearningUnit,
  restoredStudentRoute,
  routeForLearningUnit,
} from "../student/domain/learningPlan";
import {
  buildKnowledgeProgress,
  readPostQuizDraft,
} from "../student/domain/learningProgress";
import { isPreAssessmentProgressEstablished } from "../student/domain/preAssessmentAccess";
import {
  classroomDirectoryItemFromSession,
  mergeStudentClassrooms,
  normalizeStudentClassroomDirectory,
} from "../student/domain/studentClassroomDirectory";

const courseLessons = course.chapters.flatMap((chapter) =>
  chapter.sections.map((section) => ({ chapter, section })),
);
const catalogKnowledgeById = Object.fromEntries(
  courseLessons.flatMap(({ section }) =>
    section.knowledgePoints.map((knowledgePoint) => [
      knowledgePoint.id,
      knowledgePoint,
    ]),
  ),
);

/**
 *
 * @param contentVersion
 * @param publishedLesson
 */
function selectionForPublishedContent(contentVersion, publishedLesson) {
  const content = contentVersion.contentPackage || {};
  const objectiveById = Object.fromEntries(
    (content.knowledgeObjectives || []).map((item) => [item.id, item]),
  );
  if (publishedLesson.planType === "MULTI_LESSON") {
    const sourceLessonIds = publishedLesson.sourceLessons.map(
      (item) => item.textbookLessonId || item.lessonId,
    );
    const sources = sourceLessonIds
      .map((id) => courseLessons.find((item) => item.section.id === id))
      .filter(Boolean);
    const knowledgePoints = (content.knowledgeObjectives || []).map(
      (objective) => ({
        ...catalogKnowledgeById[objective.id],
        ...objective,
      }),
    );
    return {
      chapter: {
        id: "classroom-plan",
        title: sources
          .map((item) => item.chapter.title)
          .filter((value, index, values) => values.indexOf(value) === index)
          .join("·"),
      },
      section: {
        id: contentVersion.textbookLessonId,
        title: publishedLesson.title || content.lesson?.title || "课堂学习",
        knowledgePoints,
      },
      knowledgePoints,
      sourceLessons: publishedLesson.sourceLessons,
      planType: publishedLesson.planType,
      generationPolicy: publishedLesson.generationPolicy,
      questionDistribution: publishedLesson.questionDistribution,
    };
  }
  const lesson = courseLessons.find(
    (item) => item.section.id === contentVersion.textbookLessonId,
  );
  if (!lesson) throw new Error("该课堂对应的教材课时暂未在学生端启用");
  const knowledgePoints = lesson.section.knowledgePoints
    .filter((item) => objectiveById[item.id])
    .map((item) => ({ ...item, ...objectiveById[item.id] }));
  return {
    chapter: lesson.chapter,
    section: lesson.section,
    knowledgePoints:
      knowledgePoints.length > 0
        ? knowledgePoints
        : lesson.section.knowledgePoints,
    generationPolicy: publishedLesson.generationPolicy,
    questionDistribution: publishedLesson.questionDistribution,
  };
}

/**
 *
 * @param states
 */
function authoritativeMasteryFromServer(states = {}) {
  return Object.fromEntries(
    Object.entries(states || {}).map(([knowledgePointId, state]) => {
      const mastery = Number(state.mastery);
      return [
        knowledgePointId,
        {
          id: knowledgePointId,
          mastery: Number.isFinite(mastery) ? mastery : null,
          masterySource: "authoritative",
          status:
            state.masteryStatus === "DETERMINED" && isMasteredValue(mastery)
              ? "mastered"
              : "needs_review",
          confidence: Number(state.confidence || 0),
          evidenceCount: Number(state.evidenceCount || 0),
          updatedAt: state.updatedAt,
          algorithmVersion: state.algorithmVersion,
        },
      ];
    }),
  );
}

/**
 *
 * @param session
 */
function resumeState(session) {
  if (
    !session.selection?.section ||
    !session.selection?.knowledgePoints?.length
  )
    return null;
  const resultIds = Object.entries(session.result || {})
    .filter(([, item]) => Number(item?.evidenceCount ?? item?.total ?? 0) > 0)
    .map(([knowledgePointId]) => knowledgePointId);
  const draft = readPostQuizDraft();
  const learningUnit =
    session.learningFlow?.mode === "direct"
      ? null
      : activeLearningUnit(session.learningFlow);
  const plan = session.learningFlow?.plan;
  const preAssessmentCompleted = isPreAssessmentProgressEstablished(session);
  const planHasNoTargets =
    Array.isArray(plan?.targetKnowledgePointIds) &&
    plan.targetKnowledgePointIds.length === 0;
  const masteryCoversWholeLesson = session.selection.knowledgePoints.every(
    (knowledgePoint) => {
      const item =
        session.preMastery?.[knowledgePoint.id] ||
        session.result?.[knowledgePoint.id];
      return isMasteredValue(item?.mastery);
    },
  );
  const lessonMastered = planHasNoTargets || masteryCoversWholeLesson;
  const currentLessonIndex = courseLessons.findIndex(
    (item) => item.section.id === session.selection.section.id,
  );
  const nextLesson =
    currentLessonIndex >= 0 ? courseLessons[currentLessonIndex + 1] : null;
  const completedPlanKnowledgePointIds = (plan?.units || [])
    .slice(0, plan?.currentIndex || 0)
    .filter((unit) =>
      ["knowledge_checkpoint", "knowledge_verification"].includes(unit.kind),
    )
    .map((unit) => unit.knowledgePointId)
    .filter(Boolean);
  const currentQuestionId = draft.order?.[draft.index];
  const currentQuestion = session.postQuestions?.find(
    (question) => question.id === currentQuestionId,
  );
  const currentKnowledgePointId =
    session.practiceIntervention?.knowledgePointId ||
    learningUnit?.knowledgePointId ||
    currentQuestion?.knowledgePointIds?.[0] ||
    session.selection.knowledgePoints[0]?.id;
  const completedKnowledgePointIds = lessonMastered
    ? session.selection.knowledgePoints.map((item) => item.id)
    : learningUnit
      ? [
          ...new Set([
            ...completedPlanKnowledgePointIds,
            ...(draft.completedKpIds || []),
          ]),
        ]
      : resultIds.length > 0
        ? resultIds
        : draft.completedKpIds || [];
  const items = buildKnowledgeProgress({
    knowledgePoints: session.selection.knowledgePoints,
    preMastery: session.preMastery,
    result: learningUnit ? {} : session.result,
    postQuestions: session.postQuestions,
    postAttempts: draft.attempts || session.postAttempts,
    completedKnowledgePointIds,
    currentKnowledgePointId,
    currentLabel: session.practiceIntervention ? "错题回顾中" : "进行中",
  });

  if (session.practiceIntervention) {
    return {
      phase: "错题回顾",
      actionLabel: "继续回顾",
      route: routes.checkIn,
      items,
      lessonId: session.selection.section.id,
      preAssessmentCompleted,
    };
  }
  if (lessonMastered && nextLesson) {
    return {
      phase: "本课已掌握",
      actionLabel: "继续学习下一课",
      route: "",
      nextLessonId: nextLesson.section.id,
      items,
      lessonId: session.selection.section.id,
      preAssessmentCompleted,
    };
  }
  if (learningUnit) {
    const isLearning = ["composite_learning", "knowledge_learning"].includes(
      learningUnit.kind,
    );
    return {
      phase: isLearning
        ? "互动学习"
        : learningUnit.kind === "composite_review"
          ? "综合练习"
          : "知识点练习",
      actionLabel: "继续学习",
      route: routeForLearningUnit(learningUnit, routes.complete),
      items,
      lessonId: session.selection.section.id,
      preAssessmentCompleted,
    };
  }
  if (resultIds.length > 0) {
    return {
      phase: "本课已完成",
      actionLabel: "查看学习结果",
      route: routes.complete,
      items,
      lessonId: session.selection.section.id,
      preAssessmentCompleted,
    };
  }
  const adaptivePreAssessmentComplete = Boolean(
    session.preAssessment?.completedAt,
  );
  if (
    adaptivePreAssessmentComplete ||
    isPreAssessmentComplete(session.preQuestions, session.preAttempts)
  ) {
    return {
      phase: "课前小测完成",
      actionLabel: "查看学习重点",
      route: routes.preResult,
      items,
      lessonId: session.selection.section.id,
      preAssessmentCompleted,
    };
  }
  if (session.preQuestions?.length) {
    return {
      phase: "课前小测",
      actionLabel: "继续小测",
      route: routes.preAssessment,
      items,
      lessonId: session.selection.section.id,
      preAssessmentCompleted,
    };
  }
  return null;
}

/**
 *
 */
export default function DirectoryRoute() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session, setSession } = useLearningSession();
  const [entryState, setEntryState] = useState({ loading: false, error: "" });
  const [restoreState, setRestoreState] = useState(() => ({
    loading: Boolean(readClassStudentIdentity()?.accessToken),
    error: "",
  }));
  const [classroomState, setClassroomState] = useState({
    status: "loading",
    items: [],
    message: "",
  });
  const [classroomReload, setClassroomReload] = useState(0);
  const entryStarted = useRef(false);
  const sessionAtDirectoryEntry = useRef(session);
  const progress = resumeState(session);

  const activeClassroom = useMemo(
    () => classroomDirectoryItemFromSession(session),
    [session],
  );
  const classroomItems = useMemo(
    () => mergeStudentClassrooms(classroomState.items, activeClassroom),
    [activeClassroom, classroomState.items],
  );
  const directoryMode =
    searchParams.get("view") === "classroom" || searchParams.has("periodId")
      ? "classroom"
      : "textbook";
  const selectedClassroomId =
    searchParams.get("classroomId") ||
    searchParams.get("periodId") ||
    activeClassroom?.id ||
    "";
  const classStudentIdentity = readClassStudentIdentity();

  useEffect(() => {
    const accessToken = classStudentIdentity?.accessToken || "";
    if (!accessToken) {
      setRestoreState({ loading: false, error: "" });
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setRestoreState({ loading: true, error: "" });
    restorePersistentStudentState(accessToken, {
      signal: controller.signal,
      currentSession: sessionAtDirectoryEntry.current,
    })
      .then((restored) => {
        if (cancelled) return;
        if (restored.resetLocalSession) setSession(emptySession);
        else if (restored.session) setSession(restored.session);
        setRestoreState({ loading: false, error: "" });
      })
      .catch((error) => {
        if (cancelled || error.name === "AbortError") return;
        setRestoreState({
          loading: false,
          error: error.message || "学习进度恢复失败，请刷新重试",
        });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [classStudentIdentity?.accessToken, setSession]);

  const enterClassroom = useCallback(
    async (periodId, accessToken) => {
      if (!periodId || !accessToken)
        throw new Error("该课堂缺少进入凭证，请从老师发布的课堂入口进入");
      const serverSession = await startStudentSession(periodId, accessToken);
      const credentials = { sessionId: serverSession.id, accessToken };
      const [{ contentVersion, masteryStates }, snapshot] = await Promise.all([
        getStudentSessionContent(serverSession.id, accessToken),
        loadSessionSnapshot(credentials),
      ]);
      if (snapshot.hydrated?.session) {
        restoreQuizDrafts(snapshot.hydrated.drafts);
        writeJson(
          storageKeys.knowledgeProfile,
          snapshot.hydrated.knowledgeProfile || {},
        );
        writeJson(
          storageKeys.studentLearningHistory,
          snapshot.hydrated.learningHistory || [],
        );
        setSession({
          ...snapshot.hydrated.session,
          selection: {
            ...snapshot.hydrated.session.selection,
            questionDistribution:
              contentVersion.contentPackage?.questionDistribution || null,
          },
        });
        await flushClassroomOutbox();
        const safeRoute = restoredStudentRoute(
          snapshot.hydrated.route,
          snapshot.hydrated.session.learningFlow,
          routes.preAssessment,
        );
        navigate(safeRoute, { replace: true });
        return;
      }
      const publishedLesson = preferUnseenPublishedContent(
        mapContentVersionToStudentLesson(contentVersion),
        serverSession.studentId,
      );
      const selection = selectionForPublishedContent(
        contentVersion,
        publishedLesson,
      );
      clearAllQuizDrafts();
      setSession({
        ...emptySession,
        selection: {
          ...selection,
          contentVersion: contentVersion.versionNumber,
          contentVersionId: contentVersion.id,
          contentStatus: "published",
          learningPeriodId: periodId,
          studentSessionId: serverSession.id,
          studentId: serverSession.studentId,
          studentName: serverSession.studentName,
          classroomAccessToken: accessToken,
          startedAt: serverSession.startedAt,
          endsAt: serverSession.endsAt,
          authoritativeMastery: authoritativeMasteryFromServer(masteryStates),
        },
        preQuestions: publishedLesson.preQuestions,
        postQuestions: publishedLesson.postQuestions,
        publishedContent: {
          learningContent: publishedLesson.learningContent,
          knowledgePracticePools: publishedLesson.knowledgePracticePools,
          compositeReviewPool: publishedLesson.compositeReviewPool,
        },
      });
      await flushClassroomOutbox();
      navigate(routes.preAssessment, { replace: true });
    },
    [navigate, setSession],
  );

  useEffect(() => {
    const controller = new AbortController();
    const accessToken =
      searchParams.get("accessToken") ||
      classStudentIdentity?.accessToken ||
      activeClassroom?.accessToken;
    if (!accessToken) {
      setClassroomState({ status: "unavailable", items: [], message: "" });
      return () => controller.abort();
    }
    setClassroomState((current) => ({
      ...current,
      status: "loading",
      message: "",
    }));
    getStudentLearningPeriods(accessToken, { signal: controller.signal })
      .then((payload) => {
        const items = normalizeStudentClassroomDirectory(payload, course).map(
          (item) => ({
            ...item,
            accessToken: item.accessToken || accessToken,
          }),
        );
        setClassroomState({ status: "ready", items, message: "" });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        const unavailable = [401, 403, 404, 405, 501].includes(error.status);
        setClassroomState({
          status: unavailable ? "unavailable" : "error",
          items: [],
          message: unavailable ? "" : error.message || "请稍后重试",
        });
      });
    return () => controller.abort();
  }, [
    activeClassroom?.accessToken,
    classStudentIdentity?.accessToken,
    classroomReload,
    searchParams,
  ]);

  useEffect(() => {
    const periodId = searchParams.get("periodId");
    const accessToken = searchParams.get("accessToken");
    if (!periodId || !accessToken || entryStarted.current) return;
    entryStarted.current = true;
    setEntryState({ loading: true, error: "" });
    enterClassroom(periodId, accessToken).catch((error) => {
      entryStarted.current = false;
      setEntryState({ loading: false, error: error.message });
    });
  }, [enterClassroom, searchParams]);

  const updateDirectoryQuery = (mode, classroomId) => {
    const next = new URLSearchParams(searchParams);
    if (mode === "classroom") next.set("view", "classroom");
    else {
      next.delete("view");
      next.delete("classroomId");
      next.delete("periodId");
      next.delete("accessToken");
    }
    if (classroomId) next.set("classroomId", classroomId);
    setSearchParams(next, { replace: true });
  };

  const openClassroom = (classroom) => {
    if (
      classroom.id === session.selection?.learningPeriodId &&
      classroom.studentSessionId
    ) {
      navigate(progress?.route || routes.preAssessment);
      return;
    }
    setEntryState({ loading: true, error: "" });
    enterClassroom(classroom.periodId, classroom.accessToken).catch((error) => {
      setEntryState({ loading: false, error: error.message });
    });
  };

  const start = async (selection) => {
    clearAllQuizDrafts();
    setEntryState({ loading: true, error: "" });
    const fixedIdentity = readClassStudentIdentity();
    const localStudent = fixedIdentity || ensureLocalStudentIdentity();
    let serverSession = null;
    let authoritativeMastery = {};
    let published;
    if (fixedIdentity) {
      try {
        serverSession = await createSelfStudySession(
          selection.section.id,
          fixedIdentity.accessToken,
        );
        const serverContent = await getStudentSessionContent(
          serverSession.id,
          fixedIdentity.accessToken,
        );
        published = mapContentVersionToStudentLesson(
          serverContent.contentVersion,
        );
        authoritativeMastery = authoritativeMasteryFromServer(
          serverContent.masteryStates,
        );
        const snapshot = await loadSessionSnapshot({
          sessionId: serverSession.id,
          accessToken: fixedIdentity.accessToken,
        });
        if (snapshot.hydrated?.session) {
          restoreQuizDrafts(snapshot.hydrated.drafts);
          writeJson(
            storageKeys.knowledgeProfile,
            snapshot.hydrated.knowledgeProfile || {},
          );
          writeJson(
            storageKeys.studentLearningHistory,
            snapshot.hydrated.learningHistory || [],
          );
          setSession({
            ...snapshot.hydrated.session,
            selection: {
              ...snapshot.hydrated.session.selection,
              questionDistribution: published.questionDistribution,
            },
          });
          await flushClassroomOutbox();
          const safeRoute = restoredStudentRoute(
            snapshot.hydrated.route,
            snapshot.hydrated.session.learningFlow,
            routes.preAssessment,
          );
          setEntryState({ loading: false, error: "" });
          navigate(safeRoute, { replace: true });
          return;
        }
      } catch (error) {
        setEntryState({
          loading: false,
          error: error.message || "自主学习任务创建失败，请稍后重试",
        });
        return;
      }
    } else {
      published = await loadPublishedLessonContent(selection.section.id);
    }
    if (!published) {
      setEntryState({ loading: false, error: "这个课时还没有发布学习内容" });
      return;
    }
    const unseenPublished = preferUnseenPublishedContent(
      published,
      localStudent.studentId || localStudent.id,
    );
    const publishedObjectiveById = Object.fromEntries(
      (unseenPublished.knowledgeObjectives || []).map((objective) => [
        objective.id,
        objective,
      ]),
    );
    const publishedKnowledgePoints = selection.section.knowledgePoints
      .filter((knowledgePoint) => publishedObjectiveById[knowledgePoint.id])
      .map((knowledgePoint) => ({
        ...knowledgePoint,
        ...publishedObjectiveById[knowledgePoint.id],
      }));
    const selectedKnowledgePoints = selection.knowledgePoints
      .filter((knowledgePoint) => publishedObjectiveById[knowledgePoint.id])
      .map((knowledgePoint) => ({
        ...knowledgePoint,
        ...publishedObjectiveById[knowledgePoint.id],
      }));
    const availableKnowledgePoints =
      selectedKnowledgePoints.length > 0
        ? selectedKnowledgePoints
        : publishedKnowledgePoints;
    if (availableKnowledgePoints.length === 0) {
      setEntryState({
        loading: false,
        error: "这个课时的已发布内容与当前教材知识点不匹配，请联系老师重新发布",
      });
      return;
    }
    setSession({
      ...emptySession,
      selection: {
        ...selection,
        knowledgePoints: availableKnowledgePoints,
        contentVersion: published.version,
        contentVersionId: published.versionId,
        contentStatus: "published",
        generationPolicy: unseenPublished.generationPolicy,
        questionDistribution: unseenPublished.questionDistribution,
        learningPeriodId: serverSession?.learningPeriodId,
        studentSessionId: serverSession?.id || `student-session-${Date.now()}`,
        studentId:
          serverSession?.studentId || localStudent.studentId || localStudent.id,
        studentName:
          serverSession?.studentName ||
          fixedIdentity?.studentName ||
          "当前学生（本机）",
        classroomAccessToken: fixedIdentity?.accessToken,
        startedAt: serverSession?.startedAt || new Date().toISOString(),
        endsAt: serverSession?.endsAt,
        authoritativeMastery,
      },
      preQuestions: unseenPublished.preQuestions || [],
      postQuestions: unseenPublished.postQuestions || [],
      publishedContent: {
        learningContent: unseenPublished.learningContent,
        knowledgePracticePools: unseenPublished.knowledgePracticePools,
        compositeReviewPool: unseenPublished.compositeReviewPool,
      },
    });
    setEntryState({ loading: false, error: "" });
    navigate(routes.preAssessment);
  };

  return (
    <>
      {restoreState.loading && (
        <div className="classroom-entry-status" role="status">
          正在恢复学习进度…
        </div>
      )}
      {entryState.loading && (
        <div className="classroom-entry-status" role="status">
          正在进入课堂…
        </div>
      )}
      {restoreState.error && (
        <div className="classroom-entry-status error" role="alert">
          {restoreState.error}
        </div>
      )}
      {entryState.error && (
        <div className="classroom-entry-status error" role="alert">
          {entryState.error}
        </div>
      )}
      {!restoreState.loading && (
        <DirectoryPage
          course={course}
          progress={
            progress
              ? { ...progress, lessonTitle: session.selection.section.title }
              : null
          }
          directoryMode={directoryMode}
          classroomDirectory={{ ...classroomState, items: classroomItems }}
          selectedClassroomId={selectedClassroomId}
          onModeChange={(mode) => updateDirectoryQuery(mode)}
          onSelectClassroom={(classroomId) =>
            updateDirectoryQuery("classroom", classroomId)
          }
          onRetryClassrooms={() => setClassroomReload((value) => value + 1)}
          onEnterClassroom={openClassroom}
          onContinue={() => {
            if (!progress) return;
            if (progress.nextLessonId) {
              const lesson = courseLessons.find(
                (item) => item.section.id === progress.nextLessonId,
              );
              if (lesson) {
                start({
                  chapter: lesson.chapter,
                  section: lesson.section,
                  knowledgePoints: lesson.section.knowledgePoints,
                });
                return;
              }
            }
            navigate(progress.route || routes.complete);
          }}
          onOpenKnowledgeMap={() => navigate(routes.knowledgeMap)}
          onLearnKnowledge={(knowledgePointId) =>
            navigate(
              `${routes.knowledgeLearning(knowledgePointId)}?returnTo=${encodeURIComponent(routes.directory)}`,
            )
          }
          onStart={start}
          localExperience={!classStudentIdentity}
          busy={entryState.loading || restoreState.loading}
        />
      )}
    </>
  );
}
