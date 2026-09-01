jest.mock("../shared/infrastructure/runtimeEndpoints.js", () => ({
  adaptiveApiUrl: (path) => path,
}));

import { gradeAnswerWithFallback, gradeShortAnswerLocally } from "./gradingApi";

describe("gradeShortAnswerLocally", () => {
  test("returns a non-evidence pending result without a reference answer", () => {
    const result = gradeShortAnswerLocally({ maxScore: 10 }, "my answer");
    expect(result.gradingStatus).toBe("unresolved");
    expect(result.evidenceEligible).toBe(false);
    expect(result.score).toBeNull();
  });

  test("grades a matching answer when a reference answer exists", () => {
    const result = gradeShortAnswerLocally(
      { answer: "photosynthesis", maxScore: 10 },
      "Photosynthesis is the process",
    );
    expect(result.gradingStatus).toBe("final");
    expect(result.evidenceEligible).toBe(true);
    expect(result.score).toBe(10);
  });

  test("falls back after gateway failure for text and keeps image answers pending", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("gateway down"));
    await expect(
      gradeAnswerWithFallback({
        question: { type: "short_answer", answer: "water", maxScore: 10 },
        answerText: "water",
        contentVersionId: "published",
      }),
    ).resolves.toMatchObject({ gradingStatus: "final", evidenceEligible: true });
    await expect(
      gradeAnswerWithFallback({
        question: { type: "short_answer", answer: "water", maxScore: 10 },
        answerText: "water",
        imageDataUrl: "data:image/png;base64,x",
        contentVersionId: "published",
      }),
    ).rejects.toThrow("gateway down");
  });
});
