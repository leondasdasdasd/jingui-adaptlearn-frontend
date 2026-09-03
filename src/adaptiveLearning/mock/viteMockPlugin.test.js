import { describe, expect, it } from "vitest";
import { viteMockAdaptivePlugin } from "./viteMockPlugin.js";

function createMockServer() {
  let middleware;
  return {
    config: {
      logger: {
        warn: () => {},
      },
    },
    middlewares: {
      use(fn) {
        middleware = fn;
      },
    },
    async request(url, method = "GET", body = null) {
      const req = {
        url,
        method,
        headers: { host: "localhost:3000" },
        on(event, handler) {
          if (event === "data" && body) handler(JSON.stringify(body));
          if (event === "end") handler();
        },
      };
      let statusCode = 200;
      let responseBody = "";
      const res = {
        statusCode: 200,
        setHeader() {},
        end(data) {
          responseBody = data;
        },
      };
      let nextCalled = false;
      await middleware(req, res, () => {
        nextCalled = true;
      });
      return {
        nextCalled,
        status: res.statusCode,
        body: responseBody ? JSON.parse(responseBody) : null,
      };
    },
  };
}

describe("viteMockAdaptivePlugin", () => {
  it("intercepts teacher session request with authenticated principal", async () => {
    const plugin = viteMockAdaptivePlugin();
    const server = createMockServer();
    plugin.configureServer(server);

    const result = await server.request("/adaptive-api/teacher/session");
    expect(result.nextCalled).toBe(false);
    expect(result.body).toMatchObject({
      status: "authenticated",
      principal: {
        subjectFingerprint: "mock-teacher-fingerprint-001",
        displayName: "云谷任课教师",
        role: "TEACHER",
      },
    });
  });

  it("intercepts teacher classes list", async () => {
    const plugin = viteMockAdaptivePlugin();
    const server = createMockServer();
    plugin.configureServer(server);

    const result = await server.request(
      "/classroom-api/api/v1/teacher/classes",
    );
    expect(result.nextCalled).toBe(false);
    expect(Array.isArray(result.body)).toBe(true);
    expect(result.body.length).toBeGreaterThan(0);
    expect(result.body[0]).toHaveProperty("className");
  });

  it("intercepts teacher learning periods list", async () => {
    const plugin = viteMockAdaptivePlugin();
    const server = createMockServer();
    plugin.configureServer(server);

    const result = await server.request(
      "/classroom-api/api/v1/teacher/learning-periods",
    );
    expect(result.nextCalled).toBe(false);
    expect(Array.isArray(result.body)).toBe(true);
    expect(result.body[0]).toHaveProperty("title");
  });

  it("intercepts textbook lesson versions for teacher", async () => {
    const plugin = viteMockAdaptivePlugin();
    const server = createMockServer();
    plugin.configureServer(server);

    const result = await server.request(
      "/classroom-api/api/v1/teacher/textbook-lessons/section-1-1/content-version",
    );
    expect(result.nextCalled).toBe(false);
    expect(result.body).toHaveProperty("contentPackage");
  });
});
