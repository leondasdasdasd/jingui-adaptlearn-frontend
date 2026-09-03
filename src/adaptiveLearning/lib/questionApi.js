import { adaptiveApiUrl } from "../shared/infrastructure/runtimeEndpoints.js";
/* eslint-disable complexity, no-constant-condition -- 流式协议必须持续读取直到 reader 返回 done，并处理多种事件状态。 */
import { createGenerationBatchQueue } from "./generationBatchQueue.js";

/**
 *
 * @param entries
 * @param root0
 * @param root0.signal
 * @param root0.settle
 */
async function dispatchQuestionBatch(entries, { signal, settle }) {
  const response = await fetch(
    adaptiveApiUrl("/api/questions/generate-batch-stream"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: entries.map((entry) => ({
          id: entry.id,
          payload: entry.payload,
        })),
      }),
      signal,
    },
  );
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "题目批量任务提交失败");
  }

  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const handleLine = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    const entry = entriesById.get(event.id);
    if (!entry || entry.settled) return;
    switch (event.type) {
      case "status": {
        entry.context.onProgress?.(event);
        break;
      }
      case "error": {
        settle(entry, "reject", new Error(event.message || "题目生成失败"));
        break;
      }
      case "complete": {
        {
          settle(entry, "resolve", event.data);
          // No default
        }
        break;
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) handleLine(line);
    if (done) break;
  }
  if (buffer.trim()) handleLine(buffer);
}

const enqueueQuestionBatch = createGenerationBatchQueue({
  batchSize: 60,
  idPrefix: "question",
  abortMessage: "题目生成已取消",
  missingResultError: () => new Error("题目批量任务未返回结果，请重试"),
  dispatchBatch: dispatchQuestionBatch,
});

/**
 *
 * @param payload
 * @param root0
 * @param root0.onProgress
 * @param root0.signal
 */
async function generateSingleQuestionSet(payload, { onProgress, signal } = {}) {
  const response = await fetch(
    adaptiveApiUrl("/api/questions/generate-stream"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    },
  );

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "题目准备失败，请稍后再试");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;

  const handleLine = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "status") onProgress?.(event);
    if (event.type === "error")
      throw new Error(event.message || "题目准备失败，请稍后再试");
    if (event.type === "complete") result = event.data;
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) handleLine(line);
    if (done) break;
  }
  if (buffer.trim()) handleLine(buffer);
  if (!result) throw new Error("暂时没有准备好题目，请再试一次");
  return result;
}

/**
 *
 * @param payload
 * @param options
 */
export async function generateQuestions(payload, options = {}) {
  if (payload.multiLesson) return enqueueQuestionBatch(payload, options);
  return generateSingleQuestionSet(payload, options);
}

/**
 *
 * @param payload
 * @param root0
 * @param root0.onEvent
 * @param root0.signal
 */
export async function generateQuestionSlotsConcurrently(
  payload,
  { onEvent, signal } = {},
) {
  const response = await fetch(
    adaptiveApiUrl("/api/questions/generate-slots-stream"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    },
  );
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "插槽题目生成失败，请稍后再试");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let summary = null;
  const handleLine = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    onEvent?.(event);
    if (event.type === "complete") summary = event;
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) handleLine(line);
    if (done) break;
  }
  if (buffer.trim()) handleLine(buffer);
  if (!summary) throw new Error("插槽题目生成未正常结束，请重试未完成插槽");
  return summary;
}

/**
 *
 * @param payload
 * @param root0
 * @param root0.signal
 */
export async function generateAssessmentMatrices(payload, { signal } = {}) {
  const response = await fetch(
    adaptiveApiUrl("/api/assessment-matrices/generate"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "评估矩阵生成失败，请稍后再试");
    error.status = response.status;
    throw error;
  }
  return body;
}

/**
 * 使用已确认的评估矩阵独立规划题目插槽，不生成题目内容。
 * @param payload
 * @param root0
 * @param root0.signal
 */
export async function generateAssessmentQuestionSlots(
  payload,
  { signal } = {},
) {
  const response = await fetch(
    adaptiveApiUrl("/api/assessment-question-slots/generate"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "题目插槽规划失败，请稍后再试");
    error.status = response.status;
    throw error;
  }
  return body;
}

/**
 *
 * @param payload
 * @param root0
 * @param root0.signal
 */
export async function reviewLessonContentQuality(payload, { signal } = {}) {
  const endpoint = adaptiveApiUrl("/api/content-quality/review");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      body.message || `内容质量检查暂时失败（${response.status}）`,
    );
    error.status = response.status;
    error.payload = body;
    error.endpoint = endpoint;
    throw error;
  }
  return body;
}
