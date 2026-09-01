/* eslint-disable complexity, react/prop-types -- 作答记录沿用既有 attempt DTO。 */

import React from "react";
import { BookOpen } from "lucide-react";

import {
  aiGeneratedErrorReason,
  aiGeneratedImprovements,
} from "../../student/domain/questionFeedback.js";
import MathContent from "../MathContent";
import { localizedFeedbackItems } from "../question-feedback/questionFeedbackPresentation";
import AttemptQuestionRenderer from "./AttemptQuestionRenderer";
import {
  answerText,
  attemptTone,
  contentText,
  dateTime,
  difficulty,
  duration,
  questionRendererModel,
  questionType,
  scoreText,
} from "./model";

/**
 *
 * @param root0
 * @param root0.attempt
 * @param root0.showDetails
 * @param root0.onSelectKp
 * @param root0.kpMasteryInfo
 */
export function StudentAttemptRecord({
  attempt,
  showDetails = false,
  onSelectKp,
  kpMasteryInfo = null,
}) {
  const { question, renderer } = questionRendererModel(attempt);
  const options = Array.isArray(question.options) ? question.options : [];
  const submitted = Boolean(attempt.submittedAt);
  const answer = answerText(attempt.answer, options);
  const tone = attemptTone(attempt.result);
  const feedbackGrading = {
    ...attempt,
    feedbackSource:
      attempt.feedbackSource ||
      (attempt.aiCommentary || attempt.improvements ? "ai" : ""),
    aiCommentary: attempt.aiCommentary || attempt.feedback || "",
  };
  const errorReason = aiGeneratedErrorReason(question.type, feedbackGrading);
  const improvement = localizedFeedbackItems(
    aiGeneratedImprovements(question.type, feedbackGrading),
  );
  const generalFeedback =
    !errorReason && !improvement ? contentText(attempt.feedback) : "";

  return (
    <article className="student-home-attempt-record">
      <header className="student-home-attempt-summary">
        <div className="student-home-attempt-number">
          <strong>第 {attempt.sequence} 题</strong>
          <span className="attempt-stage-badge">
            {attempt.learningStage || "自适应巩固"}
          </span>
          {attempt.kpName && (
            <button
              type="button"
              className="attempt-kp-badge-btn"
              title={`按【${attempt.kpName}】筛选做题与活动记录`}
              onClick={() => onSelectKp && onSelectKp(attempt.kpName)}
            >
              <BookOpen size={12} />
              <span>{attempt.kpName}</span>
              {kpMasteryInfo && (
                <span className="attempt-kp-mastery-tag">
                  学前 {kpMasteryInfo.preMastery}% → 学后{" "}
                  {kpMasteryInfo.postMastery}%
                </span>
              )}
            </button>
          )}
        </div>
        <div className="student-home-attempt-timing">
          <time>
            {dateTime(attempt.submittedAt || attempt.presentedAt, true)}
          </time>
          <small>{duration(attempt.durationSeconds)}</small>
        </div>
        <b className={`student-home-attempt-result ${tone}`}>
          {attempt.result}
        </b>
      </header>
      {showDetails && (
        <div className="student-home-attempt-content">
          <section
            className="student-home-attempt-question"
            aria-label={`第 ${attempt.sequence} 题题目`}
          >
            <div className="student-home-attempt-section-heading">
              <strong>题目描述</strong>
              <div>
                <span>{questionType(question.type)}</span>
                <span>{difficulty(question.difficulty)}</span>
              </div>
            </div>
            <AttemptQuestionRenderer
              attempt={attempt}
              question={question}
              renderer={renderer}
            />
          </section>
          <section
            className="student-home-attempt-answer"
            aria-label={`第 ${attempt.sequence} 题作答`}
          >
            <div className="student-home-attempt-section-heading">
              <strong>作答与评分</strong>
              <span className="student-home-attempt-score">
                {scoreText(attempt.score, attempt.maxScore, attempt.result)}
              </span>
            </div>
            <MathContent
              as="div"
              className={`student-home-attempt-answer-text${answer ? "" : " empty"}`}
              renderKey={`${attempt.sequence}-${answer}`}
            >
              {answer || (submitted ? "作答内容暂不可用。" : "尚未提交作答。")}
            </MathContent>
            {errorReason && (
              <div className="student-home-attempt-feedback error-reason">
                <span>错误诊断</span>
                <MathContent
                  as="p"
                  renderKey={`${attempt.sequence}-${errorReason}`}
                >
                  {errorReason}
                </MathContent>
              </div>
            )}
            {improvement && (
              <div className="student-home-attempt-feedback">
                <span>掌握提升建议</span>
                <MathContent
                  as="p"
                  renderKey={`${attempt.sequence}-${improvement}`}
                >
                  {improvement}
                </MathContent>
              </div>
            )}
            {generalFeedback && (
              <div className="student-home-attempt-feedback">
                <span>批改反馈</span>
                <MathContent
                  as="p"
                  renderKey={`${attempt.sequence}-${generalFeedback}`}
                >
                  {generalFeedback}
                </MathContent>
              </div>
            )}
          </section>
        </div>
      )}
    </article>
  );
}

export default StudentAttemptRecord;
