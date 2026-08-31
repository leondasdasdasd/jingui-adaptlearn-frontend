const QUESTION_BATCH_SIZE = 60;
let questionBatchSequence = 0;
let questionBatchTimer = null;
const pendingQuestionBatch = [];

function abortError(message = '题目生成已取消') {
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

async function dispatchQuestionBatch(entries) {
  const activeEntries = entries.filter((entry) => !entry.settled);
  if (!activeEntries.length) return;
  const batchController = new AbortController();
  activeEntries.forEach((entry) => {
    entry.batchController = batchController;
    entry.batchEntries = activeEntries;
  });

  try {
    const response = await fetch('/api/questions/generate-batch-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks: activeEntries.map((entry) => ({ id: entry.id, payload: entry.payload })),
      }),
      signal: batchController.signal,
    });
    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || '题目批量任务提交失败');
    }

    const entriesById = new Map(activeEntries.map((entry) => [entry.id, entry]));
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const handleLine = (line) => {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      const entry = entriesById.get(event.id);
      if (!entry || entry.settled) return;
      if (event.type === 'status') entry.onProgress?.(event);
      else if (event.type === 'error') settleBatchEntry(entry, 'reject', new Error(event.message || '题目生成失败'));
      else if (event.type === 'complete') settleBatchEntry(entry, 'resolve', event.data);
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(handleLine);
      if (done) break;
    }
    if (buffer.trim()) handleLine(buffer);
    activeEntries.forEach((entry) => {
      if (!entry.settled) settleBatchEntry(entry, 'reject', new Error('题目批量任务未返回结果，请重试'));
    });
  } catch (error) {
    activeEntries.forEach((entry) => {
      if (!entry.settled) settleBatchEntry(entry, 'reject', error);
    });
  }
}

function flushQuestionBatch() {
  questionBatchTimer = null;
  while (pendingQuestionBatch.length) {
    const entries = pendingQuestionBatch.splice(0, QUESTION_BATCH_SIZE);
    void dispatchQuestionBatch(entries);
  }
}

function enqueueQuestionBatch(payload, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    questionBatchSequence += 1;
    const entry = {
      id: `question-${Date.now()}-${questionBatchSequence}`,
      payload,
      onProgress,
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
    pendingQuestionBatch.push(entry);
    if (!questionBatchTimer) questionBatchTimer = setTimeout(flushQuestionBatch, 0);
  });
}

async function generateSingleQuestionSet(payload, { onProgress, signal } = {}) {
  const response = await fetch('/api/questions/generate-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || '题目准备失败，请稍后再试');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  const handleLine = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === 'status') onProgress?.(event);
    if (event.type === 'error') throw new Error(event.message || '题目准备失败，请稍后再试');
    if (event.type === 'complete') result = event.data;
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(handleLine);
    if (done) break;
  }
  if (buffer.trim()) handleLine(buffer);
  if (!result) throw new Error('暂时没有准备好题目，请再试一次');
  return result;
}

export async function generateQuestions(payload, options = {}) {
  if (payload.multiLesson) return enqueueQuestionBatch(payload, options);
  return generateSingleQuestionSet(payload, options);
}

export async function generateQuestionSlotsConcurrently(payload, { onEvent, signal } = {}) {
  const response = await fetch('/api/questions/generate-slots-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || '插槽题目生成失败，请稍后再试');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let summary = null;
  const handleLine = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    onEvent?.(event);
    if (event.type === 'complete') summary = event;
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(handleLine);
    if (done) break;
  }
  if (buffer.trim()) handleLine(buffer);
  if (!summary) throw new Error('插槽题目生成未正常结束，请重试未完成插槽');
  return summary;
}

export async function generateAssessmentMatrices(payload, { signal } = {}) {
  const response = await fetch('/api/assessment-matrices/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || '评估矩阵生成失败，请稍后再试');
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function reviewLessonContentQuality(payload, { signal } = {}) {
  const response = await fetch('/api/content-quality/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || `内容质量检查暂时失败（${response.status}）`);
    error.status = response.status;
    error.payload = body;
    error.endpoint = '/api/content-quality/review';
    throw error;
  }
  return body;
}
