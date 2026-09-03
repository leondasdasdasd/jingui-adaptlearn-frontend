const RESULTS = new Set(["success", "timeout", "failed"]);

/**
 *
 * @param root0
 * @param root0.questionId
 * @param root0.contextType
 * @param root0.reasonCode
 * @param root0.result
 * @param root0.durationMs
 */
export function buildHelpRequestResultEvent({
  questionId,
  contextType,
  reasonCode,
  result,
  durationMs,
}) {
  return {
    type: "help_request_submit_result",
    questionId: String(questionId || "").slice(0, 255),
    contextType: String(contextType || "OTHER").slice(0, 32),
    reasonCode: String(reasonCode || "").slice(0, 32),
    result: RESULTS.has(result) ? result : "failed",
    durationMs: Math.max(0, Math.round(Number(durationMs) || 0)),
  };
}
