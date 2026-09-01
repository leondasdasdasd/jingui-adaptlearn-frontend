/* eslint-disable complexity, sonarjs/cognitive-complexity, unicorn/no-array-reduce -- 单一提交事务保留既有评分、自适应推进和持久化顺序。 */

import {
  adjustDifficulty,
  buildInterventionEvidence,
  difficultyRank,
  evaluateKnowledgePoint,
  normalizeDifficulty,
  questionKnowledgePointId,
  selectNextAdaptiveQuestion,
} from "../../lib/adaptiveDifficulty";
import {
  playAnswerFeedbackAudio,
  prepareAnswerFeedbackAudio,
} from "../../lib/answerFeedbackAudio";
import { gradeAnswerWithFallback } from "../../lib/gradingApi";
import { calculatePostMastery, previewU1Update } from "../../lib/mastery.js";
import { MASTERY_THRESHOLD } from "../../shared/domain/masteryPolicy.js";
import { assessmentPurposeForQuestion } from "../../shared/domain/questionPurpose.js";
import { revalidationDecisionForScore } from "../../shared/domain/tutoringStateMachine";
import { createClientId } from "../../shared/infrastructure/clientId";
import { enqueueAnswerSubmission } from "../../student/data/classroomSyncRepository";
import {
  masteryFeedbackForQuestion,
  questionKnowledgePointIds,
} from "../../student/domain/masteryFeedback.js";
import { requiresQuestionRetry } from "../../student/domain/questionFeedback";
import {
  correctionAttemptMetadata,
  correctionEncouragementId,
  shouldRequestCorrection,
} from "../../student/domain/realtimeCorrection.js";
import { compositeReviewOutcome, practiceGateOutcome } from "./model";

/**
 *
 * @param context
 */
