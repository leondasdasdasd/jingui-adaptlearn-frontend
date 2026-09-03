import {
  buildPreAssessmentBlueprint,
  diagnosticSlotForQuestion,
} from "../../shared/domain/preAssessmentBlueprint.js";
import { LESSON_GENERATION_MODULE_KIND } from "../domain/lessonContentGeneration.js";
import {
  abortError,
  assertNotCanceled,
  isCanceled,
  questionIds,
} from "./wholeLessonGenerationRuntime.js";

/**
 * 合并 OpenMAIC 增量课堂，不触碰任务或存储状态。
 * @param content
 * @param scope
 * @param runtime
 */
function mergePartialRuntime(content, scope, runtime) {
  const learningContent = content.learningContent || {
    composite: content.openMaic || null,
    knowledgePoints: [],
  };
  if (scope === "composite") {
    return {
      ...content,
      learningContent: { ...learningContent, composite: runtime },
    };
  }
  return {
    ...content,
    learningContent: {
      ...learningContent,
      knowledgePoints: [
        ...(learningContent.knowledgePoints || []).filter(
          (item) => item.knowledgeObjectiveId !== scope,
        ),
        { knowledgeObjectiveId: scope, openMaic: runtime },
      ],
    },
  };
}

/**
 *
 * @param lesson
 */
function lessonPayloadFor(lesson) {
  return {
    id: lesson.id,
    title: lesson.title,
    chapterTitle: lesson.chapter?.title || lesson.chapterTitle || "",
    grade: lesson.grade || "",
    subject: lesson.subject || "",
  };
}

/**
 *
 * @param lesson
 * @param task
 * @param common
 */
function knowledgeQuestionPayload(lesson, task, common) {
  const knowledgePoint = lesson.knowledgePoints.find(
    (item) => item.id === task.knowledgePointId,
  );
  return {
    purpose: "post",
    ...common,
    knowledgePoints: knowledgePoint ? [knowledgePoint] : [],
    countPerKnowledgePoint: Number(task.requiredCount || 15),
    reviewCount: 0,
    multiLesson: true,
  };
}

/**
 *
 * @param task
 */
function openMaicScope(task) {
  return task.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM
    ? "composite"
    : task.knowledgePointId;
}

/**
 *
 * @param lesson
 * @param scope
 */
function openMaicKnowledgePoints(lesson, scope) {
  return scope === "composite"
    ? lesson.knowledgePoints
    : lesson.knowledgePoints.filter((item) => item.id === scope);
}

/**
 * 创建单课时生成任务执行器；草稿读写仍由主控制器持有。
 * @param root0
 * @param root0.currentContent
 * @param root0.mutateLesson
 * @param root0.mutateRunContent
 * @param root0.generateQuestions
 * @param root0.createOpenMaicClassroom
 * @param root0.pollOpenMaicJob
 * @param root0.cancelOpenMaicJob
 * @param root0.now
 */
