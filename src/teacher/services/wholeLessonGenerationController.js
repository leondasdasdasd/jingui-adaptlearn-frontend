import {
  applyLessonGenerationDraftPatch,
  createLessonGenerationTaskGraph,
  getRunnableLessonGenerationTasks,
  LESSON_GENERATION_MODULE_KIND,
  LESSON_GENERATION_TASK_STATUS,
  settleLessonGenerationTask,
  settleLessonQualityCheck,
  startLessonGenerationTask,
} from '../domain/lessonContentGeneration.js';
import {
  createMultiLessonGenerationScheduler,
  GENERATION_RESOURCE_POOLS,
} from '../domain/multiLessonGenerationScheduler.js';
import {
  buildPreAssessmentBlueprint,
  diagnosticSlotForQuestion,
} from '../../shared/domain/preAssessmentBlueprint.js';

const ACTIVE_PHASES = new Set(['preparing', 'generation', 'quality_check', 'repair']);
const QUESTION_MODULE_KINDS = new Set([
  LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT,
  LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS,
  LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW,
]);

const semanticIssueCodes = Object.freeze({
  answer_rubric: 'ANSWER_RUBRIC_INCONSISTENT',
  ambiguity: 'QUESTION_AMBIGUOUS',
  factual_error: 'QUESTION_FACTUAL_ERROR',
  multiple_solutions: 'UNINTENDED_MULTIPLE_SOLUTIONS',
  duplicate: 'DUPLICATE_QUESTION',
  quality: 'QUESTION_QUALITY_LOW',
  difficulty_mismatch: 'QUESTION_DIFFICULTY_MISMATCH',
  shallow_reasoning: 'QUESTION_REASONING_TOO_SHALLOW',
  weak_distractors: 'QUESTION_DISTRACTORS_WEAK',
  generic_short_answer: 'GENERIC_SHORT_ANSWER',
  question_mix: 'QUESTION_MIX_INSUFFICIENT',
  fake_application: 'APPLICATION_CONTEXT_FAKE',
  application_reasoning: 'APPLICATION_REASONING_INCOMPLETE',
  concept_overuse: 'CONCEPT_EXPLANATION_OVERUSED',
  out_of_scope: 'QUESTION_OUT_OF_SCOPE',
  openmaic_coverage: 'OPENMAIC_COVERAGE_MISSING',
});

function abortError(message = '课时生成已取消') {
  const error = new Error(message);
  error.name = 'AbortError';
  error.code = 'LESSON_GENERATION_CANCELED';
  return error;
}

function isCanceled(error) {
  return error?.name === 'AbortError' || error?.code === 'LESSON_GENERATION_CANCELED';
}

function assertNotCanceled(run, signal) {
  if (run.canceled || signal?.aborted) throw abortError();
}

function uniqueLessons(lessons = []) {
  const seen = new Set();
  return lessons.filter((lesson) => {
    if (!lesson?.id || seen.has(lesson.id)) return false;
    seen.add(lesson.id);
    return true;
  });
}

function emptyLessonContent(lesson) {
  return {
    lessonId: lesson.id,
    preQuestions: [],
    postQuestions: [],
    learningContent: { composite: null, knowledgePoints: [] },
    status: 'draft',
    version: 1,
  };
}

function serializableGraph(graph) {
  return {
    ...graph,
    tasks: graph.tasks.map(({ outputPatch: _outputPatch, ...task }) => task),
  };
}

function taskPool(task) {
  // Quality checks and targeted repairs call the same question-model key, so
  // they share its 60-slot budget instead of opening a hidden third lane.
  if (['quality_check', 'repair'].includes(task.taskType)) {
    return GENERATION_RESOURCE_POOLS.QUESTIONS;
  }
  return QUESTION_MODULE_KINDS.has(task.moduleKind)
    ? GENERATION_RESOURCE_POOLS.QUESTIONS
    : GENERATION_RESOURCE_POOLS.OPENMAIC;
}

function moduleStatuses(graph) {
  const statuses = {};
  graph.tasks.forEach((task) => {
    if (!task.moduleId) return;
    const status = task.status === LESSON_GENERATION_TASK_STATUS.COMPLETED
      ? 'ready'
      : task.status;
    statuses[task.moduleId] = status;
  });
  return statuses;
}

