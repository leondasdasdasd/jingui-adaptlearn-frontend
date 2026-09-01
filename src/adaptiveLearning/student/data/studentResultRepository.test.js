import {
  getStudentSessionAnswers,
  getStudentSessionReport,
} from "../../shared/infrastructure/classroomApi";
import {
  loadStudentResultSnapshot,
  mapClassroomAnswerRecord,
  mapClassroomResultReport,
} from "./studentResultRepository";

jest.mock("../../shared/infrastructure/classroomApi", () => ({
  getStudentSessionAnswers: jest.fn(),
  getStudentSessionReport: jest.fn(),
}));

describe("student result repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("maps transport answers to stable attempt records", () => {
    expect(
      mapClassroomAnswerRecord({
        questionId: "q-1",
        sourceType: "pre",
        answerContent: { text: "42" },
        gradingResult: {
          correct: true,
          rubricResults: [
            { point: "方法", earned: 1, transportOnly: "not exposed" },
          ],
          transportOnly: "not exposed",
        },
        score: "2",
        maxScore: "2",
        submittedAt: "2026-08-31T00:00:00.000Z",
      }),
    ).toEqual({
      questionId: "q-1",
      purpose: "PRE",
      attempt: {
        correct: true,
        rubricResults: [{ point: "方法", earned: 1 }],
        answer: "42",
        score: 2,
        maxScore: 2,
        submittedAt: "2026-08-31T00:00:00.000Z",
        authority: "server",
        syncStatus: "persisted",
      },
    });
  });

  test("returns stable unavailable state instead of an HTTP error", async () => {
    getStudentSessionReport.mockRejectedValueOnce(
      Object.assign(new Error("service detail"), { status: 503 }),
    );
    getStudentSessionAnswers.mockResolvedValueOnce([]);
    await expect(
      loadStudentResultSnapshot({
        studentSessionId: "student-session",
        accessToken: "token",
      }),
    ).resolves.toEqual({
      status: "unavailable",
      report: null,
      answerRecords: [],
    });
  });

  test("drops malformed nested rubric transport data", () => {
    expect(
      mapClassroomAnswerRecord({
        questionId: "q-2",
        gradingResult: { rubricResults: { transportOnly: true } },
      }).attempt,
    ).not.toHaveProperty("rubricResults");
  });

  test("maps the report DTO before it reaches the route", () => {
    expect(
      mapClassroomResultReport({
        settledAt: "2026-08-31T00:00:00.000Z",
        answeredQuestionCount: "3",
        algorithmVersion: "v2",
        masteryResults: [
          {
            knowledgeObjectiveId: "kp-1",
            mastery: 82,
            sourceScores: { PRE: 0.5, POST: 0.82, transportOnly: 1 },
            trace: [
              {
                questionId: "q-1",
                masteryBefore: 50,
                masteryAfter: 82,
                masteryDelta: 32,
                confidenceAfter: 0.8,
                transportOnly: "not exposed",
              },
            ],
          },
        ],
        score: {
          status: "READY",
          reviewStatus: "PUBLISHED",
          summary: "Good progress",
          internalField: "not exposed",
        },
        transportOnly: true,
      }),
    ).toEqual({
      settledAt: "2026-08-31T00:00:00.000Z",
      answeredQuestionCount: 3,
      algorithmVersion: "v2",
      masteryResults: [
        {
          knowledgeObjectiveId: "kp-1",
          mastery: 82,
          sourceScores: { PRE: 0.5, POST: 0.82 },
          evidenceCount: 0,
          confidence: 0,
          independenceAverage: 0,
          itemConfidenceAverage: 0,
          status: "",
          algorithmVersion: "",
          trace: [
            {
              questionId: "q-1",
              masteryBefore: 50,
              masteryAfter: 82,
              masteryDelta: 32,
              confidenceAfter: 0.8,
            },
          ],
        },
      ],
      score: {
        status: "READY",
        reviewStatus: "PUBLISHED",
        summary: "Good progress",
      },
    });
  });
});
