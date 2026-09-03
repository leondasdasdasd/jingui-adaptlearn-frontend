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
          assessmentMatrices: {
            "kp-1": {
              assessmentPolicyId: "physics-v1",
              knowledgePointIds: ["kp-1"],
            },
          },
          assessmentQuestionSlots: {
            "kp-1": [
              {
                id: "slot-1",
                assessmentPolicyId: "physics-v1",
                knowledgePointIds: ["kp-1"],
              },
            ],
          },
          knowledgePracticePools: {
            "kp-1": [
              {
                id: "q-1",
                purpose: "PRACTICE",
                blueprintSlotId: "slot-1",
                source: {
                  kind: "question_bank",
                  questionId: "source-q-1",
                  version: "v3",
                },
              },
            ],
          },
        },
      },
      { lessonId: "lesson-1", preQuestions: [], postQuestions: [] },
    );

    expect(result.assessmentMatrices).toEqual({
      "kp-1": {
        assessmentPolicyId: "physics-v1",
        cells: [],
        knowledgePointIds: ["kp-1"],
      },
    });
    expect(result.assessmentQuestionSlots).toEqual({
      "kp-1": [
        {
          id: "slot-1",
          slotStructureVersion: "matrix-type-slots-v1",
          assessmentPolicyId: "physics-v1",
          difficulty: "D2",
          knowledgePointId: "",
          knowledgePointIds: ["kp-1"],
          matrixCellId: "",
          questionType: "",
        },
      ],
    });
    expect(result.postQuestions[0]).toMatchObject({
      blueprintSlotId: "slot-1",
      source: {
        kind: "question_bank",
        questionId: "source-q-1",
        version: "v3",
      },
    });
  });

  test("canonicalizes historical published slots before exposing teacher content", () => {
    const result = publishedVersionToTeacherContent({
      id: "version-old",
      textbookLessonId: "lesson-1",
      versionNumber: 1,
      contentPackage: {
        learningContent: { composite: null, knowledgePoints: [] },
        assessmentQuestionSlots: {
          "kp-1": [
            {
              id: "old-1",
              matrixCellId: "kp-1:CR:B",
              questionType: "single_choice",
            },
            {
              id: "old-2",
              matrixCellId: "kp-1:CR:B",
              questionType: "single_choice",
            },
          ],
        },
        knowledgePracticePools: {
          "kp-1": [
            {
              id: "q-1",
              purpose: "PRACTICE",
              blueprintSlotId: "old-2",
            },
          ],
        },
      },
    });

    expect(result.assessmentQuestionSlots["kp-1"]).toHaveLength(1);
    expect(result.postQuestions[0].blueprintSlotId).toBe("old-1");
  });
});
