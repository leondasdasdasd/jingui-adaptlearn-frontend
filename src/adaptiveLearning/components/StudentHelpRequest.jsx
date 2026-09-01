import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, HandHelping, LoaderCircle, X } from "lucide-react";
import { createPortal } from "react-dom";

import { useOptionalLearningSession } from "../session/LearningSessionContext";
import { getAdaptivePortalHost } from "../shared/application/adaptivePortalHost";
import {
  cancelSupportHelpRequest,
  createSupportHelpRequest,
  getSupportHelpRequests,
} from "../shared/infrastructure/classroomApi";
import { createClientId } from "../shared/infrastructure/clientId";
import { recordLearningEvent } from "../student/data/learningEventRepository";
import {
  clearCollapsedStudentHelpRequestId,
  ensureStudentSupportSession,
  readCollapsedStudentHelpRequestId,
  resetStudentSupportCredentials,
  saveCollapsedStudentHelpRequestId,
} from "../student/data/studentSupportSessionRepository";
import { buildHelpRequestResultEvent } from "../student/domain/helpRequestTelemetry";

const QUESTION_REASONS = [
  { code: "CANNOT_UNDERSTAND", label: "看不懂题目" },
  { code: "CANNOT_START", label: "不知道从哪里开始" },
  { code: "STUCK", label: "做到一半卡住了" },
  { code: "CONTENT_OR_DEVICE_ISSUE", label: "题目或设备有问题" },
];
const PAGE_REASONS = [
  { code: "CANNOT_UNDERSTAND", label: "看不懂当前内容" },
  { code: "CANNOT_START", label: "不知道下一步做什么" },
  { code: "STUCK", label: "学到一半卡住了" },
  { code: "CONTENT_OR_DEVICE_ISSUE", label: "内容或设备有问题" },
];
const OPEN_STATUSES = new Set(["OPEN", "WAITING", "PENDING", "ACKNOWLEDGED"]);
const HELP_REQUEST_TIMEOUT_MS = 12_000;

/**
 *
 * @param payload
 */
