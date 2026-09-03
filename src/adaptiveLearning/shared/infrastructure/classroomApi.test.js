vi.mock("./runtimeEndpoints.js", () => ({
  classroomApiUrl: (path) => `/classroom-api${path}`,
}));

import {
  createSelfStudySession,
  getStudentSessionSnapshot,
} from "./classroomApi";

describe("classroom API", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("creates a real new-lesson session with the explicit learning mode", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "session-1" }),
    });

    await expect(
      createSelfStudySession("lesson-1", "token-1", {
        learningMode: "NEW_LESSON",
      }),
    ).resolves.toEqual({ id: "session-1" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/classroom-api/api/v1/student/self-study-sessions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          textbookLessonId: "lesson-1",
          learningMode: "NEW_LESSON",
        }),
      }),
    );
  });

  test("surfaces a real service failure instead of returning mock data", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("gateway down"));

    await expect(
      getStudentSessionSnapshot("session-1", "token-1"),
    ).rejects.toThrow("gateway down");
  });
});
