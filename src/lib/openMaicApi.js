const OPENMAIC_BATCH_SIZE = 60;
let openMaicBatchSequence = 0;
let openMaicBatchTimer = null;
const pendingOpenMaicBatch = [];

function abortError(message = '学习内容生成已取消') {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function cancelPersistedTask(taskId) {
  return fetch(`/api/generation-tasks/${encodeURIComponent(taskId)}/cancel`, { method: 'POST' }).catch(() => {});
}

function settleBatchEntry(entry, method, value) {
  if (entry.settled) return;
  entry.settled = true;
  entry.signal?.removeEventListener('abort', entry.onAbort);
  entry[method](value);
}

async function cancelOrphanedJob(jobId) {
  if (!jobId) return;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`/api/openmaic/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
      if (response.ok) return;
    } catch {
      // The server may still be publishing the just-created job into its queue.
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 100));
  }
}

async function dispatchOpenMaicBatch(entries) {
  const activeEntries = entries.filter((entry) => !entry.settled);
  if (!activeEntries.length) return;
  const batchController = new AbortController();
  activeEntries.forEach((entry) => {
    entry.batchController = batchController;
    entry.batchEntries = activeEntries;
  });

  try {
    const response = await fetch('/api/openmaic/classrooms/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks: activeEntries.map((entry) => {
          const { batchGeneration: _batchGeneration, ...payload } = entry.payload;
          return { id: entry.id, payload };
        }),
      }),
      signal: batchController.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(body.results)) {
      throw new Error(body.message || '学习内容批量任务提交失败');
    }
    const entriesById = new Map(activeEntries.map((entry) => [entry.id, entry]));
    body.results.forEach((result) => {
      const entry = entriesById.get(result.id);
      if (!entry || entry.settled) {
        if (result.data?.jobId) void cancelOrphanedJob(result.data.jobId);
        return;
      }
      if (!result.ok) {
        settleBatchEntry(entry, 'reject', new Error(result.data?.message || '学习内容准备失败，请稍后重试'));
        return;
      }
      settleBatchEntry(entry, 'resolve', result.data);
    });
    activeEntries.forEach((entry) => {
      if (!entry.settled) settleBatchEntry(entry, 'reject', new Error('学习内容批量任务未返回结果，请重试'));
    });
  } catch (error) {
    activeEntries.forEach((entry) => {
      if (!entry.settled) settleBatchEntry(entry, 'reject', error);
    });
  }
}

function flushOpenMaicBatch() {
  openMaicBatchTimer = null;
  while (pendingOpenMaicBatch.length) {
    const entries = pendingOpenMaicBatch.splice(0, OPENMAIC_BATCH_SIZE);
    void dispatchOpenMaicBatch(entries);
  }
}

function enqueueOpenMaicBatch(payload, { signal } = {}) {
  return new Promise((resolve, reject) => {
    openMaicBatchSequence += 1;
    const entry = {
      id: `openmaic-${Date.now()}-${openMaicBatchSequence}`,
      payload,
      signal,
      resolve,
      reject,
      settled: false,
      batchController: null,
      batchEntries: null,
      onAbort: null,
    };
    entry.onAbort = () => {
      void cancelPersistedTask(entry.id);
      settleBatchEntry(entry, 'reject', signal?.reason || abortError());
      if (entry.batchController && entry.batchEntries.every((item) => item.settled)) {
        entry.batchController.abort();
      }
    };
    if (signal?.aborted) {
      entry.onAbort();
      return;
    }
    signal?.addEventListener('abort', entry.onAbort, { once: true });
    pendingOpenMaicBatch.push(entry);
    if (!openMaicBatchTimer) openMaicBatchTimer = setTimeout(flushOpenMaicBatch, 0);
  });
}

async function createSingleOpenMaicClassroom(payload, { signal } = {}) {
  const response = await fetch('/api/openmaic/classrooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || '学习内容准备失败，请稍后重试');
  return body;
}

export async function createOpenMaicClassroom(payload, options = {}) {
  if (payload.batchGeneration) return enqueueOpenMaicBatch(payload, options);
  return createSingleOpenMaicClassroom(payload, options);
}

export async function getOpenMaicJob(jobId) {
  const response = await fetch(`/api/openmaic/jobs/${encodeURIComponent(jobId)}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || '暂时无法获取准备进度，请稍后重试');
  return body;
}

export async function cancelOpenMaicJob(jobId) {
  const response = await fetch(`/api/openmaic/jobs/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || '暂时无法取消学习内容生成');
  return body;
}

export async function getOpenMaicClassroom(classroomId) {
  const response = await fetch(`/api/openmaic/classrooms/${encodeURIComponent(classroomId)}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || '暂时无法读取课堂内容');
  return body.classroom;
}

export async function incrementallyEditOpenMaicClassroom(classroomId, payload) {
  const response = await fetch(`/api/openmaic/classrooms/${encodeURIComponent(classroomId)}/incremental-edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || '课堂内容修改失败，请稍后重试');
  return body;
}
