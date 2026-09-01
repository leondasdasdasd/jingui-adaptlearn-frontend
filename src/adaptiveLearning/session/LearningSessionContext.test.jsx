/** @jest-environment node */

import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { createTutoringSession } from "../shared/domain/tutoringStateMachine";
import { upsertLearningSessionSnapshot } from "../student/data/learningHistoryRepository";
import {
  clearQuizDraft,
  readStudentSession,
  writeStudentSession,
} from "../student/data/studentSessionRepository";
import { ensureLearningPlanCheckpoints } from "../student/domain/learningPlan";
import {
  LearningSessionProvider,
  useLearningSession,
} from "./LearningSessionContext";

jest.mock("../shared/domain/tutoringStateMachine", () => ({
  createTutoringSession: jest.fn(),
}));
jest.mock("../student/data/classroomSyncRepository", () => ({
  flushClassroomOutbox: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../student/data/learningEventRepository", () => ({
  recordLearningEvent: jest.fn(),
}));
jest.mock("../student/data/learningHistoryRepository", () => ({
  ensureLocalStudentIdentity: jest.fn(() => ({ id: "local-student" })),
  upsertLearningSessionSnapshot: jest.fn(),
}));
jest.mock("../student/data/scratchPaperSessionRepository", () => ({
  clearAllScratchPaperSessions: jest.fn(),
}));
jest.mock("../student/data/sessionSnapshotRepository", () => ({
  saveSessionSnapshot: jest.fn().mockResolvedValue(undefined),
  snapshotSyncMetadata: jest.fn(() => ({ revision: 0 })),
}));
jest.mock("../student/data/studentSessionRepository", () => ({
  clearAllQuizDrafts: jest.fn(),
  clearQuizDraft: jest.fn(),
  clearStudentSession: jest.fn(),
  readStudentSession: jest.fn(),
  writeStudentSession: jest.fn(),
}));
jest.mock("../student/domain/learningPlan", () => ({
  ensureLearningPlanCheckpoints: jest.fn(),
}));
jest.mock("../student/domain/sessionHeartbeat", () => ({
  shouldRecordSessionHeartbeat: jest.fn(() => false),
}));

let observedSession;

function SessionProbe() {
  observedSession = useLearningSession().session;
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
      addEventListener: jest.fn(),
      clearInterval,
      clearTimeout,
      location: { pathname: "/adaptive-learning/student", search: "" },
      removeEventListener: jest.fn(),
      setInterval,
      setTimeout,
    };
  });

  afterAll(() => {
    delete global.window;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    observedSession = null;
    ensureLearningPlanCheckpoints.mockImplementation((plan) => plan);
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
});
