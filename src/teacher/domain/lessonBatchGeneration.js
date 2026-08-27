export const lessonGenerationStatus = {
  idle: { label: '未生成', tone: 'muted' },
  queued: { label: '排队中', tone: 'info' },
  generating: { label: '生成中', tone: 'info' },
  partial: { label: '已保存部分内容', tone: 'info' },
  reconnecting: { label: '正在重连', tone: 'warning' },
  completed: { label: '已完成', tone: 'success' },
  canceled: { label: '已取消', tone: 'muted' },
  failed: { label: '生成失败', tone: 'error' },
};

/** Applies one lesson update without replacing sibling lesson drafts in shared storage. */
export function updateLessonGenerationRecord(records = {}, lessonId, update) {
  if (!lessonId || typeof update !== 'function') return records;
  return {
    ...records,
    [lessonId]: update(records[lessonId] || {}),
  };
}

/** Prevents a late poll from an older job overwriting a newer job for the same lesson. */
export function canApplyLessonJobUpdate(content = {}, jobId = '') {
  const currentJobId = String(content.generationStatus?.jobId || '');
  return !currentJobId || !jobId || currentJobId === jobId;
}

export function isResumableLessonGeneration(status = '') {
  return !['completed', 'succeeded', 'failed', 'canceled', 'cancelled'].includes(status);
}

export function generationStateForLesson(content = {}) {
  const saved = content.generationStatus || {};
  const normalizedStatus = saved.status === 'succeeded'
    ? 'completed'
    : saved.status === 'cancelled'
      ? 'canceled'
      : saved.status;
  if (lessonGenerationStatus[normalizedStatus]) {
    return { ...saved, status: normalizedStatus, progress: Number(saved.progress || 0) };
  }
  const composite = content.learningContent?.composite || content.openMaic;
  if (composite?.classroomId && composite?.classroomUrl) {
    return { status: 'completed', progress: 100, error: '' };
  }
  return { status: 'idle', progress: 0, error: '' };
}

function lessonGenerationCancelledError(lessonId = '') {
  const error = new Error('课时生成已取消');
  error.name = 'AbortError';
  error.code = 'LESSON_GENERATION_CANCELLED';
  error.lessonId = lessonId;
  return error;
}

export function isLessonGenerationCancelled(error) {
  return error?.code === 'LESSON_GENERATION_CANCELLED' || error?.name === 'AbortError';
}

function assertNotCancelled(signal, lessonId = '') {
  if (signal?.aborted) throw lessonGenerationCancelledError(lessonId);
}

function waitForNextPoll(delayMs, signal, lessonId = '') {
  assertNotCancelled(signal, lessonId);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener?.('abort', onAbort);
      callback();
    };
    const onAbort = () => finish(() => reject(lessonGenerationCancelledError(lessonId)));
    signal?.addEventListener?.('abort', onAbort, { once: true });
    window.setTimeout(() => finish(resolve), delayMs);
  });
}

export async function resolveClassroomGeneration(response, {
  getJob, onProgress, signal, lessonId = '',
}) {
  assertNotCancelled(signal, lessonId);
  if (response.status === 'succeeded' && response.result?.classroomId) return response.result;
  if (!response.jobId) throw new Error('课时讲解还没有准备好');
  let consecutiveFailures = 0;
  while (true) {
    assertNotCancelled(signal, lessonId);
    let job;
    try {
      job = await getJob(response.jobId);
      assertNotCancelled(signal, lessonId);
      consecutiveFailures = 0;
    } catch (error) {
      if (isLessonGenerationCancelled(error)) throw error;
      consecutiveFailures += 1;
      onProgress?.({
        jobId: response.jobId,
        status: 'reconnecting',
        message: '进度连接暂时中断，正在自动重连',
      });
      if (consecutiveFailures >= 5) throw error;
      await waitForNextPoll(consecutiveFailures * 3000, signal, lessonId);
      continue;
    }
    onProgress?.({ ...job, jobId: response.jobId });
    if (job.status === 'succeeded' && job.result?.classroomId) return job.result;
    if (['canceled', 'cancelled'].includes(job.status)) throw lessonGenerationCancelledError(lessonId);
    if (job.status === 'failed') throw new Error(job.error || job.message || '课时讲解生成失败');
    await waitForNextPoll(job.pollIntervalMs || 3000, signal, lessonId);
  }
}

export async function runLessonBatchGeneration(lessonIds, {
  concurrency = 2, worker, onStatus, signal, signalForLesson,
}) {
  const ids = [...new Set(lessonIds)].filter(Boolean);
  const results = new Array(ids.length);
  let cursor = 0;
  ids.forEach((lessonId) => onStatus?.(lessonId, { status: 'queued', progress: 0, error: '' }));

  const runner = async () => {
    while (cursor < ids.length) {
      const index = cursor;
      cursor += 1;
      const lessonId = ids[index];
      const lessonSignal = signalForLesson?.(lessonId) || signal;
      onStatus?.(lessonId, { status: 'generating', progress: 2, error: '' });
      try {
        assertNotCancelled(lessonSignal, lessonId);
        const value = await worker(lessonId, (progress) => {
          if (lessonSignal?.aborted) return;
          onStatus?.(lessonId, {
            status: typeof progress === 'object' ? progress.status || 'generating' : 'generating',
            progress: Number((typeof progress === 'object' ? progress.progress : progress) || 2),
            error: '',
            ...(typeof progress === 'object' ? progress : {}),
          });
        }, { signal: lessonSignal });
        assertNotCancelled(lessonSignal, lessonId);
        onStatus?.(lessonId, { status: 'completed', progress: 100, error: '' });
        results[index] = { lessonId, status: 'fulfilled', value };
      } catch (error) {
        if (isLessonGenerationCancelled(error)) {
          onStatus?.(lessonId, { status: 'canceled', progress: 0, error: '' });
          results[index] = { lessonId, status: 'canceled', reason: error };
        } else {
          onStatus?.(lessonId, { status: 'failed', progress: 0, error: error.message });
          results[index] = { lessonId, status: 'rejected', reason: error };
        }
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), ids.length) }, () => runner()));
  return results;
}
