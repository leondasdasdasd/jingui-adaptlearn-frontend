import {
  correctionEncouragementId,
  correctionEncouragementIds,
} from "./realtimeCorrection";

describe("realtime correction", () => {
  test("selects a stable semantic encouragement id without UI copy", () => {
    const first = correctionEncouragementId("question-1");
    const second = correctionEncouragementId("question-1");

    expect(second).toBe(first);
    expect(correctionEncouragementIds).toContain(first);
    expect(first).toMatch(/^[a-z-]+$/);
  });
});
