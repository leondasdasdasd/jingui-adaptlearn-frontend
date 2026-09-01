import { isPreAssessmentComplete } from "../../lib/mastery.js";

/**
 *
 * @param session
 */
export function preAssessmentContext(session = {}) {
  return session.learningFlow?.context || session;
}

/**
 *
 * @param session
 */
export function isPreAssessmentGateSatisfied(session = {}) {
  const context = preAssessmentContext(session);
  return (
    Boolean(context.preAssessment?.completedAt) ||
    isPreAssessmentComplete(
      context.preQuestions || [],
      context.preAttempts || {},
    )
  );
}

/**
 *
 * @param session
 */
export function isPreAssessmentProgressEstablished(session = {}) {
  if (isPreAssessmentGateSatisfied(session)) return true;
  const context = preAssessmentContext(session);
  const flow = session.learningFlow || context.learningFlow;
  const hasLearningPlan = Boolean(flow?.plan);
  const hasPracticeAttempts =
    Object.keys(context.postAttempts || {}).length > 0;
  const hasLearningResult = Object.values(context.result || {}).some(
    (item) => Number(item?.evidenceCount ?? item?.total ?? 0) > 0,
  );
  return hasLearningPlan || hasPracticeAttempts || hasLearningResult;
}
