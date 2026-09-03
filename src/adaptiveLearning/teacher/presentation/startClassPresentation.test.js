import { START_CLASS_ISSUES, startClassIssue } from "../domain/startClassIssue";
import { startClassIssueText } from "./startClassPresentation";

describe("start class presentation", () => {
  afterEach(() => {
    delete window.globalLange;
  });

  test("localizes stable start-class issues without bilingual messages", () => {
    const error = startClassIssue(START_CLASS_ISSUES.SELECT_STUDENTS);
    window.globalLange = "zh-CN";
    expect(startClassIssueText(error)).toBe("请至少选择 1 名学生");
    window.globalLange = "en";
    expect(startClassIssueText(error)).toBe("Select at least one student");
  });

  test("does not expose unknown transport errors", () => {
    window.globalLange = "en";
    expect(startClassIssueText(new Error("database host unavailable"))).toBe(
      "Failed to start the classroom. Try again",
    );
  });
});
