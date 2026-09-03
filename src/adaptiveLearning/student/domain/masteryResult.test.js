import { mapAuthoritativeMasteryResults } from "./masteryResult";

describe("authoritative mastery result", () => {
  test("keeps the stable evidence trace for result presentation", () => {
    expect(
      mapAuthoritativeMasteryResults({
        algorithmVersion: "u1",
        masteryResults: [
          {
            knowledgeObjectiveId: "kp-1",
            mastery: 82,
            trace: [
              {
                questionId: "q-1",
                masteryBefore: 50,
                masteryAfter: 82,
                masteryDelta: 32,
                confidenceAfter: 0.8,
              },
            ],
          },
        ],
      })["kp-1"].trace,
    ).toEqual([
      {
        questionId: "q-1",
        source: undefined,
        role: undefined,
        scoreRatio: undefined,
        masteryBefore: 50,
        masteryAfter: 82,
        masteryDelta: 32,
        confidenceBefore: undefined,
        confidenceAfter: 0.8,
      },
    ]);
  });
});
