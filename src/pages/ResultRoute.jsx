import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResultPage from '../components/ResultPage';
import { routes } from '../routes/routePaths';
import { useLearningSession } from '../session/LearningSessionContext';
import { getStudentSessionAnswers, getStudentSessionReport } from '../shared/infrastructure/classroomApi';
import { loadAnswerReviews } from '../lib/gradingApi';
import { calculatePostMastery } from '../lib/mastery';
import { flushClassroomOutbox, getClassroomOutboxStatus } from '../student/data/classroomSyncRepository';
import { syncKnowledgeProfileFromSession } from '../student/data/knowledgeProfileRepository';
import { settleLearningSessionSnapshot } from '../student/data/learningHistoryRepository';
import {
  isAuthoritativeReportCurrent, mapAuthoritativeMasteryResults, masteryResultMode,
  mergeAttemptsWithAuthoritative,
} from '../student/domain/masteryResult';

export default function ResultRoute() {
  const navigate = useNavigate();
  const { session, setSession } = useLearningSession();
  const isClassroom = Boolean(session.selection?.classroomAccessToken);
  const [serverReport, setServerReport] = useState(null);
  const [serverAnswers, setServerAnswers] = useState([]);
  const [reportError, setReportError] = useState('');
  const [answerReviews, setAnswerReviews] = useState({});
  const [answerReviewStatus, setAnswerReviewStatus] = useState('idle');
  const currentSessionId = session.selection?.studentSessionId || '';
  const [pendingSyncCount, setPendingSyncCount] = useState(() => getClassroomOutboxStatus(currentSessionId).answers);
  const settledHistoryKey = useRef('');
  useEffect(() => {
    if (!isClassroom) return undefined;
    let cancelled = false;
    const load = () => Promise.all([
      getStudentSessionReport(session.selection.studentSessionId, session.selection.classroomAccessToken),
      getStudentSessionAnswers(session.selection.studentSessionId, session.selection.classroomAccessToken),
    ])
      .then(([report, answers]) => { if (!cancelled) { setServerReport(report); setServerAnswers(answers); setReportError(''); } })
      .catch((error) => { if (!cancelled && error.status !== 404) setReportError(error.message); });
    const sync = () => flushClassroomOutbox().finally(() => {
      if (!cancelled) setPendingSyncCount(getClassroomOutboxStatus(currentSessionId).answers);
    });
    void sync(); void load();
    const timer = window.setInterval(() => { void sync(); void load(); }, 5_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [currentSessionId, isClassroom, session.selection?.classroomAccessToken]);

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
  const localResult = Object.keys(session.result || {}).length
    ? session.result
    : replayedLocalResult;
  const serverResult = mapAuthoritativeMasteryResults(serverReport);
  const localAnswerCount = Object.keys(session.preAttempts || {}).length + Object.keys(session.postAttempts || {}).length;
  const reportIsCurrent = isAuthoritativeReportCurrent({ report: serverReport, localAnswerCount, pendingSyncCount });
  const resultMode = masteryResultMode({ isClassroom, reportCurrent: reportIsCurrent });
  const reportResult = reportIsCurrent
    ? Object.fromEntries(session.selection.knowledgePoints.map((knowledgePoint) => [
        knowledgePoint.id,
        serverResult[knowledgePoint.id] || {
          mastery: null, status: 'INSUFFICIENT_EVIDENCE', evidenceCount: 0, confidence: 0,
        },
      ]))
    : localResult;
  const reportFingerprint = reportIsCurrent
    ? `${serverReport.algorithmVersion}:${serverReport.answeredQuestionCount}:${JSON.stringify(serverReport.masteryResults)}`
    : '';
  useEffect(() => {
    if (!reportFingerprint) return;
    setSession((current) => {
      if (current.authoritativeReportFingerprint === reportFingerprint) return current;
      const next = {
        ...current,
        result: serverResult,
        resultSource: 'authoritative',
        authoritativeReportFingerprint: reportFingerprint,
      };
      syncKnowledgeProfileFromSession(next);
      return next;
    });
  // The fingerprint changes only when a newer complete server result arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportFingerprint]);
  const serverAttempts = Object.fromEntries(serverAnswers.map((answer) => [answer.questionId, {
    ...answer.gradingResult,
    answer: answer.gradingResult?.answer ?? answer.answerContent?.text ?? '',
    score: Number(answer.score || 0),
    maxScore: Number(answer.maxScore || 0),
    submittedAt: answer.submittedAt,
    authority: 'server',
    syncStatus: 'persisted',
  }]));
  const localAttempts = { ...session.preAttempts, ...session.postAttempts };
  const allAttempts = mergeAttemptsWithAuthoritative(localAttempts, serverAttempts);
  const allQuestions = [...session.preQuestions, ...session.postQuestions];
  const submittedQuestionIds = [...new Set(serverAnswers.map((answer) => answer.questionId).filter(Boolean))];
  const submittedQuestionIdsSignature = submittedQuestionIds.join(',');
  useEffect(() => {
    if (!session.selection?.contentVersionId || !currentSessionId
        || !session.selection?.classroomAccessToken || !submittedQuestionIds.length) return undefined;
    let cancelled = false;
    setAnswerReviewStatus('loading');
    loadAnswerReviews(session.selection.contentVersionId, submittedQuestionIds, {
      studentSessionId: currentSessionId,
      accessToken: session.selection.classroomAccessToken,
    })
      .then((items) => { if (!cancelled) { setAnswerReviews(items); setAnswerReviewStatus('ready'); } })
      .catch(() => { if (!cancelled) setAnswerReviewStatus('failed'); });
    return () => { cancelled = true; };
  // The signature changes only after another answer is authoritative on the server.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, session.selection?.classroomAccessToken,
    session.selection?.contentVersionId, submittedQuestionIdsSignature]);
  const reviewedQuestions = allQuestions.map((question) => {
    const review = answerReviews[question.id];
    return review ? { ...question, answer: review.correctAnswer, analysis: review.analysis || question.analysis } : question;
  });
  const reviewedAttempts = Object.fromEntries(Object.entries(allAttempts).map(([questionId, attempt]) => {
    const review = answerReviews[questionId];
    return [questionId, review ? { ...attempt, correctAnswer: attempt.correctAnswer ?? review.correctAnswer, analysis: attempt.analysis || review.analysis } : attempt];
  }));

  useEffect(() => {
    if (!session.selection?.section || !Object.keys(session.result || {}).length) return;
    const answerCount = Object.keys(allAttempts).length;
    const key = [
      session.selection.studentSessionId,
      session.resultSource,
      answerCount,
      reportFingerprint,
      answerReviewStatus,
    ].join(':');
    if (settledHistoryKey.current === key) return;
    const serverPreAttempts = Object.fromEntries(serverAnswers
      .filter((answer) => String(answer.purpose || answer.sourceType || '').toUpperCase() === 'PRE')
      .map((answer) => [answer.questionId, serverAttempts[answer.questionId]]));
    const serverPostAttempts = Object.fromEntries(serverAnswers
      .filter((answer) => String(answer.purpose || answer.sourceType || '').toUpperCase() !== 'PRE')
      .map((answer) => [answer.questionId, serverAttempts[answer.questionId]]));
    try {
      settleLearningSessionSnapshot({
        ...session,
        preQuestions: reviewedQuestions.filter((question) => question.assessmentMode === 'pre' || question.purpose?.toUpperCase() === 'PRE'),
        postQuestions: reviewedQuestions.filter((question) => question.assessmentMode !== 'pre' && question.purpose?.toUpperCase() !== 'PRE'),
        preAttempts: { ...session.preAttempts, ...Object.fromEntries(Object.entries(reviewedAttempts).filter(([id]) => session.preQuestions.some((question) => question.id === id))), ...serverPreAttempts },
        postAttempts: { ...session.postAttempts, ...Object.fromEntries(Object.entries(reviewedAttempts).filter(([id]) => session.postQuestions.some((question) => question.id === id))), ...serverPostAttempts },
      }, {
        authority: session.resultSource === 'authoritative' ? 'authoritative' : 'preview',
        syncStatus: isClassroom ? (session.resultSource === 'authoritative' ? 'synced' : 'pending') : 'local_only',
      });
      settledHistoryKey.current = key;
    } catch {
      // 记录失败不阻塞学生查看结果；页面会继续显示本轮结果。
    }
  }, [allAttempts, answerReviewStatus, isClassroom, reportFingerprint, reportIsCurrent, reviewedAttempts, reviewedQuestions, serverAnswers, session]);
  const knowledgePointNameById = Object.fromEntries(
    session.selection.knowledgePoints.map((item) => [item.id, item.name]),
  );
  const masteryTraceByQuestionId = [session.preMastery, reportResult].reduce((byQuestion, source) => {
    Object.entries(source || {}).forEach(([knowledgePointId, item]) => {
      (item?.trace || []).forEach((trace) => {
        if (!trace.questionId) return;
        const existing = byQuestion[trace.questionId] || [];
        if (existing.some((entry) => entry.knowledgePointId === knowledgePointId)) return;
        byQuestion[trace.questionId] = [...existing, {
          ...trace,
          knowledgePointId,
          knowledgePointName: knowledgePointNameById[knowledgePointId] || knowledgePointId,
        }];
      });
    });
    return byQuestion;
  }, {});
  return (
    <ResultPage
      lesson={{ id: session.selection.section.id, title: session.selection.section.title }}
      knowledgePoints={session.selection.knowledgePoints}
      result={reportResult}
      resultMode={resultMode}
      questions={reviewedQuestions}
      attempts={reviewedAttempts}
      answerReviewStatus={answerReviewStatus}
      masteryTraceByQuestionId={masteryTraceByQuestionId}
      pendingSyncCount={pendingSyncCount}
      reportError={reportError}
      score={reportIsCurrent ? serverReport?.score : null}
      sessionType={session.selection.sessionType || 'lesson'}
      onRestart={returnToDirectory}
    />
  );
}
