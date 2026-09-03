import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import TeacherQuestionReview from "./TeacherQuestionReview";

vi.mock("@yungu-fed/question-editor", () => ({
  createEmptyQuestionPlayerResponse: vi.fn(() => ({})),
  createQuestionContentDraftFromSerialized: vi.fn((value) => value || {}),
  QuestionContentEditor: () => <div data-testid="question-content-editor" />,
  QuestionPreview: () => <div data-testid="question-preview" />,
  serializeQuestionContentDraft: vi.fn((value) => value || {}),
}));

describe("TeacherQuestionReview", () => {
  test("opens the shared editor with slot type and difficulty defaults", async () => {
    const onCreationRequestHandled = vi.fn();
    render(
      <TeacherQuestionReview
        mode="practice"
        questions={[]}
        knowledgePoints={[{ id: "kp-1", name: "光的反射" }]}
        initialScope="kp-1"
        onChange={vi.fn()}
        creationRequest={{
          id: "request-1",
          draft: {
            blueprintSlotId: "slot-1",
            matrixCellId: "kp-1:PC:B",
            type: "single_choice",
            difficulty: 4,
            knowledgePointIds: ["kp-1"],
            primaryKnowledgePointId: "kp-1",
          },
        }}
        onCreationRequestHandled={onCreationRequestHandled}
      />,
    );

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByLabelText("题型")).toHaveValue("single_choice");
    expect(screen.getByLabelText("难度")).toHaveValue("4");
    expect(onCreationRequestHandled).toHaveBeenCalledWith("request-1");
  });
});
