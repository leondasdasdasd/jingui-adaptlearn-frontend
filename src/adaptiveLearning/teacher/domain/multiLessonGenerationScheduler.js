export const GENERATION_RESOURCE_POOLS = Object.freeze({
  QUESTIONS: "questions",
  OPENMAIC: "openmaic",
  // Compatibility alias: quality checks share the question-model API key and
  // therefore must never create a third concurrency budget.
  QUALITY: "questions",
});

export const GENERATION_TASK_STATUSES = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELED: "canceled",
});

export const DEFAULT_GENERATION_POOL_CONCURRENCY = Object.freeze({
  questions: 300,
  openmaic: 300,
});

export const DEFAULT_GENERATION_PER_LESSON_CONCURRENCY = Object.freeze({
  questions: 6,
  openmaic: 5,
});

const POOL_NAMES = Object.freeze([
  GENERATION_RESOURCE_POOLS.QUESTIONS,
  GENERATION_RESOURCE_POOLS.OPENMAIC,
]);
const QUESTION_POOL_ALIASES = new Set([
  "questions",
  "quality",
  "quality_check",
  "repair",
]);
const TERMINAL_STATUSES = new Set([
  GENERATION_TASK_STATUSES.COMPLETED,
  GENERATION_TASK_STATUSES.FAILED,
  GENERATION_TASK_STATUSES.CANCELED,
]);

/**
 *
 * @param value
 * @param label
 */
function positiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new Error(`${label}必须是大于 0 的整数`);
  }
  return normalized;
}

/**
 *
 * @param overrides
 * @param defaults
 * @param label
 */
function normalizeLimits(overrides = {}, defaults, label) {
  return Object.fromEntries(
    POOL_NAMES.map((pool) => [
      pool,
      positiveInteger(
        overrides[pool] ??
          (pool === GENERATION_RESOURCE_POOLS.QUESTIONS
            ? overrides.quality
            : undefined) ??
          defaults[pool],
        `${label}.${pool}`,
      ),
    ]),
  );
}

/**
 *
 * @param overrides
 * @param poolLimits
 */
function normalizePerLessonLimits(overrides = {}, poolLimits) {
  return Object.fromEntries(
    POOL_NAMES.map((pool) => {
      const explicit = Object.prototype.hasOwnProperty.call(overrides, pool);
      const legacyQualityExplicit =
        pool === GENERATION_RESOURCE_POOLS.QUESTIONS &&
        !explicit &&
        Object.prototype.hasOwnProperty.call(overrides, "quality");
      const requested = positiveInteger(
        explicit
          ? overrides[pool]
          : legacyQualityExplicit
            ? overrides.quality
            : DEFAULT_GENERATION_PER_LESSON_CONCURRENCY[pool],
        `perLessonConcurrency.${pool}`,
      );
      const maximum = poolLimits[pool] === 1 ? 1 : poolLimits[pool] - 1;
      if ((explicit || legacyQualityExplicit) && requested > maximum) {
        throw new Error(
          `perLessonConcurrency.${pool} 不能大于 ${maximum}，需要为其他课时保留并发槽位`,
        );
      }
      return [pool, Math.min(requested, maximum)];
    }),
  );
}

/**
 *
 * @param value
 */
function canonicalPool(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (QUESTION_POOL_ALIASES.has(normalized))
    return GENERATION_RESOURCE_POOLS.QUESTIONS;
  if (normalized === GENERATION_RESOURCE_POOLS.OPENMAIC)
    return GENERATION_RESOURCE_POOLS.OPENMAIC;
  return "";
}

/**
 *
 * @param error
 */
function serializedError(error) {
  if (!error) return null;
  return {
    name: String(error.name || "Error"),
    message: String(error.message || error),
    code: error.code ? String(error.code) : "",
  };
}

/**
 *
 * @param lessonId
 * @param reason
 */
function cancellationError(lessonId, reason = "") {
  const error = new Error(reason || "课时生成已取消");
  error.name = "AbortError";
  error.code = "LESSON_GENERATION_CANCELED";
  error.lessonId = lessonId;
  return error;
}

