import { localizedDifficultyLabel } from "../../shared/presentation/difficultyPresentation";
import {
  helpReasonLabel,
  shortTime,
  snapshotText,
  supportSourceLabel,
} from "./helpRequestLabels";

/**
 * 将 support/classroom 两种后端求助记录映射为教师卡片所需语义。
 * @param request
 * @param student
 * @param studentsBySession
 */
export function toTeacherHelpRequestViewModel(request, studentsBySession = {}) {
  const student = studentsBySession[request.studentSessionId] || null;
  const snapshot = request.questionSnapshot || {};
  return {
    key: `${request.supportSessionId ? "support" : "classroom"}:${request.id}`,
    id: request.id,
    status: request.status,
    studentId: request.studentId || student?.id || "",
    studentSessionId: request.studentSessionId || "",
    supportSessionId: request.supportSessionId || "",
    note: request.note || "",
    createdAt: request.createdAt || request.requestedAt || "",
    studentName: request.studentName || student?.name || "学生",
    reason: helpReasonLabel(request.reasonCode),
    source: supportSourceLabel(request),
    time: shortTime(request.requestedAt || request.createdAt),
    questionSummary: snapshot.questionNumber
      ? `第${snapshot.questionNumber}题 · ${snapshot.questionTypeLabel || snapshot.type || "题目"} · 难度${snapshot.difficulty ? localizedDifficultyLabel(snapshot.difficulty) : "-"}`
      : snapshotText(snapshot).slice(0, 34) ||
        snapshot.pageTitle ||
        "当前学习页面",
    questionStem: snapshot.stem || "",
    answerText: request.answerSnapshot?.text || "",
    persistentSupport: Boolean(request.supportSessionId),
  };
}
