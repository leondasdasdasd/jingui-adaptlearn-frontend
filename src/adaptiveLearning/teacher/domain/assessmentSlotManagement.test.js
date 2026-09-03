import {
  assessmentQuestionSourceKey,
  appendImportedQuestionSnapshot,
  assignQuestionToAssessmentSlot,
  distributeCompositeSlotKnowledgePoints,
} from "./assessmentSlotManagement";

test("为所有题源生成统一的稳定身份键", () => {
  expect(assessmentQuestionSourceKey({ kind: " paper ", questionId: 42 })).toBe(
    "paper:42",
  );
  expect(assessmentQuestionSourceKey({ kind: "paper" })).toBe("");
  expect(
    assessmentQuestionSourceKey({ kind: "paper", questionId: "   " }),
  ).toBe("");
});
import { prepareAssessmentTypeSlots } from "./assessmentTypeSlot";

describe("assessment slot management", () => {
  const slots = [
    { id: "slot-1", matrixCellId: "composite:ST:C", knowledgePointIds: [] },
    { id: "slot-2", matrixCellId: "composite:IP:D", knowledgePointIds: [] },
  ];

  it("covers all three lesson knowledge points with cross-point slots", () => {
    const distributed = distributeCompositeSlotKnowledgePoints({
      slots,
      knowledgePointIds: ["kp-1", "kp-2", "kp-3"],
      questions: [
        {
          id: "unassigned",
          blueprintSlotId: null,
          knowledgePointIds: ["kp-1"],
        },
      ],
    });
    expect(
      distributed.every((slot) => slot.knowledgePointIds.length >= 2),
    ).toBe(true);
    expect(
      new Set(distributed.flatMap((slot) => slot.knowledgePointIds)),
    ).toEqual(new Set(["kp-1", "kp-2", "kp-3"]));
  });

  it("reassigns one primary slot and blocks duplicate imported sources", () => {
    const assigned = assignQuestionToAssessmentSlot({
      questions: [{ id: "q-1", blueprintSlotId: "old" }],
      slots: [
        {
          ...slots[0],
          assessmentPolicyId: "science-general-v1",
          knowledgePointIds: ["kp-1", "kp-2"],
        },
      ],
      questionId: "q-1",
      slotId: "slot-1",
    });
    expect(assigned[0]).toMatchObject({
      blueprintSlotId: "slot-1",
      assessmentPolicyId: "science-general-v1",
      matrixCellId: "composite:ST:C",
      knowledgePointIds: ["kp-1", "kp-2"],
    });
    const imported = appendImportedQuestionSnapshot({
      questions: assigned,
      snapshot: { stem: "真实题目快照" },
      source: { kind: " question_bank ", questionId: 42, version: "v3" },
      slot: slots[0],
    });
    expect(imported.at(-1).source).toMatchObject({
      kind: "question_bank",
      questionId: "42",
      version: "v3",
    });
    expect(() =>
      appendImportedQuestionSnapshot({
        questions: imported,
        snapshot: { stem: "更新后的源题" },
        source: { kind: "question_bank", questionId: 42, version: "v4" },
        slot: slots[0],
      }),
    ).toThrow("该题已加入当前课时");
  });

  it("preserves BFF type slots and completes composite knowledge coverage", () => {
    const result = prepareAssessmentTypeSlots({
      assessmentPolicyId: "science-general-v1",
      composite: true,
      knowledgePointIds: ["kp-1", "kp-2", "kp-3"],
      questions: [],
      rawSlots: [
        {
          id: "raw-1",
          matrixCellId: "composite:ST:C",
          questionType: "single_choice",
        },
        {
          id: "raw-2",
          matrixCellId: "composite:ST:C",
          questionType: "short_answer",
        },
      ],
    });

    expect(result).toHaveLength(2);
    expect(result.map((slot) => slot.id)).toEqual(["raw-1", "raw-2"]);
    expect(result.map((slot) => slot.questionType)).toEqual([
      "single_choice",
      "short_answer",
    ]);
    expect(result.every((slot) => slot.knowledgePointIds.length >= 2)).toBe(
      true,
    );
    expect(new Set(result.flatMap((slot) => slot.knowledgePointIds))).toEqual(
      new Set(["kp-1", "kp-2", "kp-3"]),
    );
  });
});
