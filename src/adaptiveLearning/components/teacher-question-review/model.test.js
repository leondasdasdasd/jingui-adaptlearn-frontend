/** @vitest-environment node */

import { questionSlotPresentation, resetTypeSpecificFields } from "./model";

describe("teacher question review model", () => {
  test("presents a valid assessment matrix slot", () => {
    expect(
      questionSlotPresentation({
        matrixCellId: "slot:CR:B",
        difficulty: 2,
        blueprintSlotId: "B-1",
      }),
    ).toMatchObject({
      matrixCode: "CR-B",
      difficulty: "D2",
      difficultyLabel: "2 stars",
    });
  });

  test("presents science and physics slots from the policy registry", () => {
    expect(
      questionSlotPresentation({
        assessmentPolicyId: "science-general-v1",
        matrixCellId: "science:IP:D",
        blueprintSlotId: "science-slot",
        difficulty: 4,
      }),
    ).toMatchObject({
      matrixCode: "IP-D",
      description: expect.stringContaining("探究实践 / 探究论证"),
    });
    expect(
      questionSlotPresentation({
        assessmentPolicyId: "physics-v1",
        matrixCellId: "physics:PC:C",
        blueprintSlotId: "physics-slot",
        difficulty: 3,
      }),
    ).toMatchObject({
      matrixCode: "PC-C",
      description: expect.stringContaining("物理观念 / 应用分析"),
    });
  });

  test("presents legacy questions as an empty outside-matrix cell", () => {
    expect(questionSlotPresentation({ difficulty: 2 })).toMatchObject({
      outsideMatrix: true,
      matrixCode: "",
      difficulty: "D2",
    });
  });

  test("uses the shared assignment context for stale slot ownership", () => {
    expect(
      questionSlotPresentation(
        {
          blueprintSlotId: "stale-slot",
          matrixCellId: "kp-1:CR:B",
          difficulty: 2,
        },
        {
          slotAssignments: [{ slotId: "slot-1", matrixCellId: "kp-1:CR:B" }],
        },
      ),
    ).toMatchObject({ outsideMatrix: true, matrixCode: "" });
  });

  test("resets fields that do not belong to the selected question type", () => {
    expect(
      resetTypeSpecificFields(
        { options: [{ id: "A", text: "选项" }] },
        "classification",
      ),
    ).toMatchObject({
      type: "classification",
      answer: {},
      options: [],
      categories: [],
      items: [],
      platformQuestion: null,
    });
  });
});
