import { buildLessonGenerationDraftPatch } from "./draftPatch.js";
import {
  ensureQualityCheckTask,
  isTerminalTask,
  LESSON_GENERATION_TASK_STATUS,
} from "./taskGraph.js";
import {
  taskIssue,
  validateLessonGenerationTaskResult,
} from "./taskValidation.js";

/**
 *
 * @param root0
 * @param root0.graph
 * @param root0.taskId
 * @param root0.result
 * @param root0.error
 * @param root0.lesson
 * @param root0.content
 */
export function settleLessonGenerationTask({
  graph,
  taskId,
  result,
  error,
  lesson,
  content,
}) {
  const task = graph.tasks.find((item) => item.id === taskId);
  if (
    !task ||
    !["generation", "repair"].includes(task.taskType) ||
    isTerminalTask(task)
  ) {
    return { graph, task, patch: null };
  }
  const settlement = generationTaskSettlement({
    task,
    result,
    error,
    lesson,
    content,
  });
  const settledTask = {
    ...task,
    status: settlement.status,
    issues: settlement.issues,
    outputPatch: settlement.patch,
    error: error?.message || "",
  };
  const updated = {
    ...graph,
    tasks: graph.tasks.map((item) => (item.id === taskId ? settledTask : item)),
  };
  return {
    graph: ensureQualityCheckTask(updated, task.round),
    task: settledTask,
    patch: settlement.patch,
  };
}

/**
 *
 * @param root0
 * @param root0.task
 * @param root0.result
 * @param root0.error
 * @param root0.lesson
 * @param root0.content
 */
function generationTaskSettlement({ task, result, error, lesson, content }) {
  if (error) {
    return {
      issues: [
        taskIssue(task, "GENERATION_FAILED", error.message || String(error)),
      ],
      patch: null,
      status: LESSON_GENERATION_TASK_STATUS.FAILED,
    };
  }
  const issues = validateLessonGenerationTaskResult({
    task,
    result,
    lesson,
    content,
  });
  const patch = buildLessonGenerationDraftPatch({ task, result });
  const status = patch
    ? issues.length > 0
      ? LESSON_GENERATION_TASK_STATUS.PARTIAL
      : LESSON_GENERATION_TASK_STATUS.COMPLETED
    : LESSON_GENERATION_TASK_STATUS.FAILED;
  return { issues, patch, status };
}

/**
 *
 * @param root0
 * @param root0.graph
 * @param root0.taskId
 * @param root0.issues
 */
export function settleLessonQualityCheck({
  graph,
  taskId,
  issues = [],
}) {
  const task = graph.tasks.find((item) => item.id === taskId);
  if (!task || task.taskType !== "quality_check" || isTerminalTask(task))
    return graph;
  const passed = issues.length === 0;
  const settledQualityTask = {
    ...task,
    status: LESSON_GENERATION_TASK_STATUS.COMPLETED,
    passed,
    issues,
  };
  return {
    ...graph,
    phase: "ready",
    exhausted: false,
    remainingIssues: issues,
    tasks: graph.tasks.map((item) =>
      item.id === taskId ? settledQualityTask : item,
    ),
  };
}
