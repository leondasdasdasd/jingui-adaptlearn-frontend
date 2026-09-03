import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import UnitKnowledgeMindmap from "./UnitKnowledgeMindmap";

describe("UnitKnowledgeMindmap", () => {
  const sampleChapter = {
    id: "chap-1",
    title: "有理数",
    sections: [
      {
        id: "sec-1",
        index: "1.1",
        title: "从自然数到有理数",
        knowledgePoints: [
          { id: "kp-1-1-1", name: "正数和负数的概念" },
          { id: "kp-1-1-2", name: "有理数的概念及分类" },
        ],
      },
      {
        id: "sec-2",
        index: "1.2",
        title: "数轴",
        knowledgePoints: [
          { id: "kp-1-2-1", name: "数轴的三要素与画法" },
        ],
      },
      {
        id: "sec-3",
        index: "1.3",
        title: "绝对值",
        knowledgePoints: [
          { id: "kp-1-3-1", name: "绝对值的几何与代数意义" },
        ],
      },
      {
        id: "sec-4",
        index: "1.4",
        title: "有理数的大小比较",
        knowledgePoints: [
          { id: "kp-1-4-1", name: "利用数轴比较有理数大小" },
        ],
      },
    ],
  };

  it("renders center unit node, level 2 section nodes, and level 3 knowledge points without extra labels", () => {
    render(<UnitKnowledgeMindmap chapter={sampleChapter} />);

    // 1. 顶部悬浮栏标题与图例
    expect(screen.getByText("知识地图")).toBeInTheDocument();
    expect(screen.getByText("已掌握")).toBeInTheDocument();
    expect(screen.getByText("需要巩固")).toBeInTheDocument();
    expect(screen.getByText("待检测")).toBeInTheDocument();

    // 2. 中间第一级：仅单元名，不叫单元中心
    expect(screen.getByText("有理数")).toBeInTheDocument();
    expect(screen.queryByText("单元中心")).not.toBeInTheDocument();

    // 3. 第二级：课时名（去除了1.1/1.2等序号）
    expect(screen.getByText("从自然数到有理数")).toBeInTheDocument();
    expect(screen.getByText("数轴")).toBeInTheDocument();
    expect(screen.getByText("绝对值")).toBeInTheDocument();
    expect(screen.getByText("有理数的大小比较")).toBeInTheDocument();
    expect(screen.queryByText("1.1")).not.toBeInTheDocument();

    // 4. 第三级：知识点名称
    expect(screen.getByText("正数和负数的概念")).toBeInTheDocument();
    expect(screen.getByText("有理数的概念及分类")).toBeInTheDocument();
    expect(screen.getByText("数轴的三要素与画法")).toBeInTheDocument();
    expect(screen.getByText("绝对值的几何与代数意义")).toBeInTheDocument();
    expect(screen.getByText("利用数轴比较有理数大小")).toBeInTheDocument();
  });

  it("expresses mastery only via colors on knowledge point nodes and legend", () => {
    const knowledgeProfile = {
      "kp-1-1-1": { status: "mastered", mastery: 95 },
      "kp-1-2-1": { status: "needs_review", mastery: 40 },
    };

    const { container } = render(
      <UnitKnowledgeMindmap
        chapter={sampleChapter}
        knowledgeProfile={knowledgeProfile}
      />
    );

    // 确认已掌握与需要巩固的类名生效
    const masteredKp = container.querySelector(".status-mastered");
    expect(masteredKp).toBeInTheDocument();
    expect(masteredKp.textContent).toBe("正数和负数的概念");

    const needsReviewKp = container.querySelector(".status-needs_review");
    expect(needsReviewKp).toBeInTheDocument();
    expect(needsReviewKp.textContent).toBe("数轴的三要素与画法");

    // 确认知识点卡片上不含多余的文字标签（如待检测、已掌握、0/3等文字在单个知识点卡片内均不存在）
    expect(masteredKp.textContent).not.toContain("已掌握");
    expect(masteredKp.textContent).not.toContain("0/3");
  });

  it("renders safely when chapter has empty sections", () => {
    render(<UnitKnowledgeMindmap chapter={{ id: "c-empty", title: "空单元", sections: [] }} />);
    expect(screen.getByText("空单元")).toBeInTheDocument();
  });
});
