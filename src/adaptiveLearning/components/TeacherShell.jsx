/* eslint-disable complexity, react/prop-types -- 教师外壳保留既有导航与用户菜单条件。 */

import React, { useEffect, useRef, useState } from "react";
import {
  BookOpenCheck,
  ChevronDown,
  GraduationCap,
  LogOut,
  Play,
  Radio,
  UserRound,
} from "lucide-react";

import { trans } from "../../utils/i18n";
import { NavLink, useParams } from "../routing";
import { useTeacherSession } from "../shared/application/TeacherSessionContext";
import { questionTestLogoutUrl } from "../shared/infrastructure/teacherAuthorization";
import { rememberCurrentPeriod } from "../teacher/data/classroomApiRepository";
import { clearTeacherStoragePartition } from "../teacher/data/teacherStoragePartition";
import BrandLogo from "./BrandLogo";
import StartClassDialog from "./StartClassDialog";

/**
 *
 * @param root0
 * @param root0.title
 * @param root0.subtitle
 * @param root0.leadingAction
 * @param root0.actions
 * @param root0.children
 * @param root0.currentLessonId
 * @param root0.hideGlobalHeader
 */
export default function TeacherShell({
  title,
  subtitle,
  leadingAction,
  actions,
  children,
  currentLessonId = "",
  hideGlobalHeader = false,
}) {
  const { periodId } = useParams();
  const session = useTeacherSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [startClassOpen, setStartClassOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (periodId) rememberCurrentPeriod(periodId);
  }, [periodId]);

  const displayName =
    session.displayName ||
    trans("adaptiveLearning.teacher.defaultName", "云谷教师");

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

  const logout = () => {
    clearTeacherStoragePartition();
    setUserMenuOpen(false);
    const logoutUrl = questionTestLogoutUrl(session.logoutUrl, window.location);
    if (logoutUrl) {
      window.location.assign(logoutUrl);
    } else {
      window.location.assign("/adaptive-learning/teacher/textbook-lessons");
    }
  };

  const navItems = [
    {
      id: "content",
      to: "/adaptive-learning/teacher/textbook-lessons",
      label: trans("adaptiveLearning.teacher.textbookLessons", "教材课时"),
      icon: BookOpenCheck,
      badge: trans("adaptiveLearning.teacher.aiGeneration", "AI 生成"),
      badgeTone: "ai",
    },
    {
      id: "live",
      to: "/adaptive-learning/teacher/live",
      label: trans("adaptiveLearning.teacher.liveClass", "实时课堂"),
      icon: Radio,
    },
  ];

  return (
    <div
      className={`teacher-app teacher-app-horizontal${hideGlobalHeader ? " no-global-header" : ""}`}
    >
      {/* Decorative ambient background glow */}
      <div className="teacher-ambient-glow" aria-hidden="true" />

      {!hideGlobalHeader && (
        <header className="teacher-global-header teacher-horizontal-header">
          {/* Brand section */}
          <div className="teacher-header-brand-wrap">
            <div className="teacher-brand">
              <div className="teacher-brand-logo-frame">
                <BrandLogo
                  label={trans(
                    "adaptiveLearning.teacher.brandLogo",
                    "云谷教学",
                  )}
                />
              </div>
              <div className="teacher-brand-info">
                <div className="teacher-brand-title">
                  <strong>
                    {trans(
                      "adaptiveLearning.teacher.productName",
                      "云谷自适应教学",
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Horizontal Navigation Menu */}
          <nav
            className="teacher-horizontal-nav"
            aria-label={trans(
              "adaptiveLearning.teacher.mainNavigation",
              "教师端主导航",
            )}
          >
            {navItems.map(({ id, to, label, icon: Icon, badge, badgeTone }) => (
              <NavLink
                key={id}
                to={to}
                className={({ isActive }) =>
                  `teacher-horizontal-nav-link${isActive ? " active" : ""}`
                }
              >
                <Icon size={17} className="teacher-hnav-icon" />
                <span className="teacher-hnav-label">{label}</span>
                {badge && (
                  <span
                    className={`teacher-hnav-badge ${badgeTone || "default"}`}
                  >
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right action tools & User Menu */}
          <div className="teacher-header-right-actions">
            <button
              type="button"
              className="teacher-header-start-class-btn"
              onClick={() => setStartClassOpen(true)}
              title={trans(
                "adaptiveLearning.teacher.startClassDescription",
                "选择课时和班级开始上课",
              )}
            >
              <Play size={15} fill="currentColor" />
              <span>
                {trans("adaptiveLearning.startClass.start", "开始上课")}
              </span>
            </button>

            <div className="teacher-user-menu" ref={userMenuRef}>
              <button
                className="teacher-user-trigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((value) => !value)}
              >
                <div className="teacher-user-avatar-wrap">
                  <span className="teacher-user-avatar" aria-hidden="true">
                    <GraduationCap size={16} />
                  </span>
                  <span
                    className="teacher-user-status-dot"
                    title={trans("adaptiveLearning.teacher.online", "在线")}
                  />
                </div>
                <div className="teacher-user-details">
                  <span className="teacher-user-name">{displayName}</span>
                  <span className="teacher-user-role">
                    {trans(
                      "adaptiveLearning.teacher.subjectTeacher",
                      "任课教师",
                    )}
                  </span>
                </div>
                <ChevronDown
                  className="teacher-user-chevron"
                  size={14}
                  aria-hidden="true"
                />
              </button>

              {userMenuOpen && (
                <div
                  className="teacher-user-dropdown"
                  role="menu"
                  aria-label={trans(
                    "adaptiveLearning.teacher.accountMenu",
                    "账号菜单",
                  )}
                >
                  <div className="teacher-dropdown-header">
                    <div className="teacher-dropdown-user-avatar">
                      <UserRound size={18} />
                    </div>
                    <div className="teacher-dropdown-user-info">
                      <strong>{displayName}</strong>
                      <small>
                        {session.email ||
                          trans(
                            "adaptiveLearning.teacher.identityConnected",
                            "教师统一身份已连接",
                          )}
                      </small>
                    </div>
                  </div>
                  <div className="teacher-dropdown-divider" />
                  <button
                    type="button"
                    className="teacher-dropdown-logout-btn"
                    role="menuitem"
                    onClick={logout}
                  >
                    <LogOut size={15} />
                    <span>
                      {trans(
                        "adaptiveLearning.teacher.signOut",
                        "退出登录",
                      )}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Page Layout */}
      <main className="teacher-main-horizontal">
        {(title || actions || leadingAction) && (
          <header className="teacher-page-header">
            <div className="teacher-page-heading">
              {leadingAction && (
                <div className="teacher-page-heading-leading">
                  {leadingAction}
                </div>
              )}
              <div className="teacher-page-heading-copy">
                <div className="teacher-page-title-row">
                  <h1>{title}</h1>
                </div>
                {subtitle && <p>{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="teacher-header-actions">{actions}</div>}
          </header>
        )}

        <div className="teacher-page-body">{children}</div>
      </main>

      {/* Start Class Dialog */}
      <StartClassDialog
        open={startClassOpen}
        onClose={() => setStartClassOpen(false)}
        initialLessonId={currentLessonId}
      />
    </div>
  );
}
