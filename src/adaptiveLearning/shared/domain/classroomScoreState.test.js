import { classroomScoreState } from "./classroomScoreState";

describe("classroom score state", () => {
  test("classifies teacher review without producing display copy", () => {
    expect(
      classroomScoreState({ status: "READY", reviewStatus: "PENDING" }),
    ).toEqual({
      kind: "pendingReview",
      ready: false,
      pendingReview: true,
    });
  });

  test("preserves a published service summary as content", () => {
    expect(
      classroomScoreState({
        status: "READY",
        reviewStatus: "PUBLISHED",
        summary: "Published summary",
      }),
    ).toEqual({
      kind: "published",
      ready: true,
      published: true,
      summary: "Published summary",
    });
  });

  test("distinguishes a syncing preview from local practice", () => {
    expect(classroomScoreState(null, "syncing_preview").kind).toBe("syncing");
    expect(classroomScoreState(null, "offline_preview").kind).toBe(
      "practiceComplete",
    );
  });
});
