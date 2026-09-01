/** @jest-environment node */

import { writeJson } from "../../shared/infrastructure/browserStorage";
import { getStudentLearningProfile } from "../../shared/infrastructure/classroomApi";
import { restorePersistentStudentState } from "./persistentStudentStateRepository";
import { loadSessionSnapshot } from "./sessionSnapshotRepository";
import { restoreQuizDrafts } from "./studentSessionRepository";

jest.mock("../../shared/infrastructure/browserStorage", () => ({
  writeJson: jest.fn(),
}));
jest.mock("../../shared/infrastructure/classroomApi", () => ({
  getStudentLearningProfile: jest.fn(),
}));
jest.mock("./sessionSnapshotRepository", () => ({
  loadSessionSnapshot: jest.fn(),
}));
jest.mock("./studentSessionRepository", () => ({
  restoreQuizDrafts: jest.fn(),
}));

describe("persistent student state cancellation", () => {
  test("does not write an obsolete snapshot after cancellation", async () => {
    const controller = new AbortController();
    let resolveSnapshot;
    const snapshotPromise = new Promise((resolve) => {
      resolveSnapshot = resolve;
    });
    getStudentLearningProfile.mockResolvedValue({
      student: { id: "student-1" },
      currentSession: {
        id: "session-1",
        learningPeriodId: "period-1",
        contentVersionId: "content-1",
      },
    });
    loadSessionSnapshot.mockReturnValue(snapshotPromise);

    const restoring = restorePersistentStudentState("token-1", {
      signal: controller.signal,
      currentSession: {},
    });
    await Promise.resolve();
    expect(loadSessionSnapshot).toHaveBeenCalled();
    expect(getStudentLearningProfile).toHaveBeenCalledWith("", "token-1", {
      cache: "no-store",
      signal: controller.signal,
    });
    expect(loadSessionSnapshot).toHaveBeenCalledWith(
      { sessionId: "session-1", accessToken: "token-1" },
      { cache: "no-store", signal: controller.signal },
    );
    controller.abort();
    resolveSnapshot({
      payload: {
        session: {
          selection: {
            studentId: "student-1",
            studentSessionId: "session-1",
            learningPeriodId: "period-1",
            contentVersionId: "content-1",
          },
        },
      },
      hydrated: {
        session: { selection: { studentId: "student-1" } },
        drafts: { question: { answer: "old" } },
        knowledgeProfile: { old: true },
        learningHistory: [{ id: "old" }],
      },
    });

    await expect(restoring).rejects.toMatchObject({ name: "AbortError" });
    expect(restoreQuizDrafts).not.toHaveBeenCalled();
    expect(writeJson).not.toHaveBeenCalled();
  });
});
