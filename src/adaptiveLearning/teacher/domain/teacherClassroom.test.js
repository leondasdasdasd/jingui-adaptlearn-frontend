import { buildClassroomStudents } from "./teacherClassroom";

describe("teacher classroom student view", () => {
  test("exposes stable stage, content, and warning evidence for presentation", () => {
    jest.spyOn(Date, "now").mockReturnValue(
      new Date("2026-08-31T09:10:00.000Z").getTime(),
    );

    const [student] = buildClassroomStudents({
      sessions: [
        {
          id: "session-1",
          studentId: "student-1",
          studentName: "Student A",
          status: "ACTIVE",
          startedAt: "2026-08-31T09:00:00.000Z",
          lastEventAt: "2026-08-31T09:03:00.000Z",
        },
      ],
      recentEvents: [
        {
          id: "event-1",
          studentSessionId: "session-1",
          occurredAt: "2026-08-31T09:02:00.000Z",
          payload: {
            type: "stage_entered",
            stage: "knowledge_learning",
            knowledgePointId: "kp-1",
          },
        },
      ],
      answers: [],
    });

    expect(student).toEqual(
      expect.objectContaining({
        stageCode: "knowledge_learning",
        currentContentDescriptor: {
          kind: "knowledgeExplanation",
          name: "kp-1",
        },
        warnings: [
          expect.objectContaining({ type: "inactive", minutes: 7 }),
        ],
      }),
    );
    jest.restoreAllMocks();
  });
});
