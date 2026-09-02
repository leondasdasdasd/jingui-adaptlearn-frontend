export async function startClassSession(params) {
  return { id: "class-session-1", ...params };
}

export async function launchLearningPeriod(params) {
  return { id: "period-1", ...params };
}

export async function fetchActiveClassSession() {
  return null;
}
