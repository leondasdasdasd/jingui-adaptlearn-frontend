/** @jest-environment node */
/* eslint-disable jsdoc/check-tag-names */
/* global describe, expect, jest, test */
import { listKnowledgePointTree } from "./knowledgePointApi.js";

jest.mock("../infrastructure/runtimeEndpoints.js", () => ({
  adaptiveApiUrl: (path) => `/adaptive-api${path.slice("/api".length)}`,
}));

describe("adaptive learning knowledge point API", () => {
  test("loads the scoped tree through the adaptive BFF boundary", async () => {
    const fetchImplementation = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ id: "kp-1", name: "有理数" }] }),
    });

    await expect(
      listKnowledgePointTree(
        { courseId: 7, educationStageId: 2 },
        { fetchImpl: fetchImplementation },
      ),
    ).resolves.toEqual([{ id: "kp-1", name: "有理数" }]);
    expect(fetchImplementation).toHaveBeenCalledWith(
      "/adaptive-api/v1/knowledge-points?courseId=7&educationStageId=2",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
  });
});
