import {
  questionQualityFilters,
  questionQualityJobStatus,
  questionQualityModuleLabel,
  questionQualityStatus,
} from "./questionQualityPresentation";

describe("question quality presentation", () => {
  afterEach(() => {
    delete window.globalLange;
  });

  test("localizes filters, modules, and result states", () => {
    window.globalLange = "en";
    expect(questionQualityFilters().map((item) => item.label)).toEqual([
      "All",
      "Issues",
      "Passed",
      "Failed",
    ]);
    expect(questionQualityModuleLabel({ module: "pre" })).toBe(
      "Pre-assessment",
    );
    expect(questionQualityStatus({ status: "passed" }, false).label).toBe(
      "Passed quality review",
    );
  });

  test("localizes live job progress", () => {
    window.globalLange = "en";
    expect(
      questionQualityJobStatus("running", { completed: 3, total: 8 }),
    ).toBe("Reviewing each question · 3/8 complete");
  });
});
