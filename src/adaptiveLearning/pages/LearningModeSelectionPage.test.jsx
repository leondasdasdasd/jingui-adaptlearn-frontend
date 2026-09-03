/** @vitest-environment jsdom */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LearningModeSelectionPage from "./LearningModeSelectionPage";

describe("LearningModeSelectionPage", () => {
  it("renders three simplified learning modes with updated descriptions and no teacher references", () => {
    const { container } = render(
      <MemoryRouter>
        <LearningModeSelectionPage />
      </MemoryRouter>
    );

    // 1. 验证三种模式存在
    expect(screen.getAllByText("学新课").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("打基础").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("查缺补漏").length).toBeGreaterThanOrEqual(1);

    // 2. 验证新模式的业务描述
    expect(
      screen.getByText(/无需做课前测试，直接开学新知/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/适合课后巩固复习。先做摸底测试，已学会的自动跳过/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/先做单元综合测试，智能诊断找出薄弱点/i)
    ).toBeInTheDocument();

    // 3. 验证时间限制标签行已被彻底干掉
    expect(container.querySelector(".pad-card-meta-chips")).toBeNull();
    expect(screen.queryByText(/分钟/)).toBeNull();

    // 4. 验证完全不存在“老师”字样
    expect(container.textContent).not.toContain("老师");

    // 5. 验证不含火箭靶子 emoji
    expect(container.textContent).not.toContain("🚀");
    expect(container.textContent).not.toContain("🎯");

    // 6. 验证已去掉两个返回目录按钮
    expect(screen.queryByText(/返回课时目录/)).toBeNull();
    expect(screen.queryByText(/返回课程目录/)).toBeNull();
    expect(container.querySelector(".pad-back-btn")).toBeNull();
    expect(container.querySelector(".pad-footer-back")).toBeNull();

    // 7. 验证已去掉底部“已选择：”二次显示
    expect(container.textContent).not.toContain("已选择：");
    expect(container.querySelector(".pad-footer-info")).toBeNull();
  });
});