function normalizeRequests(payload) {
  const values = Array.isArray(payload)
    ? payload
    : payload?.items || payload?.requests || (payload ? [payload] : []);
  return values
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/**
 *
 * @param request
 */
function requestStatus(request) {
  if (!request) return "";
  if (request.status === "ACKNOWLEDGED")
    return "老师已看到，求助不影响学习结论，继续完成当前步骤";
  if (["RESOLVED", "CANCELLED", "EXPIRED"].includes(request.status)) return "";
  return "已通知老师，求助不影响学习结论，你可以继续学习";
}

/**
 *
 * @param error
 */
function helpErrorMessage(error) {
  if (error?.message === "Failed to fetch" || error instanceof TypeError)
    return "暂时没联系上老师，请稍后再试";
  return error?.message || "暂时没联系上老师，请稍后再试";
}

/**
 *
 * @param pathname
 * @param hasQuestion
 */
function inferContextType(pathname, hasQuestion) {
  if (hasQuestion)
    return pathname.includes("post-assessment") ? "PRACTICE" : "ASSESSMENT";
  if (pathname.includes("/learn")) return "LEARNING";
  if (pathname.includes("knowledge-map")) return "KNOWLEDGE_MAP";
  if (pathname.includes("result") || pathname.includes("complete"))
    return "RESULT";
  if (pathname.includes("today")) return "DIRECTORY";
  return "OTHER";
}

/**
 *
 * @param root0
 * @param root0.context
 * @param root0.disabled
 */
export default function StudentHelpRequest({ context = {}, disabled = false }) {
  const learningSession = useOptionalLearningSession();
  const hasLearningSession = Boolean(learningSession);
  const session = learningSession?.session || {};
  const pagePath =
    typeof window === "undefined"
      ? "/adaptive-learning/today"
      : window.location.pathname;
  const pageSearch =
    typeof window === "undefined" ? "" : window.location.search;
  const selection = session.selection || {};
  const question = context.question;
  const knowledgePointName =
    context.knowledgePointName || selection.knowledgePoints?.[0]?.name || "";
  const lessonTitle = context.lessonTitle || selection.section?.title || "";
  const reasons = question ? QUESTION_REASONS : PAGE_REASONS;
  const identityKey = `${selection.studentId || ""}:${selection.studentName || ""}`;
  const supportSessionBoundaryKey = [
    identityKey,
    selection.learningPeriodId || "",
    selection.studentSessionId || "",
    selection.classroomAccessToken || "",
  ].join(":");
  const [supportSession, setSupportSession] = useState(null);
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [note, setNote] = useState("");
  const [activeRequest, setActiveRequest] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [collapsedRequestId, setCollapsedRequestId] = useState(
    readCollapsedStudentHelpRequestId,
  );
  const clientRequestId = useRef("");
  const helpButtonRef = useRef(null);
  const helpDialogRef = useRef(null);
  const firstReasonRef = useRef(null);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const requestContext = useMemo(
    () => ({
      contextType: inferContextType(pagePath, Boolean(question)),
      pageRoute: `${pagePath}${pageSearch}`.slice(0, 255),
      learningPeriodId: selection.learningPeriodId || null,
      studentSessionId: selection.classroomAccessToken
        ? selection.studentSessionId
        : null,
      knowledgeObjectiveId:
        question?.knowledgePointIds?.[0] ||
        selection.knowledgePoints?.[0]?.id ||
        null,
      questionId: question?.id || null,
      questionSnapshot: {
        id: question?.id || "",
        stem: question?.stem || "",
        type: question?.type || "",
        difficulty: question?.difficulty || "",
        lessonTitle,
        knowledgePointName,
        pageTitle: question
          ? "当前练习题"
          : lessonTitle || knowledgePointName || "智能学习",
        presentedAt: context.presentedAt || new Date().toISOString(),
      },
      answerSnapshot: {
        text: Array.isArray(context.answer)
          ? context.answer.join("、")
          : String(context.answer || ""),
        imageName: context.image?.name || "",
      },
    }),
    [
      context.answer,
      context.image?.name,
      context.presentedAt,
      knowledgePointName,
      lessonTitle,
      pagePath,
      pageSearch,
      question,
      selection.classroomAccessToken,
      selection.knowledgePoints,
      selection.learningPeriodId,
      selection.studentSessionId,
    ],
  );

  useEffect(() => {
    if (!hasLearningSession) return;
    let cancelled = false;
    ensureStudentSupportSession(selectionRef.current)
      .then((value) => {
        if (!cancelled) setSupportSession(value);
      })
      .catch((requestError) => {
        if (!cancelled) setError(helpErrorMessage(requestError));
      });
    return () => {
      cancelled = true;
    };
  }, [hasLearningSession, supportSessionBoundaryKey]);

  useEffect(() => {
    if (!supportSession?.id || !supportSession.accessToken) return;
    let cancelled = false;
    const load = async (canRetry = true) => {
      try {
        const payload = await getSupportHelpRequests(
          supportSession.id,
          supportSession.accessToken,
        );
        if (cancelled) return;
        setActiveRequest(
          normalizeRequests(payload).find((item) =>
            OPEN_STATUSES.has(item.status),
          ) || null,
        );
        setError("");
      } catch (requestError) {
        if (cancelled) return;
        if (requestError.status === 401 && canRetry) {
          resetStudentSupportCredentials();
          try {
            const renewed = await ensureStudentSupportSession(
              selectionRef.current,
            );
            if (!cancelled) setSupportSession(renewed);
          } catch (renewError) {
            if (!cancelled) setError(helpErrorMessage(renewError));
          }
          return;
        }
        setError(helpErrorMessage(requestError));
      }
    };
    void load();
    const timer = window.setInterval(
      () => {
        void load(false);
      },
      activeRequest ? 3000 : 10_000,
    );
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeRequest?.id, supportSession?.accessToken, supportSession?.id]);

  useEffect(() => {
    if (error) setErrorDismissed(false);
  }, [error]);

  const closeHelp = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => helpButtonRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(
      () =>
        helpDialogRef.current
          ?.querySelector('[role="radio"], textarea, button')
          ?.focus(),
      0,
    );
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeHelp();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeHelp, open]);

  const collapseStatus = () => {
    if (!activeRequest) return;
    setCollapsedRequestId(activeRequest.id);
    saveCollapsedStudentHelpRequestId(activeRequest.id);
  };

  const expandStatus = () => {
    setCollapsedRequestId("");
    clearCollapsedStudentHelpRequestId();
  };

  const submit = async () => {
    if (status === "sending") return;
    if (!reasonCode) {
      setReasonError("请选择一个求助原因");
      window.setTimeout(() => firstReasonRef.current?.focus(), 0);
      return;
    }
    setStatus("sending");
    setError("");
    const startedAt = performance.now();
    clientRequestId.current ||= createClientId();
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      HELP_REQUEST_TIMEOUT_MS,
    );
    try {
      const currentSupport =
        supportSession ||
        (await ensureStudentSupportSession(selectionRef.current));
      setSupportSession(currentSupport);
      const created = await createSupportHelpRequest(
        currentSupport.id,
        currentSupport.accessToken,
        {
          clientRequestId: clientRequestId.current,
          reasonCode,
          note: note.trim(),
          ...requestContext,
        },
        { signal: controller.signal },
      );
      expandStatus();
      setActiveRequest(created);
      setStatus("idle");
      setOpen(false);
      setReasonCode("");
      setReasonError("");
      setNote("");
      clientRequestId.current = "";
      try {
        recordLearningEvent(
          buildHelpRequestResultEvent({
            questionId: requestContext.questionId,
            contextType: requestContext.contextType,
            reasonCode,
            result: "success",
            durationMs: performance.now() - startedAt,
          }),
          selectionRef.current,
        );
      } catch {
        /* Telemetry must not change the help-request result. */
      }
    } catch (requestError) {
      const result = requestError?.name === "AbortError" ? "timeout" : "failed";
      try {
        recordLearningEvent(
          buildHelpRequestResultEvent({
            questionId: requestContext.questionId,
            contextType: requestContext.contextType,
            reasonCode,
            result,
            durationMs: performance.now() - startedAt,
          }),
          selectionRef.current,
        );
      } catch {
        /* Telemetry must not hide the retry action. */
      }
      setError(
        requestError?.name === "AbortError"
          ? "通知老师超时，请检查网络后重试"
          : helpErrorMessage(requestError),
      );
      setStatus("error");
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const cancel = async () => {
    if (!activeRequest || !supportSession || status === "cancelling") return;
    setStatus("cancelling");
    setError("");
    try {
      await cancelSupportHelpRequest(
        supportSession.id,
        activeRequest.id,
        supportSession.accessToken,
      );
      expandStatus();
      setActiveRequest(null);
      clientRequestId.current = "";
      setStatus("idle");
    } catch (requestError) {
      setError(helpErrorMessage(requestError));
      setStatus("error");
    }
  };

  if (!learningSession) return null;

  const statusCollapsed = activeRequest?.id === collapsedRequestId;

  return (
    <div className="teacher-help-control">
      {activeRequest && statusCollapsed ? (
        <button
          className="teacher-help-pending-button"
          type="button"
          aria-label="展开求助状态"
          onClick={expandStatus}
        >
          <HandHelping size={17} />
          <span>
            {activeRequest.status === "ACKNOWLEDGED"
              ? "老师已接单"
              : "等待老师"}
          </span>
          <i aria-hidden="true" />
        </button>
      ) : activeRequest ? (
        <div
          className={`teacher-help-status ${activeRequest.status === "ACKNOWLEDGED" ? "acknowledged" : ""}`}
          role="status"
        >
          <CheckCircle2 size={17} />
          <span>
            <strong>{requestStatus(activeRequest)}</strong>
          </span>
          <div className="teacher-help-status-actions">
            <button
              className="teacher-help-cancel"
              type="button"
              aria-busy={status === "cancelling"}
              disabled={status === "cancelling"}
              onClick={() => {
                void cancel();
              }}
            >
              {status === "cancelling" ? "正在取消…" : "取消求助"}
            </button>
            <button
              className="teacher-help-collapse"
              type="button"
              aria-label="收起求助状态"
              title="收起求助状态"
              onClick={collapseStatus}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          ref={helpButtonRef}
          className="teacher-help-button"
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <HandHelping size={17} />
          <span>求助老师</span>
          <i aria-hidden="true" />
        </button>
      )}
      {error && !open && !errorDismissed && (
        <span className="teacher-help-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            aria-label="关闭连接提示"
            onClick={() => setErrorDismissed(true)}
          >
            <X size={15} />
          </button>
        </span>
      )}

      {open &&
        getAdaptivePortalHost() &&
        createPortal(
          <div
            className="teacher-help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-help-title"
          >
            <button
              className="teacher-help-mask"
              type="button"
              aria-label="关闭求助弹窗"
              onClick={closeHelp}
            />
            <form
              ref={helpDialogRef}
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <header>
                <div>
                  <h2 id="teacher-help-title">你需要老师怎么帮？</h2>
                  <p>
                    {question
                      ? "老师会看到当前题目和你已经填写的内容。"
                      : "老师会看到你当前所在的学习页面和知识点。"}
                  </p>
                </div>
                <button type="button" aria-label="关闭" onClick={closeHelp}>
                  <X size={19} />
                </button>
              </header>
              <div
                className={`teacher-help-reasons${reasonError ? " invalid" : ""}`}
                role="radiogroup"
                aria-label="求助原因"
                aria-describedby={
                  reasonError ? "teacher-help-reason-error" : undefined
                }
              >
                {reasons.map((reason, index) => (
                  <button
                    ref={index === 0 ? firstReasonRef : undefined}
                    key={reason.code}
                    className={reasonCode === reason.code ? "selected" : ""}
                    type="button"
                    role="radio"
                    aria-checked={reasonCode === reason.code}
                    onClick={() => {
                      setReasonCode(reason.code);
                      setReasonError("");
                    }}
                  >
                    <span />
                    {reason.label}
                  </button>
                ))}
              </div>
              {reasonError && (
                <p
                  className="teacher-help-reason-error"
                  id="teacher-help-reason-error"
                  role="alert"
                >
                  {reasonError}
                </p>
              )}
              <label>
                <span>
                  补充说明 <small>选填</small>
                  <b>{note.length}/50</b>
                </span>
                <textarea
                  value={note}
                  maxLength={50}
                  rows={3}
                  placeholder="可以简单告诉老师你卡在了哪一步"
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              {error && (
                <div className="teacher-help-modal-error" role="alert">
                  {error}
                </div>
              )}
              <footer>
                <button
                  className="neutral-button"
                  type="button"
                  onClick={closeHelp}
                >
                  取消
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  aria-busy={status === "sending"}
                  disabled={status === "sending"}
                >
                  {status === "sending" && (
                    <LoaderCircle className="spin" size={16} />
                  )}
                  {status === "sending"
                    ? "正在通知…"
                    : status === "error"
                      ? "重新通知老师"
                      : "通知老师"}
                </button>
              </footer>
            </form>
          </div>,
          getAdaptivePortalHost(),
        )}
    </div>
  );
}
