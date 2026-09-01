/** @jest-environment node */

import { classStudentIdentityIssues } from "../domain/classStudentIdentity";
import {
  studentEntryIssueMessage,
  studentEntryText,
} from "./studentEntryPresentation";

describe("student entry presentation", () => {
  beforeEach(() => {
    global.window = { globalLange: "en", location: { search: "" } };
    global.navigator = { language: "en-US" };
  });

  test("localizes safe identity errors", () => {
    expect(studentEntryIssueMessage(classStudentIdentityIssues.mismatch)).toBe(
      "This link belongs to a different student. Use your personal link from the teacher.",
    );
    expect(studentEntryIssueMessage("transport stack trace")).toBe(
      "We could not verify your learning identity. Ask your teacher for a new link.",
    );
    expect(studentEntryText("loading.title", "正在确认学习身份")).toBe(
      "Verifying your learning identity",
    );
  });
});
