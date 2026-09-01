/* eslint-disable complexity, sonarjs/cognitive-complexity -- 视图只表达既有题目、反馈和干预状态。 */

import React from "react";
import { BookOpenCheck, Lightbulb, Sigma, X } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import { canUseQuestionPlatformPlayer } from "../../shared/question-platform/legacyQuestionAdapter.js";
import { hasConfirmedCorrectionReading } from "../../student/domain/realtimeCorrection.js";
import AppShell from "../AppShell";
import DifficultyBadge from "../DifficultyBadge";
import { ChevronLeft, ChevronRight, MessageCircle } from "../Icons";
import MathContent from "../MathContent";
import QuestionAnswer from "../QuestionAnswer";
import QuestionFeedbackCard from "../QuestionFeedbackCard";
import QuestionReferenceAnswer from "../QuestionReferenceAnswer";
import ScratchPaper from "../ScratchPaper";
import StudentHelpRequest from "../StudentHelpRequest";
import { displayCorrectAnswer } from "./model";
import { quizQuestionPropType } from "./propTypes";
import {
  correctionReadingGuideCopy,
  difficultyAdjustmentLabel,
  historyNavigationLabel,
  quizProgressActionLabel,
  quizQuestionTypeLabel,
} from "./quizPagePresentation";

/**
 *
 * @param root0
 * @param root0.viewModel
 */
