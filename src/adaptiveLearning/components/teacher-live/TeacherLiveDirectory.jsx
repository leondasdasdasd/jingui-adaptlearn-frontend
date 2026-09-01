/* eslint-disable complexity, react/prop-types -- 目录仅组合真实课堂列表的显示状态。 */

import React from "react";
import { BarChart3, Clock, Eye, Play, Radio, Users } from "lucide-react";

import StatePanel from "../StatePanel";
import { formatCardTime, liveText } from "./presentation";

/**
 *
 * @param root0
 * @param root0.filterStatus
 * @param root0.filteredPeriods
 * @param root0.initiatedPeriods
 * @param root0.loadingPeriods
 * @param root0.navigate
 * @param root0.onFilterChange
 * @param root0.onStartClass
 */
export default function TeacherLiveDirectory({
  filterStatus,
  filteredPeriods,
  initiatedPeriods,
  loadingPeriods,
  navigate,
  onFilterChange,
  onStartClass,
}) {
  return (
    <div className="live-periods-directory">
      <div className="live-periods-header">
        <div className="live-periods-filter-tabs">
          <button
            type="button"
            className={`live-periods-tab ${filterStatus === "ALL" ? "active" : ""}`}
            onClick={() => onFilterChange("ALL")}
          >
            {liveText("filterAll", "全部 ({$count})", {
              count: initiatedPeriods.length,
            })}
          </button>
          <button
            type="button"
            className={`live-periods-tab ${filterStatus === "ACTIVE" ? "active" : ""}`}
            onClick={() => onFilterChange("ACTIVE")}
          >
            {liveText("filterActive", "进行中 ({$count})", {
              count: initiatedPeriods.filter((p) => p.status !== "COMPLETED")
                .length,
            })}
          </button>
          <button
            type="button"
            className={`live-periods-tab ${filterStatus === "COMPLETED" ? "active" : ""}`}
            onClick={() => onFilterChange("COMPLETED")}
          >
            {liveText("filterCompleted", "已结束 ({$count})", {
              count: initiatedPeriods.filter((p) => p.status === "COMPLETED")
                .length,
            })}
          </button>
        </div>
      </div>

      {loadingPeriods && (
        <StatePanel
          tone="loading"
          title={liveText("directoryLoading", "正在加载实时课堂")}
          description={liveText(
            "directoryLoadingDescription",
            "正在读取已发起的课堂会话与数据...",
          )}
        />
      )}

      {!loadingPeriods && filteredPeriods.length === 0 && (
        <StatePanel
          title={liveText("directoryEmpty", "暂无对应状态的实时课堂")}
          description={liveText(
            "directoryEmptyDescription",
            "点击“开始上课”开启自适应互动课堂",
          )}
          action={
            <button
              className="teacher-primary"
              type="button"
              onClick={() => onStartClass()}
            >
              <Play size={15} fill="currentColor" />
              {liveText("startNow", "立即开始上课")}
            </button>
          }
        />
      )}

      {!loadingPeriods && filteredPeriods.length > 0 && (
        <div className="live-periods-grid">
          {filteredPeriods.map((item) => {
            const isActive = item.status !== "COMPLETED";
            return (
              <article
                key={item.periodId}
                className={`live-period-card ${isActive ? "is-active" : ""}`}
              >
                <div className="live-period-card-top">
                  <span className="live-period-class-badge">
                    <Users size={13} />
                    {item.className ||
                      item.classId ||
                      liveText("untitledClass", "未命名班级")}
                  </span>

                  <span
                    className={`live-period-status-tag ${isActive ? "active" : "completed"}`}
                  >
                    {isActive ? (
                      <>
                        <span className="live-pulse-dot" />
                        {liveText("activeStatus", "进行中")}
                      </>
                    ) : (
                      liveText("completedStatus", "已结束")
                    )}
                  </span>
                </div>

                <h3 className="live-period-card-title">
                  {item.title || liveText("defaultTitle", "自适应互动课堂")}
                </h3>

                <div className="live-period-card-meta">
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock size={13} />
                    {formatCardTime(item.activityAt)}
                  </span>
                  <span>·</span>
                  <span>
                    {isActive
                      ? liveText("monitoring", "在线监控中")
                      : liveText("learningSettled", "学情已结算")}
                  </span>
                </div>

                <div className="live-period-card-stats">
                  <div className="live-period-stat-item">
                    <span>{liveText("participants", "参与学生")}</span>
                    <strong>
                      {item.studentCount == null
                        ? "—"
                        : liveText("peopleCount", "{$count} 人", {
                            count: item.studentCount,
                          })}
                    </strong>
                  </div>
                  <div className="live-period-stat-item">
                    <span>
                      {isActive
                        ? liveText("onlineNow", "实时在线")
                        : liveText("completion", "完成度")}
                    </span>
                    <strong>
                      {isActive
                        ? item.onlineCount == null
                          ? "—"
                          : liveText("peopleCount", "{$count} 人", {
                              count: item.onlineCount,
                            })
                        : item.completionRate == null
                          ? "—"
                          : `${item.completionRate}%`}
                    </strong>
                  </div>
                  <div className="live-period-stat-item">
                    <span>{liveText("averageAccuracy", "平均正确率")}</span>
                    <strong
                      className={
                        item.avgAccuracy != null && item.avgAccuracy < 75
                          ? "danger"
                          : ""
                      }
                    >
                      {item.avgAccuracy == null ? "—" : `${item.avgAccuracy}%`}
                    </strong>
                  </div>
                </div>

                <div className="live-period-card-actions">
                  {isActive ? (
                    <button
                      type="button"
                      className="live-period-action-btn primary"
                      onClick={() =>
                        navigate(
                          `/adaptive-learning/teacher/periods/${item.periodId}/live`,
                        )
                      }
                    >
                      <Radio size={15} />
                      <span>{liveText("enterLive", "进入实时课堂")}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="live-period-action-btn secondary"
                        onClick={() =>
                          navigate(
                            `/adaptive-learning/teacher/periods/${item.periodId}/live`,
                          )
                        }
                      >
                        <Eye size={14} />
                        <span>{liveText("viewReview", "查看复盘")}</span>
                      </button>
                      <button
                        type="button"
                        className="live-period-action-btn primary"
                        onClick={() =>
                          navigate(
                            `/adaptive-learning/teacher/periods/${item.periodId}/report`,
                          )
                        }
                      >
                        <BarChart3 size={14} />
                        <span>{liveText("viewReport", "查看报告")}</span>
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
