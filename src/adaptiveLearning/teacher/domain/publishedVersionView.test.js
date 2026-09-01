import { publishedVersionToTeacherContent } from "./publishedVersionView";

describe("published version teacher content", () => {
  test("keeps assessment matrices and slots inside the mapped version", () => {
    const result = publishedVersionToTeacherContent(
      {
        id: "version-1",
        textbookLessonId: "lesson-1",
        versionNumber: 2,
        contentPackage: {
          learningContent: { composite: null, knowledgePoints: [] },
          assessmentMatrices: { "kp-1": { knowledgePointId: "kp-1" } },
          assessmentQuestionSlots: { "kp-1": [{ id: "slot-1" }] },
        },
      },
      { lessonId: "lesson-1", preQuestions: [], postQuestions: [] },
    );

    expect(result.assessmentMatrices).toEqual({
      "kp-1": { knowledgePointId: "kp-1" },
    });
    expect(result.assessmentQuestionSlots).toEqual({
      "kp-1": [{ id: "slot-1" }],
    });
  });
});
