import { isPreAssessmentGateSatisfied } from "./preAssessmentAccess";

describe("pre-assessment access", () => {
  test("allows a service-backed new lesson plan to enter learning directly", () => {
    expect(
      isPreAssessmentGateSatisfied({
        selection: { entryMode: "new_lesson" },
        learningFlow: { plan: { source: "new_lesson" } },
      }),
    ).toBe(true);
  });

  test("does not bypass the pre-assessment with only a client entry flag", () => {
    expect(
      isPreAssessmentGateSatisfied({
        selection: { entryMode: "new_lesson" },
        learningFlow: { plan: null },
        preQuestions: [{ id: "pre-1" }],
      }),
    ).toBe(false);
  });
});
