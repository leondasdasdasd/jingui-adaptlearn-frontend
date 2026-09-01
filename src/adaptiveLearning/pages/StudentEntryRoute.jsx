import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

import BrandLogo from "../components/BrandLogo";
import { routes } from "../routes/routePaths";
import { useNavigate, useParams } from "../routing";
import {
  emptySession,
  useLearningSession,
} from "../session/LearningSessionContext";
import { classroomAccessTokenFromLocation } from "../shared/contracts/classroomAccessLink";
import {
  fetchClassStudentIdentity,
  forgetClassStudentIdentity,
  readClassStudentIdentity,
  storeClassStudentIdentity,
} from "../student/data/classStudentIdentityRepository";
import { restorePersistentStudentState } from "../student/data/persistentStudentStateRepository";
import {
  studentEntryIssueMessage,
  studentEntryText,
} from "../student/presentation/studentEntryPresentation";

/**
 * 清除地址中的一次性课堂凭证，同时保留当前 Hash Router 路由。
 * @returns {void}
 */
function removeTokenFromAddressBar() {
  const [routePath, routeQuery = ""] = window.location.hash
    .replace(/^#/, "")
    .split("?");
  const routeParameters = new URLSearchParams(routeQuery);
  const pageParameters = new URLSearchParams(window.location.search);
  routeParameters.delete("accessToken");
  pageParameters.delete("accessToken");
  const pageQuery = pageParameters.toString();
  const nextRouteQuery = routeParameters.toString();
  const routeSuffix = nextRouteQuery ? `?${nextRouteQuery}` : "";
  const pageSuffix = pageQuery ? `?${pageQuery}` : "";
  const nextHash = routePath ? `#${routePath}${routeSuffix}` : "";
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${pageSuffix}${nextHash}`,
  );
}

/**
 *
 */
export default function StudentEntryRoute() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { session, setSession } = useLearningSession();
  const latestSession = useRef(session);
  latestSession.current = session;
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    const sessionAtEntry = latestSession.current;
    setState({ loading: true, error: "" });
    const rememberedIdentity = readClassStudentIdentity();
    const accessToken =
      classroomAccessTokenFromLocation() ||
      (rememberedIdentity?.studentId === studentId
        ? rememberedIdentity.accessToken
        : "");
    removeTokenFromAddressBar();
    if (!accessToken) {
      forgetClassStudentIdentity();
      setState({
        loading: false,
        error: studentEntryIssueMessage("MISSING_ACCESS_TOKEN"),
      });
      return () => controller.abort();
    }
    const verifyIdentity = async () => {
      try {
        const identity = await fetchClassStudentIdentity(
          accessToken,
          studentId,
          { signal: controller.signal },
        );
        if (!current) return;
        const rememberedCredentialChanged =
          Boolean(rememberedIdentity) &&
          (rememberedIdentity.accessToken !== accessToken ||
            rememberedIdentity.classId !== identity.classId);
        const activeSessionCredentialChanged =
          Boolean(sessionAtEntry.selection) &&
          (sessionAtEntry.selection.studentId !== identity.studentId ||
            (sessionAtEntry.selection.classroomAccessToken &&
              sessionAtEntry.selection.classroomAccessToken !== accessToken));
        if (rememberedCredentialChanged || activeSessionCredentialChanged)
          setSession(emptySession);
        const restored = await restorePersistentStudentState(accessToken, {
          signal: controller.signal,
          currentSession:
            rememberedCredentialChanged || activeSessionCredentialChanged
              ? emptySession
              : sessionAtEntry,
        });
        if (!current) return;
        storeClassStudentIdentity(identity);
        if (restored.resetLocalSession) setSession(emptySession);
        else if (restored.session) setSession(restored.session);
        navigate(routes.directory, { replace: true });
      } catch (error) {
        if (!current || error?.name === "AbortError") return;
        forgetClassStudentIdentity();
        setState({
          loading: false,
          error: studentEntryIssueMessage(error?.code),
        });
      }
    };
    void verifyIdentity();
    return () => {
      current = false;
      controller.abort();
    };
  }, [navigate, setSession, studentId]);

  return (
    <main className="student-entry-page">
      <section
        className={`student-entry-panel${state.error ? " error" : ""}`}
        role={state.error ? "alert" : "status"}
      >
        <BrandLogo label={studentEntryText("brand", "云谷学习")} />
        {state.loading ? (
          <LoaderCircle
            className="student-entry-spinner"
            size={24}
            aria-hidden="true"
          />
        ) : (
          <AlertTriangle size={24} aria-hidden="true" />
        )}
        <h1>
          {state.loading
            ? studentEntryText("loading.title", "正在确认学习身份")
            : studentEntryText("error.title", "无法进入学习空间")}
        </h1>
        <p>
          {state.loading
            ? studentEntryText(
                "loading.description",
                "确认后会进入你的固定学习主页。",
              )
            : state.error}
        </p>
      </section>
    </main>
  );
}
