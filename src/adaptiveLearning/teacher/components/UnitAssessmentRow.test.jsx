/** @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import UnitAssessmentRow from "./UnitAssessmentRow";

describe("UnitAssessmentRow", () => {
  test("章节末尾入口显示去重后的覆盖范围并独立打开单元测试内容", () => {
    const onOpen = vi.fn();
    render(
      <UnitAssessmentRow
        entry={{
          chapterId: "chapter-1",
          lessonCount: 2,
          knowledgePointCount: 3,
        }}
        onOpen={onOpen}
      />,
    );

    expect(screen.getByText(/2 lessons and 3 knowledge points/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /unit assessment/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
