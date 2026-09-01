import {
  classroomActionError,
  helpReasonLabel,
  liveCurrentContent,
  liveStageLabel,
  liveText,
  liveWarningLabel,
  supportSourceLabel,
} from "./presentation";

describe("teacher live presentation", () => {
  afterEach(() => {
    delete window.globalLange;
  });

  test("renders live classroom copy in one selected language", () => {
    window.globalLange = "zh-CN";
    expect(liveText("studentHelp", "学生求助")).toBe("学生求助");
    expect(helpReasonLabel("STUCK")).toBe("做到一半卡住了");

    window.globalLange = "en";
    expect(liveText("studentHelp", "学生求助")).toBe("Student help");
    expect(helpReasonLabel("STUCK")).toBe("Stuck partway through");
  });

  test("localizes source labels and hides internal action errors", () => {
    window.globalLange = "en";
    expect(supportSourceLabel({ contextType: "PRACTICE" })).toBe(
      "Independent practice",
    );
    expect(classroomActionError(new Error("internal database failure"))).toBe(
      "Failed to end the class. Try again later.",
    );
  });

  test("localizes stable student stages, content descriptors, and alerts", () => {
    window.globalLange = "en";
    expect(liveStageLabel("pre_assessment")).toBe("Pre-assessment");
    expect(
      liveCurrentContent({
        stageCode: "knowledge_learning",
        currentContentDescriptor: {
          kind: "knowledgeExplanation",
          name: "Rational numbers",
        },
      }),
    ).toBe("Rational numbers · Focused explanation");
    expect(liveWarningLabel({ type: "inactive", minutes: 7 })).toBe(
      "No learning change for 7 min",
    );
  });
});
