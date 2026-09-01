/** @jest-environment node */

import { answerText, getLessonAttribution, percent } from "./model";

describe("student learning home model", () => {
  test("formats mastery values without exposing invalid numeric state", () => {
    expect(percent(82.6)).toBe("83%");
    expect(percent(null)).toBe("—");
    expect(percent("invalid")).toBe("—");
  });

  test("maps stored choice labels to the authoritative option copy", () => {
    const options = [
      { label: "A", text: "正数" },
      { label: "B", text: "负数" },
    ];

    expect(answerText("B", options)).toBe("B. 负数");
    expect(answerText("A,B", options)).toBe("A. 正数；B. 负数");
  });

  test("prefers learning-record attribution over fallback lesson copy", () => {
    const profile = {
      lessonTitle: "默认课时",
      records: [
        {
          knowledgePointName: "正数与负数",
          chapterTitle: "第一章",
          lessonTitle: "第1课",
        },
      ],
    };

    expect(getLessonAttribution("正数与负数", profile)).toBe("第一章 · 第1课");
  });
});
