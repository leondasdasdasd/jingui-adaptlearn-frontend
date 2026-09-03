/**
 * 将学生页面上下文收敛为求助服务的稳定请求形状，避免组件直接依赖传输字段。
 * @param root0
 * @param root0.clientRequestId
 * @param root0.note
 * @param root0.requestContext
 * @param root0.context
 */
export function toStudentHelpRequestPayload({
  clientRequestId,
  note,
  context,
}) {
  const {
    pagePath = "",
    pageSearch = "",
    selection = {},
    question,
    answer,
    imageName = "",
    lessonTitle = "",
    knowledgePointName = "",
    questionNumber = null,
    questionTypeLabel = "",
    presentedAt = "",
  } = context || {};
  const questionSnapshot = question
    ? {
        id: question.id || "",
        stem: question.stem || "",
        type: question.type || "",
        difficulty: question.difficulty || "",
        lessonTitle,
        knowledgePointName,
        questionNumber,
        questionTypeLabel: questionTypeLabel || question.type || "",
        pageTitle: "当前练习题",
        presentedAt: presentedAt || new Date().toISOString(),
      }
    : null;
  return {
    clientRequestId,
    reasonCode: "CUSTOM",
    note: String(note || "").trim(),
    contextType: question ? "QUESTION" : "LEARNING_PAGE",
    pageRoute: `${pagePath}${pageSearch}`.slice(0, 255),
    learningPeriodId: selection.learningPeriodId || null,
    studentSessionId: selection.classroomAccessToken
      ? selection.studentSessionId
      : null,
    knowledgeObjectiveId:
      question?.knowledgePointIds?.[0] ||
      selection.knowledgePoints?.[0]?.id ||
      null,
    questionId: question?.id || null,
    questionSnapshot,
    answerSnapshot: {
      text: Array.isArray(answer) ? answer.join("、") : String(answer || ""),
      imageName,
    },
  };
}
