vi.mock("../shared/infrastructure/runtimeEndpoints.js", () => ({
  adaptiveApiUrl: (path) => path,
}));

import { gradeAnswerWithFallback, gradeShortAnswerLocally } from "./gradingApi";

describe("gradeShortAnswerLocally", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

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

  test("surfaces gateway failures instead of returning simulated grades", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("gateway down"));
    await expect(
      gradeAnswerWithFallback({
        question: { type: "short_answer", answer: "water", maxScore: 10 },
        answerText: "water",
        contentVersionId: "published",
      }),
    ).rejects.toThrow("gateway down");
    await expect(
      gradeAnswerWithFallback({
        question: { type: "short_answer", answer: "water", maxScore: 10 },
        answerText: "water",
        imageDataUrl: "data:image/png;base64,x",
        contentVersionId: "published",
      }),
    ).rejects.toThrow("gateway down");
  });

  test("does not use a published answer key when the grading service is down", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("gateway down"));
    await expect(
      gradeAnswerWithFallback({
        question: { type: "fill_blank", answer: "42", maxScore: 10 },
        answerText: "42",
        contentVersionId: "published",
      }),
    ).rejects.toThrow("gateway down");
  });

  test("does not synthesize a wrong-answer result after a service failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("gateway down"));
    await expect(
      gradeAnswerWithFallback({
        question: { type: "single_choice", answer: "B", maxScore: 1 },
        answerText: "A",
        contentVersionId: "published",
      }),
    ).rejects.toThrow("gateway down");
  });

  test("uses the objective snapshot when an image answer has no content version", async () => {
    await expect(
      gradeAnswerWithFallback({
        question: { type: "fill_blank", answer: "42", maxScore: 10 },
        answerText: "",
        imageDataUrl: "data:image/png;base64,x",
      }),
    ).resolves.toMatchObject({
      answerQuality: "no_attempt",
      authority: "local_preview",
      score: 0,
    });
  });
});
