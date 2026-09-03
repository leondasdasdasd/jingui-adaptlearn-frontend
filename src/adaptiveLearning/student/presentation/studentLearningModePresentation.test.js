/** @vitest-environment jsdom */

import {
  resolveStudentLearningModePresentation,
  studentLearningModeOptions,
} from "./studentLearningModePresentation";

describe("student learning mode presentation", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
  });

  it("projects all three paths from one presentation registry", () => {
    expect(studentLearningModeOptions()).toEqual([
      expect.objectContaining({ id: "NEW_LESSON", actionKind: "new_lesson" }),
      expect.objectContaining({
        id: "FOUNDATION",
        actionKind: "assessment_first",
      }),
      expect.objectContaining({
        id: "REMEDIATION",
        actionKind: "unit_assessment",
      }),
    ]);
  });

  it("uses the same new-lesson fallback as the domain", () => {
    expect(resolveStudentLearningModePresentation("UNKNOWN")).toEqual(
      expect.objectContaining({ id: "NEW_LESSON", actionLabel: "上新课" }),
    );
  });
});
