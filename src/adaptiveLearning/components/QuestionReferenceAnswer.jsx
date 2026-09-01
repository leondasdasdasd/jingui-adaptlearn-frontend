import React from "react";

import {
  choiceOptionText,
  questionChoiceOptions,
} from "../shared/question-platform/choiceLayout";
import MathContent from "./MathContent";

/**
 *
 * @param value
 */
export function hasReferenceAnswer(value) {
  return Array.isArray(value)
    ? value.some((item) => String(item ?? "").trim())
    : Boolean(String(value ?? "").trim());
}

/**
 *
 * @param question
 * @param answer
 */
function choiceAnswerRows(question, answer) {
  if (!["single_choice", "multiple_choice"].includes(question?.type)) return [];
  const values = Array.isArray(answer)
    ? answer
    : String(answer ?? "")
        .split(/[\s,;、，；]+/)
        .filter(Boolean);
  const options = questionChoiceOptions(question);
  return values
    .map((value, index) => {
      const normalizedValue = String(value).trim();
      const match = options
        .map((option, optionIndex) => ({
          id: String(
            typeof option === "string"
              ? String.fromCharCode(65 + optionIndex)
              : option?.id || String.fromCharCode(65 + optionIndex),
          ),
          option,
        }))
        .find(
          ({ id, option }) =>
            id === normalizedValue ||
            choiceOptionText(option) === normalizedValue,
        );
      if (!match) return null;
      return {
        id: match.id,
        key: `${normalizedValue}-${index}`,
        text: choiceOptionText(match.option),
      };
    })
    .filter(Boolean);
}

/**
 *
 * @param root0
 * @param root0.title
 * @param root0.children
 */
function ReferenceSection({ title, children }) {
  return (
    <section className="question-review-reference-section" aria-label={title}>
      <header>
        <span aria-hidden="true" />
        <h3>{title}</h3>
      </header>
      <div className="question-review-reference-content">{children}</div>
    </section>
  );
}

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.correctAnswer
 * @param root0.correctAnswerText
 * @param root0.correctAnswerLabel
 * @param root0.analysis
 */
export default function QuestionReferenceAnswer({
  question,
  correctAnswer,
  correctAnswerText,
  correctAnswerLabel = "标准答案",
  analysis = "",
}) {
  const resolvedCorrectAnswer = hasReferenceAnswer(correctAnswer);
  const hasCorrectAnswerText = hasReferenceAnswer(correctAnswerText);
  const correctChoiceRows = choiceAnswerRows(question, correctAnswer);
  if (
    !resolvedCorrectAnswer &&
    !hasCorrectAnswerText &&
    !hasReferenceAnswer(analysis)
  )
    return null;

  return (
    <div className="question-review-reference-list">
      {(resolvedCorrectAnswer || hasCorrectAnswerText) && (
        <ReferenceSection title={correctAnswerLabel}>
          {correctChoiceRows.length > 0 ? (
            <div className="question-review-reference-options">
              {correctChoiceRows.map((option) => (
                <div
                  className="question-review-reference-option"
                  key={option.key}
                >
                  <span>{option.id}</span>
                  <MathContent
                    as="div"
                    renderKey={`${option.key}-${option.text}`}
                  >
                    {option.text}
                  </MathContent>
                </div>
              ))}
            </div>
          ) : (
            <MathContent as="p" renderKey={correctAnswerText}>
              {correctAnswerText}
            </MathContent>
          )}
        </ReferenceSection>
      )}
      {hasReferenceAnswer(analysis) && (
        <ReferenceSection title="答案解析">
          <MathContent as="p" renderKey={analysis}>
            {analysis}
          </MathContent>
        </ReferenceSection>
      )}
    </div>
  );
}
