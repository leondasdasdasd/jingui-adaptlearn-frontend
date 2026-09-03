import {
  createNewLessonLearningPlan,
  createLessonLearningFlow,
} from "./learningPlan";

describe("new lesson learning plan", () => {
  test("starts with each knowledge point and its exercises without a pre-assessment", () => {
    const plan = createNewLessonLearningPlan([{ id: "kp-1" }, { id: "kp-2" }], {
      assessment: "BOTH",
      compositeExplanation: "GENERATE",
      masteredKnowledgePointPolicy: "SKIP",
    });

    expect(plan.source).toBe("new_lesson");
    expect(plan.targetKnowledgePointIds).toEqual(["kp-1", "kp-2"]);
    expect(plan.units).toEqual([
      {
        id: "learn-kp-1",
        kind: "knowledge_learning",
        knowledgePointId: "kp-1",
      },
      {
        id: "practice-kp-1",
        kind: "knowledge_practice",
        knowledgePointId: "kp-1",
      },
      {
        id: "checkpoint-kp-1",
        kind: "knowledge_checkpoint",
        knowledgePointId: "kp-1",
      },
      {
        id: "learn-kp-2",
        kind: "knowledge_learning",
        knowledgePointId: "kp-2",
      },
      {
        id: "practice-kp-2",
        kind: "knowledge_practice",
        knowledgePointId: "kp-2",
      },
      {
        id: "checkpoint-kp-2",
        kind: "knowledge_checkpoint",
        knowledgePointId: "kp-2",
      },
      { id: "composite-review", kind: "composite_review" },
    ]);
    expect(createLessonLearningFlow(plan).plan.currentIndex).toBe(0);
  });

  test("does not append a post-assessment when the published policy disables it", () => {
    const plan = createNewLessonLearningPlan([{ id: "kp-1" }], {
      assessment: "PRE",
    });

    expect(plan.units.map((unit) => unit.kind)).toEqual([
      "knowledge_learning",
      "knowledge_practice",
      "knowledge_checkpoint",
    ]);
  });
});
