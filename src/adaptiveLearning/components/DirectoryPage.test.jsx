/** @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import DirectoryPage from "./DirectoryPage";

vi.mock("./AppShell", () => ({
  default: ({ children }) => <main>{children}</main>,
}));

const section = {
  id: "lesson-1",
  index: "1.1",
  title: "正数和负数",
  estimatedMinutes: 20,
  knowledgePoints: [{ id: "kp-1", name: "正负数的意义" }],
};
const nextSection = {
  id: "lesson-2",
  index: "1.2",
  title: "数轴",
  estimatedMinutes: 20,
  knowledgePoints: [{ id: "kp-2", name: "数轴的构成" }],
};
const chapter = {
  id: "chapter-1",
  index: "1",
  title: "有理数",
  sections: [section, nextSection],
};
const course = {
  id: "course-1",
  name: "七年级数学",
  chapters: [chapter],
};
const actions = {
  onContinue: vi.fn(),
  onLearnKnowledge: vi.fn(),
  onOpenKnowledgeMap: vi.fn(),
  onSelectCourse: vi.fn(),
  onStart: vi.fn(),
  onStartNewLesson: vi.fn(),
};

describe("DirectoryPage learning mode entry", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
    vi.clearAllMocks();
  });

  it("shows mode selection only before starting a learning session", () => {
    const view = render(
      <DirectoryPage {...actions} course={course} progress={null} />,
    );
    expect(screen.getByText("这次想怎么学？")).toBeVisible();

    view.rerender(
      <DirectoryPage
        {...actions}
        course={course}
        progress={{
          lessonId: "lesson-1",
          actionLabel: "继续学习",
          items: [],
        }}
      />,
    );
    expect(screen.queryByText("这次想怎么学？")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续学习" })).toBeVisible();
  });

  it("announces the real empty state when a unit test is unavailable", () => {
    render(<DirectoryPage {...actions} course={course} progress={null} />);

    fireEvent.click(screen.getByRole("button", { name: "查缺补漏" }));
    fireEvent.click(screen.getByRole("button", { name: "开始单元测试" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "这个单元还没有可用的单元测试",
    );
  });

  it("offers mode selection after switching away from the active lesson", () => {
    render(
      <DirectoryPage
        {...actions}
        course={course}
        progress={{ lessonId: "lesson-1", actionLabel: "继续学习", items: [] }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /1\.2.*数轴/ }));

    expect(screen.getByText("这次想怎么学？")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "继续学习" }),
    ).not.toBeInTheDocument();
  });

  it("restores an active session on a lesson other than the first", () => {
    render(
      <DirectoryPage
        {...actions}
        course={course}
        progress={{ lessonId: "lesson-2", actionLabel: "继续学习", items: [] }}
      />,
    );

    expect(screen.getByRole("heading", { name: "数轴" })).toBeVisible();
    expect(screen.queryByText("这次想怎么学？")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续学习" })).toBeVisible();
  });
});
