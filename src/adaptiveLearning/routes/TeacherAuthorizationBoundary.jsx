import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

import StatePanel from "../components/StatePanel";
import { TeacherSessionProvider } from "../shared/application/TeacherSessionContext";
import {
  getTeacherSession,
  questionTestLoginUrl,
  teacherAuthorizationMessage,
} from "../shared/infrastructure/teacherAuthorization";
import {
  clearTeacherStoragePartition,
  setTeacherStoragePartition,
} from "../teacher/data/teacherStoragePartition";
import TeacherAuthorizationAction from "./TeacherAuthorizationAction";

import "../teacher-authorization.css";

/**
 *
 * @param root0
 * @param root0.children
 */
export default function TeacherAuthorizationBoundary({ children }) {
  const [state, setState] = useState({ status: "loading", error: null });
  const verificationAttempt = useRef(0);

  const verify = useCallback(async ({ signal, silent = false } = {}) => {
    const attempt = ++verificationAttempt.current;
    clearTeacherStoragePartition();
    if (!silent)
      setState({ status: "loading", error: null, loginPending: false });
    try {
      const principal = await getTeacherSession({ signal });
      if (attempt !== verificationAttempt.current) return;
      if (!setTeacherStoragePartition(principal.subjectFingerprint)) {
        const error = new Error("教师身份响应不完整");
        error.status = 503;
        throw error;
      }
      setState({
        status: "authenticated",
        error: null,
        loginPending: false,
        session: principal,
      });
    } catch (error) {
      if (
        attempt === verificationAttempt.current &&
        error?.name !== "AbortError"
      ) {
        setState((current) => ({
          status: "denied",
          error,
          loginPending: silent && current.loginPending && error?.status === 401,
        }));
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void verify({ signal: controller.signal });
    return () => {
      controller.abort();
      verificationAttempt.current += 1;
      clearTeacherStoragePartition();
    };
  }, [verify]);

  useEffect(() => {
    if (!state.loginPending) return;
    const controller = new AbortController();
    const refresh = () => {
      void verify({ signal: controller.signal, silent: true });
    };
    window.addEventListener("focus", refresh);
    const intervalId = window.setInterval(refresh, 2000);
    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      setState((current) => ({ ...current, loginPending: false }));
    }, 120_000);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [state.loginPending, verify]);

  const openQuestionTestLogin = useCallback(() => {
    if (!state.error?.loginUrl) return;
    const loginUrl = questionTestLoginUrl(
      state.error.loginUrl,
      window.location,
    );
    if (!loginUrl) return;
    window.open(loginUrl, "_blank", "noopener,noreferrer");
    setState((current) => ({ ...current, loginPending: true }));
  }, [state.error]);

  if (state.status === "authenticated") {
    return (
      <TeacherSessionProvider session={state.session}>
        {children}
      </TeacherSessionProvider>
    );
  }

  const copy = teacherAuthorizationMessage(state.error);
  return (
    <main className="teacher-authorization-boundary">
      <StatePanel
        tone={state.status === "loading" ? "loading" : "error"}
        title={state.status === "loading" ? "正在确认教师身份" : copy.title}
        description={
          state.status === "loading"
            ? "正在连接云谷统一身份服务"
            : copy.description
        }
        action={
          state.status === "denied" ? (
            <TeacherAuthorizationAction
              action={copy.action}
              canRetry={copy.canRetry}
              loginPending={Boolean(state.loginPending)}
              onLogin={openQuestionTestLogin}
              onRetry={() => {
                void verify();
              }}
            />
          ) : null
        }
      />
    </main>
  );
}

TeacherAuthorizationBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};
