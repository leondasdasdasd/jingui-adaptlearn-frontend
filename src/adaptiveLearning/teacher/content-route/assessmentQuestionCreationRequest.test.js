/** @vitest-environment node */

import { assessmentQuestionCreationRequest } from "./assessmentQuestionCreationRequest";

describe("assessment question creation request", () => {
  test("maps a slot and its matrix cell to the shared editor boundary", () => {
    expect(
      assessmentQuestionCreationRequest({
        scopeId: "kp-1",
        slotId: "slot-1",
        requestId: "request-1",
        assessment: {
          matrix: {
            assessmentPolicyId: "math-v1",
            cells: [{ cellId: "kp-1:CR:B", role: "CORE" }],
          },
          slots: [
            {
              id: "slot-1",
              matrixCellId: "kp-1:CR:B",
              questionType: "fill_blank",
              difficulty: "D3",
              knowledgePointIds: ["kp-1"],
            },
          ],
        },
      }),
    ).toEqual({
      id: "request-1",
      scopeId: "kp-1",
      opener: undefined,
      draft: {
        blueprintSlotId: "slot-1",
        assessmentPolicyId: "math-v1",
        matrixCellId: "kp-1:CR:B",
        matrixRole: "CORE",
        type: "fill_blank",
        difficulty: "D3",
        knowledgePointIds: ["kp-1"],
        primaryKnowledgePointId: "kp-1",
      },
    });
  });

  test("returns null when the slot no longer exists", () => {
    expect(
      assessmentQuestionCreationRequest({
        scopeId: "kp-1",
        slotId: "missing",
        requestId: "request-1",
        assessment: { slots: [] },
      }),
    ).toBeNull();
  });
});
