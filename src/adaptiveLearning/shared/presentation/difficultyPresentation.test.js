import {
  difficultyBadgeClassName,
  difficultyBadgeTagText,
  difficultyStarCount,
  difficultyStarsCopy,
} from "./difficultyPresentation";

describe("difficulty presentation", () => {
  const originalLanguage = window.globalLange;

  afterEach(() => {
    window.globalLange = originalLanguage;
  });

  test("localizes tag and star accessibility text in English", () => {
    window.globalLange = "en";
    expect(difficultyBadgeTagText("D4")).toBe("Difficulty · 4 stars");
    expect(difficultyBadgeClassName(4)).toBe("advanced");
    expect(difficultyStarsCopy(4)).toEqual({
      ariaLabel: "Difficulty: 4 stars",
      title: "4 stars",
    });
  });

  test("uses only the star level in Chinese", () => {
    window.globalLange = "zh-CN";
    expect(difficultyBadgeTagText("D5")).toBe("难度 · 5星");
  });

  test("keeps missing difficulty at the neutral three-star level", () => {
    expect(difficultyStarCount(null)).toBe(3);
    expect(difficultyBadgeClassName(null)).toBe("standard");
  });
});
