import createQuizProgressAction from "./createQuizProgressAction";

describe("createQuizProgressAction", () => {
  test("keeps correction semantics and execution in one command", () => {
    const onConfirmCorrection = jest.fn();
    const action = createQuizProgressAction({
      correctionRequired: true,
      retryRequired: true,
      onConfirmCorrection,
      onRetry: jest.fn(),
      onContinue: jest.fn(),
    });

    expect(action.kind).toBe("confirm-correction");
    action.run();
    expect(onConfirmCorrection).toHaveBeenCalledTimes(1);
  });

  test("selects retry and continue command kinds without view branching", () => {
    expect(
      createQuizProgressAction({
        retryRequired: true,
        answerQuality: "pending_review",
        onRetry: jest.fn(),
      }).kind,
    ).toBe("resubmit");
    expect(
      createQuizProgressAction({
        sequenceComplete: true,
        onContinue: jest.fn(),
      }).kind,
    ).toBe("continue-learning");
  });
});
