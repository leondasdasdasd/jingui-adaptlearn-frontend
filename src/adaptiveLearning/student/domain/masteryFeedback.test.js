import {
  attemptScoreRatio,
  attemptScoreRatioOrNull,
  masteryUpdateFromAttempt,
} from "./masteryFeedback";

describe("mastery feedback adapters", () => {
  test("preserves pending score state while aggregate scoring remains stable", () => {
    expect(attemptScoreRatioOrNull({})).toBeNull();
    expect(attemptScoreRatioOrNull({ scoreRatio: null })).toBeNull();
    expect(
      attemptScoreRatioOrNull({ scoreRatio: null, score: 0, maxScore: 1 }),
    ).toBeNull();
    expect(attemptScoreRatio({})).toBe(0);
    expect(attemptScoreRatioOrNull({ score: 0, maxScore: 1 })).toBe(0);
    expect(attemptScoreRatioOrNull({ score: 3, maxScore: 4 })).toBe(0.75);
  });

  test("normalizes a U1 preview without exposing its transport container", () => {
    expect(
      masteryUpdateFromAttempt(
        {
          u1Preview: {
            "kp-1": {
              masteryBefore: 0.82,
              masteryAfter: 0.91,
              confidenceAfter: 0.8,
              correctStreak: 2,
            },
          },
        },
        "kp-1",
      ),
    ).toEqual(
      expect.objectContaining({
        before: 82,
        after: 91,
        delta: 9,
        confidence: 80,
        correctStreak: 2,
        hasAuthoritativeSnapshot: true,
      }),
    );
  });
});
