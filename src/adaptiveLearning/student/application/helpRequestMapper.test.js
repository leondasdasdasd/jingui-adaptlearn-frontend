import { toStudentHelpRequestPayload } from "./helpRequestMapper";

describe("student help request mapper", () => {
  test("maps free-form help text and preserves the question snapshot contract", () => {
    expect(
      toStudentHelpRequestPayload({
        clientRequestId: "request-1",
        note: "  第一步不知道怎么列式  ",
        context: {
          pagePath: "/adaptive-learning/session",
          question: { id: "question-1", type: "short_answer" },
          questionNumber: 3,
        },
      }),
    ).toEqual({
      clientRequestId: "request-1",
      reasonCode: "CUSTOM",
      note: "第一步不知道怎么列式",
      contextType: "QUESTION",
      pageRoute: "/adaptive-learning/session",
      learningPeriodId: null,
      studentSessionId: null,
      knowledgeObjectiveId: null,
      questionId: "question-1",
      questionSnapshot: {
        id: "question-1",
        stem: "",
        type: "short_answer",
        difficulty: "",
        lessonTitle: "",
        knowledgePointName: "",
        questionNumber: 3,
        questionTypeLabel: "short_answer",
        pageTitle: "当前练习题",
        presentedAt: expect.any(String),
      },
      answerSnapshot: { text: "", imageName: "" },
    });
  });
});
