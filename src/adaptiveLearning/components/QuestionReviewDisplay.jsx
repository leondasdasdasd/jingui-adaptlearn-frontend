import React, { useMemo } from "react";
import { QuestionPlayer, QuestionPreview } from "@yungu-fed/question-editor";

import { choiceLayoutClassName } from "../shared/question-platform/choiceLayout";
import {
  adaptLegacyQuestion,
  canUseQuestionPlatformEditor,
  canUseQuestionPlatformPlayer,
  createQuestionPlatformDraft,
} from "../shared/question-platform/legacyQuestionAdapter";
import { getQuestionPlatformTemplate } from "../shared/question-platform/questionContract";
import MathContent from "./MathContent";
import QuestionReferenceAnswer, {
  hasReferenceAnswer,
} from "./QuestionReferenceAnswer";

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.studentAnswer
 * @param root0.studentAnswerText
 * @param root0.correctAnswer
 * @param root0.correctAnswerText
 * @param root0.correctAnswerLabel
 * @param root0.analysis
 */
export default function QuestionReviewDisplay({
  question,
  studentAnswer,
  studentAnswerText,
  correctAnswer,
  correctAnswerText,
  correctAnswerLabel = "标准答案",
  analysis = "",
}) {
  const resolvedCorrectAnswer = hasReferenceAnswer(correctAnswer);
  const model = useMemo(() => {
    const reviewQuestion = resolvedCorrectAnswer
      ? { ...question, answer: correctAnswer, platformQuestion: null }
      : question;
    if (canUseQuestionPlatformPlayer(reviewQuestion)) {
      return {
        kind: "player",
        ...adaptLegacyQuestion(reviewQuestion, studentAnswer),
      };
    }
    if (canUseQuestionPlatformEditor(reviewQuestion)) {
      return {
        kind: "preview",
        draft: createQuestionPlatformDraft(reviewQuestion),
        templates: [getQuestionPlatformTemplate(reviewQuestion.type)],
      };
    }
    return { kind: "fallback" };
  }, [correctAnswer, question, resolvedCorrectAnswer, studentAnswer]);
  const renderKey = JSON.stringify([
    question.id,
    question.type,
    question.stem,
    question.options,
    studentAnswer,
    correctAnswer,
    analysis,
    model.kind,
  ]);
  const showAnswerStack = model.kind !== "player";

  return (
    <div className="question-review-display">
      <MathContent
        as="div"
        className={`question-review-platform ${choiceLayoutClassName(question)}`}
        renderKey={renderKey}
      >
        {model.kind === "player" && (
          <QuestionPlayer
            className="question-review-player"
            disabled
            locale="zh-CN"
            onResponseChange={() => {}}
            questionTypeTemplates={model.templates}
            response={model.response}
            showAnswer={false}
            value={model.draft}
          />
        )}
        {model.kind === "preview" && (
          <QuestionPreview
            className="question-review-preview"
            locale="zh-CN"
            questionTypeTemplates={model.templates}
            showAnswer={false}
            showExtraAttributes={false}
            value={model.draft}
          />
        )}
        {model.kind === "fallback" && (
          <MathContent as="h2" renderKey={question.stem}>
            {question.stem}
          </MathContent>
        )}
      </MathContent>

      {showAnswerStack && (
        <div className="question-review-answer-stack">
          <div>
            <span className="detail-section-label">你的答案</span>
            <MathContent as="p" renderKey={studentAnswerText}>
              {studentAnswerText}
            </MathContent>
          </div>
        </div>
      )}

      <QuestionReferenceAnswer
        question={question}
        correctAnswer={correctAnswer}
        correctAnswerText={correctAnswerText}
        correctAnswerLabel={correctAnswerLabel}
        analysis={analysis}
      />
    </div>
  );
}