export default function QuizPageView({ viewModel }) {
  const {
    adaptiveOutcome,
    activateSelectedBlankFormula,
    answer,
    canSubmit,
    correction,
    correctionRequired,
    difficultyChange,
    difficultyToast,
    dismissIdleSupport,
    feedbackOutcome,
    fillInputModesByQuestion,
    formulaFocusRequest,
    goNext,
    grading,
    gradingError,
    handleAnswerChange,
    handleImageChange,
    hasCompleteIntervention,
    helpContext,
    historyResume,
    idleSupportEligible,
    idleSupportQuestionId,
    image,
    index,
    interventionButtonRef,
    isPost,
    isReview,
    knowledgePointName,
    lessonTitle,
    masteryFeedback,
    moveForwardFromHistory,
    onExit,
    onLearnAgain,
    postHeaderActions,
    preHeaderActions,
    progress,
    progressAction,
    question,
    resetIdleSupport,
    reviewKnowledgePoint,
    scratchPaperResetKey,
    scratchPaperScope,
    sequenceComplete,
    selectedFillBlankIndex,
    setSelectedFillBlankIndex,
    skipPreAssessmentQuestion,
    submit,
    submitting,
    viewPreviousQuestion,
    viewingHistory,
  } = viewModel;
  const correctionReadingGuide = correctionReadingGuideCopy();
  return (
    <AppShell
      title={isPost ? `${lessonTitle} · ${knowledgePointName}` : lessonTitle}
      eyebrow={
        isPost
          ? undefined
          : trans("adaptiveLearning.quiz.preAssessment", "课前小测")
      }
      actions={isPost ? postHeaderActions : preHeaderActions}
      progress={isPost ? undefined : progress}
      onBack={onExit}
      headerClassName={`quiz-page-header${isPost ? " quiz-header" : ""}`}
      compact
    >
      <div className="quiz-wrap">
        {difficultyToast && (
          <div
            className={`adaptive-difficulty-toast ${difficultyToast.direction === "up" ? "up" : "down"}`}
            role="status"
            aria-live="polite"
          >
            <strong>
              {difficultyToast.from} <span aria-hidden="true">→</span>{" "}
              {difficultyToast.to}
            </strong>
            <span>{difficultyAdjustmentLabel(difficultyToast.direction)}</span>
          </div>
        )}
        <article
          className={`question-card${question.type === "short_answer" ? " subjective-question-card" : ""}${grading ? " is-graded" : ""}`}
        >
          <div className="question-card-heading">
            <div className="question-card-identity">
              <span className="question-number-badge">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <strong>{quizQuestionTypeLabel(question.type)}</strong>
              </div>
            </div>
            <div className="question-heading-actions">
              <DifficultyBadge
                difficulty={question.difficulty}
                variant="stars"
              />
              <div
                className="question-work-tools"
                aria-label={trans(
                  "adaptiveLearning.quiz.answerTools",
                  "答题工具",
                )}
              >
                <ScratchPaper
                  key={`${scratchPaperScope}:${scratchPaperResetKey}`}
                  sessionScope={scratchPaperScope}
                  onActivity={resetIdleSupport}
                  triggerVariant="inline"
                />
                {question.type === "fill_blank" && (
                  <button
                    className="question-work-tool"
                    type="button"
                    disabled={
                      selectedFillBlankIndex === null ||
                      Boolean(grading) ||
                      submitting ||
                      viewingHistory
                    }
                    onClick={activateSelectedBlankFormula}
                    title={trans(
                      selectedFillBlankIndex === null
                        ? "adaptiveLearning.quiz.selectBlankBeforeFormula"
                        : "adaptiveLearning.quiz.formulaForSelectedBlank",
                      selectedFillBlankIndex === null
                        ? "请先选择一个填空"
                        : "为所选填空输入公式",
                    )}
                  >
                    <Sigma size={17} aria-hidden="true" />
                    <span>
                      {trans("adaptiveLearning.quiz.formula", "公式")}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
          {question.type === "short_answer" &&
            !canUseQuestionPlatformPlayer(question) && (
              <MathContent as="h1" renderKey={question.stem}>
                {question.stem}
              </MathContent>
            )}
          <QuestionAnswer
            question={question}
            value={answer}
            onChange={handleAnswerChange}
            fillInputModes={fillInputModesByQuestion[question.id] || []}
            selectedFillBlankIndex={selectedFillBlankIndex}
            onFillBlankSelect={setSelectedFillBlankIndex}
            formulaFocusRequest={formulaFocusRequest}
            image={image}
            onImageChange={handleImageChange}
            disabled={Boolean(grading) || submitting}
            grading={isPost ? grading : null}
          />
          {correction?.questionId === question.id &&
            hasConfirmedCorrectionReading(correction) &&
            !grading && (
              <p className="correction-reading-reminder" role="status">
                <BookOpenCheck size={16} aria-hidden="true" />
                {correctionReadingGuide.reminder}
              </p>
            )}

          {gradingError && (
            <div className="feedback error" role="alert">
              <strong>
                {trans(
                  "adaptiveLearning.quiz.gradingUnavailable",
                  "暂时没能完成批改",
                )}
              </strong>
              <p>
                {trans(
                  "adaptiveLearning.quiz.gradingUnavailableDetail",
                  "请稍后重试，当前答案会继续保留。",
                )}
              </p>
            </div>
          )}
          {grading && (
            <QuestionFeedbackCard
              grading={grading}
              questionType={question.type}
              outcomeTone={feedbackOutcome}
              diagnostic={!isPost}
              difficultyChange={difficultyChange}
              adaptiveOutcome={adaptiveOutcome}
              needsIntervention={hasCompleteIntervention}
              masteryFeedback={isPost ? masteryFeedback : []}
              practiceGate={isPost && !isReview ? adaptiveOutcome : null}
              practiceSummary={isPost && sequenceComplete}
            />
          )}
          {correctionRequired &&
            correction?.questionId === question.id &&
            !hasConfirmedCorrectionReading(correction) && (
              <section
                className="correction-reading-card"
                aria-labelledby="correction-reading-title"
              >
                <span className="correction-reading-icon" aria-hidden="true">
                  <BookOpenCheck size={20} />
                </span>
                <div>
                  <h2 id="correction-reading-title">
                    {correctionReadingGuide.title}
                  </h2>
                  <p>{correctionReadingGuide.description}</p>
                </div>
              </section>
            )}
          {grading?.showAnswer && isPost && !grading.correct && (
            <QuestionReferenceAnswer
              question={question}
              correctAnswer={grading.correctAnswer}
              correctAnswerText={displayCorrectAnswer(question, grading)}
              correctAnswerLabel={trans(
                "adaptiveLearning.quiz.correctAnswer",
                "正确答案",
              )}
              analysis={
                grading.analysis ||
                trans("adaptiveLearning.quiz.noAnalysis", "暂无解析")
              }
            />
          )}
        </article>

        <div className="quiz-action">
          <div className="quiz-action-start">
            {isPost && <StudentHelpRequest context={helpContext} />}
            {viewingHistory && (
              <span>
                {trans(
                  "adaptiveLearning.quiz.viewingHistory",
                  "正在查看第 {$index} 题的作答记录",
                  { index: index + 1 },
                )}
              </span>
            )}
          </div>
          <div className="quiz-action-secondary">
            {index > 0 && (
              <button
                className="neutral-button"
                type="button"
                onClick={viewPreviousQuestion}
              >
                <ChevronLeft size={17} />
                {trans("adaptiveLearning.quiz.previousQuestion", "上一题")}
              </button>
            )}
            {isPost && onLearnAgain && !grading && !viewingHistory && (
              <button
                className="neutral-button"
                type="button"
                onClick={() => reviewKnowledgePoint("permanent_action")}
              >
                {trans(
                  "adaptiveLearning.quiz.reviewKnowledgePoint",
                  "回顾这个知识点",
                )}
              </button>
            )}
            {!isPost && !grading && !viewingHistory && !canSubmit && (
              <button
                className="neutral-button"
                type="button"
                disabled={submitting}
                onClick={skipPreAssessmentQuestion}
              >
                {trans(
                  "adaptiveLearning.quiz.skipQuestion",
                  "我不会做，跳过本题",
                )}
              </button>
            )}
          </div>
          {viewingHistory ? (
            <button
              className="primary-button large"
              type="button"
              onClick={moveForwardFromHistory}
            >
              {historyNavigationLabel(index, historyResume.current?.index)}{" "}
              <ChevronRight size={17} />
            </button>
          ) : grading ? (
            <button
              className="primary-button large"
              type="button"
              onClick={progressAction.run}
            >
              {quizProgressActionLabel(
                progressAction.kind,
                correctionReadingGuide.confirmLabel,
              )}{" "}
              <ChevronRight size={17} />
            </button>
          ) : (
            <button
              className="primary-button large"
              type="button"
              aria-busy={submitting}
              disabled={!canSubmit || submitting}
              onClick={submit}
            >
              {submitting
                ? trans("adaptiveLearning.quiz.grading", "正在批改…")
                : trans("adaptiveLearning.quiz.submitAnswer", "提交答案")}
            </button>
          )}
        </div>

        {idleSupportQuestionId === question.id && idleSupportEligible && (
          <aside
            className="question-idle-support"
            role="region"
            aria-labelledby="question-idle-support-title"
          >
            <span className="question-idle-support-icon" aria-hidden="true">
              <Lightbulb size={20} />
            </span>
            <div className="question-idle-support-copy">
              <strong id="question-idle-support-title">
                {trans("adaptiveLearning.quiz.stuckTitle", "这题卡住了吗？")}
              </strong>
              <span>
                {trans(
                  "adaptiveLearning.quiz.stuckDescription",
                  "可以先回顾「{$name}」的关键方法，当前答案会为你保留。",
                  { name: knowledgePointName },
                )}
              </span>
            </div>
            <div className="question-idle-support-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => reviewKnowledgePoint("idle_prompt")}
              >
                {trans(
                  "adaptiveLearning.quiz.reviewKnowledgePoint",
                  "回顾这个知识点",
                )}
              </button>
              <button
                className="neutral-button"
                type="button"
                onClick={dismissIdleSupport}
              >
                {trans("adaptiveLearning.quiz.keepThinking", "我再想想")}
              </button>
            </div>
            <button
              className="question-idle-support-close"
              type="button"
              aria-label={trans("adaptiveLearning.quiz.closeHint", "关闭提示")}
              onClick={dismissIdleSupport}
            >
              <X size={18} />
            </button>
          </aside>
        )}

        {grading && hasCompleteIntervention && !viewingHistory && (
          <div
            className="practice-intervention-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-intervention-title"
            aria-describedby="practice-intervention-description"
          >
            <div className="practice-intervention-mask" aria-hidden="true" />
            <section>
              <header>
                <span aria-hidden="true">
                  <MessageCircle size={22} />
                </span>
                <div>
                  <small>
                    {trans(
                      "adaptiveLearning.quiz.practicePaused",
                      "本轮练习暂停",
                    )}
                  </small>
                  <h2 id="practice-intervention-title">
                    {trans(
                      "adaptiveLearning.quiz.reviewApproachTitle",
                      "先回顾一下解题思路",
                    )}
                  </h2>
                </div>
              </header>
              <div className="practice-intervention-body">
                <p id="practice-intervention-description">
                  {trans(
                    "adaptiveLearning.quiz.interventionDescription",
                    "最近 3 题还没有达到要求。接下来和老师一起找出共同问题，再回来完成一道新题验证。",
                  )}
                </p>
                <div>
                  <span>
                    {trans("adaptiveLearning.quiz.reviewContent", "回顾内容")}
                  </span>
                  <strong>{knowledgePointName}</strong>
                </div>
              </div>
              <footer>
                <button
                  ref={interventionButtonRef}
                  className="primary-button"
                  type="button"
                  onClick={() => goNext()}
                >
                  {trans("adaptiveLearning.quiz.enterReview", "进入错题回顾")}{" "}
                  <ChevronRight size={16} />
                </button>
              </footer>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

QuizPageView.propTypes = {
  viewModel: PropTypes.shape({
    adaptiveOutcome: PropTypes.object,
    activateSelectedBlankFormula: PropTypes.func.isRequired,
    answer: PropTypes.any,
    canSubmit: PropTypes.bool.isRequired,
    correction: PropTypes.object,
    correctionRequired: PropTypes.bool.isRequired,
    difficultyChange: PropTypes.object,
    difficultyToast: PropTypes.object,
    dismissIdleSupport: PropTypes.func.isRequired,
    feedbackOutcome: PropTypes.object,
    fillInputModesByQuestion: PropTypes.object.isRequired,
    formulaFocusRequest: PropTypes.number.isRequired,
    goNext: PropTypes.func.isRequired,
    grading: PropTypes.object,
    gradingError: PropTypes.string,
    handleAnswerChange: PropTypes.func.isRequired,
    handleImageChange: PropTypes.func.isRequired,
    hasCompleteIntervention: PropTypes.bool.isRequired,
    helpContext: PropTypes.object,
    historyResume: PropTypes.object.isRequired,
    idleSupportEligible: PropTypes.bool.isRequired,
    idleSupportQuestionId: PropTypes.string,
    image: PropTypes.object,
    index: PropTypes.number.isRequired,
    interventionButtonRef: PropTypes.object.isRequired,
    isPost: PropTypes.bool.isRequired,
    isReview: PropTypes.bool.isRequired,
    knowledgePointName: PropTypes.string,
    lessonTitle: PropTypes.string.isRequired,
    masteryFeedback: PropTypes.array.isRequired,
    moveForwardFromHistory: PropTypes.func.isRequired,
    onExit: PropTypes.func.isRequired,
    onLearnAgain: PropTypes.func,
    postHeaderActions: PropTypes.node,
    preHeaderActions: PropTypes.node,
    progress: PropTypes.number,
    progressAction: PropTypes.shape({
      kind: PropTypes.string.isRequired,
      run: PropTypes.func.isRequired,
    }).isRequired,
    question: quizQuestionPropType.isRequired,
    resetIdleSupport: PropTypes.func.isRequired,
    reviewKnowledgePoint: PropTypes.func.isRequired,
    scratchPaperResetKey: PropTypes.number.isRequired,
    scratchPaperScope: PropTypes.string.isRequired,
    sequenceComplete: PropTypes.bool.isRequired,
    selectedFillBlankIndex: PropTypes.number,
    setSelectedFillBlankIndex: PropTypes.func.isRequired,
    skipPreAssessmentQuestion: PropTypes.func.isRequired,
    submit: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    viewPreviousQuestion: PropTypes.func.isRequired,
    viewingHistory: PropTypes.bool.isRequired,
  }).isRequired,
};
