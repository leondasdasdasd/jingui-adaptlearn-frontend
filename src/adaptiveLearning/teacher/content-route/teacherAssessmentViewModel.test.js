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
            matrixCellId: "kp-1:CR:B",
            domain: "CR",
            targetLevel: "B",
          },
        ],
      },
      questions: [
        {
          id: "q-1",
          blueprintSlotId: "slot-1",
          assessmentMatrixCellId: "kp-1:CR:B",
          stem: "Question",
        },
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

  test("projects a science matrix and separates assigned from unassigned questions", () => {
    const result = projectTeacherAssessmentScope({
      scopeId: "composite",
      content: {
        assessmentMatrices: {
          composite: {
            assessmentPolicyId: "science-general-v1",
            scopeId: "composite",
            knowledgePointIds: ["kp-1", "kp-2", "kp-3"],
            cells: [
              {
                domain: "ST",
                targetLevel: "C",
                role: "CORE",
                variationRequirements: ["更换实验条件"],
              },
            ],
          },
        },
        assessmentQuestionSlots: {
          composite: [
            {
              id: "slot-1",
              matrixCellId: "composite:ST:C",
              knowledgePointIds: ["kp-1", "kp-2"],
            },
          ],
        },
      },
      questions: [
        {
          id: "q-1",
          blueprintSlotId: "slot-1",
          matrixCellId: "composite:ST:C",
          stem: "已归槽",
        },
        { id: "q-2", blueprintSlotId: null, stem: "未归槽" },
      ],
    });
    expect(result.matrix).toMatchObject({
      assessmentPolicyId: "science-general-v1",
      knowledgePointIds: ["kp-1", "kp-2", "kp-3"],
      cells: [{ domain: "ST", variationRequirements: ["更换实验条件"] }],
    });
    expect(result.slots[0].questions).toHaveLength(1);
    expect(result.unassignedQuestions).toEqual([
      expect.objectContaining({ id: "q-2" }),
    ]);
  });

  test("projects multiple questions owned by one canonical type slot", () => {
    const result = projectTeacherAssessmentScope({
      scopeId: "kp-1",
      content: {
        assessmentMatrices: {
          "kp-1": {
            scopeId: "kp-1",
            cells: [{ domain: "CR", targetLevel: "B", role: "CORE" }],
          },
        },
        assessmentQuestionSlots: {
          "kp-1": [
            {
              id: "old-slot-1",
              matrixCellId: "kp-1:CR:B",
              questionType: "single_choice",
              knowledgePointIds: ["kp-1"],
            },
          ],
        },
      },
      questions: [
        {
          id: "q-1",
          blueprintSlotId: "old-slot-1",
          matrixCellId: "kp-1:CR:B",
          stem: "第一题",
        },
        {
          id: "q-2",
          blueprintSlotId: "old-slot-1",
          matrixCellId: "kp-1:CR:B",
          stem: "第二题",
        },
      ],
    });

    expect(result.slots).toHaveLength(1);
    expect(result.slots[0]).toMatchObject({ id: "old-slot-1" });
    expect(result.slots[0].questions.map((question) => question.id)).toEqual([
      "q-1",
      "q-2",
    ]);
    expect(result.unassignedQuestions).toHaveLength(0);
  });

  test("uses one assignment rule for stale slots and stale matrix cells", () => {
    const result = projectTeacherAssessmentScope({
      scopeId: "kp-1",
      content: {
        assessmentMatrices: {
          "kp-1": {
            scopeId: "kp-1",
            cells: [{ domain: "CR", targetLevel: "B", role: "CORE" }],
          },
        },
        assessmentQuestionSlots: {
          "kp-1": [
            {
              id: "slot-1",
              matrixCellId: "kp-1:CR:B",
              questionType: "single_choice",
            },
          ],
        },
      },
      questions: [
        {
          id: "stale-slot",
          blueprintSlotId: "missing",
          matrixCellId: "kp-1:CR:B",
        },
        {
          id: "stale-cell",
          blueprintSlotId: "slot-1",
          matrixCellId: "kp-1:CR:C",
        },
      ],
    });

    expect(result.slots[0].questions).toHaveLength(0);
    expect(result.unassignedQuestions.map((question) => question.id)).toEqual([
      "stale-slot",
      "stale-cell",
    ]);
  });
});
