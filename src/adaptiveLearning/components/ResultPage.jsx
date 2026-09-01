import React, { useState } from "react";

import { trans } from "../../utils/i18n";
import { questionResultState } from "../shared/domain/questionResult.js";
import { localizedQuestionResult } from "../shared/presentation/questionResultPresentation";
import { formatMasteryDelta } from "../student/domain/masteryFeedback.js";
import {
  aiGeneratedErrorReason,
  aiGeneratedImprovements,
} from "../student/domain/questionFeedback.js";
import AppShell from "./AppShell";
import { Check, ChevronLeft } from "./Icons";
import MathContent from "./MathContent";
import QuestionReviewDisplay from "./QuestionReviewDisplay";
import { localizedFeedbackItems } from "./question-feedback/questionFeedbackPresentation";
import {
  resultAnswerCopy,
  resultAuthorityPresentation,
  resultPhaseLabel,
  resultQuestionStateLabel,
  shouldShowResultValues,
} from "./result-page/resultPagePresentation";

import "../classroom-assessment.css";

/**
 *
 * @param value
 */
function percent(value) {
  return value == null || !Number.isFinite(Number(value))
    ? "—"
    : `${Math.round(Number(value))}%`;
}

/**
 *
 * @param attempt
 */
function attemptAccuracy(attempt) {
  if (attempt?.scoreRatio != null)
    return Math.round(Number(attempt.scoreRatio) * 100);
  const score = Number(attempt?.score);
  const maxScore = Number(attempt?.maxScore);
  return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
    ? Math.round((score / maxScore) * 100)
    : null;
}

/**
 *
 * @param question
 * @param attempt
 */
function displayAnswer(question, attempt) {
  const copy = resultAnswerCopy();
  if (attempt?.answerImageName)
    return attempt.recognizedAnswer || attempt.answer || copy.imageAnswer;
  const values = Array.isArray(attempt?.answer)
    ? attempt.answer
    : [attempt?.answer];
  const optionById = Object.fromEntries(
    (question.options || []).map((option) => [
      typeof option === "string" ? option : option.id,
      typeof option === "string" ? option : option.text,
    ]),
  );
  return (
    values
      .filter(Boolean)
      .map((value) => optionById[value] || value)
      .join(copy.separator) || copy.unanswered
  );
}

/**
 *
 * @param question
 * @param attempt
 * @param answerReviewStatus
 */
function displayCorrectAnswer(question, attempt, answerReviewStatus = "ready") {
  const copy = resultAnswerCopy();
  const answer = attempt?.correctAnswer ?? question.answer;
  const values = Array.isArray(answer) ? answer : [answer];
  const optionById = Object.fromEntries(
    (question.options || []).map((option) => [
      typeof option === "string" ? option : option.id,
      typeof option === "string" ? option : option.text,
    ]),
  );
  const text = values
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map((value) => optionById[value] || value)
    .join(copy.separator);
  if (text) return text;
  if (answerReviewStatus === "loading") return copy.answerLoading;
  if (answerReviewStatus === "failed") return copy.answerLoadFailed;
  return copy.answerUnavailable;
}

/**
 *
 * @param attempt
 */
function questionState(attempt) {
  const ratio = attemptAccuracy(attempt);
  return questionResultState(ratio == null ? null : ratio / 100);
}

/**
 *
 * @param root0
 * @param root0.items
 * @param root0.selectedIndex
 * @param root0.onSelect
 */
