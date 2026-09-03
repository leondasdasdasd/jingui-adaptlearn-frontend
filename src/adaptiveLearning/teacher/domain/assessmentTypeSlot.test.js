/** @vitest-environment node */

import {
  assessmentQuestionGenerationSlots,
  prepareAssessmentTypeSlots,
} from "./assessmentTypeSlot";

describe("assessment type slot boundary", () => {
  const matrix = {
    cells: [
      {
        matrixCellId: "kp-1:CR:B",
        domain: "CR",
        targetLevel: "B",
        role: "CORE",
        observableBehavior: "解释概念",
        evidenceCriteria: ["证据完整"],
        variationRequirements: ["更换情境"],
      },
    ],
  };

  test("persists only slot identity, ownership, type, and difficulty", () => {
    const [slot] = prepareAssessmentTypeSlots({
      assessmentPolicyId: "math-v1",
      composite: false,
      knowledgePointIds: ["kp-1"],
      questions: [],
      rawSlots: [
        {
          id: "slot-1",
          matrixCellId: "kp-1:CR:B",
          questionType: "single_choice",
          difficulty: "D2",
          observableBehavior: "不得持久化",
          variationRequirement: "不得持久化",
        },
      ],
    });

    expect(slot).toEqual({
      id: "slot-1",
      slotStructureVersion: "matrix-type-slots-v1",
      assessmentPolicyId: "math-v1",
      knowledgePointId: "",
      knowledgePointIds: ["kp-1"],
      matrixCellId: "kp-1:CR:B",
      questionType: "single_choice",
      difficulty: "D2",
    });
  });

  test("joins matrix requirements only for the generation request", () => {
    const [requestSlot] = assessmentQuestionGenerationSlots({
      matrix,
      slots: [
        {
          id: "slot-1",
          matrixCellId: "kp-1:CR:B",
          questionType: "single_choice",
          difficulty: "D2",
          knowledgePointIds: ["kp-1"],
        },
      ],
    });

    expect(requestSlot).toMatchObject({
      id: "slot-1",
      observableBehavior: "解释概念",
      evidenceCriterion: "证据完整",
      variationRequirement: "更换情境",
    });
  });
});
