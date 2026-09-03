import React from "react";
import PropTypes from "prop-types";

import QuestionPreviewContent from "../../../components/QuestionPreviewContent";
import { canUseQuestionPlatformEditor } from "../../shared/question-platform/legacyQuestionAdapter";
import { importedV2QuestionPreviewViewModel } from "../../shared/question-platform/v2QuestionSnapshotAdapter";
import MathContent from "../MathContent";
import QuestionReferenceAnswer from "../QuestionReferenceAnswer";
import PlatformQuestionPreview from "./PlatformQuestionPreview";
import { questionPropType } from "./propTypes";

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.showAnswer
 */
export default function ReadonlyQuestionPreview({ question, showAnswer }) {
  const importedPreview = importedV2QuestionPreviewViewModel(question);
  if (importedPreview) {
    return (
      <QuestionPreviewContent
        showAnswerDetails={showAnswer}
        viewModel={importedPreview}
      />
    );
  }
  if (canUseQuestionPlatformEditor(question)) {
    return (
      <PlatformQuestionPreview question={question} showAnswer={showAnswer} />
    );
  }
  return (
    <div className="teacher-question-fallback-preview">
      <MathContent as="strong" renderKey={question.stem}>
        {question.stem}
      </MathContent>
      {showAnswer && (
        <QuestionReferenceAnswer
          question={question}
          correctAnswer={question.answer}
          correctAnswerText={
            Array.isArray(question.answer)
              ? question.answer.join("、")
              : String(question.answer || "—")
          }
          analysis={question.analysis}
        />
      )}
    </div>
  );
}

ReadonlyQuestionPreview.propTypes = {
  question: questionPropType.isRequired,
  showAnswer: PropTypes.bool.isRequired,
};
