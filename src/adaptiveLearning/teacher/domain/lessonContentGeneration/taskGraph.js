import {
  buildLessonGenerationModules,
  generationActionForModule,
} from "./modules.js";
export const LESSON_GENERATION_TASK_STATUS = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  PARTIAL: "partial",
  FAILED: "failed",
});

const TERMINAL_TASK_STATUSES = new Set([
  LESSON_GENERATION_TASK_STATUS.COMPLETED,
  LESSON_GENERATION_TASK_STATUS.PARTIAL,
  LESSON_GENERATION_TASK_STATUS.FAILED,
]);

/**
 *
 * @param task
 */
export function isTerminalTask(task) {
  return TERMINAL_TASK_STATUSES.has(task.status);
}

/**
 *
 * @param module
 * @param root0
 * @param root0.taskType
 * @param root0.round
 * @param root0.dependencies
 * @param root0.targetQuestionIds
 * @param root0.targetBlueprintSlots
 */
export function createModuleTask(
  module,
  {
    taskType = "generation",
    round = 0,
    dependencies = [],
    targetQuestionIds = [],
    targetBlueprintSlots = [],
  } = {},
) {
  const action = generationActionForModule(module);
  const taskPrefix = taskType === "repair" ? `repair:${round}` : "generate";
  return {
    id: `${taskPrefix}:${module.id}`,
    taskType,
    round,
    moduleId: module.id,
    moduleKind: module.kind,
    label: module.label,
    knowledgePointId: module.knowledgePointId,
    requiredCount:
      taskType === "repair" &&
      (targetQuestionIds.length > 0 || targetBlueprintSlots.length > 0)
        ? targetQuestionIds.length + targetBlueprintSlots.length
        : module.requiredCount,
    operation: action,
    dependencies,
    targetQuestionIds,
    targetBlueprintSlots,
    preserved: taskType === "generation" && module.complete,
    status:
      taskType === "generation" && module.complete
        ? LESSON_GENERATION_TASK_STATUS.COMPLETED
        : LESSON_GENERATION_TASK_STATUS.PENDING,
    issues: [],
    outputPatch: null,
  };
}

/**
 *
 * @param graph
 * @param task
 */
function taskDependenciesSettled(graph, task) {
  return task.dependencies.every((dependencyId) => {
    const dependency = graph.tasks.find((item) => item.id === dependencyId);
    return dependency && isTerminalTask(dependency);
  });
}

/**
 *
 * @param graph
 * @param round
 */
export function ensureQualityCheckTask(graph, round) {
  const taskType = round === 0 ? "generation" : "repair";
  const stageTasks = graph.tasks.filter(
    (task) => task.taskType === taskType && task.round === round,
  );
  if (
    stageTasks.length === 0 ||
    stageTasks.some((task) => !isTerminalTask(task))
  )
    return graph;
  const qualityTaskId = `quality-check:${round}`;
  if (graph.tasks.some((task) => task.id === qualityTaskId)) return graph;
  return {
    ...graph,
    phase: "quality_check",
    tasks: [
      ...graph.tasks,
      {
        id: qualityTaskId,
        taskType: "quality_check",
        round,
        label: round === 0 ? "整课质量检查" : `第 ${round} 轮修补质量检查`,
        dependencies: stageTasks.map((task) => task.id),
        status: LESSON_GENERATION_TASK_STATUS.PENDING,
        issues: [],
        passed: null,
      },
    ],
  };
}

/**
 * Creates one DAG per lesson. All generation nodes are independent and runnable in parallel.
 * @param root0
 * @param root0.lesson
 * @param root0.content
 */
export function createLessonGenerationTaskGraph({ lesson, content }) {
  const modules = buildLessonGenerationModules({ lesson, content });
  const graph = {
    lessonId: lesson?.id || content?.lessonId || "",
    phase: "generation",
    repairRound: 0,
    exhausted: false,
    tasks: modules.map((module) => createModuleTask(module)),
  };
  return ensureQualityCheckTask(graph, 0);
}

/**
 *
 * @param graph
 */
export function getRunnableLessonGenerationTasks(graph) {
  return graph.tasks.filter(
    (task) =>
      task.status === LESSON_GENERATION_TASK_STATUS.PENDING &&
      taskDependenciesSettled(graph, task),
  );
}

/**
 *
 * @param graph
 * @param taskId
 */
export function startLessonGenerationTask(graph, taskId) {
  const task = graph.tasks.find((item) => item.id === taskId);
  if (
    !task ||
    task.status !== LESSON_GENERATION_TASK_STATUS.PENDING ||
    !taskDependenciesSettled(graph, task)
  )
    return graph;
  return {
    ...graph,
    tasks: graph.tasks.map((item) =>
      item.id === taskId
        ? { ...item, status: LESSON_GENERATION_TASK_STATUS.RUNNING }
        : item,
    ),
  };
}

/**
 *
 * @param value
 */
