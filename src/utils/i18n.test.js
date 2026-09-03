/** @vitest-environment jsdom */

import { syncDocumentLocale } from "./i18n";

describe("document locale", () => {
  afterEach(() => {
    delete window.globalLange;
    vi.unstubAllGlobals();
  });

  test.each([
    ["zh_CN", "zh-CN"],
    ["cn", "zh-CN"],
    ["en-GB", "en"],
  ])("maps %s to the root language %s", (configuredLocale, expected) => {
    window.globalLange = configuredLocale;

    expect(syncDocumentLocale()).toBe(expected);
    expect(document.documentElement).toHaveAttribute("lang", expected);
  });

  test("falls back to English for an unsupported browser language", () => {
    vi.stubGlobal("navigator", { language: "fr-FR" });

    expect(syncDocumentLocale()).toBe("en");
    expect(document.documentElement).toHaveAttribute("lang", "en");
  });
});
