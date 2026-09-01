/** @jest-environment node */

import { stopMediaStreamTracks } from "./lib/mediaStream";
import { parseQuestionOptionDraft } from "./teacher/domain/questionOptionDraft";

describe("自适应学习正确性保护", () => {
  test("选项草稿只移除明确的选项标记，并保留普通英文内容", () => {
    expect(
      parseQuestionOptionDraft("A. 第一项\nB、第二项\nC third\nDelta"),
    ).toEqual([
      { id: "A", text: "第一项" },
      { id: "B", text: "第二项" },
      { id: "C", text: "third" },
      { id: "D", text: "Delta" },
    ]);
  });

  test("录音初始化未取得媒体流时释放流程保持幂等", () => {
    const firstTrack = { stop: jest.fn() };
    const secondTrack = { stop: jest.fn() };

    expect(() => stopMediaStreamTracks()).not.toThrow();
    stopMediaStreamTracks({ getTracks: () => [firstTrack, secondTrack] });

    expect(firstTrack.stop).toHaveBeenCalledTimes(1);
    expect(secondTrack.stop).toHaveBeenCalledTimes(1);
  });
});
