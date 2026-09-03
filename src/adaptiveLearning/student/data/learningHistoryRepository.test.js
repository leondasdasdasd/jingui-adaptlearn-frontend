/** @vitest-environment node */

import { storageKeys } from "../../shared/contracts/storageKeys";
import {
  settleLearningSessionSnapshot,
  upsertLearningSessionSnapshot,
} from "./learningHistoryRepository";

function createLocalStorage() {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

function learningSession(sessionType = "lesson") {
  return {
    learningFlow: { mode: "lesson_flow" },
    postAttempts: {},
    postQuestions: [],
    preAttempts: {},
    preAssessment: null,
    preMastery: {},
    preQuestions: [],
    result: {},
    resultSource: "preview",
    selection: {
      contentVersionId: "version-1",
      knowledgePoints: [],
      section: { id: "lesson-1", title: "第一课时" },
      sessionType,
      startedAt: "2026-09-02T08:00:00.000Z",
      studentId: `${sessionType}-student`,
      studentSessionId: `${sessionType}-session`,
      studentName: "体验用户",
    },
  };
}

describe("learning history transient session policy", () => {
  beforeEach(() => {
    global.window = { localStorage: createLocalStorage() };
  });

  afterEach(() => {
    delete global.window;
  });

  test("teacher preview cannot create or settle a learning history record", () => {
    const preview = learningSession("teacher_preview");

    expect(upsertLearningSessionSnapshot(preview)).toBeNull();
    expect(settleLearningSessionSnapshot(preview)).toBeNull();
    expect(
      window.localStorage.getItem(storageKeys.studentLearningHistory),
    ).toBeNull();
  });

  test("regular student session still persists learning history", () => {
    const record = upsertLearningSessionSnapshot(learningSession());

    expect(record).toMatchObject({
      lesson: { id: "lesson-1", title: "第一课时" },
      sessionType: "lesson",
      status: "in_progress",
    });
    expect(
      JSON.parse(
        window.localStorage.getItem(storageKeys.studentLearningHistory),
      ),
    ).toHaveLength(1);
  });
});
