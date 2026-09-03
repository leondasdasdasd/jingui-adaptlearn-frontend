/** @vitest-environment node */

import { storageKeys } from "../../shared/contracts/storageKeys";
import {
  clearScratchPaperSessionsByScopePrefix,
  scratchPaperPersistenceKey,
} from "./scratchPaperSessionRepository";

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

describe("scratch paper session cleanup", () => {
  beforeEach(() => {
    global.window = { localStorage: createLocalStorage() };
  });

  afterEach(() => {
    delete global.window;
  });

  test("clears only scratch paper records in the teacher preview scope", async () => {
    const previewScope = "teacher-preview:version-1:123:pre:version-1";
    const studentScope = "student-session-1:pre:version-1";
    scratchPaperPersistenceKey(previewScope);
    scratchPaperPersistenceKey(studentScope);

    const result = await clearScratchPaperSessionsByScopePrefix(
      "teacher-preview:version-1:123:",
    );

    expect(result).toMatchObject({ status: "cleared", count: 1 });
    expect(
      window.localStorage.getItem(
        storageKeys.scratchPaperSession(previewScope),
      ),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        storageKeys.scratchPaperSession(studentScope),
      ),
    ).not.toBeNull();
  });
});
