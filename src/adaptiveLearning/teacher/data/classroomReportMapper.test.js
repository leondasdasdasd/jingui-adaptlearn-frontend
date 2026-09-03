import { classroomReportFromApi } from "./classroomReportMapper";

describe("classroom report mapper", () => {
  test("keeps missing evidence empty instead of manufacturing report metrics", () => {
    const view = classroomReportFromApi({
      period: {
        id: "period-1",
        title: "Real lesson",
        className: "G7 C1",
        teachingCourseName: "Mathematics",
        scheduledStartAt: "2026-08-31T09:00:00Z",
        durationSeconds: 2700,
        linkedLessonIds: ["lesson-1", "lesson-2"],
      },
      snapshot: {
        sessions: [
          {
            id: "session-1",
            studentId: "student-1",
            studentName: "Student A",
            startedAt: "2026-08-31T09:00:00Z",
            lastEventAt: "2026-08-31T09:10:00Z",
            status: "SETTLED",
          },
        ],
        answers: [],
        recentEvents: [],
      },
      reports: [
        {
          studentSessionId: "session-1",
          studentId: "student-1",
          answeredQuestionCount: 0,
          masteryResults: [
            {
              knowledgeObjectiveId: "kp-1",
              status: "INSUFFICIENT_EVIDENCE",
              mastery: null,
              priorMastery: null,
              confidence: 0.2,
            },
          ],
        },
      ],
    });

    expect(view.period).toEqual(
      expect.objectContaining({
        title: "Real lesson",
        className: "G7 C1",
        durationMinutes: 45,
        linkedLessonIds: ["lesson-1", "lesson-2"],
      }),
    );
    expect(view.students[0]).toEqual(
      expect.objectContaining({
        questionCount: 0,
        accuracy: null,
        knowledgePointCount: 0,
        preMastery: null,
        postMastery: null,
      }),
    );
    expect(view.knowledgePoints[0]).toEqual(
      expect.objectContaining({
        avgPre: null,
        avgPost: null,
        avgAccuracy: null,
        totalQuestions: 0,
        masteredCount: 0,
      }),
    );
  });
});
