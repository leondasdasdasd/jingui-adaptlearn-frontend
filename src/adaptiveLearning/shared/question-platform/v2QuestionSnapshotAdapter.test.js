import {
  createAdaptiveQuestionSnapshotFromV2,
  importedV2QuestionPreviewViewModel,
} from "./v2QuestionSnapshotAdapter";

const questionType = {
  businessQuestionTypeId: 3,
  elements: [
    { type: "richText", name: "题干", config: {} },
    { type: "choice", name: "选项", config: { selectionType: "single" } },
  ],
  extras: [{ type: "solvingProcess", name: "解析" }],
  globalConfig: { hasAnswer: true },
  isComposite: false,
  name: "单选题",
  version: "1",
};

describe("V2 question snapshot adapter", () => {
  test("keeps immutable real content and derives canonical adaptive fields", () => {
    const aggregate = {
      resource: { level: 2, stem: "光在镜面上会发生什么现象？" },
      question: {
        id: 7,
        businessQuestionTypeId: 3,
        version: "v2",
        children: [],
        elements: [
          { type: "richText", content: { text: "真实题干" } },
          {
            type: "choice",
            answers: { optionIds: ["option-b"] },
            options: [
              { id: "option-a", cells: [{ text: "折射" }] },
              { id: "option-b", cells: [{ text: "反射" }] },
            ],
          },
        ],
        extras: [
          { type: "solvingProcess", content: { text: "根据反射定律判断" } },
        ],
      },
    };
    const snapshot = createAdaptiveQuestionSnapshotFromV2({
      aggregate,
      questionTypesById: { 3: questionType },
      type: "single_choice",
    });
    aggregate.question.elements[0].content.text = "被修改";

    expect(snapshot).toMatchObject({
      stem: "光在镜面上会发生什么现象？",
      type: "single_choice",
      difficulty: 2,
      answer: "B",
      analysis: "根据反射定律判断",
      options: [
        { id: "A", text: "折射" },
        { id: "B", text: "反射" },
      ],
    });
    expect(snapshot.sourceContentSnapshot).toMatchObject({
      kind: "question_bank_v2",
    });
    expect(
      snapshot.sourceContentSnapshot.question.elements[0].content.text,
    ).toBe("真实题干");
    expect(importedV2QuestionPreviewViewModel(snapshot)).toMatchObject({
      questionContent: { questionTypeKey: 3 },
      questionTypeTemplates: [expect.any(Object)],
    });
  });
});
