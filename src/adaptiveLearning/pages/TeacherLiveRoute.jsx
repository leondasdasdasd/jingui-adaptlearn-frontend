/* eslint-disable complexity, sonarjs/cognitive-complexity, promise/always-return, unicorn/explicit-length-check -- 保留课堂实时事件与预警的既有状态分支。 */

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  HandHelping,
  LoaderCircle,
  Play,
  Radio,
  TimerReset,
  Wifi,
} from "lucide-react";

import EndClassroomDialog from "../components/EndClassroomDialog";
import StartClassDialog from "../components/StartClassDialog";
import StatePanel from "../components/StatePanel";
import {
  classroomActionError,
  helpReasonLabel,
  liveCurrentContent,
  liveStageLabel,
  liveText,
  liveWarningLabel,
  shortTime,
  snapshotText,
  supportSourceLabel,
} from "../components/teacher-live/presentation";
import TeacherLiveDirectory from "../components/teacher-live/TeacherLiveDirectory";
import TeacherShell from "../components/TeacherShell";
import { useNavigate, useParams } from "../routing";
import { getLearningPeriod } from "../shared/infrastructure/classroomApi";
import {
  acknowledgeAttentionAlert,
  acknowledgeHelpRequest,
  acknowledgeSupportHelpRequest,
  confirmAttentionAlertInvalid,
  endClassroom as completeClassroom,
  fetchAttentionAlerts,
  fetchClassroomReports,
  fetchClassroomSnapshot,
  fetchHelpRequests,
  fetchSupportHelpRequests,
  fetchTeacherLearningPeriods,
  markAttentionAlertFalsePositive,
  resolveHelpRequest,
  resolveSupportHelpRequest,
  subscribeClassroom,
} from "../teacher/data/classroomApiRepository";
import { buildClassroomStudents } from "../teacher/domain/teacherClassroom";

/**
 *
 */
