import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, LogOut, UserRound } from "lucide-react";

import { useNavigate } from "../routing";
import {
  emptySession,
  useLearningSession,
} from "../session/LearningSessionContext";
import { clientEvents } from "../shared/contracts/storageKeys";
import {
  forgetClassStudentIdentity,
  readClassStudentIdentity,
} from "../student/data/classStudentIdentityRepository";
import BrandLogo from "./BrandLogo";
import StudentHelpRequest from "./StudentHelpRequest";

/**
 *
 */
function PersistenceNotice() {
  const [state, setState] = useState({ status: "idle", message: "" });
  useEffect(() => {
    const update = (event) => setState(event.detail || { status: "idle" });
    window.addEventListener(clientEvents.persistenceStatusChanged, update);
    return () =>
      window.removeEventListener(clientEvents.persistenceStatusChanged, update);
  }, []);
  if (!["offline", "error", "conflict"].includes(state.status)) return null;
  return (
    <div className={`persistence-notice ${state.status}`} role="status">
      {state.message ||
        (state.status === "offline"
          ? "当前离线，进度已保留在本机，联网后会自动保存"
          : "学习进度暂未保存，请保持页面打开并重试")}
    </div>
  );
}

/**
 *
 * @param root0
 * @param root0.title
 * @param root0.eyebrow
 * @param root0.progress
 * @param root0.onBack
 * @param root0.actions
 * @param root0.children
 * @param root0.compact
 * @param root0.immersive
 * @param root0.shellClassName
 * @param root0.headerClassName
 * @param root0.helpContext
 */
export default function AppShell({
  title,
  eyebrow,
  progress,
  onBack,
  actions,
  children,
  compact = false,
  immersive = false,
  shellClassName = "",
  headerClassName = "",
  helpContext,
}) {
  const navigate = useNavigate();
  const { session, setSession } = useLearningSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [progressIncreasing, setProgressIncreasing] = useState(false);
  const userMenuRef = useRef(null);
  const previousProgressRef = useRef(progress);
  const identity = readClassStudentIdentity();
  const displayName =
    identity?.studentName || session.selection?.studentName || "学生用户";

  useEffect(() => {
    if (!userMenuOpen) return;
    const closeOnOutsidePointer = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        userMenuRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    const previousProgress = previousProgressRef.current;
    previousProgressRef.current = progress;
    if (
      typeof progress !== "number" ||
      typeof previousProgress !== "number" ||
      progress <= previousProgress
    )
      return;
    setProgressIncreasing(true);
    const timer = window.setTimeout(() => setProgressIncreasing(false), 720);
    return () => window.clearTimeout(timer);
  }, [progress]);

  const logout = () => {
    forgetClassStudentIdentity();
    setSession(emptySession);
    setUserMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <div className={`app-shell${shellClassName ? ` ${shellClassName}` : ""}`}>
      <header
        className={`app-header${headerClassName ? ` ${headerClassName}` : ""}`}
      >
        <div className="header-side">
          {onBack ? (
            <button
              className="icon-button"
              type="button"
              aria-label="返回"
              onClick={onBack}
            >
              <ChevronLeft size={21} />
            </button>
          ) : (
            <BrandLogo label="云谷学习" />
          )}
        </div>
        <div className="header-title">
          {eyebrow && <span>{eyebrow}</span>}
          <strong>{title}</strong>
        </div>
        <div className="header-side header-side-right">
          {actions}
          {typeof progress === "number" && (
            <span className="header-progress">{progress}%</span>
          )}
          <div className="student-user-menu" ref={userMenuRef}>
            <button
              className="student-user-trigger"
              type="button"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((value) => !value)}
            >
              <span className="student-user-avatar" aria-hidden="true">
                <UserRound size={16} />
              </span>
              <span className="student-user-name">{displayName}</span>
              <ChevronDown
                className="student-user-chevron"
                size={15}
                aria-hidden="true"
              />
            </button>
            {userMenuOpen && (
              <div
                className="student-user-dropdown"
                role="menu"
                aria-label="账号菜单"
              >
                <button type="button" role="menuitem" onClick={logout}>
                  <LogOut size={16} />
                  <span>退出登录</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {typeof progress === "number" && (
        <div
          className={`top-progress${progressIncreasing ? " is-increasing" : ""}`}
          aria-label={`学习进度 ${progress}%`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <PersistenceNotice />
      <main
        className={`main-content${compact ? " compact" : ""}${immersive ? " immersive" : ""}`}
      >
        {children}
      </main>
      {helpContext && (
        <div className="student-help-floating">
          <StudentHelpRequest context={helpContext} />
        </div>
      )}
    </div>
  );
}
