/** @vitest-environment node */

import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { createTutoringSession } from "../shared/domain/tutoringStateMachine";
import { upsertLearningSessionSnapshot } from "../student/data/learningHistoryRepository";
import { clearScratchPaperSessionsByScopePrefix } from "../student/data/scratchPaperSessionRepository";
import {
  clearTransientStudentSession,
  clearQuizDraft,
  clearQuizDraftsByPrefix,
  readActiveStudentSession,
  readStudentSession,
  writeTransientStudentSession,
  writeStudentSession,
} from "../student/data/studentSessionRepository";
import { ensureLearningPlanCheckpoints } from "../student/domain/learningPlan";
import {
  LearningSessionProvider,
  useLearningSession,
} from "./LearningSessionContext";

vi.mock("../shared/domain/tutoringStateMachine", () => ({
  createTutoringSession: vi.fn(),
}));
vi.mock("../routing", () => ({
  useLocation: () => ({
    pathname: "/adaptive-learning/student",
    search: "",
  }),
}));
vi.mock("../student/data/classroomSyncRepository", () => ({
  flushClassroomOutbox: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../student/data/learningEventRepository", () => ({
  recordLearningEvent: vi.fn(),
}));
vi.mock("../student/data/learningHistoryRepository", () => ({
  ensureLocalStudentIdentity: vi.fn(() => ({ id: "local-student" })),
  upsertLearningSessionSnapshot: vi.fn(),
}));
vi.mock("../student/data/scratchPaperSessionRepository", () => ({
  clearAllScratchPaperSessions: vi.fn(),
  clearScratchPaperSessionsByScopePrefix: vi.fn(),
}));
vi.mock("../student/data/sessionSnapshotRepository", () => ({
  saveSessionSnapshot: vi.fn().mockResolvedValue(undefined),
  snapshotSyncMetadata: vi.fn(() => ({ revision: 0 })),
}));
vi.mock("../student/data/studentSessionRepository", () => ({
  clearAllQuizDrafts: vi.fn(),
  clearQuizDraft: vi.fn(),
  clearQuizDraftsByPrefix: vi.fn(),
  clearStudentSession: vi.fn(),
  clearTransientStudentSession: vi.fn(),
  readActiveStudentSession: vi.fn(),
  readStudentSession: vi.fn(),
  writeTransientStudentSession: vi.fn(),
  writeStudentSession: vi.fn(),
}));
vi.mock("../student/domain/learningPlan", () => ({
  ensureLearningPlanCheckpoints: vi.fn(),
}));
vi.mock("../student/domain/sessionHeartbeat", () => ({
  shouldRecordSessionHeartbeat: vi.fn(() => false),
}));

let observedSession;
let observedSessionActions;

function SessionProbe() {
  const context = useLearningSession();
  observedSession = context.session;
  observedSessionActions = context;
  return null;
}

const validCachedSession = () => ({
  learningCheckIn: { version: 4, messages: [], diagnosis: null },
  learningFlow: {
    mode: "lesson_flow",
    plan: null,
    activeUnit: null,
    context: null,
  },
  postAttempts: {},
  postQuestions: [],
  practiceIntervention: null,
  result: {},
  selection: null,
  tutoringSession: null,
});

