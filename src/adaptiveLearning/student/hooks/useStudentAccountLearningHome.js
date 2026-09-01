import { useEffect, useState } from "react";

import {
  forgetClassStudentIdentity,
  rememberClassStudentIdentity,
} from "../data/classStudentIdentityRepository";
import { fetchStudentAccountSession } from "../data/studentAccountSessionRepository";
import { fetchStudentLearningHome } from "../data/studentLearningHomeRepository";
import { studentAccountSessionIssues } from "../domain/studentAccountSession";

const initialState = {
  loading: true,
  profile: null,
  issue: "",
  loginUrl: "",
};

/**
 * 测验学生登录态是账号主页唯一身份权威来源；固定链接凭证由其专属入口恢复。
 * @returns {{loading: boolean, profile: object | null, issue: string, loginUrl: string}} 学生主页状态。
 */
export function useStudentAccountLearningHome() {
  const [identity, setIdentity] = useState(null);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const controller = new AbortController();
    if (!identity) {
      void fetchStudentAccountSession({ signal: controller.signal })
        .then((studentIdentity) => {
          if (!rememberClassStudentIdentity(studentIdentity)) {
            const storageError = new Error("学生身份无法保存");
            storageError.code = studentAccountSessionIssues.unavailable;
            throw storageError;
          }
          setIdentity(studentIdentity);
          return studentIdentity;
        })
        .catch((error) => {
          if (error?.name !== "AbortError") {
            if (
              [
                studentAccountSessionIssues.loginRequired,
                studentAccountSessionIssues.accessDenied,
              ].includes(error?.code)
            ) {
              // 当前测验会话已否定学生身份，旧课堂凭证不能跨账号继续生效。
              forgetClassStudentIdentity();
            }
            setState({
              loading: false,
              profile: null,
              issue: error?.code || studentAccountSessionIssues.unavailable,
              loginUrl: error?.loginUrl || "",
            });
          }
          return null;
        });
    }
    return () => controller.abort();
  }, [identity]);

  useEffect(() => {
    const controller = new AbortController();
    const accessToken = identity?.accessToken || "";
    let cancelled = false;
    let timer;

    const load = async () => {
      try {
        const profile = await fetchStudentLearningHome(accessToken, {
          signal: controller.signal,
        });
        if (!cancelled) setState({ ...initialState, loading: false, profile });
      } catch (error) {
        if (!cancelled && error?.name !== "AbortError") {
          setState({
            ...initialState,
            loading: false,
            issue: error?.code || studentAccountSessionIssues.unavailable,
          });
        }
      }
    };

    if (accessToken) {
      setState(initialState);
      void load();
      timer = window.setInterval(load, 10_000);
    }
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) window.clearInterval(timer);
    };
  }, [identity]);

  return state;
}
