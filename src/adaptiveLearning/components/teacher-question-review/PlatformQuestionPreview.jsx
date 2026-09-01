/* eslint-disable complexity -- 预览需覆盖答案、解析与题型平台分支。 */

import React, { useMemo } from "react";
import { QuestionPreview } from "@yungu-fed/question-editor";
import PropTypes from "prop-types";

import { createQuestionPlatformDraft } from "../../shared/question-platform/legacyQuestionAdapter";
import { getQuestionPlatformTemplate } from "../../shared/question-platform/questionContract";
import MathContent from "../MathContent";
import QuestionReferenceAnswer from "../QuestionReferenceAnswer";
import { questionPropType } from "./propTypes";

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.showAnswer
 */
export default function PlatformQuestionPreview({ question, showAnswer }) {
  const isChoiceQuestion = ["single_choice", "multiple_choice"].includes(
    question.type,
  );
  const value = useMemo(
    () => createQuestionPlatformDraft(question),
    [question],
  );
  const questionTypeTemplates = useMemo(
    () => [getQuestionPlatformTemplate(question.type)],
    [question.type],
  );
  const mathRenderKey = useMemo(
    () =>
      JSON.stringify([
        question.id,
        question.stem,
        question.options,
        question.answer,
        question.platformQuestion,
        showAnswer,
      ]),
    [question, showAnswer],
  );
  return (
    <>
      <MathContent as="div" renderKey={mathRenderKey}>
        <QuestionPreview
          className="teacher-question-platform-preview"
          locale="zh-CN"
          questionTypeTemplates={questionTypeTemplates}
          showAnswer={showAnswer && !isChoiceQuestion}
          showExtraAttributes={showAnswer && question.type === "short_answer"}
          value={value}
        />
      </MathContent>
      {showAnswer && isChoiceQuestion && (
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
      {showAnswer &&
        question.analysis &&
        question.type !== "short_answer" &&
        !isChoiceQuestion && (
          <MathContent
            as="small"
            className="teacher-question-analysis"
            renderKey={question.analysis}
          >
            <b>参考解析：</b>
            {question.analysis}
          </MathContent>
        )}
    </>
  );
}

PlatformQuestionPreview.propTypes = {
  question: questionPropType.isRequired,
  showAnswer: PropTypes.bool.isRequired,
};
