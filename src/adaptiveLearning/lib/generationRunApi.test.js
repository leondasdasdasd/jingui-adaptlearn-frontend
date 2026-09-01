/** @jest-environment node */

jest.mock("../shared/infrastructure/runtimeEndpoints.js", () => ({
  adaptiveApiUrl: (path) => path,
}));

import { generationStateFromRun } from "./generationRunApi";

describe("generation run presentation boundary", () => {
  test("exposes the published version without leaking the draft DTO", () => {
    const generation = generationStateFromRun({
      draft: { publishedVersionNumber: "7" },
      progress: 100,
      runId: "run-1",
      status: "published",
    });

    expect(generation.publishedVersionNumber).toBe(7);
    expect(generation).not.toHaveProperty("draft");
  });

  test("uses null when the run has no published version", () => {
    expect(
      generationStateFromRun({ runId: "run-2", status: "running" })
        .publishedVersionNumber,
    ).toBeNull();
  });
});