function phaseStatus(graph, canceled = false) {
  if (canceled) return 'canceled';
  if (graph.phase === 'ready') return 'completed';
  if (graph.phase === 'failed') return 'failed';
  if (graph.phase === 'quality_check') return 'validating';
  if (graph.phase === 'repair') return 'repairing';
  const runnable = graph.tasks.filter((task) => (
    ['pending', 'running'].includes(task.status) && task.taskType !== 'quality_check'
  ));
  return runnable.some((task) => task.status === 'running') ? 'generating' : 'queued';
}

function generationProgress(graph) {
  if (graph.phase === 'ready') return 100;
  const initialTasks = graph.tasks.filter((task) => task.taskType === 'generation');
  const settledInitial = initialTasks.filter((task) => ['completed', 'partial', 'failed'].includes(task.status)).length;
  const generationProgressValue = initialTasks.length
    ? 2 + Math.round((settledInitial / initialTasks.length) * 76)
    : 78;
  if (graph.phase === 'generation') return Math.min(78, generationProgressValue);
  if (graph.phase === 'quality_check') return Math.min(94, 82 + Number(graph.repairRound || 0) * 5);
  if (graph.phase === 'repair') return Math.min(96, 84 + Number(graph.repairRound || 0) * 5);
  return graph.phase === 'failed' ? Math.min(99, generationProgressValue) : generationProgressValue;
}

function generationMessage(graph, canceled = false) {
  if (canceled) return '已取消未完成任务，已生成内容仍保留在草稿';
  if (graph.phase === 'ready') return '整课内容已通过规则与 AI 质检，等待教师预览确认';
  if (graph.phase === 'failed') return '已保留完成内容，仍有问题需重试或人工处理';
  if (graph.phase === 'quality_check') return '正在执行规则校验与 AI 合理性、重题检查';
  if (graph.phase === 'repair') return `正在定向返修（第 ${graph.repairRound} 轮）`;
  const initialTasks = graph.tasks.filter((task) => task.taskType === 'generation');
  const settled = initialTasks.filter((task) => ['completed', 'partial', 'failed'].includes(task.status)).length;
  return `题目与 MAIC 已拆分排队 · 已完成 ${settled}/${initialTasks.length}`;
}

function normalizedSemanticIssues(review = {}) {
  return (review.issues || []).map((issue) => ({
    ...issue,
    code: semanticIssueCodes[issue.type] || String(issue.code || 'QUESTION_QUALITY_LOW').toUpperCase(),
    message: [issue.questionId ? `题目 ${issue.questionId}` : '', issue.message].filter(Boolean).join('：'),
  }));
}

function errorIssue(error, moduleIds = []) {
  return {
    code: 'GENERATION_FAILED',
    message: String(error?.message || error || '生成任务失败'),
    moduleIds,
  };
}

function questionIds(question) {
  return question?.knowledgePointIds || question?.knowledgeObjectiveIds || [];
}

