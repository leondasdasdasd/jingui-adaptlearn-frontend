/* eslint-disable complexity -- 学生详情保留初次加载与刷新状态分支。 */

import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";

import StatePanel from "../components/StatePanel";
import StudentLearningHome from "../components/StudentLearningHome";
import TeacherShell from "../components/TeacherShell";
import { useNavigate, useParams } from "../routing";
import {
  fetchClassroomReports,
  fetchTeacherStudentLearningHome,
  publishStudentScore,
} from "../teacher/data/classroomApiRepository";

import "../family-student-monitor.css";
import "../student-learning-home.css";

/**
 *
 */
export default function TeacherStudentDetailRoute() {
  const navigate = useNavigate();
  const { periodId = "", studentId = "" } = useParams();
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    profile: null,
    report: null,
    error: "",
  });
  const [publishingScore, setPublishingScore] = useState(false);
  const [scoreNotice, setScoreNotice] = useState("");
  const load = useCallback(
    async ({ initial = false } = {}) => {
      setState((current) => ({
        ...current,
        loading: initial && !current.profile,
        refreshing: !initial && Boolean(current.profile),
      }));
      try {
        if (!periodId || !studentId) {
          throw new Error("缺少课堂或学生标识，请返回课堂列表重试");
        }
        const [rawProfile, rawReports] = await Promise.all([
          fetchTeacherStudentLearningHome(periodId, studentId),
          fetchClassroomReports(periodId),
        ]);
        const reports = Array.isArray(rawReports) ? rawReports : [];
        const report =
          reports.find((item) => item.studentId === studentId) || null;

        setState({
          loading: false,
          refreshing: false,
          profile: rawProfile || null,
          report,
          error: "",
        });
      } catch (error_) {
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: error_.message || "学生主页加载失败，请重试",
        }));
      }
    },
    [periodId, studentId],
  );

  useEffect(() => {
    void load({ initial: true });
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const handlePublishScore = async () => {
    const sessionId = state.report?.studentSessionId;
    if (!sessionId || publishingScore) return;
    setPublishingScore(true);
    setScoreNotice("");
    try {
      await publishStudentScore(sessionId);
      setScoreNotice("学习结论已确认并发布。");
      await load();
    } catch (error) {
      setScoreNotice(error.message || "学习结论发布失败，请重试");
    } finally {
      setPublishingScore(false);
    }
  };

  const title = state.profile?.student?.displayName || "学生学习主页";
  const scorePendingReview =
    state.report?.score?.status === "READY" &&
    state.report?.score?.reviewStatus !== "PUBLISHED";
  return (
    <TeacherShell
      hideGlobalHeader
      title={title}
      leadingAction={
        <button
          className="teacher-neutral"
          type="button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={15} />
          返回
        </button>
      }
      actions={
        scorePendingReview ? (
          <button
            className="teacher-primary"
            type="button"
            disabled={publishingScore}
            aria-busy={publishingScore}
            onClick={handlePublishScore}
          >
            <Check size={15} />
            {publishingScore ? "发布中" : "确认并发布结论"}
          </button>
        ) : null
      }
    >
      {scoreNotice && (
        <div className="family-share-toast" role="status">
          <Check size={16} />
          {scoreNotice}
        </div>
      )}
      {state.loading && (
        <StatePanel
          tone="loading"
          title="正在加载学生主页"
          description="正在同步该学生的学习状态"
        />
      )}
      {!state.loading && !state.profile && (
        <StatePanel
          tone="error"
          title="学生主页加载失败"
          description={state.error || "未找到该学生的学习记录"}
          action={
            <button
              className="teacher-primary"
              type="button"
              onClick={() => void load({ initial: true })}
            >
              <RefreshCw size={15} />
              重新加载
            </button>
          }
        />
      )}
      {state.profile && (
        <>
          {state.error && (
            <div className="teacher-notice error" role="status">
              <span>暂时无法获取最新记录，正在显示上一次结果</span>
              <button type="button" onClick={() => void load()}>
                <RefreshCw size={14} />
                重试
              </button>
            </div>
          )}
          <StudentLearningHome profile={state.profile} viewer="teacher" />
        </>
      )}
    </TeacherShell>
  );
}
