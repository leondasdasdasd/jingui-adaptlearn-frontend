import {
  assessmentQuestionTypeLabel,
  assessmentRoleMeta,
  projectAssessmentSlots,
} from "./assessmentPresentation";

const translate = (key, fallback, replacements = {}) =>
  fallback.replace(/\{\$(.*?)\}/g, (_, name) => replacements[name] ?? "");

describe("assessment presentation", () => {
  test("keeps slot contracts authoritative while applying generation state", () => {
    const result = projectAssessmentSlots({
      hasMatrix: true,
      questionSlots: [
        {
          id: "slot-1",
          matrixCode: "CR-B",
          difficulty: "medium",
          questionType: "single_choice",
          matrixRole: "CORE",
          observableBehavior: "Authoritative contract behavior",
        },
      ],
      slotGeneration: {
        isRunning: true,
        canRetry: false,
        states: [
          {
            id: "slot-1",
            status: "success",
            observableBehavior: "Leaked task payload",
          },
        ],
      },
      translate,
    });

    expect(result.slots[0]).toMatchObject({
      status: "success",
      observableBehavior: "Authoritative contract behavior",
      questionTypeLabel: "单选题",
      roleLabel: "核心",
    });
    expect(result.counts).toEqual({ successful: 1, failed: 0, waiting: 0 });
  });

  test("defaults to ready when a saved slot has no generation state", () => {
    const result = projectAssessmentSlots({
      hasMatrix: true,
      questionSlots: [{ id: "slot-1" }],
      slotGeneration: { states: [], isRunning: false, canRetry: false },
      translate,
    });

    expect(result.slots[0].status).toBe("ready");
    expect(result.canRetryFailedSlots).toBe(false);
  });

  test("uses stable localized fallbacks for unknown role and question type", () => {
    expect(assessmentRoleMeta("UNKNOWN", translate)).toMatchObject({
      id: "SUPPORT",
      label: "支撑",
    });
    expect(assessmentQuestionTypeLabel("custom_type", translate)).toBe(
      "custom_type",
    );
  });
});
