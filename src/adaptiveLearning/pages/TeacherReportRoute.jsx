/* eslint-disable complexity, sonarjs/cognitive-complexity, react/prop-types, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- 报告视图保留既有指标与展开状态条件。 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Layers,
  List,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

import StatePanel from "../components/StatePanel";
import TeacherShell from "../components/TeacherShell";
import { useNavigate, useParams } from "../routing";
import {
  fetchClassroomReportView,
} from "../teacher/data/classroomApiRepository";
import { downloadClassroomReportCsv } from "../teacher/domain/classroomReportExport";
import {
  classroomReportMasteryStatus,
  classroomReportText,
} from "../teacher/presentation/classroomReportPresentation";
import { formatPeriodTime } from "../teacher/presentation/teacherDirectoryPresentation";

import "../classroom-assessment.css";

/**
 *
 */
export default function TeacherReportRoute() {
  const navigate = useNavigate();
  const { periodId = "" } = useParams();
  const [reportView, setReportView] = useState({
    period: {},
    students: [],
    knowledgePoints: [],
  });
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // 导航 Tab 状态：'student' (学生分析) | 'knowledge' (知识点分析)
  const [activeTab, setActiveTab] = useState("student");
  const [studentSearch] = useState("");

  // 知识点展开状态集合
  const [expandedKps, setExpandedKps] = useState(new Set());

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    setErrorStatus(null);
    try {
      if (!periodId) throw new Error(classroomReportText("missingPeriod"));
      setReportView(await fetchClassroomReportView(periodId));
    } catch (error_) {
      setReportView({ period: {}, students: [], knowledgePoints: [] });
      setError(error_.message || classroomReportText("loadFailed"));
      setErrorStatus(error_.status || error_.statusCode || null);
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const studentAnalyticsList = reportView.students;
  const knowledgeAnalyticsList = reportView.knowledgePoints;

  // 默认展开所有知识点
  useEffect(() => {
    if (knowledgeAnalyticsList.length > 0) {
      setExpandedKps(new Set(knowledgeAnalyticsList.map((kp) => kp.id)));
    }
  }, [knowledgeAnalyticsList]);

  const periodMeta = reportView.period;

  // 双色对比进度条组件：可视化展示 学前% → 学后%（左右标注学前/学后，隐藏提升数值）
  const MasteryDualProgressBar = ({ pre = null, post = null, size = "md" }) => {
    const preValue = Number.isFinite(Number(pre)) ? Number(pre) : null;
    const postValue = Number.isFinite(Number(post)) ? Number(post) : null;
    const gain =
      preValue == null || postValue == null
        ? 0
        : Math.max(0, postValue - preValue);
    const preWidth = Math.min(Math.max(0, preValue || 0), 100);
    const gainWidth = Math.min(Math.max(0, gain), 100 - preWidth);

    return (
      <div className={`mastery-dual-bar-block ${size}`}>
        <div className="dual-bar-labels">
          <span className="val-pre">
            {classroomReportText("preMastery", {
              value: preValue == null ? "—" : `${Math.round(preValue)}%`,
            })}
          </span>
          <span className="val-arrow">→</span>
          <span className="val-post">
            {classroomReportText("postMastery", {
              value: postValue == null ? "—" : `${Math.round(postValue)}%`,
            })}
          </span>
        </div>
        <div className="dual-bar-track">
          <div
            className="bar-seg-pre"
            style={{ width: `${preWidth}%` }}
            title={classroomReportText("preMasteryTitle", {
              value: preValue == null ? "—" : `${preValue}%`,
            })}
          />
          <div
            className="bar-seg-gain"
            style={{ width: `${gainWidth}%` }}
            title={classroomReportText("postMasteryTitle", {
              value: postValue == null ? "—" : `${postValue}%`,
            })}
          />
        </div>
      </div>
    );
  };

  // 全班学生累计数据
  const totals = useMemo(() => {
    const totalQuestions = studentAnalyticsList.reduce(
      (sum, s) => sum + (s.questionCount || 0),
      0,
    );
    const totalMinutes = studentAnalyticsList.reduce(
      (sum, s) => sum + (s.learningMinutes || 0),
      0,
    );
    const questionStudentCount = studentAnalyticsList.filter(
      (student) => student.questionCount != null,
    ).length;
    const timedStudentCount = studentAnalyticsList.filter(
      (student) => student.learningMinutes != null,
    ).length;
    const avgQuestions =
      questionStudentCount > 0
        ? (totalQuestions / questionStudentCount).toFixed(1)
        : null;
    const avgMinutes =
      timedStudentCount > 0
        ? Math.round(totalMinutes / timedStudentCount)
        : null;
    return { totalQuestions, totalMinutes, avgQuestions, avgMinutes };
  }, [studentAnalyticsList]);

  // 全班整体统计指标
  const overallMetrics = useMemo(() => {
    if (studentAnalyticsList.length === 0) {
      return {
        totalStudents: 0,
        avgPreMastery: 0,
        avgPostMastery: 0,
        avgAccuracy: 0,
        totalQuestions: 0,
        avgQuestions: 0,
      };
    }
    const averagePresent = (values) => {
      const present = values.filter((value) => value != null);
      return present.length > 0
        ? Math.round(
            present.reduce((sum, value) => sum + value, 0) / present.length,
          )
        : null;
    };
    const avgPreMastery = averagePresent(
      studentAnalyticsList.map((student) => student.preMastery),
    );
    const avgPostMastery = averagePresent(
      studentAnalyticsList.map((student) => student.postMastery),
    );
    const avgAccuracy = averagePresent(
      studentAnalyticsList.map((student) => student.accuracy),
    );
    const totalQuestions = studentAnalyticsList.reduce(
      (sum, s) => sum + s.questionCount,
      0,
    );
    const avgQuestions = totals.avgQuestions;

    return {
      totalStudents: studentAnalyticsList.length,
      avgPreMastery,
      avgPostMastery,
      avgGain:
        avgPostMastery == null || avgPreMastery == null
          ? null
          : avgPostMastery - avgPreMastery,
      avgAccuracy,
      totalQuestions,
      avgQuestions,
    };
  }, [studentAnalyticsList, totals.avgQuestions]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentAnalyticsList;
    const q = studentSearch.toLowerCase();
    return studentAnalyticsList.filter((s) => s.name.toLowerCase().includes(q));
  }, [studentAnalyticsList, studentSearch]);

  const toggleKpExpand = (kpId) => {
    setExpandedKps((prev) => {
      const next = new Set(prev);
      if (next.has(kpId)) next.delete(kpId);
      else next.add(kpId);
      return next;
    });
  };

  const exportReport = () => {
    const knowledgeRows = knowledgeAnalyticsList.map((kp) => ({
      id: kp.id,
      name: kp.name,
      averageMastery: kp.avgPost,
      averageConfidence: kp.avgConfidence,
      evidence: kp.totalQuestions,
      unknown: kp.students.filter((s) => s.postMastery == null).length,
    }));
    downloadClassroomReportCsv({
      students: studentAnalyticsList,
      knowledgeRows,
      filename: classroomReportText("exportFilename", { periodId }),
    });
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/adaptive-learning/teacher/textbook-lessons");
    }
  };

  const backBtn = (
    <button className="teacher-neutral" type="button" onClick={handleBack}>
      <ArrowLeft size={15} />
      {classroomReportText("back")}
    </button>
  );

  if (loading) {
    return (
      <TeacherShell
        hideGlobalHeader
        title={classroomReportText("title")}
        leadingAction={backBtn}
        actions={
          <button className="teacher-neutral" disabled>
            <Download size={15} />
            {classroomReportText("export")}
          </button>
        }
      >
        <StatePanel
          tone="loading"
          title={classroomReportText("loadingTitle")}
          description={classroomReportText("loadingDescription")}
        />
      </TeacherShell>
    );
  }

  if (error) {
    const missingReport = errorStatus === 404;
    return (
      <TeacherShell
        hideGlobalHeader
        title={classroomReportText("title")}
        leadingAction={backBtn}
        actions={
          <button className="teacher-neutral" disabled>
            <Download size={15} />
            {classroomReportText("export")}
          </button>
        }
      >
        <StatePanel
          tone="error"
          title={
            missingReport
              ? classroomReportText("missingClass")
              : classroomReportText("loadFailedTitle")
          }
          description={
            missingReport
              ? classroomReportText("missingClassDescription")
              : error
          }
          action={
            <div className="teacher-report-error-actions">
              <button
                className={
                  missingReport ? "teacher-primary" : "teacher-neutral"
                }
                type="button"
                onClick={() =>
                  navigate("/adaptive-learning/teacher/textbook-lessons")
                }
              >
                <List size={15} />
                <span>{classroomReportText("backToLessons")}</span>
              </button>
              <button
                className={
                  missingReport ? "teacher-neutral" : "teacher-primary"
                }
                type="button"
                onClick={loadReport}
              >
                <RefreshCw size={15} />
                <span>{classroomReportText("reload")}</span>
              </button>
            </div>
          }
        />
      </TeacherShell>
    );
  }

  if (
    studentAnalyticsList.length === 0 &&
    knowledgeAnalyticsList.length === 0
  ) {
    return (
      <TeacherShell
        hideGlobalHeader
        title={classroomReportText("title")}
        leadingAction={backBtn}
        actions={
          <button className="teacher-neutral" disabled>
            <Download size={15} />
            {classroomReportText("export")}
          </button>
        }
      >
        <StatePanel
          title={classroomReportText("emptyTitle")}
          description={classroomReportText("emptyDescription")}
          action={
            <button
              className="teacher-primary"
              type="button"
              onClick={loadReport}
            >
              <RefreshCw size={15} />
              {classroomReportText("reload")}
            </button>
          }
        />
      </TeacherShell>
    );
  }

  return (
    <TeacherShell
      hideGlobalHeader
      title={classroomReportText("title")}
      leadingAction={backBtn}
      actions={
        <button
          className="teacher-neutral"
          type="button"
          disabled={studentAnalyticsList.length === 0}
          onClick={exportReport}
        >
          <Download size={15} />
          {classroomReportText("exportResults")}
        </button>
      }
    >
      {/* 顶部高颜值整合信息卡片 */}
      <div className="report-hero-card">
        <div className="hero-main-info">
          <div className="hero-header-row">
            <div className="hero-tags">
              <span className="hero-tag textbook">
                <BookOpen size={13} />
                {periodMeta.courseName || periodMeta.semesterName || "—"}
              </span>
              <span className="hero-tag class-badge">
                <Users size={13} /> {periodMeta.className}
              </span>
            </div>

            <div className="hero-time-badge">
              <span className="time-item">
                <Calendar size={13} />
                {formatPeriodTime(periodMeta.scheduledStartAt)} ~{" "}
                {formatPeriodTime(periodMeta.endsAt)}
              </span>
              <span className="divider">·</span>
              <span className="time-item duration">
                <Clock size={13} />
                {classroomReportText("duration", {
                  duration:
                    periodMeta.durationMinutes == null
                      ? "—"
                      : classroomReportText("minutes", {
                          count: periodMeta.durationMinutes,
                        }),
                })}
              </span>
            </div>
          </div>

          <h1 className="hero-title">{periodMeta.title}</h1>

          {periodMeta.linkedLessonIds.length > 0 && (
            <div className="hero-chapters-bar">
              <span className="chapters-label">
                <Layers size={13} />
                {classroomReportText("linkedLessons", {
                  count: periodMeta.linkedLessonIds.length,
                })}
              </span>
            </div>
          )}
        </div>

        <div className="hero-metrics-grid">
          <div className="hero-metric-item">
            <div className="metric-icon blue">
              <Users size={18} />
            </div>
            <div className="metric-info">
              <span className="metric-label">
                {classroomReportText("participants")}
              </span>
              <div className="metric-val">
                <strong>{overallMetrics.totalStudents}</strong>
                <small>{classroomReportText("participantDetail")}</small>
              </div>
            </div>
          </div>

          <div className="hero-metric-item">
            <div className="metric-icon purple">
              <FileText size={18} />
            </div>
            <div className="metric-info">
              <span className="metric-label">
                {classroomReportText("cumulativePractice")}
              </span>
              <div className="metric-val">
                <strong>{totals.totalQuestions}</strong>
                <small>
                  {classroomReportText("questionAverage", {
                    average:
                      totals.avgQuestions == null ? "—" : totals.avgQuestions,
                  })}
                </small>
              </div>
            </div>
          </div>

          <div className="hero-metric-item">
            <div className="metric-icon orange">
              <Clock size={18} />
            </div>
            <div className="metric-info">
              <span className="metric-label">
                {classroomReportText("cumulativeLearning")}
              </span>
              <div className="metric-val">
                <strong>{totals.totalMinutes}</strong>
                <small>
                  {classroomReportText("minuteAverage", {
                    average:
                      totals.avgMinutes == null ? "—" : totals.avgMinutes,
                  })}
                </small>
              </div>
            </div>
          </div>

          <div className="hero-metric-item highlight-green">
            <div className="metric-icon green">
              <TrendingUp size={18} />
            </div>
            <div className="metric-info wide">
              <span className="metric-label">
                {classroomReportText("masterySummary")}
              </span>
              <MasteryDualProgressBar
                pre={overallMetrics.avgPreMastery}
                post={overallMetrics.avgPostMastery}
                size="lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 顶部一级导航 Tab (学生分析 vs 知识点分析) */}
      <nav
        className="teacher-report-nav-tabs"
        aria-label={classroomReportText("analyticsNavigation")}
      >
        <button
          className={`nav-tab-item ${activeTab === "student" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("student")}
        >
          <Users size={17} />
          <span>{classroomReportText("studentAnalysis")}</span>
        </button>

        <button
          className={`nav-tab-item ${activeTab === "knowledge" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("knowledge")}
        >
          <BookOpen size={17} />
          <span>{classroomReportText("knowledgeAnalysis")}</span>
        </button>
      </nav>

      {/* VIEW 1: 学生分析视图 */}
      {activeTab === "student" && (
        <section className="report-section-card">
          <div className="student-outcomes-table-wrapper">
            <table className="student-outcomes-table">
              <thead>
                <tr>
                  <th>{classroomReportText("student")}</th>
                  <th>{classroomReportText("masteredKnowledge")}</th>
                  <th>{classroomReportText("masteryComparison")}</th>
                  <th>{classroomReportText("accuracy")}</th>
                  <th>{classroomReportText("questionCount")}</th>
                  <th className="th-action" />
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="student-outcome-row"
                    onClick={() =>
                      navigate(
                        `/adaptive-learning/teacher/periods/${periodId}/students/${s.id}`,
                      )
                    }
                  >
                    <td className="td-student-info">
                      <div className="student-avatar-cell">
                        <span className="avatar-circle">
                          {s.name.slice(0, 1)}
                        </span>
                        <div>
                          <strong>{s.name}</strong>
                          <small>
                            {s.learningMinutes == null
                              ? classroomReportText("learningPending")
                              : classroomReportText("learningMinutes", {
                                  count: s.learningMinutes,
                                })}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td className="td-kp-count">
                      <span className="kp-count-pill">
                        {classroomReportText("knowledgeCount", {
                          count: s.knowledgePointCount,
                        })}
                      </span>
                    </td>

                    <td className="td-mastery-dual">
                      <MasteryDualProgressBar
                        pre={s.preMastery}
                        post={s.postMastery}
                        size="sm"
                      />
                    </td>

                    <td className="td-accuracy">
                      <b
                        className={`accuracy-val ${s.accuracy >= 85 ? "high" : s.accuracy >= 65 ? "med" : "low"}`}
                      >
                        {s.accuracy == null ? "—" : `${s.accuracy}%`}
                      </b>
                    </td>

                    <td className="td-questions">
                      <span className="question-count-text">
                        {s.questionCount == null
                          ? "—"
                          : classroomReportText("questions", {
                              count: s.questionCount,
                            })}
                      </span>
                    </td>

                    <td className="td-action">
                      <ChevronRight size={16} className="arrow-icon" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredStudents.length === 0 && (
              <div className="teacher-empty">
                {classroomReportText("noStudentMatch")}
              </div>
            )}
          </div>
        </section>
      )}

      {/* VIEW 2: 知识点分析视图 */}
      {activeTab === "knowledge" && (
        <div className="knowledge-analytics-container">
          {knowledgeAnalyticsList.map((kp) => {
            const isExpanded = expandedKps.has(kp.id);
            return (
              <section key={kp.id} className="kp-analysis-card">
                <header
                  className="kp-card-header"
                  onClick={() => toggleKpExpand(kp.id)}
                >
                  <div className="kp-title-group">
                    <span className="kp-icon-badge">
                      <BookOpen size={16} />
                    </span>
                    <div>
                      <h3>{kp.name}</h3>
                      <p>
                        {classroomReportText("knowledgeAnswerSummary", {
                          students: kp.students.length,
                          average:
                            kp.avgQuestionsPerStudent == null
                              ? "—"
                              : kp.avgQuestionsPerStudent,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="kp-metrics-summary">
                    <div className="kp-metric-box highlight dual-bar-box">
                      <span>{classroomReportText("prePostMastery")}</span>
                      <MasteryDualProgressBar
                        pre={kp.avgPre}
                        post={kp.avgPost}
                        size="md"
                      />
                    </div>

                    <div className="kp-metric-box">
                      <span>{classroomReportText("accuracy")}</span>
                      <strong>
                        {kp.avgAccuracy == null ? "—" : `${kp.avgAccuracy}%`}
                      </strong>
                    </div>

                    <div className="kp-metric-box">
                      <span>{classroomReportText("masteredStudents")}</span>
                      <strong className="success-text">
                        {classroomReportText("masteredCount", {
                          mastered: kp.masteredCount,
                          total: kp.students.length,
                        })}
                      </strong>
                    </div>

                    <button
                      className="btn-toggle-expand"
                      type="button"
                      aria-label={classroomReportText("toggleDetails")}
                    >
                      {isExpanded ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>
                  </div>
                </header>

                {isExpanded && (
                  <div className="kp-students-detail-panel">
                    <div className="kp-detail-subhead">
                      <h4>
                        {classroomReportText("studentDetails", {
                          count: kp.students.length,
                        })}
                      </h4>
                    </div>

                    <div className="kp-student-grid">
                      {kp.students.map((st) => (
                        <div
                          key={st.studentId}
                          className="kp-student-item-card"
                          onClick={() =>
                            navigate(
                              `/adaptive-learning/teacher/periods/${periodId}/students/${st.studentId}`,
                            )
                          }
                        >
                          <div className="st-card-top">
                            <span className="st-avatar">
                              {st.studentName.slice(0, 1)}
                            </span>
                            <div className="st-name-wrap">
                              <strong>{st.studentName}</strong>
                              <span
                                className={`st-status-badge ${st.status.toLowerCase()}`}
                              >
                                {classroomReportMasteryStatus(st.status)}
                              </span>
                            </div>
                          </div>

                          <div className="st-card-metrics">
                            <div className="metric-row bar-row">
                              <MasteryDualProgressBar
                                pre={st.preMastery}
                                post={st.postMastery}
                                size="xs"
                              />
                            </div>
                            <div className="metric-row">
                              <span>
                                {classroomReportText("answerPerformance")}
                              </span>
                              <span>
                                {classroomReportText("answerSummary", {
                                  count: st.questionCount,
                                  accuracy:
                                    st.accuracy == null
                                      ? "—"
                                      : `${st.accuracy}%`,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}

          {knowledgeAnalyticsList.length === 0 && (
            <div className="teacher-empty">
              {classroomReportText("noKnowledgeComparison")}
            </div>
          )}
        </div>
      )}
    </TeacherShell>
  );
}
