/**
 *
 * @param lessonIds
 * @param root0
 * @param root0.signal
 */
export async function getLessonGenerationTasks(lessonIds, { signal } = {}) {
  const ids = [...new Set(lessonIds)].filter(Boolean);
  if (ids.length === 0) return {};
  const response = await fetch(
    adaptiveApiUrl(
      `/api/generation-tasks?lessonIds=${encodeURIComponent(ids.join(","))}`,
    ),
    { signal },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "暂时无法读取后端生成任务");
  return body.lessons || {};
}

/**
 *
 * @param tasks
 */
export function databaseGenerationState(tasks = []) {
  if (tasks.length === 0) return null;
  const newest = [...tasks].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt)),
  )[0];
  const runId = newest?.runId || newest?.payload?.generationRunId;
  const runTasks = runId
    ? tasks.filter(
        (task) => (task.runId || task.payload?.generationRunId) === runId,
      )
    : [newest];
  const counts = runTasks.reduce((result, task) => {
    result[task.status] = (result[task.status] || 0) + 1;
    return result;
  }, {});
  const total = runTasks.length;
  const terminal =
    (counts.completed || 0) + (counts.failed || 0) + (counts.canceled || 0);
  const status = counts.running
    ? "generating"
    : counts.queued
      ? "queued"
      : counts.failed
        ? "failed"
        : counts.canceled
          ? "canceled"
          : "completed";
  return {
    status,
    progress: total ? Math.round((terminal / total) * 100) : 0,
    message: counts.running
      ? `后端工作器执行中 · ${counts.running}/${total}`
      : counts.queued
        ? `数据库排队中 · ${counts.queued}/${total}`
        : status === "failed"
          ? "后端任务失败，已保留完成结果和失败原因"
          : status === "canceled"
            ? "后端任务已取消，完成结果仍保留"
            : "后端任务已完成",
    databaseAuthoritative: true,
    taskCount: total,
    counts,
    runId,
    updatedAt: newest.updatedAt,
  };
}
import { adaptiveApiUrl } from "../shared/infrastructure/runtimeEndpoints.js";
