import {
  applyLessonGenerationDraftPatch,
  createLessonGenerationTaskGraph,
  getRunnableLessonGenerationTasks,
  settleLessonGenerationTask,
  settleLessonQualityCheck,
  startLessonGenerationTask,
} from "../domain/lessonContentGeneration.js";
import {
  createMultiLessonGenerationScheduler,
  GENERATION_RESOURCE_POOLS,
} from "../domain/multiLessonGenerationScheduler.js";
import {
  abortError,
  ACTIVE_PHASES,
  assertNotCanceled,
  emptyLessonContent,
  errorIssue,
  generationMessage,
  generationProgress,
  isCanceled,
  moduleStatuses,
  normalizedSemanticIssues,
  phaseStatus,
  QUESTION_MODULE_KINDS,
  serializableGraph,
  taskPool,
  uniqueLessons,
} from "./wholeLessonGenerationRuntime.js";
import { createWholeLessonTaskExecutor } from "./wholeLessonTaskExecutor.js";

/**
 * Executes complete lesson DAGs through one shared fair scheduler.
 *
 * Storage is dependency-injected so tests and a future server repository use the
 * same execution semantics. Every module result is merged against the latest
 * lessonId-scoped draft immediately after it settles.
 * @param root0
 * @param root0.loadContents
 * @param root0.saveContents
 * @param root0.prepareContent
 * @param root0.generateQuestions
 * @param root0.createOpenMaicClassroom
 * @param root0.pollOpenMaicJob
 * @param root0.cancelOpenMaicJob
 * @param root0.validateLessonVersion
 * @param root0.reviewLessonContentQuality
 * @param root0.buildPublishedContentPackage
 * @param root0.scheduler
 * @param root0.schedulerOptions
 * @param root0.now
 */
