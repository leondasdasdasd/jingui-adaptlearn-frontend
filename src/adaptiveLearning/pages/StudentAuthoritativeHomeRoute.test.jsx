import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import {
  forgetStudentLearningIdentity,
  rememberStudentLearningIdentity,
} from "../student/data/studentLearningIdentityRepository";
import { fetchStudentAccountSession } from "../student/data/studentAccountSessionRepository";
import { fetchStudentLearningHome } from "../student/data/studentLearningHomeRepository";
import StudentAuthoritativeHomeRoute from "./StudentAuthoritativeHomeRoute";

vi.mock("../routing", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../components/AppShell", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock(
  "../components/StatePanel",
  () => ({
    default: ({ title, description, action }) => (
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        {action}
      </div>
    ),
  }),
);
vi.mock("../components/StudentLearningHome", () => ({
  default: ({ profile }) => <div>profile:{profile.student.name}</div>,
}));
vi.mock("../student/data/studentLearningIdentityRepository", () => ({
  forgetStudentLearningIdentity: vi.fn(),
  rememberStudentLearningIdentity: vi.fn(),
}));
vi.mock("../student/data/studentAccountSessionRepository", () => ({
  fetchStudentAccountSession: vi.fn(),
  studentAccountSessionIssues: {
    loginRequired: "LOGIN_REQUIRED",
    accessDenied: "ACCESS_DENIED",
    noClassroom: "NO_CLASSROOM",
    unavailable: "UNAVAILABLE",
  },
}));
vi.mock("../student/data/studentLearningHomeRepository", () => ({
  fetchStudentLearningHome: vi.fn(),
}));

describe("StudentAuthoritativeHomeRoute", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
    vi.clearAllMocks();
    rememberStudentLearningIdentity.mockReturnValue(true);
  });

  test("exchanges the quiz login session, remembers identity, then loads the home", async () => {
    const identity = {
      accessToken: "token-1",
      classId: "class-1",
      className: "七年级 1 班",
      studentId: "student-1",
      studentName: "林同学",
    };
    fetchStudentAccountSession.mockResolvedValue(identity);
    fetchStudentLearningHome.mockResolvedValue({
      student: { name: "林同学" },
    });

    const view = render(<StudentAuthoritativeHomeRoute />);

    await waitFor(() =>
      expect(screen.getByText("profile:林同学")).toBeInTheDocument(),
    );
    expect(rememberStudentLearningIdentity).toHaveBeenCalledWith(identity);
    expect(fetchStudentLearningHome).toHaveBeenCalledWith(
      "token-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    view.unmount();
  });

  test("replaces a legacy fixed-link identity with the current quiz student", async () => {
    const currentIdentity = {
      accessToken: "current-token",
      classId: "class-2",
      studentId: "student-2",
      studentName: "周同学",
    };
    fetchStudentAccountSession.mockResolvedValue(currentIdentity);
    fetchStudentLearningHome.mockResolvedValue({
      student: { name: "周同学" },
    });

    const view = render(<StudentAuthoritativeHomeRoute />);

    await waitFor(() =>
      expect(screen.getByText("profile:周同学")).toBeInTheDocument(),
    );
    expect(fetchStudentAccountSession).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(rememberStudentLearningIdentity).toHaveBeenCalledWith(
      currentIdentity,
    );
    expect(fetchStudentLearningHome).toHaveBeenCalledWith(
      "current-token",
      expect.any(Object),
    );
    view.unmount();
  });

  test.each(["LOGIN_REQUIRED", "ACCESS_DENIED"])(
    "clears a legacy classroom identity when the quiz session returns %s",
    async (code) => {
      fetchStudentAccountSession.mockRejectedValue(
        Object.assign(new Error("identity rejected"), { code }),
      );

      render(<StudentAuthoritativeHomeRoute />);

      await waitFor(() =>
        expect(forgetStudentLearningIdentity).toHaveBeenCalled(),
      );
      expect(fetchStudentLearningHome).not.toHaveBeenCalled();
    },
  );

  test("loads an empty personal home without classroom context", async () => {
    fetchStudentAccountSession.mockResolvedValue({
      accessToken: "account-token",
      classId: "",
      className: "",
      studentId: "student-new",
      studentName: "新同学",
    });
    fetchStudentLearningHome.mockResolvedValue({ student: { name: "新同学" } });

    render(<StudentAuthoritativeHomeRoute />);

    expect(await screen.findByText("profile:新同学")).toBeInTheDocument();
  });

  test("refreshes an expired learning credential from the current quiz login", async () => {
    fetchStudentAccountSession
      .mockResolvedValueOnce({
        accessToken: "expired-token",
        studentId: "student-1",
        studentName: "林同学",
      })
      .mockResolvedValueOnce({
        accessToken: "refreshed-token",
        studentId: "student-1",
        studentName: "林同学",
      });
    fetchStudentLearningHome
      .mockRejectedValueOnce(
        Object.assign(new Error("expired"), { status: 401 }),
      )
      .mockResolvedValueOnce({ student: { name: "林同学" } });

    render(<StudentAuthoritativeHomeRoute />);

    expect(await screen.findByText("profile:林同学")).toBeInTheDocument();
    expect(forgetStudentLearningIdentity).toHaveBeenCalledTimes(1);
    expect(fetchStudentAccountSession).toHaveBeenCalledTimes(2);
    expect(fetchStudentLearningHome).toHaveBeenLastCalledWith(
      "refreshed-token",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  test("offers the BFF login destination without adding a student token", async () => {
    fetchStudentAccountSession.mockRejectedValue(
      Object.assign(new Error("login"), {
        code: "LOGIN_REQUIRED",
        loginUrl: "https://quiz.example.test/login",
      }),
    );

    render(<StudentAuthoritativeHomeRoute />);

    const login = await screen.findByRole("link", {
      name: "登录测验",
    });
    expect(login).toHaveAttribute("href", "https://quiz.example.test/login");
    expect(login.href).not.toContain("accessToken");
  });
});
