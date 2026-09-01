import {
  localizedAttemptAnswer,
  localizedAttemptOutcome,
  localizedAttemptQuestionStem,
  localizedAttemptSource,
  localizedAttemptType,
  studentAttemptHistoryCopy,
} from "./presentation";

describe("student attempt history presentation", () => {
  const originalLanguage = window.globalLange;

  afterEach(() => {
    window.globalLange = originalLanguage;
  });

  test("returns English-only history copy", () => {
    window.globalLange = "en";
    expect(studentAttemptHistoryCopy({ visible: 5, total: 12 })).toMatchObject({
      title: "Attempt history",
      clearFilters: "Clear filters",
      visibleCount: "Showing 5 of 12",
    });
    expect(localizedAttemptType("practice")).toBe("Knowledge practice");
    expect(localizedAttemptSource("classroom")).toBe("Synced from class");
    expect(localizedAttemptOutcome("partial")).toBe("Partially correct");
    expect(localizedAttemptAnswer([])).toBe("Not recorded");
    expect(localizedAttemptQuestionStem("")).toBe(
      "Question content unavailable",
    );
  });

  test("returns Chinese history copy", () => {
    window.globalLange = "zh-CN";
    expect(studentAttemptHistoryCopy().title).toBe("做题记录");
    expect(localizedAttemptType("pre")).toBe("课前小测");
  });
});
