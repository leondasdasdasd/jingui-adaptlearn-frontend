/** @jest-environment node */
/* global afterEach, describe, expect, jest, test */
import { generateAssessmentQuestionSlots } from "./questionApi.js";

jest.mock("../shared/infrastructure/runtimeEndpoints.js", () => ({
  adaptiveApiUrl: (path) => `/adaptive-api${path.slice("/api".length)}`,
}));

describe("assessment question slot API", () => {
  afterEach(() => {
    delete global.fetch;
  });

  test("plans slots through a boundary separate from matrix and question generation", async () => {
    const responseBody = {
      assessmentQuestionSlots: {
        "kp-1": [{ id: "kp-1:CR:B:1", matrixCellId: "kp-1:CR:B" }],
      },
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    });
    global.fetch = fetchMock;
    const payload = {
      lesson: { id: "lesson-1", title: "正负数" },
      knowledgePoints: [{ id: "kp-1", name: "正负数" }],
      assessmentMatrices: { "kp-1": { knowledgePointId: "kp-1" } },
    };

    await expect(generateAssessmentQuestionSlots(payload)).resolves.toEqual(
      responseBody,
    );
    expect(responseBody.assessmentQuestionSlots["kp-1"][0]).not.toHaveProperty(
      "slotId",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/adaptive-api/assessment-question-slots/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  test("surfaces the slot planning failure without falling through to question generation", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ message: "矩阵格证据数不匹配" }),
    });

    await expect(generateAssessmentQuestionSlots({})).rejects.toThrow(
      "矩阵格证据数不匹配",
    );
  });
});