export default function TeacherLiveRoute() {
  const navigate = useNavigate();
  const { periodId = "" } = useParams();
  const hasPeriod = Boolean(periodId);

  const [snapshot, setSnapshot] = useState({
    sessions: [],
    recentEvents: [],
    answers: [],
  });
  const [reports, setReports] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [supportHelpRequests, setSupportHelpRequests] = useState([]);
  const [attentionAlerts, setAttentionAlerts] = useState([]);
  const [attentionBusy, setAttentionBusy] = useState("");
  const [period, setPeriod] = useState(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  const [endingClassroom, setEndingClassroom] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [endClassroomError, setEndClassroomError] = useState("");
  const [operationNotice, setOperationNotice] = useState("");

  // Initiated classrooms card list states
  const [startClassOpen, setStartClassOpen] = useState(false);
  const [initiatedPeriods, setInitiatedPeriods] = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

  const refresh = async () => {
    if (!periodId) return;
    try {
      const [
        nextSnapshot,
        nextReports,
        nextPeriod,
        nextHelpRequests,
        nextAttentionAlerts,
      ] = await Promise.all([
        fetchClassroomSnapshot(periodId),
        fetchClassroomReports(periodId),
        getLearningPeriod(periodId),
        fetchHelpRequests(periodId),
        fetchAttentionAlerts(periodId),
      ]);

      setSnapshot(
        nextSnapshot || { sessions: [], recentEvents: [], answers: [] },
      );
      setReports(Array.isArray(nextReports) ? nextReports : []);
      setPeriod(nextPeriod || null);
      setError("");
      setHelpRequests(Array.isArray(nextHelpRequests) ? nextHelpRequests : []);
      setAttentionAlerts(
        Array.isArray(nextAttentionAlerts) ? nextAttentionAlerts : [],
      );
    } catch {
      setError(liveText("dataLoadFailed", "课堂数据加载失败，请重试"));
    }
  };

  const refreshSupport = async () => {
    try {
      const payload = await fetchSupportHelpRequests();
      setSupportHelpRequests(
        Array.isArray(payload) ? payload : payload?.items || [],
      );
    } catch {
      // Ignore background error to avoid displaying 500 error banner on list view
    }
  };

  const loadInitiatedPeriods = async () => {
    setLoadingPeriods(true);
    try {
      const periods = await fetchTeacherLearningPeriods();
      setInitiatedPeriods(Array.isArray(periods) ? periods : []);
      setError("");
    } catch {
      setInitiatedPeriods([]);
      setError(liveText("listLoadFailed", "课堂列表加载失败，请重试"));
    } finally {
      setLoadingPeriods(false);
    }
  };

  useEffect(() => {
    if (!hasPeriod) {
      void loadInitiatedPeriods();
    }
  }, [hasPeriod]);

  useEffect(() => {
    if (!periodId) {
      setConnected(false);
      return;
    }
    const controller = new AbortController();
    let refreshTimer;
    let reconnectTimer;
    let reconnectDelay = 500;
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 15_000);

    const connect = () => {
      if (controller.signal.aborted) return;
      subscribeClassroom(
        periodId,
        (event) => {
          reconnectDelay = 500;
          setConnected(true);
          if (["connected", "heartbeat"].includes(event.type)) return;
          window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(() => {
            void refresh();
          }, 150);
        },
        controller.signal,
      )
        .then(() => {
          if (controller.signal.aborted) return;
          setConnected(false);
          reconnectTimer = window.setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
        })
        .catch((streamError) => {
          if (streamError.name === "AbortError" || controller.signal.aborted)
            return;
          setConnected(false);
          setError(liveText("connectionFailed", "实时连接中断，正在重试"));
          reconnectTimer = window.setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
        });
    };
    connect();
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.clearTimeout(refreshTimer);
      window.clearTimeout(reconnectTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId]);

  useEffect(() => {
    void refreshSupport();
    const timer = window.setInterval(() => {
      void refreshSupport();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!operationNotice) return;
    const timer = window.setTimeout(() => setOperationNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [operationNotice]);

  const students = useMemo(
    () => buildClassroomStudents(snapshot, reports),
    [snapshot, reports],
  );
  const classroomEnded = period?.status === "COMPLETED";
  const alerts = students.flatMap((student) =>
    student.warnings.map((warning) => ({ ...warning, student })),
  );
  const studentBySession = Object.fromEntries(
    students.map((student) => [student.sessionId, student]),
  );
  const visibleHelpRequests = [...supportHelpRequests, ...helpRequests].sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
  );

  const activeAttentionStudentIds = new Set([
    ...alerts.map((item) => item.student.id),
    ...visibleHelpRequests
      .map(
        (item) => item.studentId || studentBySession[item.studentSessionId]?.id,
      )
      .filter(Boolean),
    ...attentionAlerts
      .map(
        (item) => item.studentId || studentBySession[item.studentSessionId]?.id,
      )
      .filter(Boolean),
  ]);

  const scored = students.filter((student) => student.accuracy != null);
  const average =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, student) => sum + student.accuracy, 0) /
            scored.length,
        )
      : null;
  const inactive = students.filter((student) =>
    student.warnings.some((warning) => warning.type === "inactive"),
  ).length;
  const openStudent = (studentId) =>
    navigate(
      `/adaptive-learning/teacher/periods/${periodId}/students/${studentId}`,
    );

  const updateAttention = async (key, action) => {
    setAttentionBusy(key);
    setError("");
    try {
      await action();
      await Promise.all([refresh(), refreshSupport()]);
    } catch {
      setError(liveText("actionFailed", "操作失败，请重试"));
    } finally {
      setAttentionBusy("");
    }
  };

  const handleEndClassroom = async () => {
    setEndingClassroom(true);
    setEndClassroomError("");
    setError("");
    try {
      const settledReports = await completeClassroom(periodId);
      if (Array.isArray(settledReports)) setReports(settledReports);
      setPeriod((current) =>
        current ? { ...current, status: "COMPLETED" } : current,
      );
      setEndConfirmOpen(false);
      setOperationNotice(
        liveText("endedNotice", "课堂已结束，学习记录已完成结算"),
      );
      await refresh();
    } catch (requestError) {
      setEndClassroomError(classroomActionError(requestError));
    } finally {
      setEndingClassroom(false);
    }
  };

  const filteredPeriods = useMemo(() => {
    return initiatedPeriods.filter((p) => {
      const isCompleted = p.status === "COMPLETED";
      if (filterStatus === "ACTIVE") return !isCompleted;
      if (filterStatus === "COMPLETED") return isCompleted;
      return true;
    });
  }, [initiatedPeriods, filterStatus]);

  const remainingSeconds =
    students.length > 0
      ? Math.max(
          0,
          Math.floor(
            (new Date(students[0].endsAt).getTime() - Date.now()) / 1000,
          ),
        )
      : 0;
  const remainingText = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  const helpRequestPanel = (
    <section className="live-help-requests">
      <header>
        <div>
          <HandHelping size={16} />
          <h2>{liveText("studentHelp", "学生求助")}</h2>
        </div>
        <span>
          {liveText("pendingItems", "{$count} 项待处理", {
            count: visibleHelpRequests.length,
          })}
        </span>
      </header>
      {visibleHelpRequests.map((request) => {
        const student = studentBySession[request.studentSessionId];
        const requestKey = `help:${request.id}`;
        const persistentSupport = Boolean(request.supportSessionId);
        return (
          <article
            className={request.status === "ACKNOWLEDGED" ? "acknowledged" : ""}
            key={`${persistentSupport ? "support" : "classroom"}:${request.id}`}
          >
            <button
              className="attention-card-main"
              type="button"
              onClick={() => student && openStudent(student.id)}
            >
              <HandHelping size={17} />
              <span>
                <strong>
                  {request.studentName ||
                    student?.name ||
                    liveText("student", "学生")}
                </strong>
                <b>
                  {helpReasonLabel(request.reasonCode)}
                </b>
                <small>
                  {supportSourceLabel(request)} ·{" "}
                  {shortTime(request.requestedAt || request.createdAt)} ·{" "}
                  {snapshotText(request.questionSnapshot).slice(0, 34) ||
                    request.questionSnapshot?.pageTitle ||
                    liveText("currentLearningPage", "当前学习页面")}
                </small>
              </span>
            </button>
            {request.note && (
              <p className="attention-card-note">
                <strong>{liveText("additionalNote", "补充说明：")}</strong>
                {request.note}
              </p>
            )}
            <div className="attention-card-actions">
              {request.status !== "ACKNOWLEDGED" && (
                <button
                  type="button"
                  aria-busy={attentionBusy === requestKey}
                  disabled={attentionBusy === requestKey}
                  onClick={() => {
                    void updateAttention(requestKey, () =>
                      persistentSupport
                        ? acknowledgeSupportHelpRequest(request.id)
                        : acknowledgeHelpRequest(periodId, request.id),
                    );
                  }}
                >
                  {attentionBusy === requestKey && (
                    <LoaderCircle className="spin" size={14} />
                  )}
                  {liveText("handleRequest", "我来处理")}
                </button>
              )}
              {request.status === "ACKNOWLEDGED" && (
                <button
                  type="button"
                  aria-busy={attentionBusy === requestKey}
                  disabled={attentionBusy === requestKey}
                  onClick={() => {
                    void updateAttention(requestKey, () =>
                      persistentSupport
                        ? resolveSupportHelpRequest(request.id)
                        : resolveHelpRequest(periodId, request.id),
                    );
                  }}
                >
                  {attentionBusy === requestKey && (
                    <LoaderCircle className="spin" size={14} />
                  )}
                  {liveText("resolved", "已解决")}
                </button>
              )}
            </div>
          </article>
        );
      })}
      {visibleHelpRequests.length === 0 && (
        <div className="live-attention-empty">
          {liveText("noStudentHelp", "当前没有学生求助")}
        </div>
      )}
    </section>
  );

  return (
    <TeacherShell
      hideGlobalHeader={hasPeriod}
      title={
        hasPeriod
          ? period?.title || liveText("title", "实时课堂")
          : undefined
      }
      leadingAction={
        hasPeriod ? (
          <button
            className="teacher-neutral"
            onClick={() => navigate("/adaptive-learning/teacher/live")}
          >
            <ArrowLeft size={15} />
            {liveText("back", "返回")}
          </button>
        ) : undefined
      }
      actions={
        hasPeriod ? (
          <>
            {!classroomEnded && (
              <button
                className="teacher-neutral"
                disabled={endingClassroom}
                onClick={() => {
                  setEndClassroomError("");
                  setEndConfirmOpen(true);
                }}
              >
                {liveText("endClass", "下课")}
              </button>
            )}
            {classroomEnded && (
              <button
                className="teacher-neutral"
                onClick={() =>
                  navigate(
                    `/adaptive-learning/teacher/periods/${periodId}/report`,
                  )
                }
              >
                {liveText("viewReport", "查看课堂报告")}
              </button>
            )}
            <button
              className="teacher-primary"
              onClick={() => setStartClassOpen(true)}
            >
              <Play size={15} fill="currentColor" />
              {liveText("startNextClass", "开启下一堂课")}
            </button>
          </>
        ) : undefined
      }
    >
      {operationNotice && (
        <div className="operation-feedback-toast success" role="status">
          <span>
            <CheckCircle2 size={14} />
          </span>
          {operationNotice}
        </div>
      )}
      {error && (
        <div className="teacher-notice error" role="alert">
          {error}
        </div>
      )}

      {/* INITIATED LIVE CLASSROOM CARDS DIRECTORY WHEN NO PERIOD ID IS IN URL */}
      {hasPeriod ? (
        /* ACTIVE CLASSROOM MONITORING DASHBOARD WHEN PERIOD ID IS PRESENT */
        <>
          <div className={`live-banner${classroomEnded ? " ended" : ""}`}>
            <div>
              <span className="live-pulse">
                <Radio size={16} />
                {classroomEnded
                  ? liveText("classEnded", "课堂已结束")
                  : connected
                    ? liveText("connected", "实时连接中")
                    : liveText("connecting", "正在连接")}
              </span>
              <strong>
                {classroomEnded
                  ? liveText("recordsSettled", "学习记录已结算")
                  : students.length > 0
                    ? liveText("remaining", "剩余 {$time}", {
                        time: remainingText,
                      })
                    : liveText("waitingForStudents", "等待学生进入")}
              </strong>
            </div>
            <div>
              <Wifi size={16} />
              {liveText("onlineCount", "{$count} 人在线", {
                count: students.filter((student) => student.online).length,
              })}
            </div>
          </div>

          <div className="live-kpis">
            <div>
              <span>{liveText("onlineLearning", "在线学习")}</span>
              <strong>
                {students.filter((student) => student.online).length}
              </strong>
            </div>
            <div>
              <span>{liveText("needsAttention", "需要关注")}</span>
              <strong className="danger-number">
                {activeAttentionStudentIds.size}
              </strong>
              <small>
                {liveText(
                  "helpAndAlerts",
                  "{$help} 项求助 · {$alerts} 项预警",
                  {
                    help: visibleHelpRequests.length,
                    alerts: attentionAlerts.length + alerts.length,
                  },
                )}
              </small>
            </div>
            <div>
              <span>{liveText("averageAccuracy", "平均正确率")}</span>
              <strong>{average == null ? "—" : `${average}%`}</strong>
              <small>{liveText("scoredStudents", "有有效作答学生")}</small>
            </div>
            <div>
              <span>{liveText("inactiveFiveMinutes", "5 分钟无变化")}</span>
              <strong className={inactive ? "danger-number" : ""}>
                {inactive}
              </strong>
              <small>
                {liveText("confirmLearningStatus", "需要确认学习状态")}
              </small>
            </div>
          </div>

          <div className="live-layout">
            <section className="live-students">
              <header>
                <div>
                  <h2>{liveText("studentProgress", "学生实时进度")}</h2>
                  <span>{liveText("alertsFirst", "预警优先")}</span>
                </div>
              </header>
              <div className="live-table-head">
                <span>{liveText("student", "学生")}</span>
                <span>{liveText("currentStage", "当前环节")}</span>
                <span>{liveText("learningProgress", "学习进度")}</span>
                <span>{liveText("accuracy", "正确率")}</span>
                <span>{liveText("status", "状态")}</span>
                <span />
              </div>
              {[...students]
                .sort((a, b) => b.warnings.length - a.warnings.length)
                .map((student) => (
                  <button
                    className={`live-student-row ${student.tone}`}
                    key={student.id}
                    type="button"
                    onClick={() => openStudent(student.id)}
                  >
                    <div>
                      <strong>{student.name}</strong>
                      <small>
                        {student.lastActivityMinutes
                          ? liveText(
                              "activityMinutesAgo",
                              "{$count} 分钟前有变化",
                              { count: student.lastActivityMinutes },
                            )
                          : liveText("activityJustNow", "刚刚有学习变化")}
                      </small>
                    </div>
                    <span>
                      <b>{liveStageLabel(student.stageCode)}</b>
                      <small>{liveCurrentContent(student)}</small>
                    </span>
                    <div className="row-progress">
                      <span>
                        <i style={{ width: `${student.progress}%` }} />
                      </span>
                      <b>{student.progress}%</b>
                    </div>
                    <strong>
                      {student.accuracy == null ? "—" : `${student.accuracy}%`}
                    </strong>
                    <span
                      className={
                        student.warning
                          ? `alert-text ${student.tone}`
                          : "ok-text"
                      }
                    >
                      {student.warning ? (
                        <AlertTriangle size={15} />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      {student.sessionStatus === "SETTLED"
                        ? liveText("settled", "已结算")
                        : student.warnings.length > 0
                          ? liveWarningLabel(student.warnings[0])
                          : liveText("normal", "学习正常")}
                    </span>
                    <Eye size={16} />
                  </button>
                ))}
              {students.length === 0 && (
                <StatePanel
                  compact
                  title={liveText("waitingTitle", "等待学生进入课堂")}
                  description={liveText(
                    "waitingDescription",
                    "学生进入后，这里会实时显示学习进度和需要关注的状态",
                  )}
                />
              )}
            </section>

            <aside className="live-attention-panel">
              {helpRequestPanel}
              <section className="live-ai-alerts">
                <header>
                  <div>
                    <AlertTriangle size={16} />
                    <h2>{liveText("learningAlerts", "学习预警")}</h2>
                  </div>
                  <span>
                    {liveText("alertsPending", "{$count} 项待关注", {
                      count: attentionAlerts.length + alerts.length,
                    })}
                  </span>
                </header>
                {attentionAlerts.map((alert) => {
                  const student = studentBySession[alert.studentSessionId];
                  const alertKey = `alert:${alert.id}`;
                  const evidenceItems = Array.isArray(alert.evidenceHistory)
                    ? alert.evidenceHistory
                    : alert.evidence || [];
                  const evidence =
                    evidenceItems.at(-1) || alert.latestEvidence || {};
                  const evidencePayload = evidence.payload || evidence;
                  const level = alert.level || alert.severity || "WARNING";
                  return (
                    <article
                      className={`attention-alert-card ${String(level).toLowerCase()}`}
                      key={alert.id}
                    >
                      <button
                        className="attention-card-main"
                        type="button"
                        onClick={() => student && openStudent(student.id)}
                      >
                        <AlertTriangle size={17} />
                        <span>
                          <strong>
                            {alert.studentName ||
                              student?.name ||
                              liveText("student", "学生")}
                          </strong>
                          <b>
                            {["RED", "DANGER"].includes(level)
                              ? liveText("highPriorityPrefix", "高优先级 · ")
                              : ""}
                            {liveText(
                              "suspectedInvalidAnswers",
                              "疑似连续无效作答",
                            )}
                          </b>
                          <small>
                            {alert.occurrenceCount ||
                              alert.signalCount ||
                              evidenceItems.length ||
                              0}{" "}
                            {liveText("timesPrefix", "次 · ")}
                            {snapshotText(
                              evidencePayload.answerSnapshot ||
                                evidencePayload.answer,
                            ).slice(0, 30) ||
                              liveText(
                                "viewStudentRecord",
                                "点击查看学生记录",
                              )}
                          </small>
                        </span>
                      </button>
                      <div className="attention-card-actions">
                        {alert.status === "ACKNOWLEDGED" ? (
                          <button
                            type="button"
                            aria-busy={attentionBusy === alertKey}
                            disabled={attentionBusy === alertKey}
                            onClick={() => {
                              void updateAttention(alertKey, () =>
                                confirmAttentionAlertInvalid(
                                  periodId,
                                  alert.id,
                                ),
                              );
                            }}
                          >
                            {attentionBusy === alertKey && (
                              <LoaderCircle className="spin" size={14} />
                            )}
                            {liveText("confirmInvalid", "确认无效")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-busy={attentionBusy === alertKey}
                            disabled={attentionBusy === alertKey}
                            onClick={() => {
                              void updateAttention(alertKey, () =>
                                acknowledgeAttentionAlert(periodId, alert.id),
                              );
                            }}
                          >
                            {attentionBusy === alertKey && (
                              <LoaderCircle className="spin" size={14} />
                            )}
                            {liveText("acknowledged", "已关注")}
                          </button>
                        )}
                        <button
                          type="button"
                          aria-busy={attentionBusy === alertKey}
                          disabled={attentionBusy === alertKey}
                          onClick={() => {
                            void updateAttention(alertKey, () =>
                              markAttentionAlertFalsePositive(
                                periodId,
                                alert.id,
                              ),
                            );
                          }}
                        >
                          {attentionBusy === alertKey && (
                            <LoaderCircle className="spin" size={14} />
                          )}
                          {liveText("falsePositive", "误判")}
                        </button>
                      </div>
                    </article>
                  );
                })}
                {alerts.map((item, index) => (
                  <button
                    className="derived-alert-card"
                    key={`${item.student.id}-${item.type}-${index}`}
                    type="button"
                    onClick={() => openStudent(item.student.id)}
                  >
                    {item.type === "inactive" ? (
                      <TimerReset size={17} />
                    ) : (
                      <AlertTriangle size={17} />
                    )}
                    <span>
                      <strong>{item.student.name}</strong>
                      <b>{liveWarningLabel(item)}</b>
                      <small>
                        {liveStageLabel(item.student.stageCode)} ·{" "}
                        {item.student.kp}
                      </small>
                    </span>
                  </button>
                ))}
                {attentionAlerts.length === 0 && alerts.length === 0 && (
                  <div className="live-attention-empty">
                    {liveText("noAlerts", "当前没有需要关注的预警")}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </>
      ) : (
        <TeacherLiveDirectory
          filterStatus={filterStatus}
          filteredPeriods={filteredPeriods}
          initiatedPeriods={initiatedPeriods}
          loadingPeriods={loadingPeriods}
          navigate={navigate}
          onFilterChange={setFilterStatus}
          onStartClass={() => setStartClassOpen(true)}
        />
      )}

      {endConfirmOpen && (
        <EndClassroomDialog
          className={period?.className}
          lessonTitle={period?.title}
          studentCount={students.length}
          onlineCount={students.filter((student) => student.online).length}
          pending={endingClassroom}
          error={endClassroomError}
          onCancel={() => setEndConfirmOpen(false)}
          onConfirm={handleEndClassroom}
        />
      )}

      {/* Start Class Dialog */}
      <StartClassDialog
        open={startClassOpen}
        onClose={() => setStartClassOpen(false)}
      />
    </TeacherShell>
  );
}
