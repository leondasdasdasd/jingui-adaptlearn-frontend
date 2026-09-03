import { buildPublishedContentPackage } from "./publishedContentPackage";
import { publishedVersionToTeacherContent } from "./publishedVersionView";

describe("published adaptive assessment slots", () => {
  const lesson = {
    id: "physics-lesson",
    title: "光的反射",
    knowledgePoints: [{ id: "kp-reflection", name: "反射定律" }],
  };

  test("preserves policy, source snapshot and slot identity through publish and restore", () => {
    const slot = {
      id: "physics-slot-1",
      assessmentPolicyId: "physics-v1",
      matrixCellId: "kp-reflection:PC:C",
      knowledgePointIds: ["kp-reflection"],
    };
    const question = {
      id: "question_bank-7",
      phase: "knowledge",
      type: "single_choice",
      stem: "反射角与入射角有什么关系？",
      options: [
        { id: "A", text: "相等" },
        { id: "B", text: "互余" },
      ],
      answer: "A",
      analysis: "依据光的反射定律",
      difficulty: 2,
      assessmentPolicyId: "physics-v1",
      blueprintSlotId: slot.id,
      matrixCellId: slot.matrixCellId,
      knowledgePointIds: ["kp-reflection"],
      source: { kind: "question_bank", questionId: "7", version: "v2" },
      sourceContentSnapshot: {
        kind: "question_bank_v2",
        question: { id: 7, elements: [] },
        questionTypes: [],
      },
    };
    const contentPackage = buildPublishedContentPackage({
      lesson,
      content: {
        preQuestions: [],
        postQuestions: [question],
        assessmentMatrices: {
          "kp-reflection": {
            assessmentPolicyId: "physics-v1",
            knowledgePointId: "kp-reflection",
          },
        },
        assessmentQuestionSlots: { "kp-reflection": [slot] },
        learningContent: { composite: {}, knowledgePoints: [] },
      },
    });
    const publishedQuestion =
      contentPackage.knowledgePracticePools["kp-reflection"][0];
    expect(publishedQuestion).toMatchObject({
      blueprintSlotId: "physics-slot-1",
      assessmentPolicyId: "physics-v1",
      source: { kind: "question_bank", questionId: "7" },
      sourceContentSnapshot: { kind: "question_bank_v2" },
    });

    const restored = publishedVersionToTeacherContent({
      id: "version-1",
      textbookLessonId: lesson.id,
      versionNumber: 1,
      contentPackage,
    });
    expect(restored.postQuestions[0]).toMatchObject({
      blueprintSlotId: "physics-slot-1",
      assessmentPolicyId: "physics-v1",
      sourceContentSnapshot: { kind: "question_bank_v2" },
    });
    expect(restored.assessmentQuestionSlots["kp-reflection"][0]).toMatchObject({
      id: "physics-slot-1",
      assessmentPolicyId: "physics-v1",
    });
  });

  test("keeps a policy-aware unassigned question outside legacy D1-D5 slots", () => {
    const contentPackage = buildPublishedContentPackage({
      lesson,
      content: {
        preQuestions: [],
        postQuestions: [
          {
            id: "unassigned-1",
            phase: "knowledge",
            type: "short_answer",
            stem: "说明反射现象",
            answer: "略",
            difficulty: 3,
            assessmentPolicyId: "physics-v1",
            blueprintSlotId: null,
            knowledgePointIds: ["kp-reflection"],
          },
        ],
        assessmentMatrices: {},
        assessmentQuestionSlots: {},
        learningContent: { composite: {}, knowledgePoints: [] },
      },
    });
    expect(
      contentPackage.knowledgePracticePools["kp-reflection"][0].blueprintSlotId,
    ).toBeNull();
  });
});
