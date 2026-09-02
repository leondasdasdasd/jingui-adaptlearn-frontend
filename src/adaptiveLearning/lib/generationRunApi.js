export async function cancelGenerationRun() {
  return true;
}

export async function createLessonGenerationRuns() {
  return [];
}

export function generationStateFromRun(run) {
  return "completed";
}

export async function getLessonGenerationRuns() {
  return [];
}

export function mergeGenerationRunDraft(draft) {
  return draft;
}

export async function startGenerationRun() {
  return { id: "run-1", status: "completed" };
}

export async function getGenerationRun() {
  return { id: "run-1", status: "completed" };
}
