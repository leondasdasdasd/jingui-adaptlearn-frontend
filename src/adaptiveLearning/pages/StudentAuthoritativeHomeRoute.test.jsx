import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import {
  forgetClassStudentIdentity,
  readClassStudentIdentity,
  rememberClassStudentIdentity,
} from "../student/data/classStudentIdentityRepository";
import { fetchStudentAccountSession } from "../student/data/studentAccountSessionRepository";
import { fetchStudentLearningHome } from "../student/data/studentLearningHomeRepository";
import StudentAuthoritativeHomeRoute from "./StudentAuthoritativeHomeRoute";

jest.mock("../routing", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../components/AppShell", () => ({ children }) => (
  <div>{children}</div>
));
jest.mock(
  "../components/StatePanel",
  () =>
    ({ title, description, action }) => (
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        {action}
      </div>
    ),
);
jest.mock("../components/StudentLearningHome", () => ({ profile }) => (
  <div>profile:{profile.student.name}</div>
));
jest.mock("../student/data/classStudentIdentityRepository", () => ({
  forgetClassStudentIdentity: jest.fn(),
  readClassStudentIdentity: jest.fn(),
  rememberClassStudentIdentity: jest.fn(),
}));
jest.mock("../student/data/studentAccountSessionRepository", () => ({
  fetchStudentAccountSession: jest.fn(),
  studentAccountSessionIssues: {
    loginRequired: "LOGIN_REQUIRED",
    accessDenied: "ACCESS_DENIED",
    noClassroom: "NO_CLASSROOM",
    unavailable: "UNAVAILABLE",
  },
}));
jest.mock("../student/data/studentLearningHomeRepository", () => ({
  fetchStudentLearningHome: jest.fn(),
}));

describe("StudentAuthoritativeHomeRoute", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
    jest.clearAllMocks();
    rememberClassStudentIdentity.mockReturnValue(true);
  });

  test("exchanges the quiz login session, remembers identity, then loads the home", async () => {
    const identity = {
      accessToken: "token-1",
      classId: "class-1",
      className: "七年级 1 班",
      studentId: "student-1",
      studentName: "林同学",
    };
    readClassStudentIdentity.mockReturnValue(null);
    fetchStudentAccountSession.mockResolvedValue(identity);
    fetchStudentLearningHome.mockResolvedValue({
      student: { name: "林同学" },
    });

    const view = render(<StudentAuthoritativeHomeRoute />);

    await waitFor(() =>
      expect(screen.getByText("profile:林同学")).toBeInTheDocument(),
    );
    expect(rememberClassStudentIdentity).toHaveBeenCalledWith(identity);
    expect(fetchStudentLearningHome).toHaveBeenCalledWith(
      "token-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    view.unmount();
  });

  test("replaces a legacy fixed-link identity with the current quiz student", async () => {
    readClassStudentIdentity.mockReturnValue({
      accessToken: "legacy-token",
      classId: "class-1",
      studentId: "student-1",
    });
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
    expect(readClassStudentIdentity).not.toHaveBeenCalled();
    expect(fetchStudentAccountSession).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(rememberClassStudentIdentity).toHaveBeenCalledWith(currentIdentity);
    expect(fetchStudentLearningHome).toHaveBeenCalledWith(
      "current-token",
      expect.any(Object),
    );
    view.unmount();
  });

  test.each(["LOGIN_REQUIRED", "ACCESS_DENIED"])(
    "clears a legacy classroom identity when the quiz session returns %s",
    async (code) => {
      readClassStudentIdentity.mockReturnValue({
        accessToken: "legacy-token",
        classId: "class-1",
        studentId: "student-1",
      });
      fetchStudentAccountSession.mockRejectedValue(
        Object.assign(new Error("identity rejected"), { code }),
      );

      render(<StudentAuthoritativeHomeRoute />);

      await waitFor(() => expect(forgetClassStudentIdentity).toHaveBeenCalled());
      expect(readClassStudentIdentity).not.toHaveBeenCalled();
      expect(fetchStudentLearningHome).not.toHaveBeenCalled();
    },
  );

  test("shows the localized no-classroom state", async () => {
    readClassStudentIdentity.mockReturnValue(null);
    fetchStudentAccountSession.mockRejectedValue(
      Object.assign(new Error("none"), { code: "NO_CLASSROOM" }),
    );

    render(<StudentAuthoritativeHomeRoute />);

    expect(
      await screen.findByText("暂时没有可学习的课堂"),
    ).toBeInTheDocument();
  });

  test("offers the BFF login destination without adding a student token", async () => {
    readClassStudentIdentity.mockReturnValue(null);
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
