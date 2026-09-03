import { questionResultState } from "./questionResult";

describe("question result state", () => {
  test.each([
    [null, "pending"],
    ["", "pending"],
    [1, "correct"],
    [0.999, "correct"],
    [0.5, "partial"],
    [0, "incorrect"],
  ])("maps %p to %s", (ratio, expected) => {
    expect(questionResultState(ratio)).toBe(expected);
  });
});
