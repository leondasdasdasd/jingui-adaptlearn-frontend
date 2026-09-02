export function formatAssessmentResult(result) {
  return {
    scoreText: result?.score != null ? `${result.score}%` : "--",
    statusText: result?.passed ? "已通过" : "未通过",
  };
}

export function preAssessmentAnswerStateMeta() {
  return { label: "正确", color: "#10b981" };
}

export function preAssessmentAnswerText() {
  return "";
}

export function preAssessmentDiagnosticStatus() {
  return "诊断完成";
}

export function preAssessmentNextStep() {
  return "开始推荐练习";
}

export const preAssessmentResultCopy = {
  title: "小测诊断结果",
};

export const preAssessmentResultText = {
  title: "小测诊断结果",
};

export function preAssessmentStopReason() {
  return "完成全部题目";
}

export function preAssessmentSummary() {
  return { total: 0, correct: 0 };
}
