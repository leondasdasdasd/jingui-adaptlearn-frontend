/** @jest-environment node */

import {
  SLOT_QUESTION_APPEND_ISSUES,
  appendQuestionBoundToSlot,
} from "./slotQuestionAppend";

describe("appendQuestionBoundToSlot", () => {
  const existing = [
    { id: "old-slot-question", blueprintSlotId: "slot-1", phase: "knowledge" },
    { id: "review-1", phase: "review" },
  ];

  test("adds a new question for an occupied slot without replacing the old one", () => {
    const generated = {
      id: "new-slot-question",
      blueprintSlotId: "slot-1",
      phase: "knowledge",
    };

    expect(
      appendQuestionBoundToSlot({
        existingQuestions: existing,
        generatedQuestion: generated,
        slotId: "slot-1",
        isComposite: false,
      }),
    ).toEqual([existing[0], generated, existing[1]]);
  });

  test("appends composite questions and keeps their slot binding", () => {
    expect(
      appendQuestionBoundToSlot({
        existingQuestions: existing,
        generatedQuestion: {
          id: "new-review",
          blueprintSlotId: "composite-slot",
        },
        slotId: "composite-slot",
        isComposite: true,
      }),
    ).toEqual([
      ...existing,
      {
        id: "new-review",
        blueprintSlotId: "composite-slot",
        phase: "review",
      },
    ]);
  });

  test("rejects replacement IDs and mismatched slot bindings", () => {
    expect(() =>
      appendQuestionBoundToSlot({
        existingQuestions: existing,
        generatedQuestion: { ...existing[0] },
        slotId: "slot-1",
        isComposite: false,
      }),
    ).toThrow(SLOT_QUESTION_APPEND_ISSUES.DUPLICATE_ID);
    expect(() =>
      appendQuestionBoundToSlot({
        existingQuestions: existing,
        generatedQuestion: { id: "new", blueprintSlotId: "slot-2" },
        slotId: "slot-1",
        isComposite: false,
      }),
    ).toThrow(SLOT_QUESTION_APPEND_ISSUES.SLOT_MISMATCH);
  });
});
