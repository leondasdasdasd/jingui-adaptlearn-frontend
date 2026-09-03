/** @vitest-environment node */

import { toTeacherHelpRequestViewModel } from "./helpRequestViewModel";

describe("teacher help request view model", () => {
  test("presents the student's internal difficulty code as stars", () => {
    const viewModel = toTeacherHelpRequestViewModel({
      id: "request-1",
      questionSnapshot: {
        difficulty: "D5",
        questionNumber: 2,
        questionTypeLabel: "单选题",
      },
    });

    expect(viewModel.questionSummary).toBe("第2题 · 单选题 · 难度5 stars");
  });
});
