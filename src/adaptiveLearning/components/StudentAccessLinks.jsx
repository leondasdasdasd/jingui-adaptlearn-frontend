import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Copy,
  KeyRound,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";

import { storageKeys } from "../shared/contracts/storageKeys";
import {
  readJson,
  removeStoredValue,
  writeJson,
} from "../shared/infrastructure/browserStorage";
import {
  getLearningPeriodAssignments,
  getStudentAccessCredentialStatus,
  revokeStudentAccessCredential,
  rotateStudentAccessCredential,
} from "../shared/infrastructure/classroomApi";
import { teacherStorageKey } from "../teacher/data/teacherStoragePartition";

/**
 *
 * @param periodId
 * @param studentId
 */
function accessTokenStorageKey(periodId, studentId) {
  return teacherStorageKey(
    storageKeys.teacherStudentAccessToken(periodId, studentId),
  );
}

/**
 *
 * @param periodId
 * @param studentId
 */
function readStoredToken(periodId, studentId) {
  try {
    return readJson(accessTokenStorageKey(periodId, studentId), "");
  } catch {
    return "";
  }
}

/**
 *
 * @param periodId
 * @param studentId
 * @param token
 */
function storeToken(periodId, studentId, token) {
  try {
    writeJson(accessTokenStorageKey(periodId, studentId), token);
  } catch {
    /* Teacher identity is re-established before this component mounts. */
  }
}

/**
 *
 * @param periodId
 * @param studentId
 */
function removeStoredToken(periodId, studentId) {
  try {
    removeStoredValue(accessTokenStorageKey(periodId, studentId));
  } catch {
    /* Nothing needs clearing before the teacher partition exists. */
  }
}

/**
 *
 * @param periodId
 * @param accessToken
 */
function entryUrl(periodId, accessToken) {
  const base =
    import.meta.env.VITE_STUDENT_ENTRY_URL ||
    `${window.location.origin}/adaptive-learning/today`;
  const url = new URL(base, window.location.origin);
  url.searchParams.set("periodId", periodId);
  url.searchParams.set("accessToken", accessToken);
  return url.toString();
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
    if (!document.execCommand("copy")) throw new Error("浏览器未允许复制");
  } finally {
    textarea.remove();
  }
}

/**
 *
 * @param root0
 * @param root0.periodId
 * @param root0.initialLinks
 */
