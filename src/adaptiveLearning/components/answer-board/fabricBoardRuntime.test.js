/** @jest-environment node */
jest.mock("fabric", () => ({ fabric: {} }));

import {
  createFabricBoardSnapshot,
  isFabricBoardSnapshot,
} from "./fabricBoardRuntime";

describe("Fabric board snapshot contract", () => {
  it("keeps Fabric serialization behind a versioned persistence boundary", () => {
    const document = { objects: [{ type: "path" }], version: "5.5.2" };
    const canvas = { toJSON: jest.fn(() => document) };

    const snapshot = createFabricBoardSnapshot(canvas);

    expect(canvas.toJSON).toHaveBeenCalledWith(["boardTool"]);
    expect(snapshot).toEqual({
      contract: "adaptive-fabric-board",
      version: 1,
      document,
    });
    expect(isFabricBoardSnapshot(snapshot)).toBe(true);
    expect(isFabricBoardSnapshot({ document })).toBe(false);
  });
});
