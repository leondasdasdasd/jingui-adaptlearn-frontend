import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";

import { trans } from "../../utils/i18n";
import StatePanel from "../components/StatePanel";
import TeacherShell from "../components/TeacherShell";
import { useNavigate } from "../routing";
import { fetchTeacherLearningPeriods } from "../teacher/data/classroomApiRepository";
import directoryViewState from "../teacher/presentation/directoryViewState";
import {
  formatPeriodTime,
  periodStatusMeta,
} from "../teacher/presentation/teacherDirectoryPresentation";

import "../teacher-reports.css";

/**
 *
 */
export default function TeacherReportsRoute() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, periods: [], error: "" });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const periods = await fetchTeacherLearningPeriods();
      setState({ loading: false, periods, error: "" });
    } catch {
      setState((current) => ({
        ...current,
        loading: false,
        error: trans(
          "adaptiveLearning.directory.periodLoadFailed",
          "课堂列表加载失败",
        ),
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const periods = useMemo(
    () =>
      [...state.periods].sort(
        (left, right) =>
          new Date(right.activityAt || 0).getTime() -
          new Date(left.activityAt || 0).getTime(),
      ),
    [state.periods],
  );

  const openReport = (periodId) => {
    navigate(
      `/adaptive-learning/teacher/periods/${encodeURIComponent(periodId)}/report`,
    );
  };
  const viewState = directoryViewState(state, periods.length);

  return (
    <TeacherShell
      title={trans("adaptiveLearning.directory.reportsTitle", "学习报告")}
    >
      {viewState === "loading" && (
        <StatePanel
          tone="loading"
          title={trans(
            "adaptiveLearning.directory.loadingPeriods",
            "正在加载课堂",
          )}
          description={trans(
            "adaptiveLearning.directory.loadingPeriodsDescription",
            "正在读取当前账号可访问的课堂",
          )}
        />
      )}
      {viewState === "error" && (
        <StatePanel
          tone="error"
          title={trans(
            "adaptiveLearning.directory.periodLoadFailed",
            "课堂列表加载失败",
          )}
          description={state.error}
          action={
            <button className="teacher-primary" type="button" onClick={load}>
              <RefreshCw size={15} />
              <span>
                {trans("adaptiveLearning.directory.reload", "重新加载")}
              </span>
            </button>
          }
        />
      )}
      {viewState === "empty" && (
        <StatePanel
          title={trans(
            "adaptiveLearning.directory.noPeriods",
            "暂无可查看的课堂",
          )}
          description={trans(
            "adaptiveLearning.directory.noPeriodsDescription",
            "当前账号还没有可访问的课堂，课堂创建或授权后会显示在这里。",
          )}
        />
      )}
      {viewState === "ready" && (
        <section
          className="teacher-report-directory"
          aria-label={trans(
            "adaptiveLearning.directory.periodReportsAria",
            "可查看的课堂报告",
          )}
        >
          <header>
            <h2>
              {trans(
                "adaptiveLearning.directory.accessiblePeriods",
                "可访问课堂",
              )}
            </h2>
            <span>
              {trans(
                "adaptiveLearning.directory.periodCount",
                "共 {$count} 堂",
                { count: periods.length },
              )}
            </span>
          </header>
          <div className="teacher-report-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{trans("adaptiveLearning.directory.period", "课堂")}</th>
                  <th>{trans("adaptiveLearning.directory.class", "班级")}</th>
                  <th>{trans("global.status", "状态")}</th>
                  <th>
                    {trans("adaptiveLearning.directory.recentTime", "最近时间")}
                  </th>
                  <th
                    aria-label={trans(
                      "adaptiveLearning.directory.actions",
                      "操作",
                    )}
                  />
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => {
                  const status = periodStatusMeta(period.status);
                  const actionLabel = status.showFinalReport
                    ? trans("adaptiveLearning.directory.viewReport", "查看报告")
                    : trans(
                        "adaptiveLearning.directory.viewStatistics",
                        "查看统计",
                      );
                  return (
                    <tr key={period.periodId}>
                      <td>
                        <strong>
                          {period.title ||
                            trans(
                              "adaptiveLearning.directory.untitledPeriod",
                              "未命名课堂",
                            )}
                        </strong>
                      </td>
                      <td>
                        {period.className ||
                          period.classId ||
                          trans(
                            "adaptiveLearning.directory.untitledClass",
                            "未命名班级",
                          )}
                      </td>
                      <td>
                        <span className={`teacher-status ${status.tone}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <time dateTime={period.activityAt || undefined}>
                          {formatPeriodTime(period.activityAt)}
                        </time>
                      </td>
                      <td>
                        <button
                          className="teacher-report-open"
                          type="button"
                          onClick={() => openReport(period.periodId)}
                        >
                          {actionLabel}
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </TeacherShell>
  );
}
