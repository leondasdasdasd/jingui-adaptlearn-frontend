/** @vitest-environment node */

import {
  CLASSROOM_LEARNING_MODE,
  DEFAULT_CLASSROOM_LEARNING_MODE,
  resolveClassroomLearningMode,
} from "./classroomLearningMode";

describe("classroom learning mode", () => {
  it("keeps the three student paths as one shared definition", () => {
    expect(
      resolveClassroomLearningMode(CLASSROOM_LEARNING_MODE.FOUNDATION),
    ).toBe("FOUNDATION");
  });

  it("falls back to the default path for an unknown mode", () => {
    expect(resolveClassroomLearningMode("UNKNOWN")).toBe(
      DEFAULT_CLASSROOM_LEARNING_MODE,
    );
  });
});
