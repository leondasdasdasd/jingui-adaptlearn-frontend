import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, HandHelping, LoaderCircle, X } from "lucide-react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";

import { trans } from "../../utils/i18n";
import { useLocation } from "../routing";
import { useOptionalLearningSession } from "../session/LearningSessionContext";
import { getAdaptivePortalHost } from "../shared/application/adaptivePortalHost";
import {
  cancelSupportHelpRequest,
  createSupportHelpRequest,
  getSupportHelpRequests,
} from "../shared/infrastructure/classroomApi";
import { createClientId } from "../shared/infrastructure/clientId";
import { localizedDifficultyLabel } from "../shared/presentation/difficultyPresentation";
import { toStudentHelpRequestPayload } from "../student/application/helpRequestMapper";
import { recordLearningEvent } from "../student/data/learningEventRepository";
import {
  clearCollapsedStudentHelpRequestId,
  ensureStudentSupportSession,
  readCollapsedStudentHelpRequestId,
  resetStudentSupportCredentials,
  saveCollapsedStudentHelpRequestId,
} from "../student/data/studentSupportSessionRepository";
import { buildHelpRequestResultEvent } from "../student/domain/helpRequestTelemetry";

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
    return trans("adaptiveLearning.help.teacherAccepted", "老师已看到");
  if (["RESOLVED", "CANCELLED", "EXPIRED"].includes(request.status)) return "";
  return trans("adaptiveLearning.help.teacherNotified", "已通知老师");
}

/**
 *
 * @param error
 */
function helpErrorMessage(error) {
  if (error?.message === "Failed to fetch" || error instanceof TypeError)
    return trans(
      "adaptiveLearning.help.teacherUnavailable",
      "暂时没联系上老师，请稍后再试",
    );
  return (
    error?.message ||
    trans(
      "adaptiveLearning.help.teacherUnavailable",
      "暂时没联系上老师，请稍后再试",
    )
  );
}

/**
 *
 * @param pathname
 * @param hasQuestion
 */
/**
 *
 * @param root0
 * @param root0.context
 * @param root0.disabled
 */
