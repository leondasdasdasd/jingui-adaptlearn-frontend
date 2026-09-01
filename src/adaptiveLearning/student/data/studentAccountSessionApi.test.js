/** @jest-environment node */

jest.mock("../../shared/infrastructure/runtimeEndpoints.js", () => ({
  adaptiveApiUrl: (path) => `/adaptive-api${path.replace(/^\/api/, "")}`,
}));

import { requestStudentAccountSession } from "./studentAccountSessionApi";

describe("student account session API adapter", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("uses the quiz login cookie without putting credentials in the URL", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ studentId: "student-1" }),
      ok: true,
      status: 200,
    });

    await requestStudentAccountSession();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/adaptive-api/student/session",
      expect.objectContaining({
        credentials: "include",
        method: "GET",
        redirect: "manual",
      }),
    );
    expect(globalThis.fetch.mock.calls[0][0]).not.toContain("accessToken");
  });

  test("preserves only the failure metadata required by the repository", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: "STUDENT_SESSION_REQUIRED",
          loginUrl: "/login",
          message: "请登录",
        }),
      ok: false,
      status: 401,
    });

    await expect(requestStudentAccountSession()).rejects.toMatchObject({
      code: "STUDENT_SESSION_REQUIRED",
      loginUrl: "/login",
      status: 401,
    });
  });
});
