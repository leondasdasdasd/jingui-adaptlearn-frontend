import {
  projectSlotGenerationState,
  projectTeacherAssessmentScope,
} from "./teacherAssessmentViewModel";

describe("teacher assessment view model", () => {
  test("normalizes matrix and slot storage variants at the route boundary", () => {
    const result = projectTeacherAssessmentScope({
      scopeId: "kp-1",
      content: {
        assessmentMatrices: [
          {
            knowledgePointId: "kp-1",
            cells: [
              {
                domain: "CR",
                level: "B",
                role: "CORE",
                minimumIndependentEvidence: 1,
              },
            ],
          },
        ],
        assessmentQuestionSlots: [
          {
            id: "slot-1",
            knowledgePointId: "kp-1",
            domain: "CR",
            targetLevel: "B",
          },
        ],
      },
      questions: [
        { id: "q-1", assessmentMatrixCellId: "kp-1:CR:B", stem: "Question" },
      ],
    });

    expect(result).toMatchObject({
      scopeId: "kp-1",
      hasMatrix: true,
      slots: [{ id: "slot-1", matrixCode: "CR-B" }],
      matrix: {
        applicableCellCount: 1,
        evidenceSatisfiedCellCount: 1,
        cells: [{ cellId: "kp-1:CR:B", level: "B" }],
      },
    });
  });

  test("strips persisted slot fields from generation task state", () => {
    const result = projectSlotGenerationState(
      {
        scope: "kp-1",
        mode: "knowledge-questions",
        phase: "partial",
        slots: [
          {
            id: "slot-1",
            status: "failed",
            matrixCellId: "must-not-leak",
            questionType: "single_choice",
            error: "transport detail",
          },
        ],
      },
      "kp-1",
    );

    expect(result).toEqual({
      states: [{ id: "slot-1", status: "failed", questionId: "" }],
      isGeneratingMatrix: false,
      isPlanning: false,
      isRunning: false,
      isBusy: false,
      canRetry: true,
    });
  });

  test("marks slot planning as a scope-level busy assessment command", () => {
    const result = projectSlotGenerationState(
      {
        scope: "kp-1",
        mode: "knowledge-slots",
      },
      "kp-1",
    );

    expect(result).toMatchObject({
      isGeneratingMatrix: false,
      isPlanning: true,
      isRunning: false,
      isBusy: true,
      canRetry: false,
    });
  });
});
