import {
  appendScopedMessage,
  replaceScopedStepStatus,
  replaceScopedValue,
} from "./sessionState";

describe("teacher agent session state", () => {
  it("updates one scope without replacing sibling conversation state", () => {
    const previous = { pre: [{ id: "m1" }], review: [{ id: "m2" }] };
    const next = appendScopedMessage(previous, "pre", { id: "m3" });

    expect(next.pre.map(({ id }) => id)).toEqual(["m1", "m3"]);
    expect(next.review).toBe(previous.review);
  });

  it("updates scoped values and step statuses immutably", () => {
    expect(replaceScopedValue({ pre: "old" }, "pre", "new")).toEqual({
      pre: "new",
    });
    expect(
      replaceScopedStepStatus(
        { pre: { inspect: "pending" }, review: { draft: "completed" } },
        "pre",
        "inspect",
        "running",
      ),
    ).toEqual({
      pre: { inspect: "running" },
      review: { draft: "completed" },
    });
  });
});