/**
 * Executes complete lesson DAGs through one shared fair scheduler.
 *
 * Storage is dependency-injected so tests and a future server repository use the
 * same execution semantics. Every module result is merged against the latest
 * lessonId-scoped draft immediately after it settles.
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
  if (typeof loadContents !== 'function' || typeof saveContents !== 'function') {
    throw new Error('整课生成控制器需要草稿读写依赖');
  }
  const requiredDependencies = {
    generateQuestions,
    createOpenMaicClassroom,
    pollOpenMaicJob,
    validateLessonVersion,
    reviewLessonContentQuality,
    buildPublishedContentPackage,
  };
  Object.entries(requiredDependencies).forEach(([name, value]) => {
    if (typeof value !== 'function') throw new Error(`整课生成控制器缺少 ${name}`);
  });

  const listeners = new Set();
  const activeRuns = new Map();
  let runSequence = 0;

  const scheduler = suppliedScheduler || createMultiLessonGenerationScheduler({
    ...schedulerOptions,
    onTaskUpdate: (task) => {
      schedulerOptions.onTaskUpdate?.(task);
      const run = activeRuns.get(task.lessonId);
      if (!run || !run.schedulerTaskIds.has(task.id)) return;
      run.schedulerTasks.set(task.id, task);
      persistRun(run);
    },
  });

  function emit(lessonId, content) {
    listeners.forEach((listener) => listener({ lessonId, content, contents: loadContents() }));
  }

  function mutateLesson(lessonId, update) {
    const contents = loadContents();
    const nextLesson = update(contents[lessonId] || {});
    const next = { ...contents, [lessonId]: nextLesson };
    saveContents(next);
    emit(lessonId, nextLesson);
    return nextLesson;
  }

  function persistRun(run, extra = {}) {
    if (!run.graph) return null;
    const status = phaseStatus(run.graph, run.canceled);
    const schedulerTasks = [...run.schedulerTasks.values()];
    const queued = schedulerTasks.filter((task) => task.status === 'queued');
    const next = mutateLesson(run.lesson.id, (current) => ({
      ...current,
      lessonId: run.lesson.id,
      status: 'draft',
      updatedAt: new Date(now()).toISOString(),
      generationStatus: {
        ...(current.generationStatus || {}),
        runId: run.id,
        batchId: run.batchId,
        status,
        phase: run.graph.phase,
        progress: run.canceled ? Number(current.generationStatus?.progress || 0) : generationProgress(run.graph),
        message: generationMessage(run.graph, run.canceled),
        moduleStatuses: moduleStatuses(run.graph),
        queuedTaskCount: queued.length,
        queuePosition: queued.length ? Math.min(...queued.map((task) => Number(task.queuePosition || 1))) : null,
        activeTaskCount: schedulerTasks.filter((task) => task.status === 'running').length,
        repairRound: Number(run.graph.repairRound || 0),
        issues: run.graph.remainingIssues || [],
        taskGraph: serializableGraph(run.graph),
        startedAt: run.startedAt,
        updatedAt: new Date(now()).toISOString(),
        completedAt: status === 'completed' ? new Date(now()).toISOString() : current.generationStatus?.completedAt,
        ...extra,
      },
    }));
    return next;
  }

  function mutateRunContent(run, update, { incrementVersion = false } = {}) {
    return mutateLesson(run.lesson.id, (current) => {
      if (current.generationStatus?.runId && current.generationStatus.runId !== run.id) return current;
      const updated = update({ ...emptyLessonContent(run.lesson), ...current });
      return {
        ...updated,
        status: 'draft',
        version: incrementVersion ? Number(current.version || 0) + 1 : Number(current.version || 1),
        updatedAt: new Date(now()).toISOString(),
      };
    });
  }

  function currentContent(run) {
    return { ...emptyLessonContent(run.lesson), ...(loadContents()[run.lesson.id] || {}) };
  }

  function taskInstruction(run, task) {
    if (task.taskType !== 'repair') return '';
    const qualityIssues = run.graph.tasks
      .filter((item) => item.taskType === 'quality_check' && item.round === task.round - 1)
      .flatMap((item) => item.issues || [])
      .filter((issue) => (issue.moduleIds || []).includes(task.moduleId));
    const issueCopy = qualityIssues.map((issue) => issue.message).filter(Boolean).join('；');
    const content = currentContent(run);
    const targets = new Set(task.targetQuestionIds || []);
    const forbiddenStems = [...(content.preQuestions || []), ...(content.postQuestions || [])]
      .filter((question) => !targets.has(question.id))
      .map((question) => String(question.stem || '').trim())
      .filter(Boolean)
      .slice(0, 60);
    return `这是发布前自动返修。必须解决：${issueCopy || '当前模块未通过校验'}。不要复用已有题干或只替换数字改写：${JSON.stringify(forbiddenStems)}`;
  }

  async function executeQuestionTask(run, task, signal) {
    assertNotCanceled(run, signal);
    const lesson = run.lesson;
    const lessonPayload = {
      id: lesson.id,
      title: lesson.title,
      chapterTitle: lesson.chapter?.title || lesson.chapterTitle || '',
      grade: lesson.grade || '',
      subject: lesson.subject || '',
    };
    const teacherInstruction = taskInstruction(run, task);
    const generationIdentity = {
      generationModuleId: task.moduleId,
      generationTaskType: task.taskType,
      generationRunId: run.id,
    };
    let payload;
    if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT) {
      const content = currentContent(run);
      const targetIds = new Set(task.targetQuestionIds || []);
      const replacementSlots = [...(content.preQuestions || [])]
        .filter((question) => targetIds.has(question.id))
        .map(diagnosticSlotForQuestion)
        .filter(Boolean);
      const diagnosticBlueprintSlots = task.taskType === 'repair'
        ? (task.targetBlueprintSlots?.length
            ? task.targetBlueprintSlots
            : replacementSlots.length ? replacementSlots : buildPreAssessmentBlueprint(lesson.knowledgePoints))
        : buildPreAssessmentBlueprint(lesson.knowledgePoints);
      payload = {
        purpose: 'pre', lesson: lessonPayload, knowledgePoints: lesson.knowledgePoints,
        count: diagnosticBlueprintSlots.length,
        diagnosticBlueprintSlots,
        targetQuestionIds: task.targetQuestionIds || [],
        teacherInstruction,
        multiLesson: true,
        ...generationIdentity,
      };
    } else if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS) {
      const knowledgePoint = lesson.knowledgePoints.find((item) => item.id === task.knowledgePointId);
      payload = {
        purpose: 'post', lesson: lessonPayload, knowledgePoints: knowledgePoint ? [knowledgePoint] : [],
        countPerKnowledgePoint: Number(task.requiredCount || 15), reviewCount: 0, teacherInstruction,
        multiLesson: true,
        ...generationIdentity,
      };
    } else {
      payload = {
        purpose: 'post', lesson: lessonPayload, knowledgePoints: lesson.knowledgePoints,
        countPerKnowledgePoint: 0, reviewCount: Number(task.requiredCount || 6), teacherInstruction,
        multiLesson: true,
        ...generationIdentity,
      };
    }
    const response = await generateQuestions(payload, {
      signal,
      onProgress: (progress) => {
        if (run.canceled || signal.aborted) return;
        mutateLesson(run.lesson.id, (current) => ({
          ...current,
          generationStatus: {
            ...(current.generationStatus || {}),
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
      ...(task.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW ? { phase: 'review' } : {}),
    }));
    return {
      questions,
      assessmentMatrices: response.assessmentMatrices || {},
      assessmentMatrix: response.assessmentMatrix || null,
    };
  }

  function mergePartialRuntime(content, scope, runtime) {
    const learningContent = content.learningContent || { composite: content.openMaic || null, knowledgePoints: [] };
    if (scope === 'composite') {
      return { ...content, learningContent: { ...learningContent, composite: runtime } };
    }
    return {
      ...content,
      learningContent: {
        ...learningContent,
        knowledgePoints: [
          ...(learningContent.knowledgePoints || []).filter((item) => item.knowledgeObjectiveId !== scope),
          { knowledgeObjectiveId: scope, openMaic: runtime },
        ],
      },
    };
  }

  function saveOpenMaicCheckpoint(run, scope, checkpoint, partialResult = null) {
    mutateRunContent(run, (current) => {
      const jobs = { ...(current.openMaicJobs || {}) };
      if (checkpoint) jobs[scope] = checkpoint;
      else delete jobs[scope];
      let next = { ...current, openMaicJobs: jobs };
      if (partialResult?.classroomId) {
        next = mergePartialRuntime(next, scope, {
          jobId: checkpoint?.jobId || '',
          status: 'partial', partial: true,
          progress: Number(checkpoint?.progress || 0),
          step: checkpoint?.step || '',
          classroomId: partialResult.classroomId,
          classroomUrl: partialResult.url,
          scenesCount: partialResult.completedScenes || partialResult.scenesCount,
          totalScenes: partialResult.totalScenes,
          generatedAt: new Date(now()).toISOString(),
        });
      }
      return next;
    });
  }

  async function executeOpenMaicTask(run, task, signal) {
    assertNotCanceled(run, signal);
    const lesson = run.lesson;
    const scope = task.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM
      ? 'composite'
      : task.knowledgePointId;
    const content = currentContent(run);
    const savedJob = content.openMaicJobs?.[scope];
    const lessonPayload = {
      id: lesson.id,
      title: lesson.title,
      chapterTitle: lesson.chapter?.title || lesson.chapterTitle || '',
      grade: lesson.grade || '',
      subject: lesson.subject || '',
    };
    const response = savedJob?.jobId && !['failed', 'canceled', 'cancelled', 'succeeded'].includes(savedJob.status)
      ? { jobId: savedJob.jobId, status: savedJob.status }
      : await createOpenMaicClassroom({
          lesson: lessonPayload,
          knowledgePoints: scope === 'composite'
            ? lesson.knowledgePoints
            : lesson.knowledgePoints.filter((item) => item.id === scope),
          generationMode: 'deep',
          cacheOnly: false,
          batchGeneration: true,
          generationModuleId: task.moduleId,
          generationTaskType: task.taskType,
          generationRunId: run.id,
          teacherInstruction: taskInstruction(run, task),
        }, { signal });
    if (run.canceled || signal.aborted) {
      if (response.jobId) await cancelOpenMaicJob(response.jobId).catch(() => {});
      throw abortError();
    }
    if (response.status === 'succeeded' && response.result?.classroomId) {
      saveOpenMaicCheckpoint(run, scope, null);
      return {
        runtime: {
          status: 'succeeded', progress: 100,
          classroomId: response.result.classroomId,
          classroomUrl: response.result.url,
          scenesCount: response.result.scenesCount,
          generatedAt: new Date(now()).toISOString(),
          cached: Boolean(response.cached),
        },
      };
    }
    if (!response.jobId) throw new Error(`${task.label}未返回可恢复的任务标识`);
    run.openMaicJobIds.add(response.jobId);
    saveOpenMaicCheckpoint(run, scope, {
      ...(savedJob || {}),
      jobId: response.jobId,
      scope,
      status: response.status || 'queued',
      progress: Number(response.progress || 2),
      moduleId: task.moduleId,
      updatedAt: new Date(now()).toISOString(),
    });
    try {
      const result = await pollOpenMaicJob(response.jobId, {
        signal,
        lessonId: lesson.id,
        onProgress: (job) => {
          if (run.canceled || signal.aborted) return;
          const checkpoint = {
            ...job,
            jobId: response.jobId,
            scope,
            moduleId: task.moduleId,
            updatedAt: new Date(now()).toISOString(),
          };
          saveOpenMaicCheckpoint(run, scope, checkpoint, job.partialResult);
        },
      });
      assertNotCanceled(run, signal);
      saveOpenMaicCheckpoint(run, scope, null);
      return {
        runtime: {
          jobId: response.jobId,
          status: 'succeeded', progress: 100,
          classroomId: result.classroomId,
          classroomUrl: result.url || result.classroomUrl,
          scenesCount: result.scenesCount,
          generatedAt: new Date(now()).toISOString(),
        },
      };
    } catch (error) {
      if (!isCanceled(error)) {
        saveOpenMaicCheckpoint(run, scope, {
          ...(currentContent(run).openMaicJobs?.[scope] || {}),
          jobId: response.jobId,
          scope,
          moduleId: task.moduleId,
          status: 'failed',
          error: String(error.message || error),
          updatedAt: new Date(now()).toISOString(),
        });
      }
      throw error;
    } finally {
      run.openMaicJobIds.delete(response.jobId);
    }
  }

  async function settleModuleRun(run, task, { result, error }) {
    run.commitQueue = run.commitQueue.then(() => {
      if (run.canceled || (error && isCanceled(error))) return;
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
        mutateRunContent(run, (content) => applyLessonGenerationDraftPatch(content, settled.patch), {
          incrementVersion: true,
        });
      }
      persistRun(run);
    });
    await run.commitQueue;
  }

  function scheduledModuleTask(run, task) {
    const schedulerId = `${run.id}:${task.id}`;
    run.schedulerTaskIds.add(schedulerId);
    return {
      id: schedulerId,
      lessonId: run.lesson.id,
      pool: taskPool(task),
      metadata: { runId: run.id, taskId: task.id, moduleId: task.moduleId, label: task.label },
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

  async function runQualityTask(run, task, signal) {
    assertNotCanceled(run, signal);
    run.graph = startLessonGenerationTask(run.graph, task.id);
    persistRun(run);
    const content = currentContent(run);
    const stageIssues = run.graph.tasks
      .filter((item) => ['generation', 'repair'].includes(item.taskType) && item.round === task.round)
      .flatMap((item) => item.issues || []);
    let issues = [...stageIssues];
    let semanticReview = null;
    try {
      const contentPackage = buildPublishedContentPackage({ lesson: run.lesson, content });
      const structural = await validateLessonVersion(run.lesson.id, {
        schemaVersion: '2.0',
        contentPackage,
        qualityReport: { reviewMode: 'deterministic+ai', reviewedBy: 'current-teacher' },
      }, { signal });
      issues.push(...(structural.issues || []));
      if (structural.passed && issues.length === 0) {
        semanticReview = await reviewLessonContentQuality({
          lesson: {
            id: run.lesson.id,
            title: run.lesson.title,
            chapterTitle: run.lesson.chapter?.title || run.lesson.chapterTitle || '',
          },
          knowledgePoints: run.lesson.knowledgePoints,
          contentPackage,
          openMaicScenes: [],
        }, { signal });
        issues.push(...normalizedSemanticIssues(semanticReview));
      }
    } catch (error) {
      if (isCanceled(error)) throw error;
      issues.push({
        code: 'QUALITY_CHECK_UNAVAILABLE',
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
        lesson: run.lesson,
        content: currentContent(run),
      });
      mutateRunContent(run, (current) => ({
        ...current,
        qualityReport: {
          passed: issues.length === 0,
          issues,
          semanticReview,
          reviewMode: 'deterministic+ai',
          checkedAt: new Date(now()).toISOString(),
        },
      }));
      persistRun(run);
    });
    await run.commitQueue;
    return { passed: issues.length === 0, issues };
  }

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

  async function driveRun(run, initialHandles) {
    let handles = initialHandles;
    try {
      while (!run.canceled && ACTIVE_PHASES.has(run.graph.phase)) {
        if (handles.length) await Promise.all(handles.map((handle) => handle.done));
        await run.commitQueue;
        if (run.canceled) break;
        const runnable = getRunnableLessonGenerationTasks(run.graph);
        if (!runnable.length) break;
        const scheduled = runnable.map((task) => (
          task.taskType === 'quality_check'
            ? scheduledQualityTask(run, task)
            : scheduledModuleTask(run, task)
        ));
        handles = scheduler.enqueueTasks(scheduled);
        handles.forEach((handle) => run.handles.set(handle.id, handle));
        persistRun(run);
      }
      await run.commitQueue;
      if (run.canceled) persistRun(run);
      else if (run.graph.phase !== 'ready' && run.graph.phase !== 'failed') {
        run.graph = { ...run.graph, phase: 'failed', remainingIssues: [errorIssue('生成执行器未找到可运行的后续任务')] };
        persistRun(run);
      }
      return { lessonId: run.lesson.id, status: phaseStatus(run.graph, run.canceled), graph: run.graph };
    } finally {
      if (activeRuns.get(run.lesson.id) === run) activeRuns.delete(run.lesson.id);
    }
  }

  async function startLessons(lessons, { batchId = `batch-${now()}` } = {}) {
    const targets = uniqueLessons(lessons).filter((lesson) => !activeRuns.has(lesson.id));
    if (!targets.length) return [];
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
        initialContent: { ...emptyLessonContent(lesson), ...(loadContents()[lesson.id] || {}) },
      };
      activeRuns.set(lesson.id, run);
      mutateLesson(lesson.id, (current) => ({
        ...emptyLessonContent(lesson),
        ...current,
        lessonId: lesson.id,
        status: 'draft',
        generationStatus: {
          ...(current.generationStatus || {}),
          runId: run.id,
          batchId,
          status: 'queued',
          phase: 'preparing',
          progress: 1,
          message: '正在读取已有草稿与发布版本',
          startedAt: run.startedAt,
          updatedAt: new Date(now()).toISOString(),
        },
      }));
      return run;
    });

    await Promise.all(runs.map(async (run) => {
      try {
        const existing = run.initialContent;
        const prepared = await prepareContent(run.lesson, existing, {
          signal: run.prepareController.signal,
        });
        if (run.canceled) return;
        mutateRunContent(run, () => ({ ...existing, ...prepared, lessonId: run.lesson.id }));
        run.graph = createLessonGenerationTaskGraph({ lesson: run.lesson, content: currentContent(run) });
        persistRun(run);
      } catch (error) {
        run.graph = createLessonGenerationTaskGraph({ lesson: run.lesson, content: currentContent(run) });
        if (!run.canceled && !isCanceled(error)) {
          run.graph = {
            ...run.graph,
            phase: 'failed',
            remainingIssues: [{ code: 'DRAFT_PREPARE_FAILED', message: error.message, moduleIds: [] }],
          };
        }
        persistRun(run);
      }
    }));

    const runnableEntries = runs.flatMap((run) => (
      !run.canceled && run.graph?.phase === 'generation'
        ? getRunnableLessonGenerationTasks(run.graph).map((task) => ({ run, task }))
        : []
    ));
    const scheduled = runnableEntries.map(({ run, task }) => scheduledModuleTask(run, task));
    const handles = scheduler.enqueueTasks(scheduled);
    const handlesByRun = new Map(runs.map((run) => [run.id, []]));
    handles.forEach((handle) => {
      const run = runs.find((item) => handle.id.startsWith(`${item.id}:`));
      if (!run) return;
      run.handles.set(handle.id, handle);
      handlesByRun.get(run.id).push(handle);
    });
    runs.forEach((run) => {
      if (run.graph?.phase === 'failed') {
        run.promise = Promise.resolve({ lessonId: run.lesson.id, status: 'failed', graph: run.graph })
          .finally(() => { if (activeRuns.get(run.lesson.id) === run) activeRuns.delete(run.lesson.id); });
      } else {
        run.promise = driveRun(run, handlesByRun.get(run.id) || []);
      }
    });
    return Promise.allSettled(runs.map((run) => run.promise));
  }

  async function cancelLesson(lessonId) {
    const run = activeRuns.get(lessonId);
    if (!run) return { lessonId, canceled: false, canceledTaskCount: 0 };
    run.canceled = true;
    run.prepareController.abort(abortError('教师取消了这个课时的生成'));
    const canceledTaskCount = scheduler.cancelLesson(lessonId, '教师取消了这个课时的生成');
    const current = currentContent(run);
    const jobIds = new Set([
      ...run.openMaicJobIds,
      ...Object.values(current.openMaicJobs || {}).map((job) => job?.jobId).filter(Boolean),
    ]);
    const cancellationResults = await Promise.allSettled([...jobIds].map((jobId) => cancelOpenMaicJob(jobId)));
    const failedJobIds = [...jobIds].filter((_jobId, index) => cancellationResults[index]?.status === 'rejected');
    mutateRunContent(run, (content) => ({
      ...content,
      openMaicJobs: Object.fromEntries(Object.entries(content.openMaicJobs || {}).map(([scope, job]) => [
        scope,
        {
          ...job,
          status: failedJobIds.includes(job.jobId) ? 'cancellation_pending' : 'canceled',
          updatedAt: new Date(now()).toISOString(),
        },
      ])),
    }));
    persistRun(run, {
      cancelUnconfirmedJobIds: failedJobIds,
      error: failedJobIds.length ? `${failedJobIds.length} 个 MAIC 后台任务暂未确认取消` : '',
    });
    return { lessonId, canceled: true, canceledTaskCount, failedJobIds };
  }

  function resumableLessons(lessons = []) {
    const contents = loadContents();
    return uniqueLessons(lessons).filter((lesson) => {
      const generation = contents[lesson.id]?.generationStatus || {};
      return ['queued', 'generating', 'partial', 'validating', 'repairing', 'reconnecting'].includes(generation.status)
        && !activeRuns.has(lesson.id);
    });
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    startLessons,
    resumeLessons: (lessons, options) => startLessons(resumableLessons(lessons), options),
    cancelLesson,
    isLessonActive: (lessonId) => activeRuns.has(lessonId),
    getActiveLessonIds: () => [...activeRuns.keys()],
    getSchedulerSnapshot: () => scheduler.getSnapshot(),
    waitForIdle: () => scheduler.waitForIdle(),
    subscribe,
  });
}
