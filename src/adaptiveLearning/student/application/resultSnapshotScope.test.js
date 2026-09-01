import { resultSnapshotForScope } from "./resultSnapshotScope";

describe("result session scope", () => {
  test("hides an old student result after the session changes", () => {
    const oldSnapshot = {
      scopeKey: "session-a:token-a",
      status: "ready",
      report: { answeredQuestionCount: 3 },
      answerRecords: [{ questionId: "q-1" }],
    };
    expect(resultSnapshotForScope(oldSnapshot, "session-b:token-b")).toEqual({
      scopeKey: "",
      status: "idle",
      report: null,
      answerRecords: [],
    });
  });
});
