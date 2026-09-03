/** @vitest-environment node */

vi.mock("../shared/infrastructure/runtimeEndpoints.js", () => ({
  adaptiveApiUrl: (path) => path,
}));

import { createOpenMaicClassroom } from "./openMaicApi.js";

describe("createOpenMaicClassroom", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("propagates a network failure instead of returning a mock classroom", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("gateway down"));

    await expect(
      createOpenMaicClassroom({ lesson: { id: "lesson-1" } }),
    ).rejects.toThrow("gateway down");
  });

  test("uses the server error message when classroom creation fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "service unavailable" }),
    });

    await expect(
      createOpenMaicClassroom({ lesson: { id: "lesson-1" } }),
    ).rejects.toThrow("service unavailable");
  });
});
