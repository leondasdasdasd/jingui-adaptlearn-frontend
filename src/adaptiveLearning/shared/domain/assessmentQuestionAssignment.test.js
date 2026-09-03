/** @vitest-environment node */

import { classifyAssessmentQuestionAssignment } from "./assessmentQuestionAssignment";

describe("assessment question assignment", () => {
  const context = {
    slotAssignments: [
      { slotId: "slot-1", matrixCellId: "kp-1:CR:B", matrixCell: {} },
      { slotId: "slot-2", matrixCellId: "kp-1:CR:C", matrixCell: {} },
    ],
  };

  test("accepts only a slot and matrix cell that both belong to the scope", () => {
    expect(
      classifyAssessmentQuestionAssignment(
        {
          blueprintSlotId: "slot-1",
          matrixCellId: "kp-1:CR:B",
        },
        context,
      ),
    ).toEqual({
      slotId: "slot-1",
      matrixCellId: "kp-1:CR:B",
      outsideMatrix: false,
      matrixCell: {},
    });
  });

  test.each([
    [{ matrixCellId: "kp-1:CR:B" }],
    [{ blueprintSlotId: "slot-1" }],
    [{ blueprintSlotId: "stale-slot", matrixCellId: "kp-1:CR:B" }],
    [{ blueprintSlotId: "slot-1", matrixCellId: "stale-cell" }],
    [{ blueprintSlotId: "slot-1", matrixCellId: "kp-1:CR:C" }],
  ])(
    "classifies incomplete or stale ownership as outside matrix",
    (question) => {
      expect(
        classifyAssessmentQuestionAssignment(question, context).outsideMatrix,
      ).toBe(true);
    },
  );

  test("rejects a stale pair when its matrix cell no longer exists", () => {
    expect(
      classifyAssessmentQuestionAssignment(
        { blueprintSlotId: "slot-stale", matrixCellId: "cell-stale" },
        {
          slotAssignments: [
            {
              slotId: "slot-stale",
              matrixCellId: "cell-stale",
              matrixCell: null,
            },
          ],
        },
      ).outsideMatrix,
    ).toBe(true);
  });
});
