import {
  normalizeOpenMaicClassroomUrl,
  openMaicPlaybackUrl,
  openMaicProfessionalUrl,
} from "./openMaicRuntimeAdapter.js";

describe("normalizeOpenMaicClassroomUrl", () => {
  it.each([
    ["http://127.0.0.1:3100/classroom/room-1", "/openmaic/classroom/room-1"],
    ["http://127.0.0.1:3101/classroom/room-2", "/openmaic/classroom/room-2"],
    ["/openmaic/classroom/room-3", "/openmaic/classroom/room-3"],
  ])("maps runtime URL %s to browser URL", (input, expected) => {
    expect(normalizeOpenMaicClassroomUrl(input)).toBe(expected);
  });

  it("builds a browser URL from classroom id and preserves external URLs", () => {
    expect(normalizeOpenMaicClassroomUrl("", "room-fallback")).toBe(
      "/openmaic/classroom/room-fallback",
    );
    expect(
      normalizeOpenMaicClassroomUrl(
        "https://learning.example.org/classroom/room-4",
      ),
    ).toBe("https://learning.example.org/classroom/room-4");
  });
});

describe("OpenMAIC view modes", () => {
  it("opens classroom preview in student mode", () => {
    expect(
      openMaicPlaybackUrl("/openmaic/classroom/room-2?source=teacher#scene-3"),
    ).toBe("/openmaic/classroom/room-2?source=teacher&view=student#scene-3");
  });

  it("opens professional mode without the student view parameter", () => {
    expect(
      openMaicProfessionalUrl(
        "/openmaic/classroom/room-2?source=teacher&view=student#scene-3",
      ),
    ).toBe("/openmaic/classroom/room-2?source=teacher#scene-3");
  });
});
