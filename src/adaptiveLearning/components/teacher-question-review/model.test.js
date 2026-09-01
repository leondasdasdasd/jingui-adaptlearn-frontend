/** @jest-environment node */

import { questionSlotPresentation, resetTypeSpecificFields } from "./model";

describe("teacher question review model", () => {
  test("presents a valid assessment matrix slot", () => {
    expect(
      questionSlotPresentation({
        matrixCellId: "slot:CR:B",
        difficulty: 2,
        blueprintSlotId: "B-1",
      }),
    ).toMatchObject({ matrixCode: "CR-B", difficulty: "D2" });
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
