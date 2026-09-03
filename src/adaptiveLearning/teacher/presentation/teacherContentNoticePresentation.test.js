import { teacherContentNoticeText } from "./teacherContentNoticePresentation";

describe("teacher content notice presentation", () => {
  afterEach(() => {
    delete window.globalLange;
  });

  test("does not combine Chinese and English in one generation notice", () => {
    window.globalLange = "zh-CN";
    expect(teacherContentNoticeText("checkingGeneratedContent")).toBe(
      "正在检查生成结果",
    );

    window.globalLange = "en";
    expect(teacherContentNoticeText("checkingGeneratedContent")).toBe(
      "Checking generated content",
    );
  });

  test("localizes issue counts", () => {
    window.globalLange = "en";
    expect(teacherContentNoticeText("issuesFound", { count: 3 })).toBe(
      "3 issues found; publishing remains available",
    );
  });
});
