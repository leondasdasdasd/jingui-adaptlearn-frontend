export function createGenerationBatchQueue() {
  return {
    enqueue: (item) => item,
    process: async () => {},
    getStatus: () => ({ pending: 0, completed: 0 }),
  };
}

export function enqueueGenerationTask(task) {
  return task;
}

export function getGenerationQueueStatus() {
  return { pending: 0, completed: 0 };
}
