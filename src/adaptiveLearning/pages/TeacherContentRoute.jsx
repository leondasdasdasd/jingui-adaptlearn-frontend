/* eslint-disable complexity, sonarjs/cognitive-complexity, promise/always-return, promise/catch-or-return -- 路由组件集中装配单一内容工作流，并恢复可并行的持久化生成任务。 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate, useParams, useSearchParams } from "../routing";
import { course, findLessonById } from "../shared/domain/courseCatalog";
import { createDefaultContent } from "../shared/domain/defaultLessonContent";
import { createTeacherContentAgentActions } from "../teacher/content-route/createTeacherContentAgentActions";
import { createTeacherContentGenerationActions } from "../teacher/content-route/createTeacherContentGenerationActions";
import { createTeacherContentLifecycleActions } from "../teacher/content-route/createTeacherContentLifecycleActions";
import { createTeacherContentQuestionActions } from "../teacher/content-route/createTeacherContentQuestionActions";
import { createTeacherContentRuntimeActions } from "../teacher/content-route/createTeacherContentRuntimeActions";
import { projectTeacherAssessmentScope } from "../teacher/content-route/teacherAssessmentViewModel";
import { isGenerationCancelled } from "../teacher/content-route/teacherContentRouteSupport";
import TeacherContentView from "../teacher/content-route/TeacherContentView";
import { useTeacherContentSynchronization } from "../teacher/content-route/useTeacherContentSynchronization";
import { readTeacherContent } from "../teacher/data/teacherContentRepository";
import { publishedVersionToTeacherContent } from "../teacher/domain/publishedVersionView";
import { applyStyleSampleKnowledgeClassrooms } from "../teacher/domain/styleComparisonClassrooms";

/** 教师内容工作台路由。 */
export default function TeacherContentRoute() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = searchParams.get("tab");
  const lesson = useMemo(() => findLessonById(lessonId), [lessonId]);
  const [allContent, setAllContent] = useState(readTeacherContent);
  const [selectedKpId, setSelectedKpId] = useState(() =>
    initialTab === "comprehensive"
      ? "composite"
      : lesson.knowledgePoints[0]?.id || "composite",
  );
  const [activeSectionTab, setActiveSectionTab] = useState("matrix");

  useEffect(() => {
    if (
      selectedKpId !== "composite" &&
      !lesson.knowledgePoints.some((kp) => kp.id === selectedKpId)
    ) {
      setSelectedKpId(lesson.knowledgePoints[0]?.id || "composite");
    }
  }, [lesson.knowledgePoints, selectedKpId]);
  const [notice, setNotice] = useState("");
  const [openMaicJob, setOpenMaicJob] = useState(null);
  const [activeLearningScope] = useState("composite");
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewFrameState, setPreviewFrameState] = useState("loading");
  const [previewFrameKey, setPreviewFrameKey] = useState(0);
  const previewRef = useRef(null);
  const resumedJobs = useRef(new Set());
  const activeOpenMaicJobsRef = useRef(new Map());
  const generationRunRef = useRef(0);
  const generationAbortRef = useRef(null);
  const questionPoolAbortRef = useRef(null);
  const generationStartedAtRef = useRef(0);
  const [questionGeneration, setQuestionGeneration] = useState({
    mode: "",
    scope: "",
    status: null,
    error: "",
  });
  const [teacherAgent, setTeacherAgent] = useState({
    open: false,
    scope: "whole",
  });
  const teacherAgentReturnFocusRef = useRef(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedVersions, setPublishedVersions] = useState([]);
  const [selectedPublishedVersionId, setSelectedPublishedVersionId] =
    useState("");

  const [lessonGeneration, setLessonGeneration] = useState({
    phase: "idle",
    message: "",
    moduleStatuses: {},
    moduleProgress: {},
    issues: [],
    repairRound: 0,
  });
  const [backendGenerationRun, setBackendGenerationRun] = useState(null);
  const [backendRunChecked, setBackendRunChecked] = useState(false);
  const [backendPollRevision, setBackendPollRevision] = useState(0);
  const [loadedLessonId, setLoadedLessonId] = useState("");
  const recoveredLesson = useRef("");
  const defaultContent = createDefaultContent()["section-1-1"];
  const editableBase = allContent[lesson.id] || {
    ...defaultContent,
    lessonId: lesson.id,
    preQuestions: [],
    postQuestions: [],
    version: 1,
    status: "draft",
  };
  const sortedPublishedVersions = useMemo(
    () =>
      [...publishedVersions].sort(
        (left, right) =>
          Number(right.versionNumber || 0) - Number(left.versionNumber || 0),
      ),
    [publishedVersions],
  );
  const latestPublishedVersion = sortedPublishedVersions[0] || null;
  const selectedPublishedVersion =
    sortedPublishedVersions.find(
      (version) => version.id === selectedPublishedVersionId,
    ) || latestPublishedVersion;
  const viewingHistoricalVersion = Boolean(
    selectedPublishedVersionId &&
    latestPublishedVersion &&
    selectedPublishedVersion?.id !== latestPublishedVersion.id,
  );
  const base = viewingHistoricalVersion
    ? publishedVersionToTeacherContent(selectedPublishedVersion, editableBase)
    : editableBase;
  const activeGenerationStatuses = new Set([
    "queued",
    "running",
    "quality_check",
    "repairing",
  ]);
  const contentMutationLocked = Boolean(
    viewingHistoricalVersion ||
    (backendGenerationRun?.runId &&
      activeGenerationStatuses.has(backendGenerationRun.status)) ||
    (!backendRunChecked &&
      base.generationStatus?.runId &&
      activeGenerationStatuses.has(base.generationStatus.phase)),
  );
  const storedLearningContent = base.learningContent || {
    composite: base.openMaic || null,
    knowledgePoints: [],
  };
  const rawLearningContent = applyStyleSampleKnowledgeClassrooms(
    lesson.id,
    storedLearningContent,
  );
  const learningContent = {
    composite: rawLearningContent?.composite || null,
    knowledgePoints: rawLearningContent?.knowledgePoints || [],
  };
  const runtime =
    activeLearningScope === "composite"
      ? learningContent.composite
      : (learningContent.knowledgePoints || []).find(
          (item) => item.knowledgeObjectiveId === activeLearningScope,
        )?.openMaic;
  useEffect(() => {
    if (!runtime?.classroomUrl) {
      setPreviewFrameState("idle");
      return;
    }
    setPreviewFrameState("loading");
    const timer = window.setTimeout(() => {
      setPreviewFrameState((current) =>
        current === "loading" ? "slow" : current,
      );
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [activeLearningScope, previewFrameKey, runtime?.classroomUrl]);
  const openTeacherAgent = useCallback((scope = "whole", trigger = null) => {
    teacherAgentReturnFocusRef.current = trigger || document.activeElement;
    setTeacherAgent({ open: true, scope });
  }, []);
  const closeTeacherAgent = useCallback(() => {
    setTeacherAgent((current) => ({ ...current, open: false }));
    window.requestAnimationFrame(() =>
      teacherAgentReturnFocusRef.current?.focus?.(),
    );
  }, []);
  useEffect(() => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    questionPoolAbortRef.current?.abort();
    questionPoolAbortRef.current = null;
    generationStartedAtRef.current = 0;
    generationRunRef.current += 1;
    resumedJobs.current.clear();
    activeOpenMaicJobsRef.current.clear();
    const persistedInspection =
      readTeacherContent()[lesson.id]?.inspectionStatus;
    setLessonGeneration(
      persistedInspection?.inspectedAt
        ? {
            phase:
              readTeacherContent()[lesson.id]?.status === "published"
                ? "published"
                : "dirty",
            message: persistedInspection.message || "",
            moduleStatuses: {},
            moduleProgress: {},
            issues: persistedInspection.issues || [],
            repairRound: 0,
            inspectedAt: persistedInspection.inspectedAt,
          }
        : {
            phase: "idle",
            message: "",
            moduleStatuses: {},
            moduleProgress: {},
            issues: [],
            repairRound: 0,
          },
    );
    setBackendGenerationRun(null);
    setBackendRunChecked(false);
    setPublishedVersions([]);
    setSelectedPublishedVersionId("");
    setTeacherAgent({ open: false, scope: "whole" });
    return () => {
      generationAbortRef.current?.abort();
      questionPoolAbortRef.current?.abort();
    };
  }, [lesson.id]);

  const lessonPayload = {
    id: lesson.id,
    title: lesson.title,
    chapterTitle:
      lesson.chapter?.title ||
      course.chapters.find((chapter) =>
        chapter.sections.some((item) => item.id === lesson.id),
      )?.title ||
      "",
    grade: lesson.grade || course.grade,
    subject: lesson.subject || course.subject,
  };
  const { refreshPublishedVersions } = useTeacherContentSynchronization({
    backendGenerationRun,
    backendPollRevision,
    backendRunChecked,
    base,
    learningContent,
    lesson,
    lessonPayload,
    loadedLessonId,
    recoveredLesson,
    setAllContent,
    setBackendGenerationRun,
    setBackendRunChecked,
    setLessonGeneration,
    setLoadedLessonId,
    setNotice,
    setPublishedVersions,
  });
  useEffect(() => {
    if (!previewExpanded) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPreviewExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewExpanded]);

  const setModuleStatus = (moduleIds, status) => {
    setLessonGeneration((current) => ({
      ...current,
      moduleStatuses: {
        ...current.moduleStatuses,
        ...Object.fromEntries(moduleIds.map((id) => [id, status])),
      },
    }));
  };
  const runtimeActions = createTeacherContentRuntimeActions({
    activeLearningScope,
    activeOpenMaicJobsRef,
    backendGenerationRun,
    base,
    contentMutationLocked,
    generationAbortRef,
    generationRunRef,
    lesson,
    lessonPayload,
    refreshPublishedVersions,
    resumedJobs,
    setAllContent,
    setBackendGenerationRun,
    setLessonGeneration,
    setModuleStatus,
    setNotice,
    setOpenMaicJob,
    setPublishing,
    storedLearningContent,
  });
  const {
    saveDraft,
    persistDraftContent,
    saveLearningRuntime,
    contentVersionSnapshot,
    assertContentVersion,
    saveOpenMaicJobCheckpoint,
    checkedGenerationProposalMatchesCurrentDraft,
    publishReadyContent,
    pollOpenMaic,
    savedOpenMaicJobs,
    savedOpenMaicJobKey,
    createOpenMaicRuntime,
    generateOpenMaic,
  } = runtimeActions;
  useEffect(() => {
    const pendingJobs = Object.entries(savedOpenMaicJobs).filter(
      ([, savedJob]) =>
        savedJob?.jobId && !resumedJobs.current.has(savedJob.jobId),
    );
    if (pendingJobs.length === 0) return;
    const recoveryRunId = generationRunRef.current + 1;
    generationRunRef.current = recoveryRunId;
    generationAbortRef.current?.abort();
    generationAbortRef.current = new AbortController();
    const restoringStatuses = Object.fromEntries(
      pendingJobs.map(([scope]) => [
        scope === "composite"
          ? "composite-classroom"
          : `knowledge-classroom:${scope}`,
        "generating",
      ]),
    );
    setLessonGeneration((current) => ({
      ...current,
      phase: "generating",
      message: `正在恢复 ${pendingJobs.length} 个 MAIC 子任务，已完成内容不会重做`,
      moduleStatuses: { ...current.moduleStatuses, ...restoringStatuses },
    }));
    const recoveries = pendingJobs.map(([scope, savedJob]) => {
      resumedJobs.current.add(savedJob.jobId);
      activeOpenMaicJobsRef.current.set(savedJob.jobId, scope);
      setOpenMaicJob(savedJob);
      const moduleId =
        scope === "composite"
          ? "composite-classroom"
          : `knowledge-classroom:${scope}`;
      return pollOpenMaic(
        savedJob.jobId,
        savedJob.teacherInstruction || "",
        scope,
        recoveryRunId,
      )
        .then((nextRuntime) => {
          saveLearningRuntime(scope, nextRuntime, {
            version: Number(base.version || 0) + 1,
            lastInstruction: savedJob.teacherInstruction || "",
          });
          saveOpenMaicJobCheckpoint(scope, null);
          setModuleStatus([moduleId], "ready");
          setOpenMaicJob(nextRuntime);
          setNotice("已找回后台生成任务，完成内容已保存到草稿");
        })
        .catch((error) => {
          saveOpenMaicJobCheckpoint(scope, null);
          setModuleStatus(
            [moduleId],
            isGenerationCancelled(error) ? "missing" : "failed",
          );
          setOpenMaicJob({
            ...savedJob,
            status: isGenerationCancelled(error) ? "cancelled" : "failed",
            message: error.message,
          });
          throw error;
        })
        .finally(() => {
          activeOpenMaicJobsRef.current.delete(savedJob.jobId);
        });
    });
    Promise.allSettled(recoveries).then(() => {
      // 清除已完成 checkpoint 会改变 savedOpenMaicJobKey 并重跑本 effect，
      // 但不应取消同一课时、同一批恢复任务结束后的自动质检。
      if (generationRunRef.current !== recoveryRunId) return;
      const latest = readTeacherContent()[lesson.id] || base;
      void validateGeneratedContent(
        {
          ...latest,
          learningContent: latest.learningContent || {
            composite: latest.openMaic || null,
            knowledgePoints: [],
          },
        },
        [],
        recoveryRunId,
      );
    });
    // pollOpenMaic 使用 jobId 恢复长任务，支持多个 MAIC 子任务并行恢复。
  }, [savedOpenMaicJobKey]);

  const questionActions = createTeacherContentQuestionActions({
    assertContentVersion,
    base,
    contentMutationLocked,
    contentVersionSnapshot,
    lesson,
    lessonPayload,
    questionGeneration,
    questionPoolAbortRef,
    saveDraft,
    setNotice,
    setQuestionGeneration,
  });
  const {
    generateQuestionSet,
    generateKnowledgePointAssessmentMatrix,
    generateKnowledgePointQuestionSlots,
    generateKnowledgePointQuestionPool,
    stopKnowledgePointQuestionPool,
  } = questionActions;

  const generationActions = createTeacherContentGenerationActions({
    createOpenMaicRuntime,
    generationAbortRef,
    generationRunRef,
    lesson,
    lessonPayload,
    persistDraftContent,
    setLessonGeneration,
    setModuleStatus,
    setOpenMaicJob,
    setQuestionGeneration,
  });
  const { friendlyTaskError, generateQuestionAction } = generationActions;
  const lifecycleActions = createTeacherContentLifecycleActions({
    activeOpenMaicJobsRef,
    backendGenerationRun,
    base,
    friendlyTaskError,
    generationAbortRef,
    generationRunRef,
    generationStartedAtRef,
    lesson,
    lessonGeneration,
    persistDraftContent,
    saveOpenMaicJobCheckpoint,
    setBackendGenerationRun,
    setBackendPollRevision,
    setLessonGeneration,
    setNotice,
    setOpenMaicJob,
    setQuestionGeneration,
    storedLearningContent,
  });
  const {
    validateContent,
    validateGeneratedContent,
    generateWholeLesson,
    runRequestedGeneration,
    stopWholeLessonGeneration,
  } = lifecycleActions;
  const agentActions = createTeacherContentAgentActions({
    activeLearningScope,
    assertContentVersion,
    base,
    checkedGenerationProposalMatchesCurrentDraft,
    contentMutationLocked,
    contentVersionSnapshot,
    generateOpenMaic,
    generateQuestionAction,
    generateQuestionSet,
    generateWholeLesson,
    generationAbortRef,
    generationRunRef,
    lesson,
    lessonGeneration,
    lessonPayload,
    openTeacherAgent,
    persistDraftContent,
    publishReadyContent,
    publishing,
    saveDraft,
    setAllContent,
    setLessonGeneration,
    setNotice,
    setPublishing,
    setQuestionGeneration,
    stopWholeLessonGeneration,
    storedLearningContent,
    teacherAgent,
    runRequestedGeneration,
    validateContent,
  });
  const {
    knowledgeQuestions,
    reviewQuestions,
    updatePostQuestionGroup,
    lessonGenerationModules,
    lessonGenerationRunning,
    teacherAgentQuestions,
    planTeacherAgentInstruction,
    executeTeacherAgentStep,
    validateTeacherAgentPlan,
    publish,
  } = agentActions;

  const hasLessonContent = Boolean(
    base.preQuestions.length > 0 ||
    base.postQuestions.length > 0 ||
    storedLearningContent.composite,
  );
  const publishStatus =
    base.status === "published"
      ? ["已发布", "published"]
      : publishing || lessonGeneration.phase === "ready"
        ? [
            publishing ? "发布中" : "待确认发布",
            publishing ? "processing" : "draft",
          ]
        : lessonGenerationRunning || lessonGeneration.phase === "dirty"
          ? [
              lessonGeneration.phase === "dirty" ? "有未发布修改" : "处理中",
              lessonGeneration.phase === "dirty" ? "draft" : "processing",
            ]
          : hasLessonContent
            ? ["需处理", "draft"]
            : ["尚未生成", "empty"];
  const publishActionLabel = publishing
    ? lessonGeneration.phase === "validating"
      ? "快速检查中…"
      : "发布中…"
    : "发布";
  const openMaicView = {
    openMaicJob,
    previewExpanded,
    activeLearningScope,
    previewRef,
    previewFrameState,
    contentMutationLocked,
    generateOpenMaic,
    previewFrameKey,
    setPreviewFrameKey,
    setPreviewFrameState,
  };

  const isCompositeSelected = selectedKpId === "composite";
  const currentKp = isCompositeSelected
    ? null
    : lesson.knowledgePoints.find((item) => item.id === selectedKpId) ||
      lesson.knowledgePoints[0];
  const currentKpRuntime = isCompositeSelected
    ? null
    : (learningContent.knowledgePoints || []).find(
        (item) => item.knowledgeObjectiveId === selectedKpId,
      )?.openMaic;
  const knowledgeAssessment = projectTeacherAssessmentScope({
    scopeId: currentKp?.id || lesson.knowledgePoints[0]?.id || "",
    content: base,
    questions: knowledgeQuestions,
    questionGeneration,
  });
  const compositeAssessment = projectTeacherAssessmentScope({
    scopeId: "composite",
    content: base,
    questions: reviewQuestions,
    questionGeneration,
  });
  const teacherAgentGeneration = {
    generating: questionGeneration.scope === teacherAgent.scope,
    status:
      questionGeneration.scope === teacherAgent.scope
        ? questionGeneration.status
        : null,
  };

  const viewModel = {
    activeSectionTab,
    backendGenerationRun,
    base,
    contentMutationLocked,
    compositeAssessment,
    currentKp,
    currentKpRuntime,
    hasLessonContent,
    isCompositeSelected,
    knowledgeAssessment,
    knowledgeQuestions,
    latestPublishedVersion,
    learningContent,
    lesson,
    lessonGeneration,
    lessonGenerationModules,
    lessonGenerationRunning,
    notice,
    openMaicView,
    publishActionLabel,
    publishStatus,
    publishing,
    reviewQuestions,
    selectedKpId,
    selectedPublishedVersion,
    sortedPublishedVersions,
    teacherAgent,
    teacherAgentGeneration,
    teacherAgentQuestions,
    viewingHistoricalVersion,
  };
  const viewActions = {
    closeTeacherAgent,
    executeTeacherAgentStep,
    generateKnowledgePointAssessmentMatrix,
    generateKnowledgePointQuestionPool,
    generateKnowledgePointQuestionSlots,
    generateQuestionSet,
    navigate,
    openTeacherAgent,
    planTeacherAgentInstruction,
    publish,
    setActiveSectionTab,
    setSelectedKpId,
    setSelectedPublishedVersionId,
    stopKnowledgePointQuestionPool,
    stopWholeLessonGeneration,
    updatePostQuestionGroup,
    validateTeacherAgentPlan,
  };
  return <TeacherContentView model={viewModel} actions={viewActions} />;
}
