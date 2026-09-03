import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import StartClassCourseStep from "./StartClassCourseStep";

const chapters = [
  {
    id: "chapter-1",
    index: "1",
    title: "有理数",
    sections: [{ id: "lesson-1", index: "1.1", title: "正数和负数" }],
  },
  {
    id: "chapter-2",
    index: "2",
    title: "整式",
    sections: [{ id: "lesson-2", index: "2.1", title: "整式基础" }],
  },
];

const renderStep = (selectedLessonIds = []) =>
  render(
    <StartClassCourseStep
      subjects={[{ subjectId: "math", subjectName: "数学" }]}
      courses={[{ courseId: "course-1", courseName: "七年级数学" }]}
      semesterName="2026 学年"
      selectedSubjectId="math"
      selectedCourseId="course-1"
      onSubjectChange={vi.fn()}
      onCourseChange={vi.fn()}
      chapters={chapters}
      availableLessonIds={["lesson-1", "lesson-2"]}
      selectedLessonIds={selectedLessonIds}
      onToggleLesson={vi.fn()}
      loading={false}
    />,
  );

describe("StartClassCourseStep", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
  });

  it("keeps chapters collapsed until the teacher opens one", () => {
    renderStep();

    expect(screen.queryByText("1.1 正数和负数")).not.toBeInTheDocument();
    const chapterTrigger = screen.getByRole("button", { name: /1 有理数/ });
    expect(chapterTrigger).toHaveClass("start-class-chapter-trigger");
    fireEvent.click(chapterTrigger);
    expect(screen.getByText("1.1 正数和负数")).toBeInTheDocument();
  });

  it("automatically reveals a chapter containing a selected lesson", () => {
    renderStep(["lesson-2"]);

    expect(screen.getByText("2.1 整式基础")).toBeInTheDocument();
    expect(screen.getByText("已选 1")).toBeInTheDocument();
  });

  it("expands and collapses all chapters from one control", () => {
    renderStep();

    fireEvent.click(screen.getByRole("button", { name: "展开全部" }));
    expect(screen.getByText("1.1 正数和负数")).toBeInTheDocument();
    expect(screen.getByText("2.1 整式基础")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "收起全部" }));
    expect(screen.queryByText("1.1 正数和负数")).not.toBeInTheDocument();
  });

  it("localizes the form labels and directory instruction in English", () => {
    window.globalLange = "en";
    renderStep();

    expect(screen.getByLabelText(/^Grade/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Subject/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Course/)).toBeInTheDocument();
    expect(
      screen.getByText(/Choose lessons from the course outline/),
    ).toBeInTheDocument();
  });
});
