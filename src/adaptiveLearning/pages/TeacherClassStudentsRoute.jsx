import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldOff,
  Users,
} from "lucide-react";

import StatePanel from "../components/StatePanel";
import TeacherShell from "../components/TeacherShell";
import { useNavigate, useParams } from "../routing";
import { classroomStudentAccessUrl } from "../shared/contracts/classroomAccessLink";
import {
  CLASS_ROSTER_ISSUES,
  fetchTeacherClassRosterView,
  forgetCurrentClass,
  revokeClassStudentAccessCredential,
  rotateClassStudentAccessCredential,
} from "../teacher/data/classroomApiRepository";
import {
  classRosterCredentialStatus,
  classRosterOperationFailed,
  classRosterText,
  classRosterTime,
} from "../teacher/presentation/classRosterPresentation";

import "../class-roster.css";

/**
 *
 * @param student
 */
function copyableAccessToken(student) {
  const credential = student.credential;
  return credential.status === "ACTIVE" &&
    typeof credential.accessToken === "string"
    ? credential.accessToken
    : "";
}

/**
 *
 * @param value
 */
async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("aria-hidden", "true");
  textarea.tabIndex = -1;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.append(textarea);
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    if (!document.execCommand("copy")) throw new Error("CLIPBOARD_DENIED");
  } finally {
    textarea.remove();
  }
}

/**
 *
 */