export default function StudentAccessLinks({ periodId, initialLinks = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState([]);
  const [tokens, setTokens] = useState(() =>
    Object.fromEntries(
      initialLinks
        .filter((item) => item.accessToken)
        .map((item) => [item.studentId, item.accessToken]),
    ),
  );
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const initialTokenSignature = initialLinks
    .filter((item) => item.accessToken)
    .map((item) => `${item.studentId}:${item.accessToken}`)
    .join("|");

  const load = useCallback(async () => {
    if (!periodId) return;
    try {
      const assignments = await getLearningPeriodAssignments(periodId);
      const statuses = await Promise.all(
        (assignments || []).map(async (assignment) => ({
          ...assignment,
          credential: await getStudentAccessCredentialStatus(
            periodId,
            assignment.studentId,
          ).catch((requestError) =>
            requestError.status === 404 ? null : Promise.reject(requestError),
          ),
        })),
      );
      setRows(statuses);
      setTokens((current) =>
        Object.fromEntries(
          statuses.flatMap((student) => {
            const active = student.credential?.status === "ACTIVE";
            if (!active) {
              removeStoredToken(periodId, student.studentId);
              return [];
            }
            const token =
              current[student.studentId] ||
              readStoredToken(periodId, student.studentId);
            return token ? [[student.studentId, token]] : [];
          }),
        ),
      );
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [periodId]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setExpanded(false);
  }, [periodId]);
  useEffect(() => {
    setTokens({});
  }, [periodId]);
  useEffect(() => {
    const seeded = Object.fromEntries(
      initialLinks
        .filter((item) => item.accessToken)
        .map((item) => [item.studentId, item.accessToken]),
    );
    for (const [studentId, token] of Object.entries(seeded))
      storeToken(periodId, studentId, token);
    setTokens((current) => ({ ...current, ...seeded }));
    // The signature tracks token changes without rerunning for a fresh empty-array prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTokenSignature, periodId]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visibleRows = useMemo(
    () => (rows.length > 0 ? rows : initialLinks),
    [initialLinks, rows],
  );

  const rotate = async (student) => {
    const active =
      student.credential?.status === "ACTIVE" ||
      Boolean(tokens[student.studentId]);
    if (
      active &&
      !window.confirm(
        `重新生成后，${student.studentName}的旧链接会立即失效。确认继续？`,
      )
    )
      return;
    setBusy(`rotate:${student.studentId}`);
    setError("");
    try {
      const created = await rotateStudentAccessCredential(
        periodId,
        student.studentId,
      );
      storeToken(periodId, student.studentId, created.accessToken);
      setTokens((current) => ({
        ...current,
        [student.studentId]: created.accessToken,
      }));
      await load();
      setNotice(
        `已为${student.studentName}生成新链接${active ? "，旧链接已失效" : ""}`,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  };

  const revoke = async (student) => {
    setBusy(`revoke:${student.studentId}`);
    setError("");
    try {
      await revokeStudentAccessCredential(periodId, student.studentId);
      removeStoredToken(periodId, student.studentId);
      setTokens((current) => ({ ...current, [student.studentId]: "" }));
      await load();
      setNotice(`已撤销${student.studentName}的访问链接`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  };

  const copy = async (student) => {
    const token = tokens[student.studentId];
    if (!token) return;
    setError("");
    try {
      await copyText(entryUrl(periodId, token));
      setNotice(`已复制${student.studentName}的学习链接`);
    } catch {
      setError("复制失败，请检查浏览器权限后重试");
    }
  };

  if (!periodId || (visibleRows.length === 0 && !error)) return null;
  return (
    <section
      className={`classroom-links live-entry-links student-access-links${expanded ? " expanded" : ""}`}
    >
      <header>
        <div className="student-access-heading">
          <span>
            <KeyRound size={17} />
          </span>
          <h2>学生专属入口</h2>
        </div>
        <div className="student-access-header-actions">
          <small>链接仅限本人使用，请单独发送</small>
          <button
            className="student-access-toggle"
            type="button"
            aria-controls="student-access-table"
            aria-expanded={expanded}
            aria-label={expanded ? "收起学生专属入口" : "展开学生专属入口"}
            title={expanded ? "收起" : "展开"}
            onClick={() => setExpanded((current) => !current)}
          >
            <ChevronDown aria-hidden="true" size={17} />
          </button>
        </div>
      </header>
      {notice && (
        <div className="teacher-notice success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="teacher-notice error" role="alert">
          {error}
        </div>
      )}
      {expanded && visibleRows.length > 0 && (
        <div className="student-access-table" id="student-access-table">
          <div className="student-access-table-head" aria-hidden="true">
            <span>学生</span>
            <span>链接状态</span>
            <span>操作</span>
          </div>
          {visibleRows.map((student) => {
            const token = tokens[student.studentId];
            const active =
              student.credential?.status === "ACTIVE" || Boolean(token);
            const statusLabel = active
              ? "链接有效"
              : student.credential?.status === "REVOKED"
                ? "已撤销"
                : "未生成";
            return (
              <article key={student.studentId}>
                <strong className="student-access-name">
                  {student.studentName}
                </strong>
                <span
                  className={`student-access-status ${active ? "active" : "inactive"}`}
                >
                  {active && <CheckCircle2 size={14} />}
                  {statusLabel}
                </span>
                <div className="student-access-actions">
                  {token && (
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => {
                        void copy(student);
                      }}
                    >
                      <Copy size={14} />
                      复制链接
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      void rotate(student);
                    }}
                  >
                    {busy === `rotate:${student.studentId}` ? (
                      <LoaderCircle className="spin" size={14} />
                    ) : (
                      <RotateCcw size={14} />
                    )}
                    {active ? "重新生成" : "生成链接"}
                  </button>
                  {active && (
                    <button
                      className="danger"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => {
                        void revoke(student);
                      }}
                    >
                      {busy === `revoke:${student.studentId}` ? (
                        <LoaderCircle className="spin" size={14} />
                      ) : (
                        <Ban size={14} />
                      )}
                      撤销
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
