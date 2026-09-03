import {
  knowledgeMapSourceLabel,
  knowledgeMapStatusCopy,
} from "./knowledgeMapPresentation";

describe("knowledge map presentation", () => {
  it("localizes learning status and action copy", () => {
    window.globalLange = "en";

    expect(knowledgeMapStatusCopy("needs_review")).toEqual({
      label: "Needs review",
      actionText: "Review",
    });
    expect(knowledgeMapStatusCopy("unknown").label).toBe("Not started");
  });

  it("maps evidence sources without exposing unknown values", () => {
    window.globalLange = "zh-CN";

    expect(knowledgeMapSourceLabel("pre_assessment_preview")).toBe("课前诊断");
    expect(knowledgeMapSourceLabel("unknown")).toBe("");
  });
});
