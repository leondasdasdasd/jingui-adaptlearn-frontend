import {
  difficultyBadgeClassName,
  difficultyBadgeTagText,
  difficultyStarsCopy,
} from "./presentation";

describe("difficulty badge presentation", () => {
  const originalLanguage = window.globalLange;

  afterEach(() => {
    window.globalLange = originalLanguage;
  });

  test("localizes tag and star accessibility text in English", () => {
    window.globalLange = "en";
    expect(difficultyBadgeTagText("D4")).toBe(
      "Difficulty · D4 Variant synthesis",
    );
    expect(difficultyBadgeClassName(4)).toBe("advanced");
    expect(difficultyStarsCopy(4)).toEqual({
      ariaLabel: "Difficulty: 4 stars",
      title: "4 stars",
    });
  });
});
