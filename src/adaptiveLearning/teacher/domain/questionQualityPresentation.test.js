import { collectLessonQualityQuestions } from "./questionQualityPresentation";

describe("question quality domain", () => {
  test("keeps locale-specific module labels out of server question snapshots", () => {
    const questions = collectLessonQualityQuestions({
      preQuestions: [{ id: "pre-1", stem: "Question A" }],
      postQuestions: [
        { id: "post-1", stem: "Question B", phase: "review" },
      ],
    });

    expect(questions).toEqual([
      expect.objectContaining({ id: "pre-1", module: "pre" }),
      expect.objectContaining({ id: "post-1", module: "post" }),
    ]);
    expect(questions.every((question) => !("moduleLabel" in question))).toBe(
      true,
    );
  });
});
