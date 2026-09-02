export function questionResultStatus(result) {
  return result?.isCorrect ? "CORRECT" : "INCORRECT";
}

export function questionResultState(result) {
  return result?.isCorrect ? "CORRECT" : "INCORRECT";
}

export function formatQuestionScore(score) {
  return typeof score === "number" ? `${Math.round(score * 100)}%` : "0%";
}