/**
 *
 * @param task
 */
function taskSnapshot(task) {
  return {
    id: task.id,
    lessonId: task.lessonId,
    moduleId: task.moduleId,
    pool: task.pool,
    status: task.status,
    queuePosition:
      task.status === GENERATION_TASK_STATUSES.QUEUED
        ? task.queuePosition
        : null,
    metadata: task.metadata,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    finishedAt: task.finishedAt,
    value:
      task.status === GENERATION_TASK_STATUSES.COMPLETED
        ? task.value
        : undefined,
    error: task.error,
  };
}

/**
 *
 * @param limit
 * @param perLessonLimit
 */
function createPoolState(limit, perLessonLimit) {
  return {
    limit,
    perLessonLimit,
    lessonOrder: [],
    queues: new Map(),
    cursor: 0,
    activeTaskIds: new Set(),
    activeByLesson: new Map(),
  };
}

/**
 * Creates a reusable in-memory scheduler for lesson generation work.
 *
 * A task is `{ id?, lessonId, moduleId?, pool, run, metadata? }`. `run` receives
 * `{ signal, task }`. Every pool drains independently. Within a pool, lesson
 * queues are selected round-robin and per-lesson limits prevent one lesson
 * from occupying every worker slot.
 * @param root0
 * @param root0.concurrency
 * @param root0.perLessonConcurrency
 * @param root0.onTaskUpdate
 * @param root0.onObserverError
 * @param root0.now
 * @param root0.schedule
 */
