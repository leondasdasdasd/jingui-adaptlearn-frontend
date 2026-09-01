/**
 * 将反馈后的主动作语义与执行函数收口为同一命令。
 * @param {object} input - 当前学习状态与对应动作。
 * @returns {{kind: string, run: Function}} 稳定的练习主命令。
 */
export default function createQuizProgressAction(input) {
  if (input.correctionRequired) {
    return {
      kind: "confirm-correction",
      run: () => input.onConfirmCorrection(),
    };
  }
  if (input.retryRequired) {
    return {
      kind:
        input.answerQuality === "pending_review" ? "resubmit" : "retry-answer",
      run: () => input.onRetry(),
    };
  }
  if (input.hasCompleteIntervention) {
    return { kind: "review-problem", run: () => input.onContinue() };
  }
  if (input.sequenceComplete) {
    return { kind: "continue-learning", run: () => input.onContinue() };
  }
  return {
    kind: input.adaptiveOutcome ? "continue" : "next-question",
    run: () => input.onContinue(),
  };
}
