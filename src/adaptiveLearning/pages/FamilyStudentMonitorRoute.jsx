import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";

import BrandLogo from "../components/BrandLogo";
import StatePanel from "../components/StatePanel";
import StudentLearningHome from "../components/StudentLearningHome";
import { useParams } from "../routing";
import { getFamilyStudentMonitor } from "../shared/infrastructure/classroomApi";

import "../family-student-monitor.css";
import "../student-learning-home.css";

/**
 *
 */
export default function FamilyStudentMonitorRoute() {
  const { shareToken = "" } = useParams();
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    data: null,
    error: "",
    invalid: false,
  });
  const load = useCallback(
    async ({ initial = false } = {}) => {
      setState((current) => ({
        ...current,
        loading: initial && !current.data,
        refreshing: !initial && Boolean(current.data),
      }));
      try {
        const data = await getFamilyStudentMonitor(shareToken, {
          cache: "no-store",
        });
        setState({
          loading: false,
          refreshing: false,
          data,
          error: "",
          invalid: false,
        });
      } catch (error) {
        const invalid = [401, 403, 404, 410].includes(error.status);
        setState((current) => ({
          loading: false,
          refreshing: false,
          data: invalid ? null : current.data,
          error: error.message || "暂时无法读取学习情况",
          invalid,
        }));
      }
    },
    [shareToken],
  );

  useEffect(() => {
    void load({ initial: true });
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 10_000);
    const refreshVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [load]);

  return (
    <div className="family-monitor-shell">
      <header className="family-monitor-header">
        <BrandLogo label="云谷学习" />
        <div>
          <span>家长查看</span>
          <strong>学生学习主页</strong>
        </div>
        <span className="family-monitor-readonly">
          <ShieldCheck size={15} />
          只读
        </span>
      </header>
      <main className="family-monitor-main">
        {state.loading && (
          <StatePanel
            tone="loading"
            title="正在同步学习情况"
            description="正在读取孩子最新的学习记录"
          />
        )}
        {!state.loading && !state.data && state.invalid && (
          <StatePanel
            tone="error"
            title="链接已失效"
            description="这个家长查看链接无效、已过期或已被老师重新生成"
          />
        )}
        {!state.loading && !state.data && !state.invalid && (
          <StatePanel
            tone="error"
            title="暂时无法同步学习情况"
            description={state.error || "请检查网络后重新加载"}
            action={
              <button
                className="student-home-refresh"
                type="button"
                onClick={() => load({ initial: true })}
              >
                <RefreshCw size={15} />
                重新加载
              </button>
            }
          />
        )}
        {state.data && (
          <>
            {state.error && (
              <div className="family-monitor-stale" role="status">
                <AlertCircle size={15} />
                暂时无法获取最新记录，正在显示上一次结果
              </div>
            )}
            <StudentLearningHome profile={state.data} viewer="family" />
          </>
        )}
      </main>
    </div>
  );
}
