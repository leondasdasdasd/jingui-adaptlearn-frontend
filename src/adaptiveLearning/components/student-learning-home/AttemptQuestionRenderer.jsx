/* eslint-disable complexity, react/prop-types -- 题型兼容渲染沿用既有 question DTO。 */

import React from "react";
import { QuestionPlayer, QuestionPreview } from "@yungu-fed/question-editor";

import { choiceLayoutClassName } from "../../shared/question-platform/choiceLayout";
import MathContent from "../MathContent";
import QuestionReferenceAnswer from "../QuestionReferenceAnswer";
import { answerText, contentText, optionLabel } from "./model";

/**
 *
 * @param root0
 * @param root0.attempt
 * @param root0.question
 * @param root0.renderer
 */
export default function AttemptQuestionRenderer({
  attempt,
  question,
  renderer,
}) {
  if (!question.stem)
    return (
      <p className="student-home-attempt-unavailable">题目内容暂不可用。</p>
    );
  const isChoiceQuestion = ["single_choice", "multiple_choice"].includes(
    question.type,
  );
  const correctAnswer = attempt.correctAnswer ?? question.answer;
  const choiceReference =
    isChoiceQuestion && contentText(correctAnswer) ? (
      <QuestionReferenceAnswer
        question={question}
        correctAnswer={correctAnswer}
        correctAnswerText={answerText(correctAnswer, question.options)}
        analysis={question.analysis}
      />
    ) : null;
  if (renderer) {
    const renderKey = JSON.stringify([
      question.type,
      question.stem,
      question.options,
    ]);
    return (
      <>
        <MathContent
          as="div"
          className={`student-home-attempt-question-player ${choiceLayoutClassName(question)}`}
          renderKey={renderKey}
        >
          {renderer.kind === "player" ? (
            <QuestionPlayer
              className="student-home-question-player"
              disabled
              locale="zh-CN"
              onResponseChange={() => {}}
              questionTypeTemplates={renderer.templates}
              response={renderer.response}
              showAnswer={
                !isChoiceQuestion && Boolean(contentText(attempt.correctAnswer))
              }
              showExtraAttributes={
                !isChoiceQuestion && Boolean(question.analysis)
              }
              value={renderer.draft}
            />
          ) : (
            <QuestionPreview
              className="student-home-question-preview"
              locale="zh-CN"
              questionTypeTemplates={renderer.templates}
              showAnswer={false}
              showExtraAttributes={
                !isChoiceQuestion &&
                Boolean(question.answer || question.analysis)
              }
              value={renderer.draft}
            />
          )}
        </MathContent>
        {choiceReference}
      </>
    );
  }
  return (
    <div className="student-home-attempt-question-fallback">
      <MathContent
        as="div"
        className="student-home-attempt-stem"
        renderKey={`${attempt.sequence}-${question.stem}`}
      >
        {question.stem}
      </MathContent>
      {question.options.length > 0 && (
        <ul
          className={`student-home-attempt-options ${choiceLayoutClassName(question)}`}
          aria-label="题目选项"
        >
          {question.options.map((option, index) => {
            const label = optionLabel(option, index);
            return (
              <li key={`${label}-${index}`}>
                <span>{label}</span>
                <MathContent
                  as="div"
                  renderKey={`${attempt.sequence}-${label}-${option.text}`}
                >
                  {option.text || "—"}
                </MathContent>
              </li>
            );
          })}
        </ul>
      )}
      {choiceReference}
    </div>
  );
}