export default function createQuizSubmit(context) {
  const {
    answer,
    attempts,
    buildPreTransition,
    canSubmit,
    completedKpIds,
    correction,
    image,
    index,
    isPost,
    isReview,
    knowledgePointName,
    knowledgePoints,
    lessonTitle,
    liveMasteryByKp,
    masteryPrior,
    masteryQuestions,
    mode,
    onRevalidationComplete,
    order,
    persistDraft,
    priorAttempts,
    question,
    questions,
    recordQuizEvent,
    revalidationKnowledgePointId,
    reviewQuestions,
    selectionSeed,
    setAdaptiveOutcome,
    setAssessmentComplete,
    setAttempts,
    setCompletedKpIds,
    setCorrection,
    setDifficultyChange,
    setDifficultyToast,
    setFeedbackOutcome,
    setGrading,
    setGradingError,
    setLiveMasteryByKp,
    setMasteryFeedback,
    setOrder,
    setPendingIntervention,
    setSubmitting,
    setTargetByKp,
    startingMastery,
    submitting,
    syncCredentials,
    targetByKp,
  } = context;
  return async function submit() {
    if (!canSubmit || submitting) return;
    prepareAnswerFeedbackAudio();
    setFeedbackOutcome(null);
    setSubmitting(true);
    setGradingError("");
    try {
      const correctingCurrentQuestion = correction?.questionId === question.id;
      const rawGrade = await gradeAnswerWithFallback({
        question,
        contentVersionId: question.contentVersionId,
        answerText: answer,
        imageDataUrl: image?.dataUrl || "",
        attemptStage: correctingCurrentQuestion ? "correction" : "initial",
        priorFormalGradeReceipt: correctingCurrentQuestion
          ? correction.initialFormalGradeReceipt || ""
          : "",
      });
      const grade = {
        ...rawGrade,
        showAnswer: Boolean(
          correctingCurrentQuestion &&
          !rawGrade.correct &&
          rawGrade.correctAnswer !== undefined,
        ),
      };
      const revalidatingCurrentQuestion = Boolean(
        revalidationKnowledgePointId &&
        revalidationKnowledgePointId === questionKnowledgePointId(question),
      );
      if (
        grade.gradingStatus === "unresolved" ||
        grade.evidenceEligible === false
      ) {
        setGrading(grade);
        setDifficultyChange(null);
        setDifficultyToast(null);
        setAdaptiveOutcome(null);
        setPendingIntervention(null);
        return;
      }
      if (requiresQuestionRetry(grade)) {
        if (grade.answerQuality === "off_task") {
          recordQuizEvent({
            type: "off_task_answer",
            mode,
            lessonTitle,
            questionId: question.id,
            knowledgePointId: questionKnowledgePointId(question),
            stem: question.stem,
            answer: image ? "[图片作答]" : answer,
            score: grade.score,
            maxScore: grade.maxScore,
            feedback: grade.feedback,
            offTaskConfidence: Number(
              grade.confidence ?? grade.itemConfidence ?? 0.9,
            ),
            reasonCode: grade.reasonCode || "ANSWER_NOT_RELEVANT",
            questionSnapshot: {
              id: question.id,
              stem: question.stem,
              type: question.type,
              difficulty: question.difficulty,
            },
            answerSnapshot: {
              text: image
                ? grade.recognizedAnswer || "[图片作答]"
                : Array.isArray(answer)
                  ? answer.join("、")
                  : String(answer || ""),
              imageName: image?.name || "",
            },
          });
        }
        setGrading(grade);
        setDifficultyChange(null);
        setDifficultyToast(null);
        setAdaptiveOutcome(null);
        setPendingIntervention(null);
        return;
      }
      if (
        shouldRequestCorrection({
          mode,
          grading: grade,
          correction,
          revalidation: revalidatingCurrentQuestion,
        })
      ) {
        setFeedbackOutcome("incorrect");
        void playAnswerFeedbackAudio(false);
        const nextCorrection = {
          questionId: question.id,
          requestedAt: new Date().toISOString(),
          initialAnswer: answer,
          initialRecognizedAnswer: grade.recognizedAnswer || "",
          initialScore: grade.score,
          initialMaxScore: grade.maxScore,
          initialScoreRatio: grade.scoreRatio,
          initialFormalGradeReceipt: grade.formalGradeReceipt || "",
          encouragementId: correctionEncouragementId(question.id),
        };
        setCorrection(nextCorrection);
        setGrading({
          ...grade,
          correctAnswer: undefined,
          analysis: undefined,
          showAnswer: false,
          correctionRequired: true,
        });
        setDifficultyChange(null);
        setDifficultyToast(null);
        setAdaptiveOutcome(null);
        setPendingIntervention(null);
        setMasteryFeedback([]);
        persistDraft(
          attempts,
          order,
          targetByKp,
          index,
          completedKpIds,
          answer,
          image,
          {
            correction: nextCorrection,
          },
        );
        recordQuizEvent({
          type: "answer_correction_requested",
          mode,
          lessonTitle,
          questionId: question.id,
          knowledgePointId: questionKnowledgePointId(question),
          score: grade.score,
          maxScore: grade.maxScore,
          scoreRatio: grade.scoreRatio,
          answerQuality: grade.answerQuality,
        });
        return;
      }
      let attempt = {
        clientSubmissionId: createClientId(),
        answer,
        answerImageName: image?.name || "",
        submittedAt: new Date().toISOString(),
        ...grade,
        ...correctionAttemptMetadata(
          correctingCurrentQuestion ? correction : null,
          answer,
          grade,
        ),
      };
      setFeedbackOutcome(grade.correct === true ? "correct" : "incorrect");
      void playAnswerFeedbackAudio(grade.correct === true);
      if (isPost) {
        const candidateAttempts = { ...attempts, [question.id]: attempt };
        const replayQuestions = [...masteryQuestions, ...questions].filter(
          (item, itemIndex, list) =>
            item?.id &&
            list.findIndex((candidate) => candidate.id === item.id) ===
              itemIndex,
        );
        const recalculatedMastery = calculatePostMastery(
          replayQuestions,
          { ...priorAttempts, ...candidateAttempts },
          knowledgePoints,
          masteryPrior,
        );
        const previewByKnowledgePoint = Object.fromEntries(
          questionKnowledgePointIds(question).map((knowledgePointId) => {
            const result = recalculatedMastery[knowledgePointId];
            const trace = [...(result?.trace || [])]
              .reverse()
              .find((item) => item.questionId === question.id);
            const preview = trace
              ? {
                  ...trace,
                  masteryAfter: result.mastery,
                  confidenceAfter: result.confidence,
                  lowerBound: result.lowerBound,
                  upperBound: result.upperBound,
                  correctStreak: result.correctStreak,
                  algorithmVersion: result.algorithmVersion,
                  isPreview: true,
                }
              : previewU1Update({
                  question,
                  attempt,
                  previous: liveMasteryByKp[knowledgePointId] || {},
                  knowledgePointId,
                });
            return [knowledgePointId, preview];
          }),
        );
        attempt = { ...attempt, u1Preview: previewByKnowledgePoint };
      }
      const nextAttempts = { ...attempts, [question.id]: attempt };
      let nextMasteryFeedback = isPost
        ? masteryFeedbackForQuestion({
            question,
            attempt,
            knowledgePoints,
            previousMastery: liveMasteryByKp,
            initialMastery: startingMastery,
          })
        : [];
      let nextLiveMasteryByKp = liveMasteryByKp;
      enqueueAnswerSubmission({
        question,
        attempt,
        mode,
        image,
        credentials: syncCredentials,
      });
      recordQuizEvent({
        type: "answer_submitted",
        mode,
        lessonTitle,
        questionId: question.id,
        knowledgePointId: questionKnowledgePointId(question),
        stem: question.stem,
        answer: image ? `[图片] ${answer || ""}`.trim() : answer,
        score: grade.score,
        maxScore: grade.maxScore,
        scoreRatio: grade.scoreRatio,
        correct: grade.correct,
        feedback: grade.feedback,
        correctionAttempted: Boolean(attempt.correctionAttempted),
        correctionSucceeded: attempt.correctionSucceeded,
        initialScoreRatio: attempt.initialScoreRatio,
        difficulty: question.difficulty,
        knowledgePointIds: question.knowledgePointIds || [],
        knowledgePointWeights: question.knowledgePointWeights || {},
        sourceType: assessmentPurposeForQuestion(question, mode),
        hintUsed: Boolean(attempt.hintUsed || question.hintUsed),
        novelty: attempt.novelty || question.novelty || "NEW",
        itemQuality: attempt.itemQuality ?? question.itemQuality ?? 1,
        gradingConfidence:
          attempt.gradingConfidence ?? attempt.confidence ?? 0.9,
        blueprintSlotId:
          question.blueprintSlotId || question.preAssessmentSlotId || "",
        questionSnapshot: {
          id: question.id,
          stem: question.stem,
          type: question.type,
          difficulty: question.difficulty,
          phase: question.phase,
        },
        revalidation: Boolean(
          revalidationKnowledgePointId &&
          revalidationKnowledgePointId === questionKnowledgePointId(question),
        ),
      });
      let nextOrder = order;
      let nextTargets = targetByKp;
      let nextCompleted = completedKpIds;
      let change = null;
      let outcome = null;
      let intervention = null;
      let completeAfterCurrent = false;

      if (isPost) {
        const kpId = questionKnowledgePointId(question);
        const currentTarget = targetByKp[kpId] || question.difficulty || "D3";
        const isRevalidation = revalidationKnowledgePointId === kpId;
        const nextTarget = isReview
          ? currentTarget
          : adjustDifficulty(currentTarget, grade.scoreRatio);
        let decision = null;
        nextTargets = isReview
          ? targetByKp
          : { ...targetByKp, [kpId]: nextTarget };
        if (!isReview) {
          const latestMastery = nextMasteryFeedback.find(
            (item) => item.knowledgePointId === kpId,
          )?.after;
          decision = isRevalidation
            ? revalidationDecisionForScore(grade.scoreRatio, latestMastery)
            : evaluateKnowledgePoint({
                questions,
                attempts: nextAttempts,
                knowledgePointId: kpId,
                mastery: latestMastery,
              });
          // The U1 preview can carry a historical streak from the starting
          // mastery snapshot. Practice stability is a current-round gate, so
          // show the streak from this round's ordered attempts instead.
          nextMasteryFeedback = nextMasteryFeedback.map((item) =>
            item.knowledgePointId === kpId
              ? { ...item, correctStreak: decision.correctStreak }
              : item,
          );
          outcome = practiceGateOutcome(decision);
          if (decision.status !== "continue") {
            if (decision.status !== "needs_intervention") {
              nextCompleted = [...new Set([...completedKpIds, kpId])];
            }
            if (decision.status === "needs_intervention") {
              outcome = {
                ...decision,
                title: "先停一下，回顾思路",
                message:
                  "连续几题还没有达到要求，先和老师一起看看问题出在哪里。",
              };
            }
            if (decision.status === "needs_intervention") {
              const evidence = buildInterventionEvidence({
                questions,
                attempts: nextAttempts,
                knowledgePointId: kpId,
              });
              intervention = {
                trigger: "three_consecutive_not_passed",
                triggeredAt: new Date().toISOString(),
                knowledgePointId: kpId,
                knowledgePointName,
                evidence,
              };
            }
          }
        }
        const nextQuestion = selectNextAdaptiveQuestion({
          questions,
          attempts: nextAttempts,
          currentQuestion: question,
          targetByKp: nextTargets,
          completedKnowledgePointIds: nextCompleted,
          selectionSeed,
        });
        if (nextQuestion && !nextOrder.includes(nextQuestion.id)) {
          nextOrder = [...nextOrder, nextQuestion.id];
          if (intervention && questionKnowledgePointId(nextQuestion) === kpId) {
            intervention = {
              ...intervention,
              revalidationQuestionId: nextQuestion.id,
            };
          }
          const actualFrom = normalizeDifficulty(
            question.difficulty || currentTarget,
          );
          const actualTo = normalizeDifficulty(
            nextQuestion.difficulty || nextTarget,
          );
          const actualFromRank = difficultyRank(actualFrom);
          const actualToRank = difficultyRank(actualTo);
          const sameKnowledgePoint =
            questionKnowledgePointId(nextQuestion) === kpId;
          const expectedDirection =
            grade.scoreRatio >= 0.8
              ? "up"
              : grade.scoreRatio < 0.5
                ? "down"
                : "same";
          const actualDirection =
            actualToRank > actualFromRank
              ? "up"
              : actualToRank < actualFromRank
                ? "down"
                : "same";
          if (
            !isReview &&
            nextQuestion.phase !== "review" &&
            sameKnowledgePoint &&
            actualToRank !== actualFromRank &&
            actualDirection === expectedDirection
          ) {
            change = {
              from: actualFrom,
              to: actualTo,
              direction: actualToRank > actualFromRank ? "up" : "down",
              reason:
                actualToRank > actualFromRank
                  ? "下一题增加一点挑战"
                  : "下一题先回到基础",
            };
          }
        } else if (!nextQuestion) {
          // A depleted/legacy pool must not be reported as mastered merely
          // because there is no next item.  The U1 target is the only stop
          // condition; if the pool runs out first, surface support instead.
          completeAfterCurrent = true;
          if (isReview) {
            outcome = compositeReviewOutcome(reviewQuestions.length);
          } else if (!decision || decision.status === "continue") {
            outcome = {
              status: "needs_support",
              title: "题目已用完，还没有达到掌握目标",
              message: `本轮题目已经完成，但统一掌握度还未达到 ${MASTERY_THRESHOLD}%；请补充练习题后继续。`,
            };
          }
        }
        if (
          isRevalidation &&
          decision &&
          ["mastered", "needs_support"].includes(decision.status)
        ) {
          onRevalidationComplete?.({
            ...decision,
            questionId: question.id,
            reason:
              decision.status === "mastered"
                ? "REVALIDATION_PASSED"
                : decision.reason || "REVALIDATION_NOT_PASSED",
          });
        }
      } else {
        const transition = buildPreTransition(nextAttempts);
        nextOrder = transition.order;
        nextCompleted = transition.completedKnowledgePointIds;
        outcome = transition.outcome;
        completeAfterCurrent = transition.assessmentComplete;
        if (
          transition.nextQuestion &&
          questionKnowledgePointId(transition.nextQuestion) ===
            questionKnowledgePointId(question) &&
          difficultyRank(transition.nextQuestion.difficulty) !==
            difficultyRank(question.difficulty)
        ) {
          const from = normalizeDifficulty(question.difficulty);
          const to = normalizeDifficulty(transition.nextQuestion.difficulty);
          const fromRank = difficultyRank(from);
          const toRank = difficultyRank(to);
          change = {
            from,
            to,
            direction: toRank > fromRank ? "up" : "down",
            reason:
              toRank > fromRank ? "下一题确认迁移表现" : "下一题先检查基础",
          };
        }
      }

      if (isPost) {
        nextLiveMasteryByKp = nextMasteryFeedback.reduce(
          (result, item) => ({
            ...result,
            [item.knowledgePointId]: {
              ...result[item.knowledgePointId],
              ...(item.after == null ? {} : { mastery: item.after }),
              ...(item.confidence == null
                ? {}
                : { confidence: item.confidence }),
              ...(item.correctStreak == null
                ? {}
                : { correctStreak: item.correctStreak }),
            },
          }),
          liveMasteryByKp,
        );
      }

      setAttempts(nextAttempts);
      setOrder(nextOrder);
      setTargetByKp(nextTargets);
      setCompletedKpIds(nextCompleted);
      setGrading(attempt);
      setDifficultyChange(change);
      setDifficultyToast(change);
      setAdaptiveOutcome(outcome);
      setAssessmentComplete(completeAfterCurrent);
      setPendingIntervention(intervention);
      setMasteryFeedback(nextMasteryFeedback);
      setLiveMasteryByKp(nextLiveMasteryByKp);
      setCorrection(null);
      persistDraft(
        nextAttempts,
        nextOrder,
        nextTargets,
        index,
        nextCompleted,
        answer,
        image,
        {
          assessmentComplete: completeAfterCurrent,
          pendingIntervention: intervention,
          adaptiveOutcome: outcome,
          masteryFeedback: nextMasteryFeedback,
          liveMasteryByKp: nextLiveMasteryByKp,
          correction: null,
        },
      );
    } catch {
      // 页面只消费稳定状态，避免把服务端或网络层错误原文泄露给学生。
      setGradingError("unavailable");
    } finally {
      setSubmitting(false);
    }
  };
}