export function createWholeLessonTaskExecutor({
  currentContent,
  mutateLesson,
  mutateRunContent,
  generateQuestions,
  createOpenMaicClassroom,
  pollOpenMaicJob,
  cancelOpenMaicJob,
  now,
}) {
  /**
   *
   * @param run
   * @param task
   */
  function taskInstruction(run, task) {
    if (task.taskType !== "repair") return "";
    const qualityIssues = run.graph.tasks
      .filter(
        (item) =>
          item.taskType === "quality_check" && item.round === task.round - 1,
      )
      .flatMap((item) => item.issues || [])
      .filter((issue) => (issue.moduleIds || []).includes(task.moduleId));
    const issueCopy = qualityIssues
      .map((issue) => issue.message)
      .filter(Boolean)
      .join("；");
    const content = currentContent(run);
    const targets = new Set(task.targetQuestionIds || []);
    const forbiddenStems = [
      ...(content.preQuestions || []),
      ...(content.postQuestions || []),
    ]
      .filter((question) => !targets.has(question.id))
      .map((question) => String(question.stem || "").trim())
      .filter(Boolean)
      .slice(0, 60);
    return `这是发布前自动返修。必须解决：${issueCopy || "当前模块未通过校验"}。不要复用已有题干或只替换数字改写：${JSON.stringify(forbiddenStems)}`;
  }

  /**
   *
   * @param run
   * @param task
   * @param signal
   */
  async function executeQuestionTask(run, task, signal) {
    assertNotCanceled(run, signal);
    const lesson = run.lesson;
    const payload = questionTaskPayload(run, task, {
      lesson: lessonPayloadFor(lesson),
      teacherInstruction: taskInstruction(run, task),
      generationModuleId: task.moduleId,
      generationTaskType: task.taskType,
      generationRunId: run.id,
    });
    const response = await generateQuestions(payload, {
      signal,
      onProgress: (progress) => {
        if (run.canceled || signal.aborted) return;
        mutateLesson(run.lesson.id, (current) => ({
          ...current,
          generationStatus: {
            ...current.generationStatus,
            message: progress?.message || current.generationStatus?.message,
            updatedAt: new Date(now()).toISOString(),
          },
        }));
      },
    });
    assertNotCanceled(run, signal);
    const questions = (response.questions || []).map((question) => ({
      ...question,
      knowledgePointIds: questionIds(question),
      ...(task.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW
        ? { phase: "review" }
        : {}),
    }));
    return {
      questions,
      assessmentMatrices: response.assessmentMatrices || {},
      assessmentMatrix: response.assessmentMatrix || null,
    };
  }

  /**
   *
   * @param run
   * @param task
   * @param common
   */
  function questionTaskPayload(run, task, common) {
    if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT) {
      return preAssessmentQuestionPayload(run, task, common);
    }
    if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS) {
      return knowledgeQuestionPayload(run.lesson, task, common);
    }
    return {
      purpose: "post",
      ...common,
      knowledgePoints: run.lesson.knowledgePoints,
      countPerKnowledgePoint: 0,
      reviewCount: Number(task.requiredCount || 6),
      multiLesson: true,
    };
  }

  /**
   *
   * @param run
   * @param task
   * @param common
   */
  function preAssessmentQuestionPayload(run, task, common) {
    const diagnosticBlueprintSlots = diagnosticBlueprintSlotsForTask(run, task);
    return {
      purpose: "pre",
      ...common,
      knowledgePoints: run.lesson.knowledgePoints,
      count: diagnosticBlueprintSlots.length,
      diagnosticBlueprintSlots,
      targetQuestionIds: task.targetQuestionIds || [],
      multiLesson: true,
    };
  }

  /**
   *
   * @param run
   * @param task
   */
  function diagnosticBlueprintSlotsForTask(run, task) {
    const standardBlueprint = buildPreAssessmentBlueprint(
      run.lesson.knowledgePoints,
    );
    if (task.taskType !== "repair") return standardBlueprint;
    if (task.targetBlueprintSlots?.length) return task.targetBlueprintSlots;
    const targetIds = new Set(task.targetQuestionIds || []);
    const replacementSlots = [...(currentContent(run).preQuestions || [])]
      .filter((question) => targetIds.has(question.id))
      .map((question) => diagnosticSlotForQuestion(question))
      .filter(Boolean);
    return replacementSlots.length > 0 ? replacementSlots : standardBlueprint;
  }

  /**
   *
   * @param run
   * @param scope
   * @param checkpoint
   * @param partialResult
   */
  function saveOpenMaicCheckpoint(
    run,
    scope,
    checkpoint,
    partialResult = null,
  ) {
    mutateRunContent(run, (current) => {
      const jobs = { ...current.openMaicJobs };
      if (checkpoint) jobs[scope] = checkpoint;
      else delete jobs[scope];
      let next = { ...current, openMaicJobs: jobs };
      if (partialResult?.classroomId) {
        next = mergePartialRuntime(next, scope, {
          jobId: checkpoint?.jobId || "",
          status: "partial",
          partial: true,
          progress: Number(checkpoint?.progress || 0),
          step: checkpoint?.step || "",
          classroomId: partialResult.classroomId,
          classroomUrl: partialResult.url,
          scenesCount:
            partialResult.completedScenes || partialResult.scenesCount,
          totalScenes: partialResult.totalScenes,
          generatedAt: new Date(now()).toISOString(),
        });
      }
      return next;
    });
  }

  /**
   *
   * @param run
   * @param task
   * @param signal
   */
  async function executeOpenMaicTask(run, task, signal) {
    assertNotCanceled(run, signal);
    const lesson = run.lesson;
    const scope = openMaicScope(task);
    const savedJob = currentContent(run).openMaicJobs?.[scope];
    const response = await resumeOrCreateOpenMaicJob({
      run,
      task,
      lesson,
      scope,
      savedJob,
      signal,
    });
    if (run.canceled || signal.aborted) {
      await cancelStartedOpenMaicJob(response.jobId);
      throw abortError();
    }
    if (response.status === "succeeded" && response.result?.classroomId) {
      saveOpenMaicCheckpoint(run, scope, null);
      return completedRuntime(response.result, {
        cached: response.cached,
        includeCached: true,
        useClassroomUrlFallback: false,
      });
    }
    if (!response.jobId) throw new Error(`${task.label}未返回可恢复的任务标识`);
    run.openMaicJobIds.add(response.jobId);
    saveOpenMaicCheckpoint(
      run,
      scope,
      queuedCheckpoint(response, savedJob, scope, task),
    );
    return pollStartedOpenMaicJob({
      run,
      task,
      lesson,
      scope,
      response,
      signal,
    });
  }

  /**
   *
   * @param root0
   * @param root0.run
   * @param root0.task
   * @param root0.lesson
   * @param root0.scope
   * @param root0.savedJob
   * @param root0.signal
   */
  async function resumeOrCreateOpenMaicJob({
    run,
    task,
    lesson,
    scope,
    savedJob,
    signal,
  }) {
    const activeSavedJob =
      savedJob?.jobId &&
      !["failed", "canceled", "cancelled", "succeeded"].includes(
        savedJob.status,
      );
    if (activeSavedJob)
      return { jobId: savedJob.jobId, status: savedJob.status };
    return createOpenMaicClassroom(
      {
        lesson: lessonPayloadFor(lesson),
        knowledgePoints: openMaicKnowledgePoints(lesson, scope),
        generationMode: "deep",
        cacheOnly: false,
        batchGeneration: true,
        generationModuleId: task.moduleId,
        generationTaskType: task.taskType,
        generationRunId: run.id,
        teacherInstruction: taskInstruction(run, task),
      },
      { signal },
    );
  }

  /**
   *
   * @param jobId
   */
  async function cancelStartedOpenMaicJob(jobId) {
    if (jobId) await cancelOpenMaicJob(jobId).catch(() => {});
  }

  /**
   *
   * @param result
   * @param root0
   * @param root0.jobId
   * @param root0.cached
   * @param root0.includeCached
   * @param root0.useClassroomUrlFallback
   */
  function completedRuntime(
    result,
    {
      jobId = "",
      cached = false,
      includeCached = false,
      useClassroomUrlFallback = true,
    } = {},
  ) {
    return {
      runtime: {
        ...(jobId ? { jobId } : {}),
        status: "succeeded",
        progress: 100,
        classroomId: result.classroomId,
        classroomUrl: useClassroomUrlFallback
          ? result.url || result.classroomUrl
          : result.url,
        scenesCount: result.scenesCount,
        generatedAt: new Date(now()).toISOString(),
        ...(includeCached ? { cached: Boolean(cached) } : {}),
      },
    };
  }

  /**
   *
   * @param response
   * @param savedJob
   * @param scope
   * @param task
   */
  function queuedCheckpoint(response, savedJob, scope, task) {
    return {
      ...savedJob,
      jobId: response.jobId,
      scope,
      status: response.status || "queued",
      progress: Number(response.progress || 2),
      moduleId: task.moduleId,
      updatedAt: new Date(now()).toISOString(),
    };
  }

  /**
   *
   * @param job
   * @param response
   * @param scope
   * @param task
   */
  function progressCheckpoint(job, response, scope, task) {
    return {
      ...job,
      jobId: response.jobId,
      scope,
      moduleId: task.moduleId,
      updatedAt: new Date(now()).toISOString(),
    };
  }

  /**
   *
   * @param run
   * @param error
   * @param response
   * @param scope
   * @param task
   */
  function failedCheckpoint(run, error, response, scope, task) {
    return {
      ...currentContent(run).openMaicJobs?.[scope],
      jobId: response.jobId,
      scope,
      moduleId: task.moduleId,
      status: "failed",
      error: String(error.message || error),
      updatedAt: new Date(now()).toISOString(),
    };
  }

  /**
   *
   * @param root0
   * @param root0.run
   * @param root0.task
   * @param root0.lesson
   * @param root0.scope
   * @param root0.response
   * @param root0.signal
   */
  async function pollStartedOpenMaicJob({
    run,
    task,
    lesson,
    scope,
    response,
    signal,
  }) {
    try {
      const result = await pollOpenMaicJob(response.jobId, {
        signal,
        lessonId: lesson.id,
        onProgress: (job) => {
          if (run.canceled || signal.aborted) return;
          const checkpoint = progressCheckpoint(job, response, scope, task);
          saveOpenMaicCheckpoint(run, scope, checkpoint, job.partialResult);
        },
      });
      assertNotCanceled(run, signal);
      saveOpenMaicCheckpoint(run, scope, null);
      return completedRuntime(result, { jobId: response.jobId });
    } catch (error) {
      if (!isCanceled(error)) {
        saveOpenMaicCheckpoint(
          run,
          scope,
          failedCheckpoint(run, error, response, scope, task),
        );
      }
      throw error;
    } finally {
      run.openMaicJobIds.delete(response.jobId);
    }
  }

  return { executeQuestionTask, executeOpenMaicTask };
}