export default function StudentHelpRequest({ context = {}, disabled = false }) {
  const location = useLocation();
  const learningSession = useOptionalLearningSession();
  const hasLearningSession = Boolean(learningSession);
  const session = learningSession?.session || {};
  const pagePath = location.pathname;
  const pageSearch = location.search;
  const selection = session.selection || {};
  const question = context.question;
  const knowledgePointName =
    context.knowledgePointName || selection.knowledgePoints?.[0]?.name || "";
  const lessonTitle = context.lessonTitle || selection.section?.title || "";
  const identityKey = `${selection.studentId || ""}:${selection.studentName || ""}`;
  const supportSessionBoundaryKey = [
    identityKey,
    selection.learningPeriodId || "",
    selection.studentSessionId || "",
    selection.classroomAccessToken || "",
  ].join(":");
  const [supportSession, setSupportSession] = useState(null);
  const [open, setOpen] = useState(false);
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
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const requestContext = useMemo(
    () => ({
      pagePath,
      pageSearch,
      selection,
      question,
      answer: context.answer,
      questionId: question?.id || null,
      contextType: question ? "QUESTION" : "LEARNING_PAGE",
      imageName: context.image?.name,
      lessonTitle,
      knowledgePointName,
      questionNumber: context.questionNumber,
      questionTypeLabel: context.questionTypeLabel,
      presentedAt: context.presentedAt,
    }),
    [
      context,
      knowledgePointName,
      lessonTitle,
      pagePath,
      pageSearch,
      question,
      selection,
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
          ?.querySelector("textarea, header > button, footer button")
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
    if (!note.trim()) {
      setReasonError(
        trans("adaptiveLearning.help.required", "请填写你需要老师帮助的内容"),
      );
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
          ...toStudentHelpRequestPayload({
            clientRequestId: clientRequestId.current,
            note,
            context: requestContext,
          }),
        },
        { signal: controller.signal },
      );
      expandStatus();
      setActiveRequest(created);
      setStatus("idle");
      setOpen(false);
      setReasonError("");
      setNote("");
      clientRequestId.current = "";
      try {
        recordLearningEvent(
          buildHelpRequestResultEvent({
            questionId: requestContext.questionId,
            contextType: requestContext.contextType,
            reasonCode: "CUSTOM",
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
            reasonCode: "CUSTOM",
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
          ? trans(
              "adaptiveLearning.help.timeout",
              "提交求助超时，请检查网络后重试",
            )
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
          aria-label={trans("adaptiveLearning.help.expand", "展开求助状态")}
          onClick={expandStatus}
        >
          <HandHelping size={17} />
          <span>
            {activeRequest.status === "ACKNOWLEDGED"
              ? trans("adaptiveLearning.help.teacherAccepted", "老师已接单")
              : trans("adaptiveLearning.help.waitingTeacher", "等待老师")}
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
              {status === "cancelling"
                ? trans("adaptiveLearning.help.cancelling", "正在取消…")
                : trans("adaptiveLearning.help.cancel", "取消求助")}
            </button>
            <button
              className="teacher-help-collapse"
              type="button"
              aria-label={trans(
                "adaptiveLearning.help.collapse",
                "收起求助状态",
              )}
              title={trans("adaptiveLearning.help.collapse", "收起求助状态")}
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
          <span>{trans("adaptiveLearning.help.askTeacher", "求助老师")}</span>
          <i aria-hidden="true" />
        </button>
      )}
      {error && !open && !errorDismissed && (
        <span className="teacher-help-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            aria-label={trans(
              "adaptiveLearning.help.dismissNotice",
              "关闭连接提示",
            )}
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
              aria-label={trans(
                "adaptiveLearning.help.closeDialog",
                "关闭求助弹窗",
              )}
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
                  <h2 id="teacher-help-title">
                    {trans("adaptiveLearning.help.title", "你需要老师怎么帮？")}
                  </h2>
                  <p>
                    {question
                      ? trans(
                          "adaptiveLearning.help.questionPrompt",
                          "请描述你需要老师帮助的地方。",
                        )
                      : trans(
                          "adaptiveLearning.help.pagePrompt",
                          "请描述你在当前学习页面遇到的问题。",
                        )}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={trans("adaptiveLearning.help.close", "关闭")}
                  onClick={closeHelp}
                >
                  <X size={19} />
                </button>
              </header>
              {question && (
                <div className="teacher-help-question-meta">
                  <span>
                    {trans(
                      "adaptiveLearning.help.questionNumber",
                      "第 {$number} 题",
                      { number: context.questionNumber || "-" },
                    )}
                  </span>
                  <span>{context.questionTypeLabel || question.type}</span>
                  <span>
                    {trans(
                      "adaptiveLearning.help.difficulty",
                      "难度 {$difficulty}",
                      {
                        difficulty: question.difficulty
                          ? localizedDifficultyLabel(question.difficulty)
                          : "-",
                      },
                    )}
                  </span>
                </div>
              )}
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
                  {trans("adaptiveLearning.help.content", "求助内容")}{" "}
                  <small>
                    {trans("adaptiveLearning.help.requiredLabel", "必填")}
                  </small>
                  <b>{note.length}/50</b>
                </span>
                <textarea
                  value={note}
                  maxLength={50}
                  rows={3}
                  placeholder={trans(
                    "adaptiveLearning.help.placeholder",
                    "可以简单告诉老师你卡在了哪一步",
                  )}
                  onChange={(event) => {
                    setNote(event.target.value);
                    if (event.target.value.trim()) setReasonError("");
                  }}
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
                  {trans("adaptiveLearning.help.cancel", "取消")}
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
                    ? trans("adaptiveLearning.help.submitting", "正在提交…")
                    : status === "error"
                      ? trans("adaptiveLearning.help.retry", "重新提交求助")
                      : trans("adaptiveLearning.help.submit", "提交求助")}
                </button>
              </footer>
            </form>
          </div>,
          getAdaptivePortalHost(),
        )}
    </div>
  );
}

StudentHelpRequest.propTypes = {
  context: PropTypes.shape({
    knowledgePointName: PropTypes.string,
    lessonTitle: PropTypes.string,
    question: PropTypes.shape({
      difficulty: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      type: PropTypes.string,
    }),
    questionNumber: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    questionTypeLabel: PropTypes.string,
  }),
  disabled: PropTypes.bool,
};
