import {
  createdQuestionSelection,
  loadAssessmentPaperQuestions,
  loadAssessmentPapers,
  loadAssessmentQuestionBank,
  resolveTeachingContext,
} from "./assessmentQuestionSourceRepository";

const scienceScope = {
  subject: "science",
  publisher: "zhejiang",
  grade: "grade7-up",
  volume: "up",
};

const contextLoaders = {
  loadStages: async () => ({
    ifLogin: true,
    status: true,
    content: [
      {
        stageId: 3,
        stageName: "Junior High School",
        subjectList: [{ id: 12, name: "Science" }],
      },
    ],
  }),
  loadTeaching: async () => ({
    ifLogin: true,
    status: true,
    content: { gradeList: [{ gradeId: 27, gradeName: "Grade 7" }] },
  }),
};

describe("assessment question source repository", () => {
  it("resolves each real service from a stable business scope", async () => {
    await expect(
      resolveTeachingContext(scienceScope, contextLoaders),
    ).resolves.toEqual({
      stageId: 3,
      subjectId: 12,
      gradeId: 27,
    });
    await expect(resolveTeachingContext({}, contextLoaders)).rejects.toThrow(
      "当前课时缺少真实题源",
    );
  });

  it("accepts the G7-G9 grade names returned by the real question service", async () => {
    await expect(
      resolveTeachingContext(
        { ...scienceScope, grade: "grade8-up" },
        {
          ...contextLoaders,
          loadTeaching: async () => ({
            ifLogin: true,
            status: true,
            content: { gradeList: [{ gradeId: 15, gradeName: "G8" }] },
          }),
        },
      ),
    ).resolves.toMatchObject({ gradeId: 15 });
  });

  it("reuses the lesson-practice question filters and maps immutable selections", async () => {
    const loadQuestions = vi.fn(async () => ({
      ifLogin: true,
      status: true,
      content: {
        data: [
          {
            id: 7,
            type: 1,
            content: "真实题干",
            questionLevel: 2,
            answersModelList: [{ answers: "A" }, { answers: "B" }],
            answer: "B",
          },
        ],
        totalNum: 1,
      },
    }));
    const page = await loadAssessmentQuestionBank(
      {
        questionSourceScope: scienceScope,
        keyword: "观察",
        difficulty: 2,
        questionType: "single_choice",
        scope: "school",
        loaders: undefined,
      },
      { ...contextLoaders, loadQuestions },
    );
    expect(loadQuestions).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "观察",
        gradeId: 27,
        questionLevelList: [2],
        questionType: "1",
        subjectId: 12,
        type: 2,
        yearPeriodId: 3,
      }),
    );
    expect(page.items[0]).toMatchObject({
      key: "question_bank:7",
      supported: true,
      source: { kind: "question_bank", questionId: "7" },
      snapshot: { stem: "真实题干", type: "single_choice", answer: "B" },
    });
  });

  it("marks real questions without a source id as unavailable", async () => {
    const page = await loadAssessmentQuestionBank(
      { questionSourceScope: scienceScope },
      {
        ...contextLoaders,
        loadQuestions: async () => ({
          ifLogin: true,
          status: true,
          content: {
            data: [
              { id: "   ", type: 1, content: "缺少题号的真实题目一" },
              { type: 1, content: "缺少题号的真实题目二" },
            ],
            totalNum: 2,
          },
        }),
      },
    );
    expect(page.items[0]).toMatchObject({
      key: "",
      renderKey: "question_bank:unidentified:0",
      supported: false,
      unsupportedReason: "题目缺少来源标识，无法加入课时",
    });
    expect(page.items[1].renderKey).toBe("question_bank:unidentified:1");
  });

  it("creates an immutable V2 snapshot after manual creation", () => {
    const aggregate = {
      question: {
        id: 9,
        version: "v2",
        businessQuestionTypeId: 1,
        elements: [{ type: "richText", content: { text: "手动题目" } }],
        children: [],
      },
      resource: { stem: "手动题目" },
    };
    const selection = createdQuestionSelection(aggregate, [
      { businessQuestionTypeId: 1, name: "单选题" },
    ]);
    aggregate.question.elements[0].content.text = "changed";
    expect(selection).toMatchObject({
      source: { kind: "question_bank", questionId: "9" },
      snapshot: { stem: "手动题目", type: "single_choice" },
    });
    expect(
      selection.snapshot.sourceContentSnapshot.question.elements[0].content
        .text,
    ).toBe("手动题目");
  });

  it("filters real papers and extracts selectable questions through existing detail services", async () => {
    const loadPapers = vi.fn(async () => ({
      ifLogin: true,
      status: true,
      content: {
        examList: [
          { paperId: 2, examPaperName: "科学期中卷", smallQuestionNumbers: 1 },
        ],
      },
    }));
    const papers = await loadAssessmentPapers(
      { questionSourceScope: scienceScope, keyword: "期中", scope: "mine" },
      { ...contextLoaders, loadPapers },
    );
    const questions = await loadAssessmentPaperQuestions("2", {
      loadDetails: [
        async () => ({
          ifLogin: true,
          status: true,
          content: {
            sections: [
              { questions: [{ questionId: 9, content: "光的反射", type: 1 }] },
            ],
          },
        }),
      ],
    });
    expect(loadPapers).toHaveBeenCalledWith(
      expect.objectContaining({
        examName: "期中",
        gradeId: 27,
        subjectId: 12,
        viewType: 1,
      }),
    );
    expect(papers[0]).toMatchObject({
      id: "2",
      title: "科学期中卷",
      questionCount: 1,
    });
    expect(questions[0]).toMatchObject({
      supported: true,
      source: { kind: "paper", questionId: "9", paperId: "2" },
    });
  });
});
