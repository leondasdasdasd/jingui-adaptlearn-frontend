/** @jest-environment node */

import {
  curriculumCatalogLabel,
  curriculumContentStatus,
  curriculumGenerationStatus,
  curriculumOperationError,
} from "./curriculumPresentation";

describe("curriculum presentation", () => {
  beforeEach(() => {
    global.window = { globalLange: "en", location: { search: "" } };
    global.navigator = { language: "en-US" };
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
  });

  test("does not expose transport errors", () => {
    expect(curriculumOperationError("cancel")).toBe(
      "Unable to cancel generation. Try again later.",
    );
  });
});
