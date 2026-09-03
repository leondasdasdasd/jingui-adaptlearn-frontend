import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import {
  clearTeacherStoragePartition,
  setTeacherStoragePartition,
} from "../../teacher/data/teacherStoragePartition.js";
import TeacherQuestionAgent from "../TeacherQuestionAgent";
import TeacherAgentComposer from "./TeacherAgentComposer";

const requiredProps = {
  lessonId: "lesson-1",
  scope: "pre",
  open: false,
  onOpen: vi.fn(),
  onClose: vi.fn(),
  onPlanInstruction: vi.fn(),
  onExecuteStep: vi.fn(),
  onValidatePlan: vi.fn(),
  generating: false,
  generationStatus: null,
  lessonModules: [],
  lessonTask: { phase: "idle", issues: [] },
};

describe("TeacherQuestionAgent React 16 integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setTeacherStoragePartition("teacher-agent-test-partition");
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearTeacherStoragePartition();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("passes an idle busy state and a React 16-safe inert attribute", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    let renderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherQuestionAgent {...requiredProps} />,
      );
    });

    expect(renderer.root.findByType(TeacherAgentComposer).props.busy).toBe(
      false,
    );
    expect(
      renderer.root.findByProps({ id: "teacher-question-agent" }).props,
    ).toMatchObject({ inert: "", "aria-hidden": true });
    expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(/inert/i);

    act(() => renderer.unmount());
  });
});
