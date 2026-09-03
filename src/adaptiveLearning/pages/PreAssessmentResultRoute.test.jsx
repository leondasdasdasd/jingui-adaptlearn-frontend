import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";

import { loadAnswerReviews } from "../lib/gradingApi";
import { useLearningSession } from "../session/LearningSessionContext";
import PreAssessmentResultRoute from "./PreAssessmentResultRoute";

vi.mock("../components/PreAssessmentResultPage", () => ({
  default: (props) => (
    <div data-testid="result">
      {props.answerReviewStatus}:{props.questions[0]?.answer || "none"}
    </div>
  ),
}));
vi.mock("../lib/gradingApi", () => ({ loadAnswerReviews: vi.fn() }));
vi.mock("../lib/mastery", () => ({
  calculatePreMastery: vi.fn(),
  isPreAssessmentComplete: vi.fn(() => true),
}));
vi.mock("../routing", () => ({
  Navigate: () => null,
  useNavigate: () => vi.fn(),
}));
vi.mock("../session/LearningSessionContext", () => ({
  useLearningSession: vi.fn(),
}));
vi.mock("../student/domain/learningPlan", () => ({
  activeLearningUnit: vi.fn(() => null),
  routeForLearningUnit: vi.fn(() => "/complete"),
}));

function sessionFor(id, token, version) {
  return {
    preAssessment: { completedAt: "2026-08-31T00:00:00Z" },
    preAttempts: { "q-1": { answer: "student-answer" } },
    preMastery: { "kp-1": { mastery: 0.5 } },
    preQuestions: [{ id: "q-1", answer: "local-answer" }],
    learningFlow: {},
    selection: {
      classroomAccessToken: token,
      contentVersionId: version,
      studentSessionId: id,
      section: { id: "section-1", title: "Section" },
      knowledgePoints: [{ id: "kp-1", name: "Point" }],
    },
  };
}

describe("PreAssessmentResultRoute", () => {
  test("ignores an old answer-review request after the student session changes", async () => {
    let resolveOldRequest;
    const oldRequest = new Promise((resolve) => {
      resolveOldRequest = resolve;
    });
    let currentSession = sessionFor("student-session-1", "token-1", "v-1");
    useLearningSession.mockImplementation(() => ({ session: currentSession }));
    loadAnswerReviews
      .mockReturnValueOnce(oldRequest)
      .mockResolvedValueOnce({ "q-1": { correctAnswer: "new-answer" } });

    const view = render(<PreAssessmentResultRoute />);
    currentSession = sessionFor("student-session-2", "token-2", "v-2");
    view.rerender(<PreAssessmentResultRoute />);

    await waitFor(() =>
      expect(screen.getByTestId("result")).toHaveTextContent(
        "ready:new-answer",
      ),
    );
    await act(async () => {
      resolveOldRequest({ "q-1": { correctAnswer: "old-answer" } });
      await oldRequest;
    });
    expect(screen.getByTestId("result")).toHaveTextContent("ready:new-answer");
  });
});