function ReviewQuestionIndex({ items, selectedIndex, onSelect }) {
  const reviewCount = items.filter(
    ({ attempt }) => questionState(attempt) !== "correct",
  ).length;
  return (
    <section
      className="result-question-report"
      aria-label={trans("adaptiveLearning.result.roundQuestions", "本轮题目")}
    >
      <header>
        <div>
          <h2>{trans("adaptiveLearning.result.roundQuestions", "本轮题目")}</h2>
        </div>
        <strong>
          {reviewCount
            ? trans(
                "adaptiveLearning.result.questionsToReview",
                "{$count} 题需要再看",
                { count: reviewCount },
              )
            : trans("adaptiveLearning.result.noIncorrectQuestions", "本轮没有错题")}
        </strong>
      </header>
      <div
        className="result-question-index"
        role="list"
        aria-label={trans(
          "adaptiveLearning.result.questionNavigation",
          "题目导航",
        )}
      >
        {items.map(({ question, attempt }, index) => {
          const state = questionState(attempt);
          return (
            <button
              key={question.id}
              type="button"
              role="listitem"
              className={`result-question-index-button ${state}${selectedIndex === index ? " selected" : ""}`}
              aria-label={trans(
                "adaptiveLearning.result.questionStateAria",
                "第 {$index} 题，{$state}",
                {
                  index: index + 1,
                  state: resultQuestionStateLabel(state),
                },
              )}
              aria-pressed={selectedIndex === index}
              onClick={() => onSelect(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div
        className="result-question-legend"
        aria-label={trans(
          "adaptiveLearning.result.questionLegend",
          "题目状态图例",
        )}
      >
        <span>
          <i className="correct" />
          {resultQuestionStateLabel("correct")}
        </span>
        <span>
          <i className="partial" />
          {resultQuestionStateLabel("partial")}
        </span>
        <span>
          <i className="incorrect" />
          {resultQuestionStateLabel("incorrect")}
        </span>
        <span>
          <i className="pending" />
          {resultQuestionStateLabel("pending")}
        </span>
      </div>
    </section>
  );
}

/**
 *
 * @param root0
 * @param root0.lesson
 * @param root0.items
 * @param root0.index
 * @param root0.masteryTraceByQuestionId
 * @param root0.onBack
 * @param root0.onSelect
 * @param root0.answerReviewStatus
 */
function ResultQuestionDetail({
  lesson,
  items,
  index,
  masteryTraceByQuestionId,
  onBack,
  onSelect,
  answerReviewStatus,
}) {
  const item = items[index];
  if (!item) return null;
  const { question, attempt } = item;
  const ratio = attemptAccuracy(attempt);
  const state = questionState(attempt);
  const traces = masteryTraceByQuestionId[question.id] || [];
  const errorReason = aiGeneratedErrorReason(question.type, attempt);
  const improvement = localizedFeedbackItems(
    aiGeneratedImprovements(question.type, attempt),
  );
  return (
    <AppShell
      title={lesson.title}
      eyebrow={trans("adaptiveLearning.result.answerDetail", "作答详情")}
      onBack={onBack}
      compact
    >
      <div className="result-detail-wrap">
        <header className="result-detail-header">
          <div>
            <span>
              {trans(
                "adaptiveLearning.result.questionPosition",
                "第 {$index} 题 / 共 {$total} 题",
                { index: index + 1, total: items.length },
              )}{" "}
              · {resultPhaseLabel(question)}
            </span>
            <h1>{trans("adaptiveLearning.result.answerDetail", "作答详情")}</h1>
          </div>
          <strong className={state}>
            {localizedQuestionResult(
              ratio == null ? null : ratio / 100,
              "unanswered",
            )}
          </strong>
        </header>
        <ReviewQuestionIndex
          items={items}
          selectedIndex={index}
          onSelect={onSelect}
        />
        <section
          className="result-detail-card"
          aria-label={trans(
            "adaptiveLearning.result.questionAnswerDetail",
            "题目与答案详情",
          )}
        >
          <span className="detail-section-label">
            {trans("adaptiveLearning.result.questionAndAnswer", "题目与作答")}
          </span>
          <QuestionReviewDisplay
            question={question}
            studentAnswer={attempt?.answer}
            studentAnswerText={displayAnswer(question, attempt)}
            correctAnswer={attempt?.correctAnswer ?? question.answer}
            correctAnswerText={displayCorrectAnswer(
              question,
              attempt,
              answerReviewStatus,
            )}
            analysis={attempt?.analysis}
          />
          {errorReason && (
            <div className="result-detail-feedback error-reason">
              <span>
                {trans("adaptiveLearning.feedback.errorReason", "错误原因")}
              </span>
              <MathContent as="p" renderKey={errorReason}>
                {errorReason}
              </MathContent>
            </div>
          )}
          {improvement && (
            <div className="result-detail-feedback">
              <span>
                {trans("adaptiveLearning.feedback.improvement", "修改建议")}
              </span>
              <MathContent as="p" renderKey={improvement}>
                {improvement}
              </MathContent>
            </div>
          )}
          {traces.length > 0 && (
            <div className="result-detail-evidence">
              {traces.map((trace) => {
                const delta =
                  trace.masteryDelta == null
                    ? Number(trace.masteryAfter) - Number(trace.masteryBefore)
                    : Number(trace.masteryDelta);
                const confidence = Number(trace.confidenceAfter);
                return (
                  <div key={trace.knowledgePointId}>
                    <span>
                      {trace.knowledgePointName || trace.knowledgePointId}
                    </span>
                    <strong className={delta < 0 ? "down" : "up"}>
                      {formatMasteryDelta(delta, "—")}
                    </strong>
                    <small>
                      {Number.isFinite(Number(trace.masteryAfter))
                        ? trans(
                            "adaptiveLearning.result.masteryValue",
                            "掌握度 {$value}%",
                            { value: Math.round(Number(trace.masteryAfter)) },
                          )
                        : trans(
                            "adaptiveLearning.result.masteryPending",
                            "掌握度待补充",
                          )}
                      {Number.isFinite(confidence)
                        ? trans(
                            "adaptiveLearning.result.confidenceSuffix",
                            " · 置信度 {$value}%",
                            { value: Math.round(confidence) },
                          )
                        : ""}
                    </small>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <div className="result-detail-action">
          <button
            className="primary-button large"
            type="button"
            onClick={onBack}
          >
            <ChevronLeft size={18} />{" "}
            {trans("adaptiveLearning.result.backToReport", "返回学习报告")}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

/**
 *
 * @param root0
 * @param root0.lesson
 * @param root0.knowledgePoints
 * @param root0.result
 * @param root0.resultMode
 * @param root0.questions
 * @param root0.attempts
 * @param root0.masteryTraceByQuestionId
 * @param root0.reportError
 * @param root0.sessionType
 * @param root0.onRestart
 * @param root0.answerReviewStatus
 * @param root0.pendingSyncCount
 * @param root0.scoreState
 */
export default function ResultPage({
  lesson,
  knowledgePoints,
  result,
  resultMode = "offline_preview",
  questions = [],
  attempts = {},
  masteryTraceByQuestionId = {},
  reportError = "",
  sessionType = "lesson",
  onRestart,
  answerReviewStatus = "ready",
  pendingSyncCount = 0,
  scoreState,
}) {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  const determined = Object.values(result || {}).filter(
    (item) => item?.mastery != null,
  );
  const overall =
    determined.length > 0
      ? Math.round(
          determined.reduce((sum, item) => sum + Number(item.mastery), 0) /
            determined.length,
        )
      : null;
  const confidenceValues = determined
    .map((item) => Number(item.confidence))
    .filter(Number.isFinite);
  const overallConfidence =
    confidenceValues.length > 0
      ? Math.round(
          confidenceValues.reduce(
            (sum, value) => sum + (value <= 1 ? value * 100 : value),
            0,
          ) / confidenceValues.length,
        )
      : null;
  const answeredQuestions = questions.filter(
    (question, index, list) =>
      attempts[question.id] &&
      list.findIndex((item) => item.id === question.id) === index,
  );
  const orderedQuestions = [...answeredQuestions].sort((a, b) => {
    const aTime = Date.parse(attempts[a.id]?.submittedAt || "");
    const bTime = Date.parse(attempts[b.id]?.submittedAt || "");
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime)
      return aTime - bTime;
    return questions.indexOf(a) - questions.indexOf(b);
  });
  const validAccuracies = answeredQuestions
    .map((question) => attemptAccuracy(attempts[question.id]))
    .filter((value) => value != null);
  const overallCorrectRate =
    validAccuracies.length > 0
      ? Math.round(
          validAccuracies.reduce((sum, value) => sum + value, 0) /
            validAccuracies.length,
        )
      : null;
  const overallBeforeValues = determined
    .map((item) => Number(item.preMastery))
    .filter(Number.isFinite);
  const overallBefore =
    overallBeforeValues.length > 0
      ? Math.round(
          overallBeforeValues.reduce((sum, value) => sum + value, 0) /
            overallBeforeValues.length,
        )
      : null;
  const overallDelta =
    overall != null && overallBefore != null ? overall - overallBefore : null;
  const isAuthoritative = resultMode === "authoritative";
  const showResultValues = shouldShowResultValues({
    isAuthoritative,
    scoreState,
  });
  const authorityPresentation = resultAuthorityPresentation({
    isAuthoritative,
    scoreState,
    pendingSyncCount,
  });

  if (selectedQuestionIndex != null) {
    return (
      <ResultQuestionDetail
        lesson={lesson}
        items={orderedQuestions.map((question) => ({
          question,
          attempt: attempts[question.id],
        }))}
        index={selectedQuestionIndex}
        masteryTraceByQuestionId={masteryTraceByQuestionId}
        answerReviewStatus={answerReviewStatus}
        onBack={() => setSelectedQuestionIndex(null)}
        onSelect={setSelectedQuestionIndex}
      />
    );
  }

  return (
    <AppShell
      title={lesson.title}
      eyebrow={
        sessionType === "enhancement_training"
          ? trans(
              "adaptiveLearning.result.enhancementTrainingComplete",
              "提升训练完成",
            )
          : trans("adaptiveLearning.result.learningComplete", "学习完成")
      }
      compact
    >
      <div className="result-wrap">
        <section className="result-report-hero">
          <div className="complete-mark">
            <Check size={24} />
          </div>
          <div className="result-report-hero-copy">
            <span>
              {sessionType === "enhancement_training"
                ? trans(
                    "adaptiveLearning.result.enhancementRoundComplete",
                    "这一轮提升训练完成",
                  )
                : trans(
                    "adaptiveLearning.result.lessonComplete",
                    "这一课完成了",
                  )}
            </span>
            <h1>{lesson.title}</h1>
            <p>
              {overall == null
                ? trans(
                    "adaptiveLearning.result.moreEvidenceNeeded",
                    "本轮还需要更多有效作答。",
                  )
                : sessionType === "enhancement_training"
                  ? trans(
                      "adaptiveLearning.result.enhancementDescription",
                      "这次训练用于巩固变式与迁移能力。",
                    )
                  : trans(
                      "adaptiveLearning.result.lessonDescription",
                      "你已经完成一次有效学习，复习错题会更稳。",
                    )}
            </p>
          </div>
          <div className="result-report-hero-count">
            <strong>{orderedQuestions.length}</strong>
            <span>
              {trans("adaptiveLearning.result.questionsCompleted", "题已完成")}
            </span>
          </div>
        </section>

        <section
          className={`method-note result-authority-note ${isAuthoritative ? "authoritative" : "preview"}`}
          role="status"
        >
          <strong>
            {authorityPresentation.label}
          </strong>
          <p>{authorityPresentation.description}</p>
        </section>

        <section
          className="result-report-metrics"
          aria-label={trans(
            "adaptiveLearning.result.lessonPerformance",
            "整课学习表现",
          )}
        >
          <div>
            <span>{trans("adaptiveLearning.result.answers", "本次作答")}</span>
            <strong>
              {orderedQuestions.length}
              <small>{trans("adaptiveLearning.result.questionUnit", "题")}</small>
            </strong>
          </div>
          <div>
            <span>{trans("adaptiveLearning.result.scoreRate", "得分率")}</span>
            <strong>
              {showResultValues ? percent(overallCorrectRate) : "—"}
            </strong>
          </div>
          <div>
            <span>{trans("adaptiveLearning.result.masteryRate", "掌握率")}</span>
            <strong>{showResultValues ? percent(overall) : "—"}</strong>
          </div>
          <div>
            <span>{trans("adaptiveLearning.result.confidence", "置信度")}</span>
            <strong>
              {showResultValues ? percent(overallConfidence) : "—"}
            </strong>
          </div>
        </section>

        {showResultValues && (
          <section
            className="result-report-mastery"
            aria-label={trans(
              "adaptiveLearning.result.lessonMasteryChange",
              "整课掌握度变化",
            )}
          >
            <header>
              <div>
                <span>
                  {trans("adaptiveLearning.result.lessonMastery", "整课掌握度")}
                </span>
                <h2>{percent(overall)}</h2>
              </div>
              {overallDelta != null && (
                <strong className={overallDelta < 0 ? "down" : ""}>
                  {overallDelta >= 0 ? "+" : ""}
                  {overallDelta.toFixed(1)}%
                </strong>
              )}
            </header>
            <div className="result-report-progress">
              <span
                style={{
                  width: `${Math.max(0, Math.min(100, overall || 0))}%`,
                }}
              />
              {overallBefore != null && (
                <i
                  style={{
                    left: `${Math.max(0, Math.min(100, overallBefore))}%`,
                  }}
                />
              )}
            </div>
            <div className="result-report-progress-labels">
              <span>
                {trans(
                  "adaptiveLearning.result.beforeLearning",
                  "学习前 {$value}",
                  { value: percent(overallBefore) },
                )}
              </span>
              <span>
                {trans(
                  "adaptiveLearning.result.afterLearning",
                  "学习后 {$value}",
                  { value: percent(overall) },
                )}
              </span>
            </div>
          </section>
        )}

        <section className="result-list result-report-knowledge-points">
          <div className="result-list-heading">
            <h1>
              {trans("adaptiveLearning.result.masteryChange", "掌握变化")}
            </h1>
            <span>
              {trans(
                "adaptiveLearning.result.preToCurrent",
                "课前小测 → 本次学习",
              )}
            </span>
          </div>
          {knowledgePoints.map((kp) => {
            const item = result[kp.id];
            return (
              <div className="result-row" key={kp.id}>
                <div className="result-name">
                  <strong>{kp.name}</strong>
                  <small>
                    {item?.mastery == null
                      ? trans(
                          "adaptiveLearning.result.masteryConfidencePending",
                          "掌握度待补充 · 置信度待补充",
                        )
                      : showResultValues
                        ? trans(
                            isAuthoritative
                              ? "adaptiveLearning.result.authoritativeMasterySummary"
                              : "adaptiveLearning.result.masterySummary",
                            isAuthoritative
                              ? "掌握度 {$mastery}% · 有效证据 {$evidence} · 置信度 {$confidence}"
                              : "掌握度 {$mastery}% · 置信度 {$confidence}",
                            {
                              mastery: item.mastery,
                              evidence: item.evidenceCount || 0,
                              confidence:
                                item.confidence == null
                                  ? trans(
                                      "adaptiveLearning.result.pending",
                                      "待补充",
                                    )
                                  : `${Math.round(Number(item.confidence) <= 1 ? Number(item.confidence) * 100 : Number(item.confidence))}%`,
                            },
                          )
                        : trans(
                            "adaptiveLearning.result.awaitingTeacherReview",
                            "等待老师确认后展示",
                          )}
                  </small>
                </div>
                <div className="mastery-before">
                  {item?.preMastery == null
                    ? "—"
                    : trans(
                        "adaptiveLearning.result.beforeMastery",
                        "学前 {$value}%",
                        { value: item.preMastery },
                      )}
                </div>
                <div className="result-arrow">→</div>
                <div className="mastery-after">
                  {!showResultValues || item?.mastery == null
                    ? "—"
                    : trans(
                        "adaptiveLearning.result.afterMastery",
                        "学后 {$value}%",
                        { value: item.mastery },
                      )}
                </div>
              </div>
            );
          })}
        </section>

        {reportError && (
          <p className="result-sync-warning result-report-sync-warning">
            {trans(
              "adaptiveLearning.result.reportUnavailable",
              "最新课堂结算暂未同步，请稍后重试。",
            )}
          </p>
        )}

        <ReviewQuestionIndex
          items={orderedQuestions.map((question) => ({
            question,
            attempt: attempts[question.id],
          }))}
          selectedIndex={null}
          onSelect={setSelectedQuestionIndex}
        />

        <div className="result-action">
          <button
            className="secondary-button large"
            type="button"
            onClick={onRestart}
          >
            {trans("adaptiveLearning.result.backToLessons", "返回课时目录")}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
