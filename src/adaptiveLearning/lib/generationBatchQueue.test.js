import { createGenerationBatchQueue } from "./generationBatchQueue.js";

vi.mock("../shared/infrastructure/runtimeEndpoints.js", () => ({
  adaptiveApiUrl: (path) => `/adaptive-api${path.replace(/^\/api/, "")}`,
}));

describe("createGenerationBatchQueue", () => {
  it("settles protocol results and rejects entries omitted by the dispatcher", async () => {
    const enqueue = createGenerationBatchQueue({
      batchSize: 2,
      idPrefix: "test",
      abortMessage: "cancelled",
      missingResultError: () => new Error("missing"),
      cancelTask: vi.fn(),
      dispatchBatch: async ([first], { settle }) => {
        settle(first, "resolve", first.payload.value);
      },
    });

    await expect(
      Promise.allSettled([
        enqueue({ value: "ready" }),
        enqueue({ value: "omitted" }),
      ]),
    ).resolves.toEqual([
      { status: "fulfilled", value: "ready" },
      {
        status: "rejected",
        reason: expect.objectContaining({ message: "missing" }),
      },
    ]);
  });

  it("cancels persisted work and rejects with AbortError before dispatch", async () => {
    const cancelTask = vi.fn().mockResolvedValue(undefined);
    const dispatchBatch = vi.fn();
    const enqueue = createGenerationBatchQueue({
      batchSize: 2,
      idPrefix: "test",
      abortMessage: "cancelled",
      missingResultError: () => new Error("missing"),
      cancelTask,
      dispatchBatch,
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      enqueue({}, { signal: controller.signal }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(cancelTask).toHaveBeenCalledWith(expect.stringMatching(/^test-/));
    expect(dispatchBatch).not.toHaveBeenCalled();
  });
});
