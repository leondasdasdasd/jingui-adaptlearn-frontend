import { canonicalizeAssessmentTypeSlotsInContent } from "./assessmentTypeSlotMigration";

describe("assessment type-slot migration", () => {
  it("moves historical variation requirements to the matrix and strips slot copies", () => {
    const result = canonicalizeAssessmentTypeSlotsInContent({
      assessmentMatrices: {
        "kp-1": {
          knowledgePointId: "kp-1",
          cells: [
            {
              matrixCellId: "kp-1:CR:B",
              domain: "CR",
              targetLevel: "B",
              role: "CORE",
            },
          ],
        },
      },
      assessmentQuestionSlots: {
        "kp-1": [
          {
            id: "slot-1",
            matrixCellId: "kp-1:CR:B",
            questionType: "single_choice",
            difficulty: "D2",
            variationRequirement: "更换情境",
            observableBehavior: "旧要求副本",
          },
        ],
      },
    });

    expect(
      result.assessmentMatrices["kp-1"].cells[0].variationRequirements,
    ).toEqual(["更换情境"]);
    expect(result.assessmentQuestionSlots["kp-1"][0]).not.toHaveProperty(
      "variationRequirement",
    );
    expect(result.assessmentQuestionSlots["kp-1"][0]).not.toHaveProperty(
      "observableBehavior",
    );
  });

  it("atomically merges historical slots and rewrites question ownership", () => {
    const result = canonicalizeAssessmentTypeSlotsInContent({
      assessmentQuestionSlots: {
        "kp-1": [
          {
            id: "old-1",
            matrixCellId: "kp-1:CR:B",
            questionType: "single_choice",
            knowledgePointIds: ["kp-1"],
          },
          {
            id: "old-2",
            matrixCellId: "kp-1:CR:B",
            questionType: "single_choice",
            knowledgePointIds: ["kp-2"],
          },
        ],
      },
      preQuestions: [],
      postQuestions: [{ id: "q-2", blueprintSlotId: "old-2" }],
    });

    expect(result.assessmentQuestionSlots["kp-1"]).toEqual([
      expect.objectContaining({
        id: "old-1",
        knowledgePointIds: ["kp-1", "kp-2"],
      }),
    ]);
    expect(result.postQuestions[0].blueprintSlotId).toBe("old-1");
  });

  it("supports historical flat slot storage without changing unrelated slots", () => {
    const result = canonicalizeAssessmentTypeSlotsInContent({
      assessmentQuestionSlots: [
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
        {
          id: "slot-fill",
          matrixCellId: "kp-1:CR:B",
          questionType: "fill_blank",
        },
      ],
      preQuestions: [{ id: "q-1", blueprintSlotId: "old-2" }],
      postQuestions: [],
    });

    expect(result.assessmentQuestionSlots.map((slot) => slot.id)).toEqual([
      "old-1",
      "slot-fill",
    ]);
    expect(result.preQuestions[0].blueprintSlotId).toBe("old-1");
  });

  it("upgrades incomplete historical cells to the canonical four-or-three type structure", () => {
    const result = canonicalizeAssessmentTypeSlotsInContent({
      assessmentMatrices: {
        "kp-1": {
          knowledgePointId: "kp-1",
          assessmentPolicyId: "physics-v1",
          knowledgePointIds: ["kp-1"],
          cells: [
            {
              matrixCellId: "kp-1:PC:B",
              domain: "PC",
              targetLevel: "B",
              role: "CORE",
              observableBehavior: "解释物理现象",
              evidenceCriteria: ["解释完整"],
              recommendedQuestionTypes: ["single_choice", "fill_blank"],
            },
            {
              matrixCellId: "kp-1:ST:C",
              domain: "ST",
              targetLevel: "C",
              role: "SUPPORT",
              observableBehavior: "分析实验数据",
              evidenceCriteria: ["读取变量"],
              recommendedQuestionTypes: ["short_answer"],
            },
          ],
        },
      },
      assessmentQuestionSlots: {
        "kp-1": [
          {
            id: "existing",
            matrixCellId: "kp-1:PC:B",
            questionType: "single_choice",
          },
        ],
      },
      preQuestions: [],
      postQuestions: [],
    });

    const slots = result.assessmentQuestionSlots["kp-1"];
    expect(
      slots.filter((slot) => slot.matrixCellId === "kp-1:PC:B"),
    ).toHaveLength(4);
    expect(
      slots.filter((slot) => slot.matrixCellId === "kp-1:ST:C"),
    ).toHaveLength(3);
    for (const matrixCellId of ["kp-1:PC:B", "kp-1:ST:C"]) {
      const cellSlots = slots.filter(
        (slot) => slot.matrixCellId === matrixCellId,
      );
      expect(new Set(cellSlots.map((slot) => slot.questionType)).size).toBe(
        cellSlots.length,
      );
    }
  });

  it("does not repair a versioned BFF response when it is incomplete", () => {
    const result = canonicalizeAssessmentTypeSlotsInContent({
      assessmentMatrices: {
        "kp-1": {
          knowledgePointId: "kp-1",
          cells: [
            {
              matrixCellId: "kp-1:PC:B",
              role: "CORE",
              recommendedQuestionTypes: ["single_choice"],
            },
          ],
        },
      },
      assessmentQuestionSlots: {
        "kp-1": [
          {
            id: "new-slot",
            slotStructureVersion: "matrix-type-slots-v1",
            matrixCellId: "kp-1:PC:B",
            questionType: "single_choice",
          },
        ],
      },
    });

    expect(result.assessmentQuestionSlots["kp-1"]).toHaveLength(1);
  });
});
