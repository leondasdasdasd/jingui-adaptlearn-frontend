/* eslint-disable complexity, sonarjs/cognitive-complexity, react/prop-types, unicorn/explicit-length-check, sonarjs/no-duplicate-string, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- 视图保持既有条件渲染与服务端 profile 形状。 */

import React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GraduationCap,
  Grid3X3,
  MessageSquareText,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  User,
} from "lucide-react";

import { dateTime, duration, percent } from "./student-learning-home/model";
import { StudentAttemptRecord } from "./student-learning-home/StudentAttemptRecord";
import useStudentLearningHomeModel from "./student-learning-home/useStudentLearningHomeModel";
import StudentMatrixMasteryCard from "./StudentMatrixMasteryCard";

export { StudentAttemptRecord } from "./student-learning-home/StudentAttemptRecord";

/**
 *
 * @param root0
 * @param root0.profile
 * @param root0.viewer
 * @param root0.action
 */
export default function StudentLearningHome({
  profile,
  viewer = "student",
  action = null,
}) {
  const {
    activeDrillKp,
    attempts,
    drillTab,
    filteredAttempts,
    filteredSupport,
    filteredTimeline,
    handleDrillDownKP,
    knowledgePointsDetailed,
    knowledgePointsList,
    kpMasteryMap,
    overviewTab,
    score,
    scoreValuesVisible,
    selectedKpDetail,
    setDrillTab,
    setOverviewTab,
    setSelectedKp,
    setTimeFilter,
    setViewPage,
    showAttemptDetails,
    summary,
    supportActivities,
    timeFilter,
    timeline,
    viewPage,
    warnings,
  } = useStudentLearningHomeModel({ profile, viewer });

  return (
    <div className="authoritative-student-home compact-theme">
      {/* ========================================================================= */}
      {/* PAGE 1: 学生学习档案概览与全量记录页 (Overview Page) */}
      {/* ========================================================================= */}
      {viewPage === "overview" && (
        <div className="page-overview-wrapper">
          {/* 1. 顶部 Header + 5 核心指标合并卡片 */}
          <div className="student-detail-combined-card">
            <div className="student-detail-header">
              <div className="student-header-title">
                <div className="student-avatar-badge">
                  <GraduationCap size={15} />
                </div>
                <div className="student-info-meta">
                  <h2>{profile?.studentName || profile?.name || "张三"}</h2>
                  <span className="student-class-chip">
                    <User size={12} />
                    {profile?.className ||
                      profile?.gradeClass ||
                      profile?.class ||
                      "高一(1)班"}
                  </span>
                </div>
              </div>
              <div className="student-header-actions">
                <div className="time-filter-segmented">
                  <button
                    className={timeFilter === "TODAY" ? "active" : ""}
                    onClick={() => setTimeFilter("TODAY")}
                  >
                    今天
                  </button>
                  <button
                    className={timeFilter === "WEEK" ? "active" : ""}
                    onClick={() => setTimeFilter("WEEK")}
                  >
                    这周
                  </button>
                  <button
                    className={timeFilter === "MONTH" ? "active" : ""}
                    onClick={() => setTimeFilter("MONTH")}
                  >
                    这个月
                  </button>
                  <button
                    className={timeFilter === "SEMESTER" ? "active" : ""}
                    onClick={() => setTimeFilter("SEMESTER")}
                  >
                    这个学期
                  </button>
                  <button
                    className={timeFilter === "ALL" ? "active" : ""}
                    onClick={() => setTimeFilter("ALL")}
                  >
                    全部
                  </button>
                </div>
                {action}
              </div>
            </div>

            <div
              className="student-detail-summary compact"
              aria-label="学习数据概览"
            >
              <div className="summary-item metric-duration">
                <div className="s-icon-wrapper blue">
                  <Clock3 size={15} />
                </div>
                <div className="s-content">
                  <span className="s-label">有效学习时长</span>
                  <strong className="s-val">
                    {summary.effectiveLearningMinutes == null
                      ? "待结算"
                      : `${summary.effectiveLearningMinutes} 分钟`}
                  </strong>
                </div>
              </div>
              <div className="summary-item metric-mastery">
                <div className="s-icon-wrapper indigo">
                  <Award size={15} />
                </div>
                <div className="s-content">
                  <span className="s-label">综合掌握率</span>
                  <strong className="s-val highlight">
                    {percent(summary.masteryRate)}
                  </strong>
                </div>
              </div>
              <div className="summary-item metric-answers">
                <div className="s-icon-wrapper emerald">
                  <FileText size={15} />
                </div>
                <div className="s-content">
                  <span className="s-label">作答情况</span>
                  <strong className="s-val">
                    {summary.answerCount || attempts.length || 0} 题
                  </strong>
                </div>
              </div>
              <div className="summary-item metric-support">
                <div className="s-icon-wrapper amber">
                  <Sparkles size={15} />
                </div>
                <div className="s-content">
                  <span className="s-label">学习支持</span>
                  <strong className="s-val">
                    {summary.supportRounds || supportActivities.length || 0} 轮
                  </strong>
                </div>
              </div>
              <div className="summary-item metric-kps">
                <div className="s-icon-wrapper sky">
                  <BookOpen size={15} />
                </div>
                <div className="s-content">
                  <span className="s-label">知识点覆盖</span>
                  <strong className="s-val text-truncate">
                    {knowledgePointsList.length} 个
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 学习结论板块 */}
          {profile?.score && (
            <section
              className={`student-home-score${profile.score?.status === "READY" ? " ready" : ""}`}
            >
              <span className="student-home-score-tag">{score.label}</span>
              {scoreValuesVisible && (
                <div className="student-home-score-metrics">
                  <span>
                    掌握率
                    <strong>{percent(profile.score.finalMasteryScore)}</strong>
                  </span>
                  <span>
                    完成率
                    <strong>{percent(profile.score.taskCompletionRate)}</strong>
                  </span>
                  <span>
                    进步或保持
                    <strong>
                      {percent(profile.score.progressOrMaintenanceScore)}
                    </strong>
                  </span>
                </div>
              )}
              {scoreValuesVisible && (
                <details>
                  <summary>查看结论依据</summary>
                  <div>
                    <span>
                      结论覆盖率
                      <b>{percent(profile.score.conclusionCoverageRate)}</b>
                    </span>
                    <span>
                      有效作答率
                      <b>{percent(profile.score.validFirstAttemptRate)}</b>
                    </span>
                    <span>
                      干预闭环率
                      <b>{percent(profile.score.interventionClosureRate)}</b>
                    </span>
                  </div>
                </details>
              )}
            </section>
          )}

          {/* 4. 预警提醒板块 */}
          {warnings.length > 0 && (
            <section className="student-detail-warnings">
              <header>
                <AlertTriangle size={17} />
                <strong>当前需要关注</strong>
              </header>
              <div>
                {warnings.map((warning, index) => (
                  <span key={`${warning.type}-${index}`}>
                    {warning.type === "inactive" ? (
                      <TimerReset size={14} />
                    ) : (
                      <AlertTriangle size={14} />
                    )}
                    {warning.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 5. 全量学习记录板块 (Overview Tabs) */}
          <section className="global-records-card" aria-label="全量学习记录">
            <div className="global-records-header">
              <h3>学习记录</h3>
            </div>

            <div
              className="student-detail-tabs"
              role="tablist"
              aria-label="全量学习记录"
            >
              <button
                type="button"
                role="tab"
                aria-selected={overviewTab === "kp-records"}
                className={overviewTab === "kp-records" ? "active" : ""}
                onClick={() => setOverviewTab("kp-records")}
              >
                <BookOpen size={15} />
                知识点学习记录
                <span className="tab-count-badge">
                  {knowledgePointsDetailed.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={overviewTab === "timeline"}
                className={overviewTab === "timeline" ? "active" : ""}
                onClick={() => setOverviewTab("timeline")}
              >
                <Clock3 size={15} />
                行动记录
                <span className="tab-count-badge">{timeline.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={overviewTab === "attempts"}
                className={overviewTab === "attempts" ? "active" : ""}
                onClick={() => setOverviewTab("attempts")}
              >
                <CheckCircle2 size={15} />
                作答记录
                <span className="tab-count-badge">{attempts.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={overviewTab === "support"}
                className={overviewTab === "support" ? "active" : ""}
                onClick={() => setOverviewTab("support")}
              >
                <MessageSquareText size={15} />
                AI问答记录
                <span className="tab-count-badge">
                  {supportActivities.length}
                </span>
              </button>
            </div>

            {/* OVERVIEW TAB 1: 知识点学习记录 (按知识点卡片列出，可直接下钻) */}
            {overviewTab === "kp-records" && (
              <section className="student-home-record-panel">
                {knowledgePointsDetailed.length > 0 ? (
                  <div className="student-home-timeline kp-timeline-list">
                    {knowledgePointsDetailed.map((kp, idx) => (
                      <article
                        key={kp.name}
                        className="kp-timeline-item"
                        onClick={() => handleDrillDownKP(kp.name)}
                        title="点击查看该知识点详情与评估矩阵"
                      >
                        <span className="timeline-node">{idx + 1}</span>
                        <div className="kp-tl-content">
                          <div className="tl-head-row">
                            <div className="tl-title-group">
                              <strong className="kp-title-name">
                                {kp.name}
                              </strong>
                              <span className="tl-kp-tag">
                                <BookOpen size={11} />
                                {kp.lessonTitle}
                              </span>
                              <span
                                className={`kp-status-badge ${kp.status.toLowerCase()}`}
                              >
                                {kp.statusLabel}
                              </span>
                            </div>
                            <time>
                              <Clock3 size={12} />
                              最近学习: {kp.latestTimeFormatted}
                            </time>
                          </div>

                          <div className="kp-tl-body-row">
                            <div className="kp-tl-mastery-info">
                              <span className="mastery-text">
                                掌握度：
                                <span className="pre-val">
                                  学前 {kp.preMastery}%
                                </span>
                                <span className="mastery-arrow">➔</span>
                                <strong className="highlight-post">
                                  学后 {kp.postMastery}%
                                </strong>
                              </span>
                              {kp.gain > 0 && (
                                <span className="gain-badge">
                                  <TrendingUp size={12} />+{kp.gain}% 提升
                                </span>
                              )}
                            </div>
                            <div className="kp-tl-action-hint">
                              <span>
                                作答 {kp.attemptsCount} 题 · 正确率{" "}
                                {kp.accuracyRate}%
                              </span>
                              <span className="drilldown-btn-text">
                                下钻评估矩阵{" "}
                                <ChevronRight
                                  size={14}
                                  className="arrow-icon"
                                />
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="student-home-empty">
                    <p>暂无知识点学习记录。</p>
                  </div>
                )}
              </section>
            )}

            {/* OVERVIEW TAB 2: 行动记录 */}
            {overviewTab === "timeline" && (
              <section className="student-home-record-panel">
                {timeline.length > 0 ? (
                  <div className="student-home-timeline">
                    {timeline.map((item, index) => (
                      <article key={`${item.startedAt || index}-${index}`}>
                        <span className="timeline-node">{index + 1}</span>
                        <div>
                          <div className="tl-head-row">
                            <div className="tl-title-group">
                              <strong>{item.title || item.label}</strong>
                              {item.kpName && (
                                <button
                                  type="button"
                                  className="tl-kp-tag"
                                  onClick={() => handleDrillDownKP(item.kpName)}
                                  title="下钻此知识点评估矩阵"
                                >
                                  <BookOpen size={11} />
                                  {item.kpName}
                                </button>
                              )}
                            </div>
                            <time>
                              {dateTime(item.startedAt, true)}
                              {item.endedAt
                                ? ` — ${dateTime(item.endedAt, true)}`
                                : " — 进行中"}
                            </time>
                          </div>
                          <small>
                            <Clock3 size={13} />
                            {duration(item.durationSeconds)}
                          </small>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="student-home-empty">
                    <p>暂无行动记录。</p>
                  </div>
                )}
              </section>
            )}

            {/* OVERVIEW TAB 3: 作答记录 */}
            {overviewTab === "attempts" && (
              <section className="student-home-record-panel">
                {attempts.length > 0 ? (
                  <div className="student-home-attempt-list">
                    {attempts.map((attempt) => (
                      <StudentAttemptRecord
                        key={`${attempt.sequence}-${attempt.presentedAt}`}
                        attempt={attempt}
                        showDetails={showAttemptDetails}
                        onSelectKp={(kp) => handleDrillDownKP(kp)}
                        kpMasteryInfo={kpMasteryMap.get(attempt.kpName)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="student-home-empty">
                    <p>暂无作答记录。</p>
                  </div>
                )}
              </section>
            )}

            {/* OVERVIEW TAB 4: AI问答记录 */}
            {overviewTab === "support" && (
              <section className="student-home-record-panel">
                {supportActivities.length > 0 ? (
                  <div className="student-home-support-list">
                    {supportActivities.map((item, index) => (
                      <article key={`${item.occurredAt || index}-${index}`}>
                        <div className="support-icon-box">
                          <Target size={16} />
                        </div>
                        <div className="support-main-content">
                          <div className="support-title-row">
                            <strong>
                              {item.state ||
                                item.topic ||
                                "针对性解题辅导与方法归纳"}
                            </strong>
                            {item.kpName && (
                              <button
                                type="button"
                                className="tl-kp-tag"
                                onClick={() => handleDrillDownKP(item.kpName)}
                              >
                                <BookOpen size={11} />
                                {item.kpName}
                              </button>
                            )}
                          </div>
                        </div>
                        <time>{dateTime(item.occurredAt, true)}</time>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="student-home-empty">
                    <p>暂无AI问答记录。</p>
                  </div>
                )}
              </section>
            )}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: 知识点详情与下钻视角 (Drill-Down Detail Page) */}
      {/* ========================================================================= */}
      {viewPage === "drilldown" && (
        <div className="page-drilldown-wrapper">
          {/* 2.1 顶栏：返回概览按钮 */}
          <div className="drilldown-nav-banner">
            <button
              type="button"
              className="back-overview-btn"
              onClick={() => {
                setViewPage("overview");
                setSelectedKp("ALL");
              }}
            >
              <ArrowLeft size={15} />
              <span>返回学生学习概览</span>
            </button>
          </div>

          {/* 2.2 核心布局：左侧知识点切换侧边栏 + 右侧主区 */}
          <div className="matrix-view-layout">
            {/* 左侧侧边栏：知识点列表 */}
            <aside className="matrix-kp-sidebar">
              <div className="sidebar-header">
                <BookOpen size={15} />
                <span>知识点列表</span>
                <span className="sidebar-count">
                  {knowledgePointsDetailed.length}
                </span>
              </div>

              <div className="sidebar-kp-list">
                {knowledgePointsDetailed.map((kp) => {
                  const isActive = activeDrillKp === kp.name;
                  return (
                    <button
                      key={kp.name}
                      type="button"
                      className={`sidebar-kp-card ${isActive ? "active" : ""}`}
                      onClick={() => setSelectedKp(kp.name)}
                    >
                      <span className="kp-card-title">{kp.name}</span>
                      <span className="kp-card-mastery-rate">
                        掌握率 <strong>{kp.postMastery}%</strong>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* 右侧主区 */}
            <main className="matrix-content-area">
              {/* 所选知识点 Summary 归属栏 */}
              {selectedKpDetail && (
                <div className="drilldown-kp-summary-bar">
                  <div className="sum-left">
                    <span className="sum-lesson-attribution">
                      <BookOpen size={13} />
                      {selectedKpDetail.lessonTitle}
                    </span>
                    <h3>{selectedKpDetail.name}</h3>
                  </div>
                  <div className="sum-right">
                    <div className="sum-mastery-tag">
                      学前 {selectedKpDetail.preMastery}% → 学后{" "}
                      {selectedKpDetail.postMastery}%
                    </div>
                    <span
                      className={`kp-status-badge ${selectedKpDetail.status.toLowerCase()}`}
                    >
                      {selectedKpDetail.statusLabel}
                    </span>
                  </div>
                </div>
              )}

              {/* 横向 4 个导航 Tabs */}
              <div
                className="student-detail-tabs"
                role="tablist"
                aria-label="知识点详情视图导航"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={drillTab === "matrix"}
                  className={drillTab === "matrix" ? "active" : ""}
                  onClick={() => setDrillTab("matrix")}
                >
                  <Grid3X3 size={15} />
                  评估矩阵
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={drillTab === "timeline"}
                  className={drillTab === "timeline" ? "active" : ""}
                  onClick={() => setDrillTab("timeline")}
                >
                  <Clock3 size={15} />
                  行动记录
                  <span className="tab-count-badge">
                    {filteredTimeline.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={drillTab === "attempts"}
                  className={drillTab === "attempts" ? "active" : ""}
                  onClick={() => setDrillTab("attempts")}
                >
                  <CheckCircle2 size={15} />
                  作答记录
                  <span className="tab-count-badge">
                    {filteredAttempts.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={drillTab === "support"}
                  className={drillTab === "support" ? "active" : ""}
                  onClick={() => setDrillTab("support")}
                >
                  <MessageSquareText size={15} />
                  AI问答记录
                  <span className="tab-count-badge">
                    {filteredSupport.length}
                  </span>
                </button>
              </div>

              {/* TAB 1: 评估矩阵 */}
              {drillTab === "matrix" && (
                <StudentMatrixMasteryCard
                  profile={profile}
                  selectedKp={activeDrillKp}
                  attempts={attempts}
                  knowledgePointsList={knowledgePointsList}
                  kpMasteryMap={kpMasteryMap}
                  onSelectKp={(kp) => setSelectedKp(kp)}
                />
              )}

              {/* TAB 2: 单知识点行动记录 */}
              {drillTab === "timeline" && (
                <section className="student-home-record-panel">
                  {filteredTimeline.length > 0 ? (
                    <div className="student-home-timeline">
                      {filteredTimeline.map((item, index) => (
                        <article key={`${item.startedAt || index}-${index}`}>
                          <span className="timeline-node">{index + 1}</span>
                          <div>
                            <div className="tl-head-row">
                              <div className="tl-title-group">
                                <strong>{item.title || item.label}</strong>
                              </div>
                              <time>
                                {dateTime(item.startedAt, true)}
                                {item.endedAt
                                  ? ` — ${dateTime(item.endedAt, true)}`
                                  : " — 进行中"}
                              </time>
                            </div>
                            <small>
                              <Clock3 size={13} />
                              {duration(item.durationSeconds)}
                            </small>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="student-home-empty">
                      <p>【{activeDrillKp}】暂无该知识点的时间线记录。</p>
                    </div>
                  )}
                </section>
              )}

              {/* TAB 3: 单知识点作答记录 */}
              {drillTab === "attempts" && (
                <section className="student-home-record-panel">
                  {filteredAttempts.length > 0 ? (
                    <div className="student-home-attempt-list">
                      {filteredAttempts.map((attempt) => (
                        <StudentAttemptRecord
                          key={`${attempt.sequence}-${attempt.presentedAt}`}
                          attempt={attempt}
                          showDetails={showAttemptDetails}
                          onSelectKp={(kp) => setSelectedKp(kp)}
                          kpMasteryInfo={kpMasteryMap.get(attempt.kpName)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="student-home-empty">
                      <p>【{activeDrillKp}】暂无该知识点的逐题作答结果。</p>
                    </div>
                  )}
                </section>
              )}

              {/* TAB 4: 单知识点AI问答记录 */}
              {drillTab === "support" && (
                <section className="student-home-record-panel">
                  {filteredSupport.length > 0 ? (
                    <div className="student-home-support-list">
                      {filteredSupport.map((item, index) => (
                        <article key={`${item.occurredAt || index}-${index}`}>
                          <div className="support-icon-box">
                            <Target size={16} />
                          </div>
                          <div className="support-main-content">
                            <div className="support-title-row">
                              <strong>
                                {item.state ||
                                  item.topic ||
                                  "针对性解题辅导与方法归纳"}
                              </strong>
                            </div>
                          </div>
                          <time>{dateTime(item.occurredAt, true)}</time>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="student-home-empty">
                      <p>【{activeDrillKp}】暂无该知识点的学习支持记录。</p>
                    </div>
                  )}
                </section>
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
