/**
 * 将课堂结算结果归一为稳定状态，不在领域层生成界面文案。
 * @param {object | null} score 课堂结算结果
 * @param {string} resultMode 当前结果来源
 * @returns {object} 可供展示层解释的稳定状态
 */
export function classroomScoreState(score, resultMode = "authoritative") {
  if (score?.status === "READY")
    return score.reviewStatus === "PUBLISHED"
      ? {
          kind: "published",
          ready: true,
          published: true,
          summary: String(score.summary || ""),
        }
      : { kind: "pendingReview", ready: false, pendingReview: true };
  const unsettledKind = unsettledScoreKinds[score?.status];
  if (unsettledKind)
    return {
      kind: unsettledKind,
      ready: false,
      summary: String(score?.summary || ""),
    };
  if (resultMode === "syncing_preview")
    return { kind: "syncing", ready: false };
  return { kind: "practiceComplete", ready: false };
}
const unsettledScoreKinds = Object.freeze({
  PARTIAL_EVIDENCE: "partialEvidence",
  OBJECTIVE_SCOPE_UNAVAILABLE: "objectiveUnavailable",
  INSUFFICIENT_EVIDENCE: "insufficientEvidence",
});
