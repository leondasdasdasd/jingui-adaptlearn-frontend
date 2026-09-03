/* eslint-disable complexity -- OpenMAIC 批响应需要逐项处理成功、失败、取消后孤儿任务三类协议状态。 */
import { adaptiveApiUrl } from "../shared/infrastructure/runtimeEndpoints.js";
import { createGenerationBatchQueue } from "./generationBatchQueue.js";

/**
 *
 * @param jobId
 */
async function cancelOrphanedJob(jobId) {
  if (!jobId) return;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(
        adaptiveApiUrl(`/api/openmaic/jobs/${encodeURIComponent(jobId)}`),
        { method: "DELETE" },
      );
      if (response.ok) return;
    } catch {
      // The server may still be publishing the just-created job into its queue.
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 100));
  }
}

/**
 *
 * @param entries
 * @param root0
 * @param root0.signal
 * @param root0.settle
 */
async function dispatchOpenMaicBatch(entries, { signal, settle }) {
  const response = await fetch(
    adaptiveApiUrl("/api/openmaic/classrooms/batch"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: entries.map((entry) => {
          const payload = { ...entry.payload };
          delete payload.batchGeneration;
          return { id: entry.id, payload };
        }),
      }),
      signal,
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(body.results)) {
    throw new Error(body.message || "学习内容批量任务提交失败");
  }
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  for (const result of body.results) {
    const entry = entriesById.get(result.id);
    if (!entry || entry.settled) {
      if (result.data?.jobId) void cancelOrphanedJob(result.data.jobId);
      continue;
    }
    if (!result.ok) {
      settle(
        entry,
        "reject",
        new Error(result.data?.message || "学习内容准备失败，请稍后重试"),
      );
      continue;
    }
    settle(entry, "resolve", result.data);
  }
}

const enqueueOpenMaicBatch = createGenerationBatchQueue({
  batchSize: 60,
  idPrefix: "openmaic",
  abortMessage: "学习内容生成已取消",
  missingResultError: () => new Error("学习内容批量任务未返回结果，请重试"),
  dispatchBatch: dispatchOpenMaicBatch,
});

/**
 *
 * @param payload
 * @param root0
 * @param root0.signal
 */
async function createSingleOpenMaicClassroom(payload, { signal } = {}) {
  const response = await fetch(adaptiveApiUrl("/api/openmaic/classrooms"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.message || "学习内容准备失败，请稍后重试");
  return body;
}

/**
 *
 * @param payload
 * @param options
 */
export async function createOpenMaicClassroom(payload, options = {}) {
  if (payload.batchGeneration) return enqueueOpenMaicBatch(payload, options);
  return createSingleOpenMaicClassroom(payload, options);
}

/**
 *
 * @param jobId
 */
export async function getOpenMaicJob(jobId) {
  const response = await fetch(
    adaptiveApiUrl(`/api/openmaic/jobs/${encodeURIComponent(jobId)}`),
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.message || "暂时无法获取准备进度，请稍后重试");
  return body;
}

/**
 *
 * @param jobId
 */
export async function cancelOpenMaicJob(jobId) {
  const response = await fetch(
    adaptiveApiUrl(`/api/openmaic/jobs/${encodeURIComponent(jobId)}`),
    {
      method: "DELETE",
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "暂时无法取消学习内容生成");
  return body;
}

/**
 *
 * @param classroomId
 */
export async function getOpenMaicClassroom(classroomId) {
  const response = await fetch(
    adaptiveApiUrl(
      `/api/openmaic/classrooms/${encodeURIComponent(classroomId)}`,
    ),
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "暂时无法读取课堂内容");
  return body.classroom;
}

/**
 *
 * @param classroomId
 * @param payload
 */
export async function incrementallyEditOpenMaicClassroom(classroomId, payload) {
  const response = await fetch(
    adaptiveApiUrl(
      `/api/openmaic/classrooms/${encodeURIComponent(classroomId)}/incremental-edit`,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.message || "课堂内容修改失败，请稍后重试");
  return body;
}
