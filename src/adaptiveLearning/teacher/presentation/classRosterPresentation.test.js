/** @jest-environment node */

import {
  classRosterCredentialStatus,
  classRosterOperationFailed,
  classRosterTime,
} from "./classRosterPresentation";

describe("class roster presentation", () => {
  beforeEach(() => {
    global.window = { globalLange: "en", location: { search: "" } };
    global.navigator = { language: "en-US" };
  });

  test("localizes credential state without exposing transport errors", () => {
    expect(classRosterCredentialStatus("ACTIVE")).toEqual({
      tone: "info",
      label: "Link active",
    });
    expect(classRosterCredentialStatus("").label).toBe("Not generated");
    expect(classRosterOperationFailed("revoke")).toBe(
      "Unable to deactivate the link. Try again later.",
    );
  });

  test("formats activity time with the current locale and preserves gaps", () => {
    expect(classRosterTime("")).toBe("—");
    expect(classRosterTime("not-a-date")).toBe("—");
    expect(classRosterTime("2026-08-31T08:30:00Z")).not.toContain("undefined");
  });
});
