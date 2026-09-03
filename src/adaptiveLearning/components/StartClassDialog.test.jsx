import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import StartClassDialog from "./StartClassDialog";

vi.mock("../routing", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../shared/infrastructure/classroomApi", () => ({
  getLatestLessonVersion: vi.fn().mockResolvedValue(null),
  getPublishedLessonVersions: vi.fn().mockResolvedValue([]),
}));
vi.mock("../teacher/hooks/usePlatformTeachingDirectory", () => {
  const directory = {
    classes: [],
    courses: [{ courseId: "course-1", courseName: "七年级数学" }],
    error: "",
    loading: false,
    retry: vi.fn(),
    selectedCourseId: "course-1",
    selectedSubjectId: "math",
    semester: { semesterId: "semester-1", semesterName: "2026 学年" },
    setSelectedCourseId: vi.fn(),
    setSelectedSubjectId: vi.fn(),
    subjects: [{ subjectId: "math", subjectName: "数学" }],
  };

  return { usePlatformTeachingDirectory: () => directory };
});

describe("StartClassDialog", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
    document.body.style.overflow = "";
  });

  it("locks page scrolling, focuses close and closes with Escape", async () => {
    const onClose = vi.fn();
    render(<StartClassDialog open onClose={onClose} />);

    const closeButton = screen.getByRole("button", { name: "关闭" });
    await waitFor(() => expect(closeButton).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
