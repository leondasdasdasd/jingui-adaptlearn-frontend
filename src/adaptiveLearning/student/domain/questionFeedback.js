export function questionFeedbackText(question) {
  return question?.explanation || "暂无题目解析";
}

export function aiGeneratedErrorReason(q) {
  return "知识点理解有误";
}

export function aiGeneratedImprovements(q) {
  return ["多做此类基础练习"];
}
