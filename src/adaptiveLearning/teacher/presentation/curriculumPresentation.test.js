/** @vitest-environment node */

import {
  curriculumCatalogLabel,
  curriculumContentStatus,
  curriculumGenerationStatus,
  curriculumOperationError,
  curriculumText,
} from "./curriculumPresentation";

describe("curriculum presentation", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { globalLange: "en", location: { search: "" } });
    vi.stubGlobal("navigator", { language: "en-US" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("localizes status and catalog labels", () => {
    expect(curriculumContentStatus("unpublished")).toEqual({
      label: "Unpublished changes",
      tone: "warning",
    });
    expect(curriculumGenerationStatus("validating").label).toBe(
      "Rules and AI review",
    );
    expect(curriculumCatalogLabel("grade", "grade7-up")).toBe(
      "Grade 7 · Semester 1",
    );
    expect(curriculumText("currentLesson", "本课")).toBe("Current lesson");
  });

  test("does not expose transport errors", () => {
    expect(curriculumOperationError("cancel")).toBe(
      "Unable to cancel generation. Try again later.",
    );
  });
});
