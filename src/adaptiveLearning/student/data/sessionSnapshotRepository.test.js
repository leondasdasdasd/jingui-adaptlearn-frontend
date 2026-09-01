/** @jest-environment node */

import { writeJson } from "../../shared/infrastructure/browserStorage";
import {
  getStudentSessionMedia,
  getStudentSessionSnapshot,
} from "../../shared/infrastructure/classroomApi";
import { loadSessionSnapshot } from "./sessionSnapshotRepository";

jest.mock("../../shared/infrastructure/browserStorage", () => ({
  readJson: jest.fn((_key, fallback) => fallback),
  writeJson: jest.fn(),
}));
jest.mock("../../shared/infrastructure/classroomApi", () => ({
  getStudentSessionMedia: jest.fn(),
  getStudentSessionSnapshot: jest.fn(),
  putStudentSessionSnapshot: jest.fn(),
  uploadStudentSessionMedia: jest.fn(),
}));
jest.mock("./studentSessionRepository", () => ({
  readAllQuizDrafts: jest.fn(() => ({})),
}));

describe("session snapshot cancellation", () => {
  test("does not persist revision when media hydration is cancelled", async () => {
    const controller = new AbortController();
    let resolveMedia;
    getStudentSessionSnapshot.mockResolvedValue({
      revision: 7,
      payload: {
        session: { selection: { studentId: "student-1" } },
        drafts: {
          question: { currentImage: { mediaId: "media-1", dataUrl: "" } },
        },
      },
    });
    getStudentSessionMedia.mockReturnValue(
      new Promise((resolve) => {
        resolveMedia = resolve;
      }),
    );

    const loading = loadSessionSnapshot(
      { sessionId: "session-1", accessToken: "token-1" },
      { signal: controller.signal },
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(getStudentSessionMedia).toHaveBeenCalled();
    controller.abort();
    resolveMedia({});

    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
    expect(writeJson).not.toHaveBeenCalled();
  });
});