describe("LearningSessionProvider", () => {
  beforeAll(() => {
    global.window = {
      addEventListener: vi.fn(),
      clearInterval,
      clearTimeout,
      location: { pathname: "/adaptive-learning/student", search: "" },
      removeEventListener: vi.fn(),
      setInterval,
      setTimeout,
    };
  });

  afterAll(() => {
    delete global.window;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    observedSession = null;
    observedSessionActions = null;
    ensureLearningPlanCheckpoints.mockImplementation((plan) => plan);
    writeTransientStudentSession.mockReturnValue(true);
    readActiveStudentSession.mockImplementation((fallback) =>
      readStudentSession(fallback),
    );
  });

  it("按原顺序迁移旧会话并保留每一步持久化", () => {
    const tutoringSession = { state: "WAITING" };
    createTutoringSession.mockReturnValue(tutoringSession);
    readStudentSession.mockReturnValue({
      ...validCachedSession(),
      learningCheckIn: { version: 3, messages: [{ id: "old" }] },
      postAttempts: { old: { score: 1 } },
      postQuestions: [{ id: "legacy-question" }],
      practiceIntervention: { reason: "needs_support" },
      result: { old: true },
      selection: { studentName: "" },
    });

    let renderer;
    act(() => {
      renderer = TestRenderer.create(
        <LearningSessionProvider>
          <SessionProbe />
        </LearningSessionProvider>,
      );
    });

    expect(observedSession.selection).toMatchObject({
      studentId: "local-student",
      studentName: "当前学生（本机）",
    });
    expect(observedSession.postQuestions).toEqual([]);
    expect(observedSession.postAttempts).toEqual({});
    expect(observedSession.result).toEqual({});
    expect(observedSession.learningCheckIn).toEqual({
      version: 4,
      messages: [],
      diagnosis: null,
    });
    expect(observedSession.tutoringSession).toBe(tutoringSession);
    expect(clearQuizDraft).toHaveBeenCalledWith("post");
    expect(writeStudentSession).toHaveBeenCalledTimes(5);

    act(() => renderer.unmount());
  });

  it("将 flow context 映射为持久化会话而不改变内存会话", () => {
    const contextSelection = {
      classroomAccessToken: "token",
      studentSessionId: "student-session",
    };
    readStudentSession.mockReturnValue({
      ...validCachedSession(),
      learningFlow: {
        mode: "lesson_flow",
        plan: null,
        activeUnit: null,
        context: {
          selection: contextSelection,
          preQuestions: [{ id: "context-question" }],
          resultSource: "classroom",
        },
      },
      preQuestions: [{ id: "session-question" }],
      resultSource: "preview",
    });

    let renderer;
    act(() => {
      renderer = TestRenderer.create(
        <LearningSessionProvider>
          <SessionProbe />
        </LearningSessionProvider>,
      );
    });

    expect(observedSession.selection).toBeNull();
    expect(writeStudentSession).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: contextSelection,
        preQuestions: [{ id: "context-question" }],
        resultSource: "classroom",
      }),
    );
    expect(upsertLearningSessionSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ selection: contextSelection }),
      { status: "in_progress" },
    );

    act(() => renderer.unmount());
  });

  it("临时试做会话独立持久化并在退出时恢复正式学习现场", () => {
    const persistentSession = {
      ...validCachedSession(),
      selection: {
        studentId: "student-1",
        studentSessionId: "student-session-1",
      },
    };
    const previewSession = {
      ...validCachedSession(),
      selection: {
        sessionType: "teacher_preview",
        studentId: "teacher-preview:version-1",
        studentSessionId: "teacher-preview:version-1:123",
      },
    };
    readStudentSession.mockReturnValue(persistentSession);
    readActiveStudentSession.mockReturnValue(persistentSession);

    let renderer;
    act(() => {
      renderer = TestRenderer.create(
        <LearningSessionProvider>
          <SessionProbe />
        </LearningSessionProvider>,
      );
    });
    vi.clearAllMocks();
    readStudentSession.mockReturnValue(persistentSession);
    readActiveStudentSession.mockReturnValue(persistentSession);

    act(() => observedSessionActions.startTransientSession(previewSession));

    expect(observedSession).toBe(previewSession);
    expect(writeTransientStudentSession).toHaveBeenCalledWith(previewSession);
    expect(writeStudentSession).not.toHaveBeenCalled();
    expect(upsertLearningSessionSnapshot).not.toHaveBeenCalled();

    act(() => observedSessionActions.restorePersistentSession());

    expect(clearTransientStudentSession).toHaveBeenCalled();
    expect(clearQuizDraftsByPrefix).toHaveBeenCalledWith(
      "transient:teacher-preview:version-1:123:",
    );
    expect(clearScratchPaperSessionsByScopePrefix).toHaveBeenCalledWith(
      "teacher-preview:version-1:123:",
    );
    expect(observedSession.selection.studentId).toBe("student-1");
    act(() => renderer.unmount());
  });

  it("临时会话存储失败时保持正式学习现场", () => {
    const persistentSession = {
      ...validCachedSession(),
      selection: { studentId: "student-1" },
    };
    const previewSession = {
      ...validCachedSession(),
      selection: {
        sessionType: "teacher_preview",
        studentId: "teacher-preview:version-1",
      },
    };
    readStudentSession.mockReturnValue(persistentSession);
    readActiveStudentSession.mockReturnValue(persistentSession);
    writeTransientStudentSession.mockReturnValue(false);

    let renderer;
    act(() => {
      renderer = TestRenderer.create(
        <LearningSessionProvider>
          <SessionProbe />
        </LearningSessionProvider>,
      );
    });

    expect(() => {
      act(() => observedSessionActions.startTransientSession(previewSession));
    }).toThrow("TRANSIENT_SESSION_STORAGE_UNAVAILABLE");
    expect(observedSession.selection).toEqual({ studentId: "student-1" });
    expect(writeStudentSession).toHaveBeenCalledWith(
      expect.objectContaining({ selection: { studentId: "student-1" } }),
    );
    act(() => renderer.unmount());
  });
});
