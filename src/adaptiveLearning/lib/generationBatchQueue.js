import { adaptiveApiUrl } from "../shared/infrastructure/runtimeEndpoints.js";

const createAbortError = (message) => {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
};

/**
 * 取消已经落到 BFF 队列中的生成任务。取消失败不应覆盖浏览器侧的 AbortError。
 * @param {string} taskId 生成任务 ID
 * @returns {Promise<void>}
 */
export async function cancelPersistedGenerationTask(taskId) {
  try {
    await fetch(
      adaptiveApiUrl(
        `/api/generation-tasks/${encodeURIComponent(taskId)}/cancel`,
      ),
      { method: "POST" },
    );
  } catch {
    // 浏览器侧取消已经生效，BFF 清理失败不能覆盖原始 AbortError。
  }
}

const settleBatchEntry = (entry, method, value) => {
  if (entry.settled) return;
  entry.settled = true;
  entry.signal?.removeEventListener("abort", entry.onAbort);
  entry[method](value);
};

/**
 * 统一拥有批生成队列的取消、收尾和监听器生命周期；领域 API 只处理各自协议。
 * @param {object} configuration 队列配置
 * @param {number} configuration.batchSize 单批最大任务数
 * @param {string} configuration.idPrefix 任务 ID 前缀
 * @param {string} configuration.abortMessage 用户取消时的错误文案
 * @param {() => Error} configuration.missingResultError 未返回结果时的错误
 * @param {(taskId: string) => Promise<void>} configuration.cancelTask 服务端取消入口
 * @param {(entries: object[], tools: object) => Promise<void>} configuration.dispatchBatch 协议分发器
 * @returns {(payload: object, options?: object) => Promise<unknown>} 入队函数
 */
export function createGenerationBatchQueue({
  batchSize,
  idPrefix,
  abortMessage,
  missingResultError,
  cancelTask = cancelPersistedGenerationTask,
  dispatchBatch,
}) {
  let sequence = 0;
  let timer = null;
  const pending = [];

  const dispatch = async (entries) => {
    const activeEntries = entries.filter((entry) => !entry.settled);
    if (activeEntries.length === 0) return;
    const controller = new AbortController();
    for (const entry of activeEntries) {
      entry.batchController = controller;
      entry.batchEntries = activeEntries;
    }

    try {
      await dispatchBatch(activeEntries, {
        signal: controller.signal,
        settle: settleBatchEntry,
      });
      for (const entry of activeEntries) {
        if (!entry.settled)
          settleBatchEntry(entry, "reject", missingResultError());
      }
    } catch (error) {
      for (const entry of activeEntries) {
        if (!entry.settled) settleBatchEntry(entry, "reject", error);
      }
    }
  };

  const flush = () => {
    timer = null;
    while (pending.length > 0) {
      void dispatch(pending.splice(0, batchSize));
    }
  };

  return (payload, options = {}) =>
    new Promise((resolve, reject) => {
      sequence += 1;
      const { signal, ...context } = options;
      const entry = {
        id: `${idPrefix}-${Date.now()}-${sequence}`,
        payload,
        context,
        signal,
        resolve,
        reject,
        settled: false,
        batchController: null,
        batchEntries: null,
        onAbort: null,
      };
      entry.onAbort = () => {
        void cancelTask(entry.id);
        settleBatchEntry(
          entry,
          "reject",
          signal?.reason || createAbortError(abortMessage),
        );
        if (
          entry.batchController &&
          entry.batchEntries.every((item) => item.settled)
        ) {
          entry.batchController.abort();
        }
      };
      if (signal?.aborted) {
        entry.onAbort();
        return;
      }
      signal?.addEventListener("abort", entry.onAbort, { once: true });
      pending.push(entry);
      if (!timer) timer = setTimeout(flush, 0);
    });
}
