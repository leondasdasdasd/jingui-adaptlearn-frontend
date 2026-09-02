export function questionResultPresentation(res) {
  return {
    label: res?.isCorrect ? "正确" : "错误",
    color: res?.isCorrect ? "#10b981" : "#ef4444",
  };
}

export function localizedQuestionResult(res) {
  return res?.isCorrect ? "正确" : "错误";
}

export function localizedQuestionType(type) {
  return type || "单选题";
}

export function evidenceRowsForKnowledgePoint(kp) {
  return [];
}
