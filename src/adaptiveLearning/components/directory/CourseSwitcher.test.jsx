/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { zhejiangGrade7Up } from "../../shared/domain/courseCatalog/zhejiangGrade7Up.js";
import CourseSwitcher from "./CourseSwitcher";

describe("CourseSwitcher", () => {
  it("opens up Science and Physics subjects and allows switching to them", () => {
    const onSelectCourse = vi.fn();
    render(
      <CourseSwitcher
        currentCourse={zhejiangGrade7Up}
        onSelectCourse={onSelectCourse}
      />,
    );

    // Open modal
    const trigger = screen.getByTitle("点击切换年级、学科与学期");
    fireEvent.click(trigger);

    // Verify Science and Physics are present and not disabled
    const mathBtn = screen.getByRole("button", { name: /^数学/ });
    const scienceBtn = screen.getByRole("button", { name: /^科学/ });
    const physicsBtn = screen.getByRole("button", { name: /^物理/ });

    expect(mathBtn).toBeInTheDocument();
    expect(scienceBtn).toBeInTheDocument();
    expect(physicsBtn).toBeInTheDocument();

    expect(scienceBtn).not.toBeDisabled();
    expect(physicsBtn).not.toBeDisabled();

    // Select Science
    fireEvent.click(scienceBtn);
    const confirmBtn = screen.getByRole("button", { name: "确认切换" });
    fireEvent.click(confirmBtn);

    expect(onSelectCourse).toHaveBeenCalledTimes(1);
    expect(onSelectCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "科学",
      }),
    );
  });

  it("switches to Physics when Physics subject is chosen", () => {
    const onSelectCourse = vi.fn();
    render(
      <CourseSwitcher
        currentCourse={zhejiangGrade7Up}
        onSelectCourse={onSelectCourse}
      />,
    );

    const trigger = screen.getByTitle("点击切换年级、学科与学期");
    fireEvent.click(trigger);

    const physicsBtn = screen.getByRole("button", { name: /^物理/ });
    fireEvent.click(physicsBtn);

    const grade8Btn = screen.getByRole("button", { name: /^八年级/ });
    fireEvent.click(grade8Btn);

    const confirmBtn = screen.getByRole("button", { name: "确认切换" });
    fireEvent.click(confirmBtn);

    expect(onSelectCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "物理",
      }),
    );
  });
});