export function createWholeLessonGenerationController({
  loadContents,
  saveContents,
  prepareContent = async (_lesson, content) => content,
  generateQuestions,
  createOpenMaicClassroom,
  pollOpenMaicJob,
  cancelOpenMaicJob = async () => {},
  validateLessonVersion,
  reviewLessonContentQuality,
  buildPublishedContentPackage,
  scheduler: suppliedScheduler,
  schedulerOptions = {},
  now = () => Date.now(),
} = {}) {
  if (
    typeof loadContents !== "function" ||
    typeof saveContents !== "function"
  ) {
    throw new TypeError("整课生成控制器需要草稿读写依赖");
  }
  const requiredDependencies = {
    generateQuestions,
    createOpenMaicClassroom,
    pollOpenMaicJob,
    validateLessonVersion,
    reviewLessonContentQuality,
    buildPublishedContentPackage,
  };
  for (const [name, value] of Object.entries(requiredDependencies)) {
    if (typeof value !== "function")
      throw new Error(`整课生成控制器缺少 ${name}`);
  }

  const listeners = new Set();
  const activeRuns = new Map();
  let runSequence = 0;

  const scheduler =
    suppliedScheduler ||
    createMultiLessonGenerationScheduler({
      ...schedulerOptions,
      onTaskUpdate: (task) => {
        schedulerOptions.onTaskUpdate?.(task);
        const run = activeRuns.get(task.lessonId);
        if (!run || !run.schedulerTaskIds.has(task.id)) return;
        run.schedulerTasks.set(task.id, task);
        persistRun(run);
      },
    });

  /**
   *
   * @param lessonId
   * @param content
   */
  function emit(lessonId, content) {
    for (const listener of listeners)
      listener({ lessonId, content, contents: loadContents() });
  }

  /**
   *
   * @param lessonId
   * @param update
   */
  function mutateLesson(lessonId, update) {
    const contents = loadContents();
    const nextLesson = update(contents[lessonId] || {});
    const next = { ...contents, [lessonId]: nextLesson };
    saveContents(next);
    emit(lessonId, nextLesson);
    return nextLesson;
  }

  /**
   *
   * @param run
   * @param extra
   */
  function persistRun(run, extra = {}) {
    if (!run.graph) return null;
    const status = phaseStatus(run.graph, run.canceled);
    const schedulerTasks = [...run.schedulerTasks.values()];
    const queued = schedulerTasks.filter((task) => task.status === "queued");
    return mutateLesson(run.lesson.id, (current) => ({
      ...current,
      lessonId: run.lesson.id,
      status: "draft",
      updatedAt: new Date(now()).toISOString(),
      generationStatus: {
        ...current.generationStatus,
        runId: run.id,
        batchId: run.batchId,
        status,
        phase: run.graph.phase,
        progress: run.canceled
          ? Number(current.generationStatus?.progress || 0)
          : generationProgress(run.graph),
        message: generationMessage(run.graph, run.canceled),
        moduleStatuses: moduleStatuses(run.graph),
        queuedTaskCount: queued.length,
        queuePosition:
          queued.length > 0
            ? Math.min(...queued.map((task) => Number(task.queuePosition || 1)))
            : null,
        activeTaskCount: schedulerTasks.filter(
          (task) => task.status === "running",
        ).length,
        repairRound: Number(run.graph.repairRound || 0),
        issues: run.graph.remainingIssues || [],
        taskGraph: serializableGraph(run.graph),
        startedAt: run.startedAt,
        updatedAt: new Date(now()).toISOString(),
        completedAt:
          status === "completed"
            ? new Date(now()).toISOString()
            : current.generationStatus?.completedAt,
        ...extra,
      },
    }));
  }

  /**
   *
   * @param run
   * @param update
   * @param root0
   * @param root0.incrementVersion
   */
  function mutateRunContent(run, update, { incrementVersion = false } = {}) {
    return mutateLesson(run.lesson.id, (current) => {
      if (
        current.generationStatus?.runId &&
        current.generationStatus.runId !== run.id
      )
        return current;
      const updated = update({ ...emptyLessonContent(run.lesson), ...current });
      return {
        ...updated,
        status: "draft",
        version: incrementVersion
          ? Number(current.version || 0) + 1
          : Number(current.version || 1),
        updatedAt: new Date(now()).toISOString(),
      };
    });
  }

  /**
   *
   * @param run
   */
  function currentContent(run) {
    return {
      ...emptyLessonContent(run.lesson),
      ...loadContents()[run.lesson.id],
    };
  }

  const { executeOpenMaicTask, executeQuestionTask } =
    createWholeLessonTaskExecutor({
      currentContent,
      mutateLesson,
      mutateRunContent,
      generateQuestions,
      createOpenMaicClassroom,
      pollOpenMaicJob,
      cancelOpenMaicJob,
      now,
    });

  /**
   *
   * @param run
   * @param task
   * @param root0
   * @param root0.result
   * @param root0.error
   */
  async function settleModuleRun(run, task, { result, error }) {
    run.commitQueue = run.commitQueue.then(() => {
      if (run.canceled || (error && isCanceled(error))) return run.graph;
      const latest = currentContent(run);
      const settled = settleLessonGenerationTask({
        graph: run.graph,
        taskId: task.id,
        result,
        error,
        lesson: run.lesson,
        content: latest,
      });
      run.graph = settled.graph;
      if (settled.patch) {
        mutateRunContent(
          run,
          (content) => applyLessonGenerationDraftPatch(content, settled.patch),
          {
            incrementVersion: true,
          },
        );
      }
      persistRun(run);
      return run.graph;
    });
    await run.commitQueue;
  }

  /**
   *
   * @param run
   * @param task
   */
  function scheduledModuleTask(run, task) {
    const schedulerId = `${run.id}:${task.id}`;
    run.schedulerTaskIds.add(schedulerId);
    return {
      id: schedulerId,
      lessonId: run.lesson.id,
      pool: taskPool(task),
      metadata: {
        runId: run.id,
        taskId: task.id,
        moduleId: task.moduleId,
        label: task.label,
      },
      run: async ({ signal }) => {
        assertNotCanceled(run, signal);
        run.graph = startLessonGenerationTask(run.graph, task.id);
        persistRun(run);
        try {
          const result = QUESTION_MODULE_KINDS.has(task.moduleKind)
            ? await executeQuestionTask(run, task, signal)
            : await executeOpenMaicTask(run, task, signal);
          await settleModuleRun(run, task, { result });
          return result;
        } catch (error) {
          await settleModuleRun(run, task, { error });
          throw error;
        }
      },
    };
  }

  /**
   *
   * @param run
   * @param task
   * @param signal
   */
  async function runQualityTask(run, task, signal) {
    assertNotCanceled(run, signal);
    run.graph = startLessonGenerationTask(run.graph, task.id);
    persistRun(run);
    const content = currentContent(run);
    const stageIssues = run.graph.tasks
      .filter(
        (item) =>
          ["generation", "repair"].includes(item.taskType) &&
          item.round === task.round,
      )
      .flatMap((item) => item.issues || []);
    let issues = [...stageIssues];
    let semanticReview = null;
    try {
      const contentPackage = buildPublishedContentPackage({
        lesson: run.lesson,
        content,
      });
      const structural = await validateLessonVersion(
        run.lesson.id,
        {
          schemaVersion: "2.0",
          contentPackage,
          qualityReport: {
            reviewMode: "deterministic+ai",
            reviewedBy: "current-teacher",
          },
        },
        { signal },
      );
      issues.push(...(structural.issues || []));
      if (structural.passed && issues.length === 0) {
        semanticReview = await reviewLessonContentQuality(
          {
            lesson: {
              id: run.lesson.id,
              title: run.lesson.title,
              chapterTitle:
                run.lesson.chapter?.title || run.lesson.chapterTitle || "",
            },
            knowledgePoints: run.lesson.knowledgePoints,
            contentPackage,
            openMaicScenes: [],
          },
          { signal },
        );
        issues.push(...normalizedSemanticIssues(semanticReview));
      }
    } catch (error) {
      if (isCanceled(error)) throw error;
      issues.push({
        code: "QUALITY_CHECK_UNAVAILABLE",
        message: `内容已保存，但质量检查暂时失败：${error.message}`,
        moduleIds: [],
      });
    }
    assertNotCanceled(run, signal);
    run.commitQueue = run.commitQueue.then(() => {
      run.graph = settleLessonQualityCheck({
        graph: run.graph,
        taskId: task.id,
        issues,
      });
      mutateRunContent(run, (current) => ({
        ...current,
        qualityReport: {
          passed: issues.length === 0,
          issues,
          semanticReview,
          reviewMode: "deterministic+ai",
          checkedAt: new Date(now()).toISOString(),
        },
      }));
      persistRun(run);
      return run.graph;
    });
    await run.commitQueue;
    return { passed: issues.length === 0, issues };
  }

  /**
   *
   * @param run
   * @param task
   */
  function scheduledQualityTask(run, task) {
    const schedulerId = `${run.id}:${task.id}`;
    run.schedulerTaskIds.add(schedulerId);
    return {
      id: schedulerId,
      lessonId: run.lesson.id,
      pool: GENERATION_RESOURCE_POOLS.QUESTIONS,
      metadata: { runId: run.id, taskId: task.id, label: task.label },
      run: ({ signal }) => runQualityTask(run, task, signal),
    };
  }

  /**
   *
   * @param run
   * @param initialHandles
   */
  async function driveRun(run, initialHandles) {
    let handles = initialHandles;
    try {
      while (!run.canceled && ACTIVE_PHASES.has(run.graph.phase)) {
        handles = await awaitAndScheduleNext(run, handles);
        if (!handles) break;
      }
      await run.commitQueue;
      settleRunWithoutRunnableTask(run);
      return {
        lessonId: run.lesson.id,
        status: phaseStatus(run.graph, run.canceled),
        graph: run.graph,
      };
    } finally {
      if (activeRuns.get(run.lesson.id) === run)
        activeRuns.delete(run.lesson.id);
    }
  }

  /**
   *
   * @param run
   * @param handles
   */
  async function awaitAndScheduleNext(run, handles) {
    if (handles.length > 0)
      await Promise.all(handles.map((handle) => handle.done));
    await run.commitQueue;
    if (run.canceled) return null;
    const runnable = getRunnableLessonGenerationTasks(run.graph);
    if (runnable.length === 0) return null;
    const scheduled = runnable.map((task) =>
      task.taskType === "quality_check"
        ? scheduledQualityTask(run, task)
        : scheduledModuleTask(run, task),
    );
    const nextHandles = scheduler.enqueueTasks(scheduled);
    for (const handle of nextHandles) run.handles.set(handle.id, handle);
    persistRun(run);
    return nextHandles;
  }

  /**
   *
   * @param run
   */
  function settleRunWithoutRunnableTask(run) {
    if (run.canceled) {
      persistRun(run);
      return;
    }
    if (["ready", "failed"].includes(run.graph.phase)) return;
    run.graph = {
      ...run.graph,
      phase: "failed",
      remainingIssues: [errorIssue("生成执行器未找到可运行的后续任务")],
    };
    persistRun(run);
  }

  /**
   *
   * @param lessons
   * @param root0
   * @param root0.batchId
   */
  async function startLessons(lessons, { batchId = `batch-${now()}` } = {}) {
    const targets = uniqueLessons(lessons).filter(
      (lesson) => !activeRuns.has(lesson.id),
    );
    if (targets.length === 0) return [];
    const runs = targets.map((lesson) => {
      runSequence += 1;
      const run = {
        id: `${batchId}:${lesson.id}:${runSequence}`,
        batchId,
        lesson,
        graph: null,
        canceled: false,
        startedAt: new Date(now()).toISOString(),
        schedulerTaskIds: new Set(),
        schedulerTasks: new Map(),
        handles: new Map(),
        openMaicJobIds: new Set(),
        prepareController: new AbortController(),
        commitQueue: Promise.resolve(),
        promise: null,
        initialContent: {
          ...emptyLessonContent(lesson),
          ...loadContents()[lesson.id],
        },
      };
      activeRuns.set(lesson.id, run);
      mutateLesson(lesson.id, (current) => ({
        ...emptyLessonContent(lesson),
        ...current,
        lessonId: lesson.id,
        status: "draft",
        generationStatus: {
          ...current.generationStatus,
          runId: run.id,
          batchId,
          status: "queued",
          phase: "preparing",
          progress: 1,
          message: "正在读取已有草稿与发布版本",
          startedAt: run.startedAt,
          updatedAt: new Date(now()).toISOString(),
        },
      }));
      return run;
    });

    await Promise.all(
      runs.map(async (run) => {
        try {
          const existing = run.initialContent;
          const prepared = await prepareContent(run.lesson, existing, {
            signal: run.prepareController.signal,
          });
          if (run.canceled) return;
          mutateRunContent(run, () => ({
            ...existing,
            ...prepared,
            lessonId: run.lesson.id,
          }));
          run.graph = createLessonGenerationTaskGraph({
            lesson: run.lesson,
            content: currentContent(run),
          });
          persistRun(run);
        } catch (error) {
          run.graph = createLessonGenerationTaskGraph({
            lesson: run.lesson,
            content: currentContent(run),
          });
          if (!run.canceled && !isCanceled(error)) {
            run.graph = {
              ...run.graph,
              phase: "failed",
              remainingIssues: [
                {
                  code: "DRAFT_PREPARE_FAILED",
                  message: error.message,
                  moduleIds: [],
                },
              ],
            };
          }
          persistRun(run);
        }
      }),
    );

    const runnableEntries = runs.flatMap((run) =>
      !run.canceled && run.graph?.phase === "generation"
        ? getRunnableLessonGenerationTasks(run.graph).map((task) => ({
            run,
            task,
          }))
        : [],
    );
    const scheduled = runnableEntries.map(({ run, task }) =>
      scheduledModuleTask(run, task),
    );
    const handles = scheduler.enqueueTasks(scheduled);
    const handlesByRun = new Map(runs.map((run) => [run.id, []]));
    for (const handle of handles) {
      const run = runs.find((item) => handle.id.startsWith(`${item.id}:`));
      if (!run) continue;
      run.handles.set(handle.id, handle);
      handlesByRun.get(run.id).push(handle);
    }
    for (const run of runs) {
      run.promise =
        run.graph?.phase === "failed"
          ? Promise.resolve({
              lessonId: run.lesson.id,
              status: "failed",
              graph: run.graph,
            }).finally(() => {
              if (activeRuns.get(run.lesson.id) === run)
                activeRuns.delete(run.lesson.id);
            })
          : driveRun(run, handlesByRun.get(run.id) || []);
    }
    return Promise.allSettled(runs.map((run) => run.promise));
  }

  /**
   *
   * @param lessonId
   */
  async function cancelLesson(lessonId) {
    const run = activeRuns.get(lessonId);
    if (!run) return { lessonId, canceled: false, canceledTaskCount: 0 };
    run.canceled = true;
    run.prepareController.abort(abortError("教师取消了这个课时的生成"));
    const canceledTaskCount = scheduler.cancelLesson(
      lessonId,
      "教师取消了这个课时的生成",
    );
    const current = currentContent(run);
    const jobIds = new Set([
      ...run.openMaicJobIds,
      ...Object.values(current.openMaicJobs || {})
        .map((job) => job?.jobId)
        .filter(Boolean),
    ]);
    const cancellationResults = await Promise.allSettled(
      [...jobIds].map((jobId) => cancelOpenMaicJob(jobId)),
    );
    const failedJobIds = [...jobIds].filter(
      (_jobId, index) => cancellationResults[index]?.status === "rejected",
    );
    mutateRunContent(run, (content) => ({
      ...content,
      openMaicJobs: Object.fromEntries(
        Object.entries(content.openMaicJobs || {}).map(([scope, job]) => [
          scope,
          {
            ...job,
            status: failedJobIds.includes(job.jobId)
              ? "cancellation_pending"
              : "canceled",
            updatedAt: new Date(now()).toISOString(),
          },
        ]),
      ),
    }));
    persistRun(run, {
      cancelUnconfirmedJobIds: failedJobIds,
      error:
        failedJobIds.length > 0
          ? `${failedJobIds.length} 个 MAIC 后台任务暂未确认取消`
          : "",
    });
    return { lessonId, canceled: true, canceledTaskCount, failedJobIds };
  }

  /**
   *
   * @param lessons
   */
  function resumableLessons(lessons = []) {
    const contents = loadContents();
    return uniqueLessons(lessons).filter((lesson) => {
      const generation = contents[lesson.id]?.generationStatus || {};
      return (
        [
          "queued",
          "generating",
          "partial",
          "validating",
          "repairing",
          "reconnecting",
        ].includes(generation.status) && !activeRuns.has(lesson.id)
      );
    });
  }

  /**
   *
   * @param listener
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    startLessons,
    resumeLessons: (lessons, options) =>
      startLessons(resumableLessons(lessons), options),
    cancelLesson,
    isLessonActive: (lessonId) => activeRuns.has(lessonId),
    getActiveLessonIds: () => [...activeRuns.keys()],
    getSchedulerSnapshot: () => scheduler.getSnapshot(),
    waitForIdle: () => scheduler.waitForIdle(),
    subscribe,
  });
}
