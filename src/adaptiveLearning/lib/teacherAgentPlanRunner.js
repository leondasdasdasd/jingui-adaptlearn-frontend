/**
 *
 * @param root0
 * @param root0.plan
 * @param root0.validatePlan
 * @param root0.executeStep
 * @param root0.onStatus
 */
export async function executeTeacherAgentPlan({
  plan,
  validatePlan,
  executeStep,
  onStatus = () => {},
}) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  try {
    await validatePlan?.(plan);
  } catch (error) {
    if (steps[0]?.id) onStatus(steps[0].id, "failed");
    throw error;
  }

  let backgroundSubmitted = false;
  const stepResults = [];
  for (const step of steps) {
    onStatus(step.id, "running");
    try {
      const result = await executeStep(step, plan);
      const status = result?.background ? "submitted" : "completed";
      backgroundSubmitted ||= Boolean(result?.background);
      stepResults.push({ stepId: step.id, status, result });
      onStatus(step.id, status);
    } catch (error) {
      onStatus(step.id, "failed");
      throw error;
    }
  }
  return { backgroundSubmitted, stepResults };
}
