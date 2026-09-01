import React, { useEffect, useRef, useState } from "react";

import ResultPage from "../components/ResultPage";
import { calculatePostMastery } from "../lib/mastery";
import { routes } from "../routes/routePaths";
import { useNavigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import { classroomScoreState } from "../shared/domain/classroomScoreState";
import { resultSnapshotForScope } from "../student/application/resultSnapshotScope";
import { useScopedAnswerReviews } from "../student/application/useScopedAnswerReviews";
import {
  flushClassroomOutbox,
  getClassroomOutboxStatus,
} from "../student/data/classroomSyncRepository";
import { syncKnowledgeProfileFromSession } from "../student/data/knowledgeProfileRepository";
import { settleLearningSessionSnapshot } from "../student/data/learningHistoryRepository";
import { loadStudentResultSnapshot } from "../student/data/studentResultRepository";
import {
  isAuthoritativeReportCurrent,
  mapAuthoritativeMasteryResults,
  masteryResultMode,
  mergeAttemptsWithAuthoritative,
} from "../student/domain/masteryResult";

/**
 *
 */
export default function ResultRoute() {
  const navigate = useNavigate();
  const { session, setSession } = useLearningSession();
  const isClassroom = Boolean(session.selection?.classroomAccessToken);
  const currentSessionId = session.selection?.studentSessionId || "";
  const currentAccessToken = session.selection?.classroomAccessToken || "";
  const currentSessionScope = `${currentSessionId}:${currentAccessToken}`;
  const [serverSnapshot, setServerSnapshot] = useState({
    scopeKey: "",
    status: "idle",
    report: null,
    answerRecords: [],
  });
  const activeServerSnapshot = resultSnapshotForScope(
    serverSnapshot,
    currentSessionScope,
  );
  const serverReport = activeServerSnapshot.report;
  const serverAnswerRecords = activeServerSnapshot.answerRecords;
  const reportError =
    activeServerSnapshot.status === "unavailable" ? "unavailable" : "";
  const [pendingSyncCount, setPendingSyncCount] = useState(
    () => getClassroomOutboxStatus(currentSessionId).answers,
  );
  const settledHistoryKey = useRef("");
  useEffect(() => {
    if (!isClassroom) return;
    let cancelled = false;
    const requestScope = currentSessionScope;
    const load = () =>
      loadStudentResultSnapshot({
        studentSessionId: currentSessionId,
        accessToken: currentAccessToken,
      }).then((snapshot) => {
        if (cancelled) return snapshot;
        setServerSnapshot({ ...snapshot, scopeKey: requestScope });
        return snapshot;
      });
    const sync = () =>
      flushClassroomOutbox().finally(() => {
        if (!cancelled)
          setPendingSyncCount(
            getClassroomOutboxStatus(currentSessionId).answers,
          );
      });
    void sync();
    void load();
    const timer = window.setInterval(() => {
      void sync();
      void load();
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [currentAccessToken, currentSessionId, currentSessionScope, isClassroom]);

  useEffect(() => {
    settledHistoryKey.current = "";
    setPendingSyncCount(getClassroomOutboxStatus(currentSessionId).answers);
  }, [currentSessionId, currentSessionScope]);

  const returnToDirectory = () => {
    // 学生档案和当前学习状态持续保留，返回目录只改变页面位置。
    navigate(routes.directory);
  };

  const replayedLocalResult = calculatePostMastery(
    session.postQuestions,
    session.postAttempts,
    session.selection.knowledgePoints,
    session.preMastery,
  );
  // The practice flow settles each evidence window against the latest live
  // snapshot. Prefer that result when available: flattening attempts by
  // question ID cannot represent repeated rounds that reuse the same items.
  const localResult =
    Object.keys(session.result || {}).length > 0
      ? session.result
      : replayedLocalResult;
  const serverResult = mapAuthoritativeMasteryResults(serverReport);
  const localAnswerCount =
    Object.keys(session.preAttempts || {}).length +
    Object.keys(session.postAttempts || {}).length;
  const reportIsCurrent = isAuthoritativeReportCurrent({
    report: serverReport,
    localAnswerCount,
    pendingSyncCount,
  });
  const resultMode = masteryResultMode({
    isClassroom,
    reportCurrent: reportIsCurrent,
  });
  const scoreState = classroomScoreState(
    reportIsCurrent ? serverReport?.score : null,
    resultMode,
  );
  const reportResult = reportIsCurrent
    ? Object.fromEntries(
        session.selection.knowledgePoints.map((knowledgePoint) => [
          knowledgePoint.id,
          serverResult[knowledgePoint.id] || {
            mastery: null,
            status: "INSUFFICIENT_EVIDENCE",
            evidenceCount: 0,
            confidence: 0,
          },
        ]),
      )
    : localResult;
  const reportFingerprint = reportIsCurrent
    ? `${serverReport.algorithmVersion}:${serverReport.answeredQuestionCount}:${JSON.stringify(serverReport.masteryResults)}`
    : "";
  useEffect(() => {
    if (!reportFingerprint) return;
    setSession((current) => {
      if (current.authoritativeReportFingerprint === reportFingerprint)
        return current;
      const next = {
        ...current,
        result: serverResult,
        resultSource: "authoritative",
        authoritativeReportFingerprint: reportFingerprint,
      };
      syncKnowledgeProfileFromSession(next);
      return next;
    });
    // The fingerprint changes only when a newer complete server result arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportFingerprint]);
  const serverAttempts = Object.fromEntries(
    serverAnswerRecords.map((record) => [record.questionId, record.attempt]),
  );
  const localAttempts = { ...session.preAttempts, ...session.postAttempts };
  const allAttempts = mergeAttemptsWithAuthoritative(
    localAttempts,
    serverAttempts,
  );
  const allQuestions = [...session.preQuestions, ...session.postQuestions];
  const submittedQuestionIds = [
    ...new Set(
      serverAnswerRecords.map((record) => record.questionId).filter(Boolean),
    ),
  ];
  const submittedQuestionIdsSignature = submittedQuestionIds.join(",");
  const {
    items: answerReviews,
    status: answerReviewStatus,
  } = useScopedAnswerReviews({
    contentVersionId: session.selection?.contentVersionId,
    questionIds: submittedQuestionIds,
    questionIdsSignature: submittedQuestionIdsSignature,
    studentSessionId: currentSessionId,
    accessToken: currentAccessToken,
  });
  const reviewedQuestions = allQuestions.map((question) => {
    const review = answerReviews[question.id];
    return review
      ? {
          ...question,
          answer: review.correctAnswer,
          analysis: review.analysis || question.analysis,
        }
      : question;
  });
  const reviewedAttempts = Object.fromEntries(
    Object.entries(allAttempts).map(([questionId, attempt]) => {
      const review = answerReviews[questionId];
      return [
        questionId,
        review
          ? {
              ...attempt,
              correctAnswer: attempt.correctAnswer ?? review.correctAnswer,
              analysis: attempt.analysis || review.analysis,
            }
          : attempt,
      ];
    }),
  );

  useEffect(() => {
    if (
      !session.selection?.section ||
      Object.keys(session.result || {}).length === 0
    )
      return;
    const answerCount = Object.keys(allAttempts).length;
    const key = [
      session.selection.studentSessionId,
      session.resultSource,
      answerCount,
      reportFingerprint,
      answerReviewStatus,
    ].join(":");
    if (settledHistoryKey.current === key) return;
    const serverPreAttempts = Object.fromEntries(
      serverAnswerRecords
        .filter((record) => record.purpose === "PRE")
        .map((record) => [record.questionId, record.attempt]),
    );
    const serverPostAttempts = Object.fromEntries(
      serverAnswerRecords
        .filter((record) => record.purpose !== "PRE")
        .map((record) => [record.questionId, record.attempt]),
    );
    try {
      settleLearningSessionSnapshot(
        {
          ...session,
          preQuestions: reviewedQuestions.filter(
            (question) =>
              question.assessmentMode === "pre" ||
              question.purpose?.toUpperCase() === "PRE",
          ),
          postQuestions: reviewedQuestions.filter(
            (question) =>
              question.assessmentMode !== "pre" &&
              question.purpose?.toUpperCase() !== "PRE",
          ),
          preAttempts: {
            ...session.preAttempts,
            ...Object.fromEntries(
              Object.entries(reviewedAttempts).filter(([id]) =>
                session.preQuestions.some((question) => question.id === id),
              ),
            ),
            ...serverPreAttempts,
          },
          postAttempts: {
            ...session.postAttempts,
            ...Object.fromEntries(
              Object.entries(reviewedAttempts).filter(([id]) =>
                session.postQuestions.some((question) => question.id === id),
              ),
            ),
            ...serverPostAttempts,
          },
        },
        {
          authority:
            session.resultSource === "authoritative"
              ? "authoritative"
              : "preview",
          syncStatus: isClassroom
            ? session.resultSource === "authoritative"
              ? "synced"
              : "pending"
            : "local_only",
        },
      );
      settledHistoryKey.current = key;
    } catch {
      // 记录失败不阻塞学生查看结果；页面会继续显示本轮结果。
    }
  }, [
    allAttempts,
    answerReviewStatus,
    isClassroom,
    reportFingerprint,
    reportIsCurrent,
    reviewedAttempts,
    reviewedQuestions,
    serverAnswerRecords,
    session,
  ]);
  const knowledgePointNameById = Object.fromEntries(
    session.selection.knowledgePoints.map((item) => [item.id, item.name]),
  );
  const masteryTraceByQuestionId = [session.preMastery, reportResult].reduce(
    (byQuestion, source) => {
      for (const [knowledgePointId, item] of Object.entries(source || {})) {
        for (const trace of item?.trace || []) {
          if (!trace.questionId) continue;
          const existing = byQuestion[trace.questionId] || [];
          if (
            existing.some(
              (entry) => entry.knowledgePointId === knowledgePointId,
            )
          )
            continue;
          byQuestion[trace.questionId] = [
            ...existing,
            {
              masteryBefore: trace.masteryBefore,
              masteryAfter: trace.masteryAfter,
              masteryDelta: trace.masteryDelta,
              confidenceAfter: trace.confidenceAfter,
              knowledgePointId,
              knowledgePointName:
                knowledgePointNameById[knowledgePointId] || knowledgePointId,
            },
          ];
        }
      }
      return byQuestion;
    },
    {},
  );
  return (
    <ResultPage
      lesson={{
        id: session.selection.section.id,
        title: session.selection.section.title,
      }}
      knowledgePoints={session.selection.knowledgePoints}
      result={reportResult}
      resultMode={resultMode}
      questions={reviewedQuestions}
      attempts={reviewedAttempts}
      answerReviewStatus={answerReviewStatus}
      masteryTraceByQuestionId={masteryTraceByQuestionId}
      pendingSyncCount={pendingSyncCount}
      reportError={reportError}
      scoreState={scoreState}
      sessionType={session.selection.sessionType || "lesson"}
      onRestart={returnToDirectory}
    />
  );
}
