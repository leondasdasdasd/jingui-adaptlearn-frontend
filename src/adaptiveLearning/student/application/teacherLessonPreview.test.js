import {
  createTeacherLessonPreviewSession,
  learningSessionExitPath,
} from "./teacherLessonPreview";

const publishedVersion = {
  id: "version-2",
  textbookLessonId: "lesson-1",
  versionNumber: 2,
  publishedAt: "2026-09-02T00:00:00.000Z",
  contentPackage: {
    title: "有理数",
    generationPolicy: { mode: "adaptive" },
    knowledgeObjectives: [
      { id: "kp-1", name: "正数与负数" },
      { id: "kp-2", name: "数轴" },
    ],
    diagnosticQuestionPool: [
      { id: "pre-1", purpose: "PRE", knowledgeObjectiveIds: ["kp-1"] },
    ],
    learningContent: {
      composite: { status: "READY", classroomId: "room-1" },
      knowledgePoints: [],
    },
    knowledgePracticePools: {
      "kp-1": [
        {
          id: "practice-1",
          purpose: "PRACTICE",
          knowledgeObjectiveIds: ["kp-1"],
        },
      ],
    },
  },
};

describe("teacher lesson preview", () => {
  test("maps the selected published version into an isolated fresh session", () => {
    const session = createTeacherLessonPreviewSession({
      lesson: {
        id: "lesson-1",
        title: "第一课时",
        chapter: { id: "chapter-1", title: "第一章" },
        knowledgePoints: [{ id: "kp-1", name: "旧名称", discipline: "math" }],
      },
      publishedVersion,
      returnPath:
        "/adaptive-learning/teacher/textbook-lessons/lesson-1/content",
      startedAt: "2026-09-02T08:00:00.000Z",
    });

    expect(session.selection).toMatchObject({
      contentVersionId: "version-2",
      contentVersion: 2,
      studentId: "teacher-preview:version-2",
      studentName: "教师试做用户",
      sessionType: "teacher_preview",
      teacherPreview: {
        returnPath:
          "/adaptive-learning/teacher/textbook-lessons/lesson-1/content",
        publishedVersionId: "version-2",
      },
    });
    expect(session.selection.classroomAccessToken).toBeUndefined();
    expect(session.selection.knowledgePoints).toEqual([
      { id: "kp-1", name: "正数与负数", discipline: "math" },
      { id: "kp-2", name: "数轴" },
    ]);
    expect(session.preQuestions).toHaveLength(1);
    expect(session.postQuestions).toHaveLength(1);
    expect(session.preAttempts).toEqual({});
    expect(session.learningFlow.plan).toBeNull();
  });

  test("returns to the teacher lesson only for a preview session", () => {
    expect(
      learningSessionExitPath(
        createTeacherLessonPreviewSession({
          lesson: { id: "lesson-1", title: "第一课时", knowledgePoints: [] },
          publishedVersion,
          returnPath: "/teacher/lesson-1",
        }),
        "/student/directory",
      ),
    ).toBe("/teacher/lesson-1");
    expect(
      learningSessionExitPath({ selection: {} }, "/student/directory"),
    ).toBe("/student/directory");
  });
});
