import React from "react";
import PropTypes from "prop-types";

import { canUseQuestionPlatformEditor } from "../../shared/question-platform/legacyQuestionAdapter";
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