export default function TeacherClassStudentsRoute() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    classInfo: null,
    students: [],
    error: "",
    errorIssue: "",
  });
  const [query, setQuery] = useState("");
  const [busyStudentId, setBusyStudentId] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState("info");
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ completed: 0, total: 0 });

  const showNotice = useCallback((message, tone = "info") => {
    setNotice(message);
    setNoticeTone(tone);
  }, []);

  const load = useCallback(
    async ({ background = false } = {}) => {
      setState((current) => ({
        ...current,
        loading: background ? current.loading : true,
        error: "",
        errorIssue: "",
      }));
      try {
        const roster = await fetchTeacherClassRosterView(classId, {
          cache: "no-store",
        });
        setState({
          loading: false,
          classInfo: roster.classInfo,
          students: roster.students,
          error: "",
          errorIssue: "",
        });
      } catch (error) {
        if (background) {
          showNotice(
            classRosterText(
              "notice.backgroundRefreshFailed",
              "暂时无法获取最新班级数据，正在显示上一次结果。",
            ),
            "warning",
          );
          return;
        }
        if (error.code === CLASS_ROSTER_ISSUES.CLASS_NOT_FOUND)
          forgetCurrentClass();
        setState((current) => ({
          ...current,
          loading: false,
          error: classRosterText(
            "error.loadDescription",
            "暂时无法读取班级花名册，请稍后重试。",
          ),
          errorIssue: error.code || CLASS_ROSTER_ISSUES.ROSTER_LOAD_FAILED,
        }));
      }
    },
    [classId, showNotice],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load({ background: true });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const students = useMemo(
    () =>
      state.students.filter((student) => {
        const keyword = query.trim().toLowerCase();
        return (
          !keyword ||
          String(student.studentName || "")
            .toLowerCase()
            .includes(keyword) ||
          String(student.studentId || "")
            .toLowerCase()
            .includes(keyword)
        );
      }),
    [query, state.students],
  );
  const activeCount = state.students.filter(
    (student) => Number(student.activity.sessionCount || 0) > 0,
  ).length;
  const issuedCount = state.students.filter(
    (student) => student.credential.status === "ACTIVE",
  ).length;
  const copyableCount = state.students.filter((student) =>
    Boolean(copyableAccessToken(student)),
  ).length;
  const anyBusy = Boolean(busyStudentId) || bulkGenerating;

  const copyLink = async (student) => {
    const link = classroomStudentAccessUrl(
      student.studentId,
      copyableAccessToken(student),
    );
    if (!link) {
      showNotice(
        classRosterText(
          "notice.noCopyableLink",
          "该学生暂无可复制的有效链接，请先生成新链接。",
        ),
        "warning",
      );
      return;
    }
    try {
      await copyText(link);
      showNotice(
        classRosterText("notice.linkCopied", "已复制 {$name} 的学习链接", {
          name: student.studentName,
        }),
        "success",
      );
    } catch {
      showNotice(
        classRosterText(
          "notice.copyFailed",
          "复制失败，浏览器未允许访问剪贴板。请允许后再次点击复制。",
        ),
        "error",
      );
    }
  };

  const copyAllLinks = async () => {
    const lines = state.students
      .map((student) => {
        const link = classroomStudentAccessUrl(
          student.studentId,
          copyableAccessToken(student),
        );
        return link
          ? `${student.rosterNumber || ""}\t${student.studentName}\t${student.studentId}\t${link}`
          : "";
      })
      .filter(Boolean);
    if (lines.length === 0) {
      showNotice(
        classRosterText(
          "notice.noCopyableLinks",
          "当前没有可复制的有效链接，请先生成全班或单个学生链接。",
        ),
        "warning",
      );
      return;
    }
    try {
      await copyText(
        [
          classRosterText(
            "exportHeader",
            "序号\t姓名\t固定 ID\t学习链接",
          ),
          ...lines,
        ].join("\n"),
      );
      showNotice(
        classRosterText(
          "notice.linksCopied",
          "已复制 {$count} 位学生的学习链接，可按姓名分别发送",
          { count: lines.length },
        ),
        "success",
      );
    } catch {
      showNotice(
        classRosterText(
          "notice.copyAllFailed",
          "复制失败，浏览器未允许访问剪贴板。已生成的链接仍保留在当前页面，可重试复制。",
        ),
        "error",
      );
    }
  };

  const rotate = async (student) => {
    const studentId = student.studentId;
    const hadActiveCredential = student.credential.status === "ACTIVE";
    if (
      hadActiveCredential &&
      !window.confirm(
        classRosterText(
          "confirm.rotate",
          "重新生成后，{$name} 的旧链接会立即失效。确认继续？",
          { name: student.studentName },
        ),
      )
    )
      return;
    setBusyStudentId(studentId);
    showNotice("");
    try {
      const credential = await rotateClassStudentAccessCredential(
        classId,
        studentId,
      );
      if (!credential.accessToken) throw new Error("MISSING_ACCESS_TOKEN");
      setState((current) => ({
        ...current,
        students: current.students.map((item) =>
          item.studentId === studentId
            ? {
                ...item,
                credential: {
                  ...item.credential,
                  ...credential,
                  status: "ACTIVE",
                },
              }
            : item,
        ),
      }));
      showNotice(
        classRosterText(
          hadActiveCredential
            ? "notice.linkRotated"
            : "notice.linkGenerated",
          hadActiveCredential
            ? "已为 {$name} 生成新链接，旧链接已失效，可随时复制发送。"
            : "已为 {$name} 生成新链接，可随时复制发送。",
          { name: student.studentName },
        ),
        "success",
      );
    } catch {
      showNotice(classRosterOperationFailed("rotate"), "error");
    } finally {
      setBusyStudentId("");
    }
  };

  const rotateAll = async () => {
    if (state.students.length === 0) {
      showNotice(
        classRosterText(
          "notice.emptyClass",
          "当前班级没有预设学生，无法生成学习链接。",
        ),
        "warning",
      );
      return;
    }
    if (
      !window.confirm(
        classRosterText(
          issuedCount ? "confirm.rotateAll" : "confirm.generateAll",
          issuedCount
            ? "将为全班 {$count} 位学生重新生成学习链接，已有旧链接会立即失效。确认继续？"
            : "将为全班 {$count} 位学生生成学习链接。确认继续？",
          { count: state.students.length },
        ),
      )
    )
      return;
    setBulkGenerating(true);
    setBulkProgress({ completed: 0, total: state.students.length });
    showNotice("");
    let completed = 0;
    const results = await Promise.allSettled(
      state.students.map(async (student) => {
        const studentId = student.studentId;
        try {
          const credential = await rotateClassStudentAccessCredential(
            classId,
            studentId,
          );
          if (!credential.accessToken)
            throw new Error("MISSING_ACCESS_TOKEN");
          return {
            studentId,
            credential,
          };
        } finally {
          completed += 1;
          setBulkProgress({ completed, total: state.students.length });
        }
      }),
    );
    const generated = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const credentialsById = Object.fromEntries(
      generated.map((item) => [item.studentId, item]),
    );
    setState((current) => ({
      ...current,
      students: current.students.map((student) => {
        const generatedCredential = credentialsById[student.studentId];
        return generatedCredential
          ? {
              ...student,
              credential: {
                ...student.credential,
                ...generatedCredential.credential,
                status: "ACTIVE",
              },
            }
          : student;
      }),
    }));
    const failedCount = results.length - generated.length;
    if (!failedCount) {
      showNotice(
        classRosterText(
          issuedCount
            ? "notice.allLinksRotated"
            : "notice.allLinksGenerated",
          issuedCount
            ? "已生成全班 {$count} 位学生的新链接，旧链接已失效，可随时复制并分别发送。"
            : "已生成全班 {$count} 位学生的新链接，可随时复制并分别发送。",
          { count: generated.length },
        ),
        "success",
      );
    } else if (generated.length > 0) {
      showNotice(
        classRosterText(
          "notice.partialGenerated",
          "已生成 {$success} 位学生的新链接，{$failed} 位生成失败。成功链接已保留，可先复制后再逐个重试。",
          { success: generated.length, failed: failedCount },
        ),
        "warning",
      );
    } else {
      showNotice(classRosterOperationFailed("rotateAll"), "error");
    }
    setBulkGenerating(false);
  };

  const revoke = async (student) => {
    const studentId = student.studentId;
    if (
      !window.confirm(
        classRosterText(
          "confirm.revoke",
          "确认停用 {$name} 的固定链接？",
          { name: student.studentName },
        ),
      )
    )
      return;
    setBusyStudentId(studentId);
    showNotice("");
    try {
      await revokeClassStudentAccessCredential(classId, studentId);
      setState((current) => ({
        ...current,
        students: current.students.map((item) =>
          item.studentId === studentId
            ? {
                ...item,
                credential: {
                  ...item.credential,
                  status: "REVOKED",
                  accessToken: "",
                },
              }
            : item,
        ),
      }));
      showNotice(
        classRosterText(
          "notice.linkRevoked",
          "已停用 {$name} 的学习链接",
          { name: student.studentName },
        ),
        "success",
      );
    } catch {
      showNotice(classRosterOperationFailed("revoke"), "error");
    } finally {
      setBusyStudentId("");
    }
  };

  return (
    <TeacherShell
      hideGlobalHeader
      title={
        state.classInfo?.className ||
        classRosterText("titleFallback", "班级学生")
      }
      leadingAction={
        <button
          className="teacher-neutral"
          type="button"
          onClick={() => navigate("/adaptive-learning/teacher/classes")}
        >
          <ArrowLeft size={15} />
          <span>{classRosterText("back", "返回")}</span>
        </button>
      }
      actions={
        <div className="class-roster-header-actions">
          <button
            className="teacher-secondary"
            type="button"
            onClick={() => {
              void rotateAll();
            }}
            disabled={state.loading || anyBusy || state.students.length === 0}
            aria-busy={bulkGenerating || undefined}
          >
            {bulkGenerating ? (
              <LoaderCircle className="class-roster-spin" size={15} />
            ) : issuedCount ? (
              <RefreshCw size={15} />
            ) : (
              <KeyRound size={15} />
            )}
            <span>
              {bulkGenerating
                ? classRosterText(
                    "generatingProgress",
                    "正在生成 {$completed}/{$total}",
                    bulkProgress,
                  )
                : issuedCount
                  ? classRosterText("rotateAll", "重新生成全班链接")
                  : classRosterText("generateAll", "生成全班链接")}
            </span>
          </button>
          <button
            className="teacher-primary"
            type="button"
            onClick={copyAllLinks}
            disabled={state.loading || anyBusy || copyableCount === 0}
          >
            <Copy size={15} />
            <span>
              {classRosterText("copyAll", "复制全部链接")}
              {copyableCount ? ` (${copyableCount})` : ""}
            </span>
          </button>
        </div>
      }
    >
      {notice && (
        <div
          className={`teacher-notice ${noticeTone}`}
          role={noticeTone === "error" ? "alert" : "status"}
        >
          {notice}
        </div>
      )}
      {state.loading && (
        <StatePanel
          tone="loading"
          title={classRosterText("loading.title", "正在加载班级")}
          description={classRosterText(
            "loading.description",
            "正在汇总固定花名册和学习活动",
          )}
        />
      )}
      {!state.loading && state.error && (
        <StatePanel
          tone="error"
          title={
            state.errorIssue === CLASS_ROSTER_ISSUES.CLASS_NOT_FOUND
              ? classRosterText("error.notFound", "未找到可访问的班级")
              : classRosterText("error.title", "班级加载失败")
          }
          description={state.error}
          action={
            <div className="class-roster-state-actions">
              {state.errorIssue !== CLASS_ROSTER_ISSUES.CLASS_NOT_FOUND && (
                <button
                  className="teacher-primary"
                  type="button"
                  onClick={load}
                >
                  <RefreshCw size={15} />
                  <span>{classRosterText("reload", "重新加载")}</span>
                </button>
              )}
              <button
                className="teacher-secondary"
                type="button"
                onClick={() => navigate("/adaptive-learning/teacher/classes")}
              >
                <Users size={15} />
                <span>
                  {classRosterText("chooseAnotherClass", "选择其他班级")}
                </span>
              </button>
            </div>
          }
        />
      )}
      {!state.loading && !state.error && (
        <div className="class-roster-page">
          <section
            className="class-roster-summary"
            aria-label={classRosterText("summary", "班级概览")}
          >
            <div>
              <Users size={18} />
              <span>{classRosterText("studentTotal", "班级人数")}</span>
              <strong>
                {state.students.length}
                <small>{classRosterText("peopleUnit", "人")}</small>
              </strong>
            </div>
            <div>
              <ExternalLink size={18} />
              <span>
                {classRosterText("studentsWithActivity", "已有学习记录")}
              </span>
              <strong>
                {activeCount}
                <small>{classRosterText("peopleUnit", "人")}</small>
              </strong>
            </div>
            <div>
              <KeyRound size={18} />
              <span>{classRosterText("activeLinks", "有效固定链接")}</span>
              <strong>
                {issuedCount}
                <small>{classRosterText("itemUnit", "个")}</small>
              </strong>
            </div>
          </section>
          <section className="class-roster-table-section">
            <header>
              <div>
                <h2>{classRosterText("rosterTitle", "学生花名册")}</h2>
                <p>
                  {classRosterText(
                    "rosterDescription",
                    "学生来自班级预设名单；有效链接可随时复制，重新生成会使旧链接失效。",
                  )}
                </p>
              </div>
              <label className="class-roster-search">
                <Search size={15} />
                <span className="sr-only">
                  {classRosterText("search", "搜索学生")}
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={classRosterText(
                    "searchPlaceholder",
                    "搜索姓名或固定 ID",
                  )}
                />
              </label>
            </header>
            <div className="class-roster-table-scroll">
              <table className="class-roster-table">
                <thead>
                  <tr>
                    <th>{classRosterText("column.number", "序号")}</th>
                    <th>{classRosterText("column.student", "学生")}</th>
                    <th>{classRosterText("column.id", "固定 ID")}</th>
                    <th>{classRosterText("column.activity", "学习活动")}</th>
                    <th>{classRosterText("column.answers", "累计作答")}</th>
                    <th>{classRosterText("column.recent", "最近学习")}</th>
                    <th>{classRosterText("column.linkStatus", "链接状态")}</th>
                    <th aria-label={classRosterText("column.actions", "操作")} />
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const studentId = student.studentId;
                    const activity = student.activity;
                    const credential = student.credential;
                    const credentialStatus = classRosterCredentialStatus(
                      credential.status,
                    );
                    const active = Number(activity.sessionCount || 0) > 0;
                    const busy = busyStudentId === studentId;
                    const controlsBusy = anyBusy;
                    const hasCopyableLink = Boolean(
                      copyableAccessToken(student),
                    );
                    return (
                      <tr key={studentId}>
                        <td>{student.rosterNumber || "—"}</td>
                        <td>
                          <button
                            className="class-roster-student"
                            type="button"
                            onClick={() =>
                              navigate(
                                `/adaptive-learning/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/home`,
                              )
                            }
                          >
                            {student.studentName ||
                              classRosterText(
                                "untitledStudent",
                                "未命名学生",
                              )}
                            <ExternalLink size={13} />
                          </button>
                        </td>
                        <td>
                          <code>{studentId}</code>
                        </td>
                        <td>
                          <span
                            className={`teacher-status ${active ? "success" : "muted"}`}
                          >
                            {active
                              ? classRosterText(
                                  "sessionCount",
                                  "{$count} 次学习",
                                  { count: activity.sessionCount },
                                )
                              : classRosterText("notStarted", "未开始")}
                          </span>
                        </td>
                        <td>
                          {active && activity.answerCount !== null
                            ? classRosterText("answerCount", "{$count} 题", {
                                count: activity.answerCount,
                              })
                            : "—"}
                        </td>
                        <td>{classRosterTime(activity.lastActiveAt)}</td>
                        <td>
                          <span
                            className={`teacher-status ${credentialStatus.tone}`}
                          >
                            {credentialStatus.label}
                          </span>
                        </td>
                        <td>
                          <div className="class-roster-actions">
                            {hasCopyableLink && (
                              <button
                                className="primary"
                                type="button"
                                disabled={controlsBusy}
                                onClick={() => {
                                  void copyLink(student);
                                }}
                              >
                                <Copy size={15} />
                                <span>
                                  {classRosterText("copyLink", "复制链接")}
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              title={
                                credential.status === "ACTIVE"
                                  ? classRosterText(
                                      "rotateHint",
                                      "重新生成后旧链接会立即失效",
                                    )
                                  : classRosterText(
                                      "generateHint",
                                      "生成学习链接",
                                    )
                              }
                              disabled={controlsBusy}
                              onClick={() => {
                                void rotate(student);
                              }}
                            >
                              {busy ? (
                                <LoaderCircle
                                  className="class-roster-spin"
                                  size={15}
                                />
                              ) : credential.status === "ACTIVE" ? (
                                <RefreshCw size={15} />
                              ) : (
                                <KeyRound size={15} />
                              )}
                              <span>
                                {credential.status === "ACTIVE"
                                  ? classRosterText("rotate", "重新生成")
                                  : classRosterText("generate", "生成链接")}
                              </span>
                            </button>
                            <button
                              className="danger"
                              type="button"
                              aria-label={classRosterText(
                                "revokeForStudent",
                                "停用 {$name} 的学习链接",
                                { name: student.studentName },
                              )}
                              title={classRosterText(
                                "revokeLink",
                                "停用学习链接",
                              )}
                              disabled={
                                controlsBusy || credential.status !== "ACTIVE"
                              }
                              onClick={() => {
                                void revoke(student);
                              }}
                            >
                              <ShieldOff size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {students.length === 0 && (
              <div className="class-roster-empty">
                {state.students.length > 0
                  ? classRosterText(
                      "empty.filtered",
                      "没有符合当前搜索条件的学生。",
                    )
                  : classRosterText(
                      "empty.class",
                      "该班级暂无预设学生，请先在测验系统中维护花名册。",
                    )}
              </div>
            )}
          </section>
        </div>
      )}
    </TeacherShell>
  );
}
