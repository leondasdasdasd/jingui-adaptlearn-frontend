/** @vitest-environment jsdom */

import { getQuestionTypeLocalizedName } from "./questionTypeEditorAdapter";

const questionType = { enName: "Single choice", name: "单选题" };

describe("question type locale", () => {
  afterEach(() => {
    delete window.globalLange;
    vi.unstubAllGlobals();
  });

  test.each([
    ["EN_us", "Single choice"],
    ["cn", "单选题"],
  ])("uses the canonical application locale for %s", (source, expected) => {
    window.globalLange = source;

    expect(getQuestionTypeLocalizedName(questionType)).toBe(expected);
  });

  test("falls back to English for an unsupported browser language", () => {
    vi.stubGlobal("navigator", { language: "fr-FR" });

    expect(getQuestionTypeLocalizedName(questionType)).toBe("Single choice");
  });
});
