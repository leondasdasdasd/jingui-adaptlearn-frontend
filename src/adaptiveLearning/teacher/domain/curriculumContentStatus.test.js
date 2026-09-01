/** @jest-environment node */

import { deriveCurriculumContentStatus } from "./curriculumContentStatus";

describe("curriculum content status", () => {
  test("keeps a newer local draft visible after an earlier version was published", () => {
    expect(
      deriveCurriculumContentStatus({
        status: "draft",
        publishedVersionId: "version-1",
        postQuestions: [{ id: "question-1" }],
      }),
    ).toBe("unpublished");
  });

  test.each([
    [{ publishedVersionId: "version-1" }, "published"],
    [{ learningUnits: [{ id: "unit-1" }] }, "unpublished"],
    [{}, "empty"],
  ])("maps %p to %s", (content, status) => {
    expect(deriveCurriculumContentStatus(content)).toBe(status);
  });
});
