import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { routes } from "../routes/routePaths";
import RoleSwitcherFloat from "./RoleSwitcherFloat";

const routing = vi.hoisted(() => ({
  location: { pathname: "" },
  navigate: vi.fn(),
}));

vi.mock("../routing", () => ({
  useLocation: () => routing.location,
  useNavigate: () => routing.navigate,
}));

function renderSwitcher(pathname) {
  routing.location.pathname = pathname;
  render(<RoleSwitcherFloat />);
}

describe("RoleSwitcherFloat", () => {
  beforeEach(() => {
    window.globalLange = "zh-CN";
    routing.navigate.mockClear();
  });

  it("switches the student view to the real teacher route", () => {
    renderSwitcher(routes.directory);
    fireEvent.click(screen.getByRole("button", { name: /切为教师/ }));
    expect(routing.navigate).toHaveBeenCalledWith(routes.teacherHome);
  });

  it("switches the teacher view to the real student directory route", () => {
    renderSwitcher(routes.teacherHome);
    fireEvent.click(screen.getByRole("button", { name: /切为学生/ }));
    expect(routing.navigate).toHaveBeenCalledWith(routes.directory);
  });

  it("marks session workflows so fixed actions remain reachable", () => {
    renderSwitcher(routes.preAssessment);

    expect(document.querySelector(".role-switcher-float")).toHaveAttribute(
      "data-workflow",
      "true",
    );
  });
});