export function createMultiLessonGenerationScheduler({
  concurrency = {},
  perLessonConcurrency = {},
  onTaskUpdate,
  onObserverError,
  now = () => Date.now(),
  schedule = (callback) => queueMicrotask(callback),
} = {}) {
  const poolLimits = normalizeLimits(
    concurrency,
    DEFAULT_GENERATION_POOL_CONCURRENCY,
    "concurrency",
  );
  const perLessonLimits = normalizePerLessonLimits(
    perLessonConcurrency,
    poolLimits,
  );
  const pools = Object.fromEntries(
    POOL_NAMES.map((pool) => [
      pool,
      createPoolState(poolLimits[pool], perLessonLimits[pool]),
    ]),
  );
  const tasks = new Map();
  const reservedTaskIds = new Set();
  const idleWaiters = new Set();
  let sequence = 0;
  let drainScheduled = false;

  /**
   *
   * @param task
   */
  function notify(task) {
    if (!onTaskUpdate) return;
    try {
      onTaskUpdate(taskSnapshot(task));
    } catch (error) {
      onObserverError?.(error);
    }
  }

  /**
   *
   * @param task
   */
  function settleHandle(task) {
    if (task.handleSettled) return;
    task.handleSettled = true;
    task.resolveDone(taskSnapshot(task));
  }

  /**
   *
   * @param poolState
   * @param lessonId
   */
  function activeCountForLesson(poolState, lessonId) {
    return poolState.activeByLesson.get(lessonId) || 0;
  }

  /**
   *
   * @param poolState
   * @param lessonId
   */
  function addLessonToPool(poolState, lessonId) {
    if (!poolState.queues.has(lessonId)) poolState.queues.set(lessonId, []);
    if (!poolState.lessonOrder.includes(lessonId))
      poolState.lessonOrder.push(lessonId);
  }

  /**
   *
   * @param poolState
   * @param lessonId
   */
  function queuedTasksForLesson(poolState, lessonId) {
    return (poolState.queues.get(lessonId) || [])
      .map((taskId) => tasks.get(taskId))
      .filter((task) => task?.status === GENERATION_TASK_STATUSES.QUEUED);
  }

  /**
   *
   * @param poolState
   */
  function contendingLessonCount(poolState) {
    return poolState.lessonOrder.filter(
      (lessonId) =>
        activeCountForLesson(poolState, lessonId) > 0 ||
        queuedTasksForLesson(poolState, lessonId).length > 0,
    ).length;
  }

  /**
   * Queue positions mirror the round-robin order, not raw insertion order.
   * @param poolName
   */
  function refreshQueuePositions(poolName) {
    const poolState = pools[poolName];
    const queues = new Map(
      poolState.lessonOrder.map((lessonId) => [
        lessonId,
        queuedTasksForLesson(poolState, lessonId),
      ]),
    );
    let cursor = poolState.cursor;
    let position = 1;
    let remaining = [...queues.values()].reduce(
      (sum, queue) => sum + queue.length,
      0,
    );

    while (remaining > 0 && poolState.lessonOrder.length > 0) {
      let selectedIndex = -1;
      for (let offset = 0; offset < poolState.lessonOrder.length; offset += 1) {
        const index = (cursor + offset) % poolState.lessonOrder.length;
        if ((queues.get(poolState.lessonOrder[index]) || []).length > 0) {
          selectedIndex = index;
          break;
        }
      }
      if (selectedIndex < 0) break;
      const lessonId = poolState.lessonOrder[selectedIndex];
      const task = queues.get(lessonId).shift();
      const previousPosition = task.queuePosition;
      task.queuePosition = position;
      if (previousPosition !== position) notify(task);
      position += 1;
      remaining -= 1;
      cursor = (selectedIndex + 1) % poolState.lessonOrder.length;
    }
  }

  /**
   *
   * @param poolName
   */
  function nextQueuedTask(poolName) {
    const poolState = pools[poolName];
    const lessonCount = poolState.lessonOrder.length;
    if (lessonCount === 0) return null;
    const enforceFairShare = contendingLessonCount(poolState) > 1;

    for (let offset = 0; offset < lessonCount; offset += 1) {
      const index = (poolState.cursor + offset) % lessonCount;
      const lessonId = poolState.lessonOrder[index];
      if (
        enforceFairShare &&
        activeCountForLesson(poolState, lessonId) >= poolState.perLessonLimit
      )
        continue;
      const queue = poolState.queues.get(lessonId) || [];
      while (queue.length > 0) {
        const task = tasks.get(queue[0]);
        if (task?.status === GENERATION_TASK_STATUSES.QUEUED) {
          queue.shift();
          poolState.cursor = (index + 1) % lessonCount;
          return task;
        }
        queue.shift();
      }
    }
    return null;
  }

  /**
   *
   */
  function isIdle() {
    return POOL_NAMES.every((poolName) => {
      const poolState = pools[poolName];
      if (poolState.activeTaskIds.size > 0) return false;
      return ![...tasks.values()].some(
        (task) =>
          task.pool === poolName &&
          task.status === GENERATION_TASK_STATUSES.QUEUED,
      );
    });
  }

  /**
   *
   */
  function getSnapshot() {
    return {
      idle: isIdle(),
      pools: Object.fromEntries(
        POOL_NAMES.map((poolName) => {
          const poolState = pools[poolName];
          return [
            poolName,
            {
              concurrency: poolState.limit,
              perLessonConcurrency: poolState.perLessonLimit,
              activeCount: poolState.activeTaskIds.size,
              queuedCount: [...tasks.values()].filter(
                (task) =>
                  task.pool === poolName &&
                  task.status === GENERATION_TASK_STATUSES.QUEUED,
              ).length,
            },
          ];
        }),
      ),
      tasks: [...tasks.values()].map(taskSnapshot),
    };
  }

  /**
   *
   */
  function resolveIdleWaiters() {
    if (!isIdle()) return;
    const snapshot = getSnapshot();
    for (const resolve of idleWaiters) resolve(snapshot);
    idleWaiters.clear();
  }

  /**
   *
   * @param task
   */
  function releaseActiveSlot(task) {
    const poolState = pools[task.pool];
    if (!poolState.activeTaskIds.delete(task.id)) return;
    const nextCount = Math.max(
      0,
      activeCountForLesson(poolState, task.lessonId) - 1,
    );
    if (nextCount === 0) poolState.activeByLesson.delete(task.lessonId);
    else poolState.activeByLesson.set(task.lessonId, nextCount);
  }

  /**
   *
   * @param task
   * @param status
   * @param payload
   */
  function finishTask(task, status, payload) {
    releaseActiveSlot(task);
    if (!TERMINAL_STATUSES.has(task.status)) {
      task.status = status;
      task.queuePosition = null;
      task.finishedAt = now();
      if (status === GENERATION_TASK_STATUSES.COMPLETED) task.value = payload;
      else task.error = serializedError(payload);
      notify(task);
      settleHandle(task);
    }
    refreshQueuePositions(task.pool);
    drainPool(task.pool);
    resolveIdleWaiters();
  }

  /**
   *
   * @param task
   */
  function startTask(task) {
    const poolState = pools[task.pool];
    task.status = GENERATION_TASK_STATUSES.RUNNING;
    task.queuePosition = null;
    task.startedAt = now();
    poolState.activeTaskIds.add(task.id);
    poolState.activeByLesson.set(
      task.lessonId,
      activeCountForLesson(poolState, task.lessonId) + 1,
    );
    notify(task);

    Promise.resolve()
      .then(() =>
        task.run({
          signal: task.controller.signal,
          task: taskSnapshot(task),
        }),
      )
      .then(
        (value) => finishTask(task, GENERATION_TASK_STATUSES.COMPLETED, value),
        (error) => {
          const canceled =
            task.controller.signal.aborted || error?.name === "AbortError";
          finishTask(
            task,
            canceled
              ? GENERATION_TASK_STATUSES.CANCELED
              : GENERATION_TASK_STATUSES.FAILED,
            error,
          );
        },
      );
  }

  /**
   *
   * @param poolName
   */
  function drainPool(poolName) {
    const poolState = pools[poolName];
    while (poolState.activeTaskIds.size < poolState.limit) {
      const task = nextQueuedTask(poolName);
      if (!task) break;
      startTask(task);
    }
    refreshQueuePositions(poolName);
    resolveIdleWaiters();
  }

  /**
   *
   */
  function scheduleDrain() {
    if (drainScheduled) return;
    drainScheduled = true;
    schedule(() => {
      drainScheduled = false;
      POOL_NAMES.forEach(drainPool);
    });
  }

  /**
   *
   * @param input
   */
  function normalizeTask(input) {
    const lessonId = String(input?.lessonId || "").trim();
    const moduleId = String(input?.moduleId || "").trim();
    const requestedPool = String(input?.pool || "").trim();
    const pool = canonicalPool(requestedPool);
    const run = input?.run;
    if (!lessonId) throw new Error("生成任务缺少 lessonId");
    if (!pool) throw new Error(`未知资源池：${requestedPool || "empty"}`);
    if (typeof run !== "function") throw new Error("生成任务缺少 run 函数");
    sequence += 1;
    const id = String(
      input.id ||
        (moduleId
          ? `${lessonId}:${moduleId}`
          : `${lessonId}:${pool}:${sequence}`),
    );
    if (tasks.has(id) || reservedTaskIds.has(id))
      throw new Error(`生成任务 id 重复：${id}`);
    reservedTaskIds.add(id);
    let resolveDone;
    const done = new Promise((resolve) => {
      resolveDone = resolve;
    });
    return {
      id,
      lessonId,
      moduleId,
      pool,
      run,
      metadata: input.metadata || null,
      status: GENERATION_TASK_STATUSES.QUEUED,
      queuePosition: null,
      createdAt: now(),
      startedAt: null,
      finishedAt: null,
      value: undefined,
      error: null,
      controller: new AbortController(),
      done,
      resolveDone,
      handleSettled: false,
    };
  }

  /**
   *
   * @param inputs
   */
  function enqueueTasks(inputs = []) {
    let normalized;
    try {
      normalized = inputs.map(normalizeTask);
    } catch (error) {
      reservedTaskIds.clear();
      for (const [taskId, _task] of tasks.entries())
        reservedTaskIds.add(taskId);
      throw error;
    }
    for (const task of normalized) {
      tasks.set(task.id, task);
      const poolState = pools[task.pool];
      addLessonToPool(poolState, task.lessonId);
      poolState.queues.get(task.lessonId).push(task.id);
    }
    const touchedPools = new Set(normalized.map((task) => task.pool));
    for (const poolName of touchedPools) refreshQueuePositions(poolName);
    for (const task of normalized) {
      if (task.queuePosition === null) notify(task);
    }
    scheduleDrain();
    return normalized.map((task) => ({
      id: task.id,
      done: task.done,
      snapshot: () => taskSnapshot(task),
    }));
  }

  /**
   *
   * @param lessonOrConfig
   * @param maybeTasks
   */
  function taskInputsForLesson(lessonOrConfig, maybeTasks) {
    const config =
      typeof lessonOrConfig === "string"
        ? { lessonId: lessonOrConfig, tasks: maybeTasks }
        : lessonOrConfig || {};
    const lessonId = String(config.lessonId || "").trim();
    if (!lessonId) throw new Error("课时入队缺少 lessonId");
    const lessonTasks = config.tasks || [
      ...(config.questions || []).map((task) => ({
        ...task,
        pool: "questions",
      })),
      ...(config.openmaic || []).map((task) => ({ ...task, pool: "openmaic" })),
      ...(config.quality || []).map((task) => ({ ...task, pool: "quality" })),
      ...(config.quality_check || []).map((task) => ({
        ...task,
        pool: "quality_check",
      })),
      ...(config.repair || []).map((task) => ({ ...task, pool: "repair" })),
    ];
    return lessonTasks.map((task) => ({ ...task, lessonId }));
  }

  /**
   *
   * @param lessonOrConfig
   * @param maybeTasks
   */
  function enqueueLesson(lessonOrConfig, maybeTasks) {
    return enqueueTasks(taskInputsForLesson(lessonOrConfig, maybeTasks));
  }

  /**
   * Atomically queues many lessons before any pool starts draining.
   * @param lessonConfigs
   */
  function enqueueLessons(lessonConfigs = []) {
    return enqueueTasks(
      lessonConfigs.flatMap((config) => taskInputsForLesson(config)),
    );
  }

  /**
   *
   * @param task
   * @param reason
   */
  function cancelTask(task, reason) {
    if (!task || TERMINAL_STATUSES.has(task.status)) return false;
    const error = cancellationError(task.lessonId, reason);
    task.controller.abort(error);
    task.status = GENERATION_TASK_STATUSES.CANCELED;
    task.queuePosition = null;
    task.finishedAt = now();
    task.error = serializedError(error);
    notify(task);
    settleHandle(task);
    return true;
  }

  /**
   *
   * @param lessonId
   * @param reason
   */
  function cancelLesson(lessonId, reason = "") {
    const normalizedLessonId = String(lessonId || "").trim();
    let canceledCount = 0;
    const touchedPools = new Set();
    for (const task of tasks) {
      if (task.lessonId !== normalizedLessonId) continue;
      if (cancelTask(task, reason)) {
        canceledCount += 1;
        touchedPools.add(task.pool);
      }
    }
    for (const poolName of touchedPools) {
      refreshQueuePositions(poolName);
      drainPool(poolName);
    }
    resolveIdleWaiters();
    return canceledCount;
  }

  /**
   *
   * @param taskId
   */
  function getTask(taskId) {
    const task = tasks.get(taskId);
    return task ? taskSnapshot(task) : null;
  }

  /**
   *
   * @param lessonId
   */
  function getLessonTasks(lessonId) {
    return [...tasks.values()]
      .filter((task) => task.lessonId === lessonId)
      .map(taskSnapshot);
  }

  /**
   *
   */
  function waitForIdle() {
    if (isIdle()) return Promise.resolve(getSnapshot());
    return new Promise((resolve) => idleWaiters.add(resolve));
  }

  return Object.freeze({
    enqueueTasks,
    enqueueLesson,
    enqueueLessons,
    cancelLesson,
    getTask,
    getLessonTasks,
    getSnapshot,
    waitForIdle,
  });
}
