import {
  LESSON_GENERATION_MODULE_KIND,
  LESSON_GENERATION_TASK_STATUS,
} from "../domain/lessonContentGeneration.js";
import { GENERATION_RESOURCE_POOLS } from "../domain/multiLessonGenerationScheduler.js";

export const ACTIVE_PHASES = new Set([
  "preparing",
  "generation",
  "quality_check",
  "repair",
]);
export const QUESTION_MODULE_KINDS = new Set([
  LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT,
  LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS,
  LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW,
]);

const semanticIssueCodes = Object.freeze({
  answer_rubric: "ANSWER_RUBRIC_INCONSISTENT",
  ambiguity: "QUESTION_AMBIGUOUS",
  factual_error: "QUESTION_FACTUAL_ERROR",
  multiple_solutions: "UNINTENDED_MULTIPLE_SOLUTIONS",
  duplicate: "DUPLICATE_QUESTION",
  quality: "QUESTION_QUALITY_LOW",
  difficulty_mismatch: "QUESTION_DIFFICULTY_MISMATCH",
  shallow_reasoning: "QUESTION_REASONING_TOO_SHALLOW",
  weak_distractors: "QUESTION_DISTRACTORS_WEAK",
  generic_short_answer: "GENERIC_SHORT_ANSWER",
  question_mix: "QUESTION_MIX_INSUFFICIENT",
  fake_application: "APPLICATION_CONTEXT_FAKE",
  application_reasoning: "APPLICATION_REASONING_INCOMPLETE",
  concept_overuse: "CONCEPT_EXPLANATION_OVERUSED",
  out_of_scope: "QUESTION_OUT_OF_SCOPE",
  openmaic_coverage: "OPENMAIC_COVERAGE_MISSING",
});

/**
 *
 * @param message
 */
export function abortError(message = "课时生成已取消") {
  const error = new Error(message);
  error.name = "AbortError";
  error.code = "LESSON_GENERATION_CANCELED";
  return error;
}

/**
 *
 * @param error
 */
export function isCanceled(error) {
  return (
    error?.name === "AbortError" || error?.code === "LESSON_GENERATION_CANCELED"
  );
}

/**
 *
 * @param run
 * @param signal
 */
export function assertNotCanceled(run, signal) {
  if (run.canceled || signal?.aborted) throw abortError();
}

/**
 *
 * @param lessons
 */
export function uniqueLessons(lessons = []) {
  const seen = new Set();
  return lessons.filter((lesson) => {
    if (!lesson?.id || seen.has(lesson.id)) return false;
    seen.add(lesson.id);
    return true;
  });
}

/**
 *
 * @param lesson
 */
export function emptyLessonContent(lesson) {
  return {
    lessonId: lesson.id,
    preQuestions: [],
    postQuestions: [],
    learningContent: { composite: null, knowledgePoints: [] },
    status: "draft",
    version: 1,
  };
}

/**
 *
 * @param graph
 */
export function serializableGraph(graph) {
  return {
    ...graph,
    tasks: graph.tasks.map((task) => {
      const serializableTask = { ...task };
      delete serializableTask.outputPatch;
      return serializableTask;
    }),
  };
}

/**
 *
 * @param task
 */
export function taskPool(task) {
  // Quality checks and targeted repairs call the same question-model key, so
  // they share its 60-slot budget instead of opening a hidden third lane.
  if (["quality_check", "repair"].includes(task.taskType)) {
    return GENERATION_RESOURCE_POOLS.QUESTIONS;
  }
  return QUESTION_MODULE_KINDS.has(task.moduleKind)
    ? GENERATION_RESOURCE_POOLS.QUESTIONS
    : GENERATION_RESOURCE_POOLS.OPENMAIC;
}

/**
 *
 * @param graph
 */
export function moduleStatuses(graph) {
  const statuses = {};
  for (const task of graph.tasks) {
    if (!task.moduleId) continue;
    const status =
      task.status === LESSON_GENERATION_TASK_STATUS.COMPLETED
        ? "ready"
        : task.status;
    statuses[task.moduleId] = status;
  }
  return statuses;
}

/**
 *
 * @param graph
 * @param canceled
 */
export function phaseStatus(graph, canceled = false) {
  if (canceled) return "canceled";
  if (graph.phase === "ready") return "completed";
  if (graph.phase === "failed") return "failed";
  if (graph.phase === "quality_check") return "validating";
  if (graph.phase === "repair") return "repairing";
  const runnable = graph.tasks.filter(
    (task) =>
      ["pending", "running"].includes(task.status) &&
      task.taskType !== "quality_check",
  );
  return runnable.some((task) => task.status === "running")
    ? "generating"
    : "queued";
}

/**
 *
 * @param graph
 */
export function generationProgress(graph) {
  if (graph.phase === "ready") return 100;
  const initialTasks = graph.tasks.filter(
    (task) => task.taskType === "generation",
  );
  const settledInitial = initialTasks.filter((task) =>
    ["completed", "partial", "failed"].includes(task.status),
  ).length;
  const generationProgressValue =
    initialTasks.length > 0
      ? 2 + Math.round((settledInitial / initialTasks.length) * 76)
      : 78;
  if (graph.phase === "generation")
    return Math.min(78, generationProgressValue);
  const repairProgress = generationRepairProgress(graph);
  if (repairProgress !== null) return repairProgress;
  return graph.phase === "failed"
    ? Math.min(99, generationProgressValue)
    : generationProgressValue;
}

/**
 * 质检和返修阶段使用独立进度上限，避免主进度计算承担阶段分支。
 * @param graph
 */
function generationRepairProgress(graph) {
  if (graph.phase === "quality_check")
    return Math.min(94, 82 + Number(graph.repairRound || 0) * 5);
  if (graph.phase === "repair")
    return Math.min(96, 84 + Number(graph.repairRound || 0) * 5);
  return null;
}

/**
 *
 * @param graph
 * @param canceled
 */
export function generationMessage(graph, canceled = false) {
  if (canceled) return "已取消未完成任务，已生成内容仍保留在草稿";
  if (graph.phase === "ready")
    return "整课内容已通过规则与 AI 质检，等待教师预览确认";
  if (graph.phase === "failed")
    return "已保留完成内容，仍有问题需重试或人工处理";
  if (graph.phase === "quality_check")
    return "正在执行规则校验与 AI 合理性、重题检查";
  if (graph.phase === "repair")
    return `正在定向返修（第 ${graph.repairRound} 轮）`;
  const initialTasks = graph.tasks.filter(
    (task) => task.taskType === "generation",
  );
  const settled = initialTasks.filter((task) =>
    ["completed", "partial", "failed"].includes(task.status),
  ).length;
  return `题目与 MAIC 已拆分排队 · 已完成 ${settled}/${initialTasks.length}`;
}

/**
 *
 * @param review
 */
export function normalizedSemanticIssues(review = {}) {
  return (review.issues || []).map((issue) => ({
    ...issue,
    code:
      semanticIssueCodes[issue.type] ||
      String(issue.code || "QUESTION_QUALITY_LOW").toUpperCase(),
    message: [issue.questionId ? `题目 ${issue.questionId}` : "", issue.message]
      .filter(Boolean)
      .join("："),
  }));
}

/**
 *
 * @param error
 * @param moduleIds
 */
export function errorIssue(error, moduleIds = []) {
  return {
    code: "GENERATION_FAILED",
    message: String(error?.message || error || "生成任务失败"),
    moduleIds,
  };
}

/**
 *
 * @param question
 */
export function questionIds(question) {
  return question?.knowledgePointIds || question?.knowledgeObjectiveIds || [];
}
