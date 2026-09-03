import { afterEach, describe, expect, it, vi } from "vitest";

import request, { withQuery } from "./request";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("standalone platform request", () => {
  it("builds one consistent query string without an empty suffix", () => {
    expect(withQuery("/api/example")).toBe("/api/example");
    expect(withQuery("/api/example", { lessonId: "lesson 1" })).toBe(
      "/api/example?lessonId=lesson+1",
    );
  });

  it("sends credentials and serializes JSON bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: true }),
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);

    await request("/api/example", {
      body: { lessonId: "lesson-1" },
      method: "POST",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/example",
      expect.objectContaining({
        body: JSON.stringify({ lessonId: "lesson-1" }),
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json; charset=utf-8",
        }),
      }),
    );
  });

  it("preserves login state for non-authentication failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(request("/api/example")).resolves.toMatchObject({
      ifLogin: true,
    });
  });
});
