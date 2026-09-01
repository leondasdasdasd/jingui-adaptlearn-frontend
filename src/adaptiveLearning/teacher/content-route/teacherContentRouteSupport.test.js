jest.mock("../../lib/questionApi", () => ({
  generateQuestions: jest.fn(),
}));

import {
  ensureUniqueQuestionStems,
  generationCancelledError,
  isGenerationCancelled,
  normalizedQuestionStem,
  noticeMessage,
  noticeTone,
} from "./teacherContentRouteSupport";

describe("teacherContentRouteSupport", () => {
  test("归一化题干后阻止跨生成批次的重复题目", () => {
    expect(normalizedQuestionStem({ stem: " 速度 是多少？ " })).toBe(
      "速度是多少",
    );
    expect(() =>
      ensureUniqueQuestionStems([
        { stem: "速度是多少？" },
        { stem: "速度 是多少!" },
      ]),
    ).toThrow("生成题目中存在重复题干");
    expect(() =>
      ensureUniqueQuestionStems([
        { stem: "速度是多少？" },
        { stem: "求加速度" },
      ]),
    ).not.toThrow();
  });

  test.each([
    ["生成失败，请重试", "error"],
    ["请先补充知识点", "warning"],
    ["内容已保存", "success"],
    ["正在加载", "info"],
    [{ tone: "error", message: "服务不可用" }, "error"],
  ])("将通知 %p 映射为 %s 状态", (notice, expectedTone) => {
    expect(noticeTone(notice)).toBe(expectedTone);
  });

  test("保留结构化通知并统一识别取消错误", () => {
    expect(noticeMessage("warning", "仍有内容待补齐")).toEqual({
      tone: "warning",
      message: "仍有内容待补齐",
    });

    const cancelled = generationCancelledError();
    expect(isGenerationCancelled(cancelled)).toBe(true);
    expect(isGenerationCancelled(new Error("生成已取消"))).toBe(true);
    expect(isGenerationCancelled(new Error("请求失败"))).toBe(false);
  });
});
