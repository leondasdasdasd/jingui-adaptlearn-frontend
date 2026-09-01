/** @jest-environment node */

jest.mock("./runtimeEndpoints.js", () => ({
  adaptiveApiUrl: (path) => `/adaptive-api${path.replace(/^\/api/, "")}`,
}));

import { getTeacherSession } from "./teacherAuthorization";

describe("teacher authorization boundary", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("reports an unavailable identity service instead of authenticating", async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(getTeacherSession()).rejects.toMatchObject({
      code: "TEACHER_IDENTITY_UNAVAILABLE",
      status: 503,
    });
  });

  test("preserves the login destination from an unauthenticated response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: "TEACHER_SESSION_REQUIRED",
          loginUrl: "https://task.daily.yungu-inc.org/exam",
          message: "需要使用教师账号登录",
        }),
      ok: false,
      status: 401,
    });

    await expect(getTeacherSession()).rejects.toMatchObject({
      code: "TEACHER_SESSION_REQUIRED",
      loginUrl: "https://task.daily.yungu-inc.org/exam",
      status: 401,
    });
  });

  test("returns only a validated authenticated principal", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          logoutUrl: "https://task.daily.yungu-inc.org/logout",
          principal: {
            displayName: "Leon",
            subjectFingerprint: "hmac-sha256:test-principal",
          },
          status: "authenticated",
        }),
      ok: true,
      status: 200,
    });

    await expect(getTeacherSession()).resolves.toEqual({
      displayName: "Leon",
      logoutUrl: "https://task.daily.yungu-inc.org/logout",
      subjectFingerprint: "hmac-sha256:test-principal",
    });
  });
});
