/** @vitest-environment jsdom */

import { resolveUnitAssessmentChapter } from "./resolveUnitAssessmentChapter";

describe("resolveUnitAssessmentChapter", () => {
  beforeEach(() => sessionStorage.clear());

  test("rejects route state from another course and resolves by composite identity", () => {
    const chapter = resolveUnitAssessmentChapter({
      courseId: "zhejiang-grade7-math-volume1",
      chapterId: "chapter-1",
      routedChapter: {
        id: "chapter-1",
        course: { id: "science-zhejiang-grade7-up" },
        sections: [],
      },
    });

    expect(chapter.course.id).toBe("zhejiang-grade7-math-volume1");
    expect(chapter.title).toBe("有理数");
  });
});
