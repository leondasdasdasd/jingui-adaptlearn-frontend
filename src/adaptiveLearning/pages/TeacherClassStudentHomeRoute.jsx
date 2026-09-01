import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, RefreshCw } from "lucide-react";

import StatePanel from "../components/StatePanel";
import StudentLearningHome from "../components/StudentLearningHome";
import TeacherShell from "../components/TeacherShell";
import { useNavigate, useParams } from "../routing";
import { fetchTeacherClassStudentLearningHome } from "../teacher/data/classroomApiRepository";

import "../student-learning-home.css";

/**
 *
 */
export default function TeacherClassStudentHomeRoute() {
  const navigate = useNavigate();
  const { classId, studentId } = useParams();
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    profile: null,
    error: "",
  });
  const load = useCallback(
    async ({ initial = false } = {}) => {
      setState((current) => ({
        ...current,
        loading: initial && !current.profile,
        refreshing: !initial && Boolean(current.profile),
        error: "",
      }));
      try {
        const profile = await fetchTeacherClassStudentLearningHome(
          classId,
          studentId,
          { cache: "no-store" },
        );
        setState({ loading: false, refreshing: false, profile, error: "" });
      } catch (error) {
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: error.message || "学生学习主页加载失败",
        }));
      }
    },
    [classId, studentId],
  );
  useEffect(() => {
    void load({ initial: true });
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [load]);
  const title = useMemo(
    () =>
      state.profile?.student?.displayName
        ? `${state.profile.student.displayName}的学习主页`
        : "学生学习主页",
    [state.profile],
  );

  return (
    <TeacherShell
      hideGlobalHeader
      title={title}
      leadingAction={
        <button
          className="teacher-neutral"
          type="button"
          onClick={() =>
            navigate(`/adaptive-learning/teacher/classes/${classId}/students`)
          }
        >
          <ArrowLeft size={15} />
          <span>返回</span>
        </button>
      }
    >
      <div className="teacher-student-home-viewer">
        <Eye size={15} />
        <span>当前为只读视图，包含该学生全部自主学习和老师课堂记录。</span>
      </div>
      {state.loading && (
        <StatePanel
          tone="loading"
          title="正在加载学习主页"
          description="正在汇总该学生的长期学习记录"
        />
      )}
      {!state.loading && !state.profile && state.error && (
        <StatePanel
          tone="error"
          title="学习主页加载失败"
          description={state.error}
        />
      )}
      {state.profile && (
        <>
          {state.error && (
            <div className="teacher-notice error" role="status">
              暂时无法获取最新记录，正在显示上一次结果
            </div>
          )}
          <StudentLearningHome
            profile={state.profile}
            viewer="teacher"
            recordScope="all"
          />
        </>
      )}
    </TeacherShell>
  );
}
