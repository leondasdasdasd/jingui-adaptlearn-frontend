vi.mock("../shared/infrastructure/runtimeEndpoints.js", () => ({
  adaptiveApiUrl: (path) => `/adaptive-api${path}`,
}));

import { analyzeLearningCheckIn } from "./learningCheckInApi";

describe("learning check-in API", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("surfaces a real service failure instead of returning a mock diagnosis", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("gateway down"));

    await expect(analyzeLearningCheckIn({ messages: [] })).rejects.toThrow(
      "gateway down",
    );
  });
});
