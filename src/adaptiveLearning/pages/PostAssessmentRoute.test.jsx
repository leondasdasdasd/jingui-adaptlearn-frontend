/** @vitest-environment node */

import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { routes } from "../routes/routePaths";
import PostAssessmentRoute from "./PostAssessmentRoute";

const mockExitLearningSession = vi.fn();

vi.mock(
  "../components/LearningResourceStatePage",
  () => ({
    default: function MockLearningResourceStatePage({ onBack }) {
      return <button onClick={onBack}>back</button>;
    },
  }),
);
vi.mock("../components/QuizPage", () => ({ default: () => null }));
vi.mock("../routing", () => ({
  Navigate: () => null,
  useNavigate: () => vi.fn(),
}));
vi.mock("../session/LearningSessionContext", () => ({
  useLearningSession: () => ({
    session: {
      learningFlow: { context: null, mode: "lesson_flow", plan: null },
      postAttempts: {},
      postQuestions: [],
      preAttempts: {},
      preMastery: {},
      preQuestions: [],
      result: {},
      selection: {
        knowledgePoints: [],
        section: { id: "lesson-1", title: "第一课时" },
        sessionType: "teacher_preview",
        studentId: "teacher-preview:version-1",
        studentSessionId: "teacher-preview:version-1:123",
      },
    },
    setSession: vi.fn(),
  }),
}));
vi.mock("../session/useLearningSessionExit", () => ({
  useLearningSessionExit: () => mockExitLearningSession,
}));
vi.mock("../student/application/learningUnitQuestionMapper.js", () => ({
  questionsForLearningUnit: () => [],
}));
vi.mock("../student/data/learningEventRepository", () => ({
  recordLearningEvent: vi.fn(),
}));
vi.mock("../student/data/learningHistoryRepository", () => ({
  readLearningAttempts: vi.fn(() => []),
  readLocalStudentIdentity: vi.fn(() => null),
}));
vi.mock("../student/domain/learningPlan", () => ({
  activeLearningUnit: vi.fn(() => null),
  advanceLessonFlow: vi.fn(),
  finishTemporaryLearning: vi.fn(),
  resolveKnowledgeVerification: vi.fn(),
  routeForLearningUnit: vi.fn(),
  startDirectCheckpoint: vi.fn(),
  startRelearning: vi.fn(),
}));
vi.mock("../student/domain/practiceMastery.js", () => ({
  calculatePracticeRoundMastery: vi.fn(),
  currentPracticeMastery: vi.fn(() => ({})),
}));

describe("PostAssessmentRoute teacher preview empty state", () => {
  test("exits through the session boundary before returning", () => {
    mockExitLearningSession.mockClear();
    let renderer;
    act(() => {
      renderer = TestRenderer.create(<PostAssessmentRoute />);
    });

    act(() => renderer.root.findByType("button").props.onClick());

    expect(mockExitLearningSession).toHaveBeenCalledWith(routes.directory);
    act(() => renderer.unmount());
  });
});
