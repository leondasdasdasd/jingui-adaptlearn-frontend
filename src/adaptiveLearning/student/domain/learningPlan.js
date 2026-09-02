export function activeLearningUnit(flow) {
  return flow?.currentUnit || null;
}

export function advanceLessonFlow(flow) {
  return flow;
}

export function finishTemporaryLearning(flow) {
  return flow;
}

export function routeForLearningUnit(unit) {
  return "/adaptive-learning/learning";
}

export function startDirectLearning(lessonId) {
  return { lessonId, type: "learn" };
}

export function startDirectPractice(lessonId) {
  return { lessonId, type: "practice" };
}
