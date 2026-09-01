/** @jest-environment node */
import { createImageAnswerContent } from "./fabricImageAdapter";

describe("drawing answer content contract", () => {
  it("maps exported ink to the existing image answer shape", () => {
    expect(createImageAnswerContent("data:image/png;base64,ink")).toEqual({
      kind: "image",
      backgroundDataUrl: "",
      inkDataUrl: "data:image/png;base64,ink",
    });
  });
});
