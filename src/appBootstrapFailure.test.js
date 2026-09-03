import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const indexDocument = new JSDOM(indexHtml).window.document;
const bootstrapGuard = indexDocument.querySelector("#app-bootstrap-guard").textContent;

function createBootstrapRuntime() {
  const runtime = new JSDOM('<div id="app-bootstrap-state"></div>', {
    runScripts: "outside-only",
    url: "http://example.test/",
  });
  let timeoutCallback;
  runtime.window.setTimeout = (callback) => {
    timeoutCallback = callback;
    return 1;
  };
  runtime.window.console.error = vi.fn();
  runtime.window.eval(bootstrapGuard);

  return {
    runtime,
    triggerTimeout: () => timeoutCallback(),
  };
}

function dispatchRejection(window, reason) {
  const event = new window.Event("unhandledrejection");
  Object.defineProperty(event, "reason", { value: reason });
  window.dispatchEvent(event);
}

describe("app bootstrap failure guard", () => {
  it("shows a bilingual recovery action when a script fails", () => {
    const { runtime } = createBootstrapRuntime();

    runtime.window.dispatchEvent(
      new runtime.window.ErrorEvent("error", { message: "module failed" }),
    );

    const alert = runtime.window.document.querySelector('[role="alert"]');
    expect(alert).toHaveTextContent("页面未能启动");
    expect(alert).toHaveTextContent("The app could not start");
    expect(alert.querySelector("button")).toHaveTextContent(
      "刷新页面 / Reload",
    );
    runtime.window.close();
  });

  it("handles an unhandled initialization rejection", () => {
    const { runtime } = createBootstrapRuntime();

    dispatchRejection(runtime.window, new Error("initialization failed"));

    expect(runtime.window.document.querySelector('[role="alert"]')).not.toBeNull();
    runtime.window.close();
  });

  it("turns an initialization timeout into a visible failure", () => {
    const { runtime, triggerTimeout } = createBootstrapRuntime();

    triggerTimeout();

    expect(runtime.window.document.querySelector('[role="alert"]')).not.toBeNull();
    runtime.window.close();
  });

  it("does nothing after React has replaced the bootstrap state", () => {
    const { runtime, triggerTimeout } = createBootstrapRuntime();
    runtime.window.document.querySelector("#app-bootstrap-state").remove();

    triggerTimeout();
    runtime.window.dispatchEvent(
      new runtime.window.ErrorEvent("error", { message: "late error" }),
    );

    expect(runtime.window.document.querySelector('[role="alert"]')).toBeNull();
    expect(runtime.window.console.error).not.toHaveBeenCalled();
    runtime.window.close();
  });

  it("keeps the first failure state when more errors arrive", () => {
    const { runtime } = createBootstrapRuntime();

    runtime.window.dispatchEvent(
      new runtime.window.ErrorEvent("error", { message: "first error" }),
    );
    const firstMarkup = runtime.window.document.body.innerHTML;
    dispatchRejection(runtime.window, new Error("second error"));

    expect(runtime.window.document.body.innerHTML).toBe(firstMarkup);
    expect(runtime.window.console.error).toHaveBeenCalledTimes(1);
    runtime.window.close();
  });
});
