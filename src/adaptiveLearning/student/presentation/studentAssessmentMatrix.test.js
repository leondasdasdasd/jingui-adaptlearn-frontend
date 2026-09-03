import {
  buildStudentAssessmentMatrixViewModel,
  getKnowledgePointMatrixStats,
  resolveStudentAssessmentMatrices,
} from "./studentAssessmentMatrix";

const lesson = {
  id: "lesson-1",
  title: "第一课",
  knowledgePoints: [{ id: "kp-1", name: "正数与负数" }],
};

const matrices = {
  "kp-1": {
    knowledgePointId: "kp-1",
    cells: [
      {
        matrixCellId: "kp-1:CR:A",
        domain: "CR",
        targetLevel: "A",
        role: "CORE",
      },
      {
        matrixCellId: "kp-1:PJ:B",
        domain: "PJ",
        targetLevel: "B",
        role: "SUPPORT",
      },
      {
        matrixCellId: "kp-1:M:C",
        domain: "M",
        targetLevel: "C",
        role: "EXTENSION",
      },
    ],
  },
};

describe("student assessment matrix presentation", () => {
  it.each([
    [69, 0],
    [70, 1],
    [80, 2],
    [90, 3],
  ])(
    "lights role cells at the centralized mastery thresholds",
    (mastery, expected) => {
      const result = getKnowledgePointMatrixStats({
        lesson,
        knowledgePoint: lesson.knowledgePoints[0],
        profile: { "kp-1": { mastery } },
        assessmentMatrices: matrices,
      });

      expect(result).toMatchObject({ lighted: expected, total: 3 });
    },
  );

  it("lights a cell from matching passed evidence below its mastery threshold", () => {
    const viewModel = buildStudentAssessmentMatrixViewModel({
      lesson,
      knowledgePoint: lesson.knowledgePoints[0],
      mode: "knowledgePoint",
      profile: { "kp-1": { mastery: 10 } },
      attempts: [
        {
          knowledgePointId: "kp-1",
          matrixCellId: "kp-1:M:C",
          score: 7,
          maxScore: 10,
        },
      ],
      assessmentMatrices: matrices,
    });

    expect(viewModel.cellMap.get("M:C")).toMatchObject({
      isLighted: true,
    });
    expect(viewModel.lightingRate).toBe(33);
  });

  it("builds the stable five-cell visual fallback without mock payloads", () => {
    const fallback = resolveStudentAssessmentMatrices({ lesson });
    expect(fallback["kp-1"].cells).toHaveLength(5);
    expect(fallback.composite.cells).toHaveLength(3);
  });
});
