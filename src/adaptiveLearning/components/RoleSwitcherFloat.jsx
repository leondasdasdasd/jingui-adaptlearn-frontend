import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  MapPin,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";

import { trans } from "../../utils/i18n";
import { routes } from "../routes/routePaths";
import { useLocation, useNavigate } from "../routing";

import "../styles/role-switcher-float.css";

/**
 *
 */
export default function RoleSwitcherFloat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const popoverRef = useRef(null);

  const isTeacherMode = location.pathname.includes("/teacher");
  const isStudentWorkflow = location.pathname.startsWith(
    "/adaptive-learning/session/",
  );
  const teacherLabel = trans("adaptiveLearning.roleSwitcher.teacher", "教师端");
  const studentLabel = trans("adaptiveLearning.roleSwitcher.student", "学生端");

  // Close popover when clicking outside
  useEffect(() => {
    /**
     *
     * @param event
     */
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleRole = () => {
    if (isTeacherMode) {
      navigate(routes.directory);
    } else {
      navigate(routes.teacherHome);
    }
    setIsOpen(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  if (isMinimized) {
    return (
      <div
        className="role-switcher-float fixed bottom-6 right-6 z-[9999]"
        data-mode={isTeacherMode ? "teacher" : "student"}
        data-directory={location.pathname === routes.directory}
        data-workflow={isStudentWorkflow}
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="role-switcher-minimized-trigger flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-all text-xs font-medium border border-slate-700 cursor-pointer"
          title={trans(
            "adaptiveLearning.roleSwitcher.expand",
            "展开账号切换浮窗",
          )}
        >
          {isTeacherMode ? (
            <GraduationCap className="w-4 h-4 text-indigo-400" />
          ) : (
            <User className="w-4 h-4 text-emerald-400" />
          )}
          <span>{isTeacherMode ? teacherLabel : studentLabel}</span>
          <ChevronUp className="w-3.5 h-3.5 opacity-70" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="role-switcher-float fixed bottom-6 right-6 z-[9999]"
      ref={popoverRef}
      data-mode={isTeacherMode ? "teacher" : "student"}
      data-directory={location.pathname === routes.directory}
      data-workflow={isStudentWorkflow}
    >
      {/* Quick Menu Popover */}
      {isOpen && (
        <div className="role-switcher-popover absolute bottom-14 right-0 w-72 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="role-switcher-popover-header px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="role-switcher-popover-title flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-slate-800 tracking-wide uppercase">
                {trans(
                  "adaptiveLearning.roleSwitcher.title",
                  "身份视角与快速导航",
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={trans("global.close", "关闭")}
              className="role-switcher-close text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Role Switching Options */}
          <div className="role-switcher-popover-body p-3 bg-white">
            <div className="role-switcher-section-label text-[11px] font-medium text-slate-400 px-2 mb-1.5">
              {trans(
                "adaptiveLearning.roleSwitcher.switchConsole",
                "切换控制台",
              )}
            </div>
            <div className="role-switcher-role-grid grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  if (!isTeacherMode) handleToggleRole();
                }}
                className={`role-switcher-role-option teacher flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isTeacherMode
                    ? "bg-indigo-50/80 border-indigo-200 text-indigo-900 shadow-sm"
                    : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <GraduationCap
                    className={`w-4 h-4 ${
                      isTeacherMode ? "text-indigo-600" : "text-slate-400"
                    }`}
                  />
                  <span className="font-semibold">{teacherLabel}</span>
                </div>
                {isTeacherMode && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 font-normal">
                    <Check className="w-3 h-3" />{" "}
                    {trans(
                      "adaptiveLearning.roleSwitcher.selected",
                      "当前选定",
                    )}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isTeacherMode) handleToggleRole();
                }}
                className={`role-switcher-role-option student flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isTeacherMode
                    ? "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                    : "bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <User
                    className={`w-4 h-4 ${
                      isTeacherMode ? "text-slate-400" : "text-emerald-600"
                    }`}
                  />
                  <span className="font-semibold">{studentLabel}</span>
                </div>
                {!isTeacherMode && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-normal">
                    <Check className="w-3 h-3" />{" "}
                    {trans(
                      "adaptiveLearning.roleSwitcher.selected",
                      "当前选定",
                    )}
                  </span>
                )}
              </button>
            </div>

            {/* Sub Nav Links */}
            <div className="role-switcher-section-label text-[11px] font-medium text-slate-400 px-2 mb-1">
              {isTeacherMode
                ? trans(
                    "adaptiveLearning.roleSwitcher.teacherShortcuts",
                    "教师端常用功能",
                  )
                : trans(
                    "adaptiveLearning.roleSwitcher.studentShortcuts",
                    "学生端常用功能",
                  )}
            </div>

            <div className="role-switcher-shortcuts space-y-1">
              {isTeacherMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.teacherHome)}
                    className="role-switcher-shortcut w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors text-left"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {trans(
                        "adaptiveLearning.roleSwitcher.teacherWorkspace",
                        "教材课时工作台",
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleNavigate("/adaptive-learning/teacher/reports")
                    }
                    className="role-switcher-shortcut w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors text-left"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {trans(
                        "adaptiveLearning.roleSwitcher.classReports",
                        "班级学情报表",
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleNavigate(routes.teacherQuestionQuality)
                    }
                    className="role-switcher-shortcut w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors text-left"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {trans(
                        "adaptiveLearning.roleSwitcher.questionQuality",
                        "题目质量分析",
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.teacherClasses)}
                    className="role-switcher-shortcut w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors text-left"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {trans(
                        "adaptiveLearning.roleSwitcher.classMembers",
                        "班级成员管理",
                      )}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.directory)}
                    className="role-switcher-shortcut w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-emerald-50/50 hover:text-emerald-700 transition-colors text-left"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {trans(
                        "adaptiveLearning.roleSwitcher.learningDirectory",
                        "今日学习目录",
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.knowledgeMap)}
                    className="role-switcher-shortcut w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-emerald-50/50 hover:text-emerald-700 transition-colors text-left"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {trans(
                        "adaptiveLearning.roleSwitcher.knowledgeMap",
                        "知识图谱总览",
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.studentHome)}
                    className="role-switcher-shortcut w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-emerald-50/50 hover:text-emerald-700 transition-colors text-left"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {trans(
                        "adaptiveLearning.roleSwitcher.studentHome",
                        "学生个人中心",
                      )}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Direct Switch CTA */}
          <div className="role-switcher-popover-footer p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              {trans(
                "adaptiveLearning.roleSwitcher.directMode",
                "一键直达模式",
              )}
            </span>
            <button
              type="button"
              onClick={handleToggleRole}
              className="role-switcher-direct-button flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer shadow-sm"
            >
              <ArrowLeftRight className="w-3 h-3 text-indigo-300" />
              <span>
                {trans(
                  "adaptiveLearning.roleSwitcher.switchTo",
                  "切换至{$role}",
                  { role: isTeacherMode ? studentLabel : teacherLabel },
                )}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Floating Trigger Pill */}
      <div className="role-switcher-trigger-bar flex items-center gap-1 bg-slate-900/95 text-white p-1.5 pl-3 rounded-full shadow-2xl border border-slate-700/80 backdrop-blur-md hover:border-slate-500 transition-all">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={trans(
            "adaptiveLearning.roleSwitcher.openNavigation",
            "打开身份视角与快速导航",
          )}
          aria-expanded={isOpen}
          className="role-switcher-trigger-main flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer select-none"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isTeacherMode ? "bg-indigo-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isTeacherMode ? "bg-indigo-500" : "bg-emerald-500"
              }`}
            />
          </span>

          {isTeacherMode ? (
            <div className="flex items-center gap-1.5 text-indigo-200">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span>
                {trans(
                  "adaptiveLearning.roleSwitcher.teacherMode",
                  "教师端模式",
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-200">
              <User className="w-4 h-4 text-emerald-400" />
              <span>
                {trans(
                  "adaptiveLearning.roleSwitcher.studentMode",
                  "学生端模式",
                )}
              </span>
            </div>
          )}

          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          )}
        </button>

        <div className="h-4 w-[1px] bg-slate-700 my-auto mx-0.5" />

        <button
          type="button"
          onClick={handleToggleRole}
          className="role-switcher-quick-button flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-medium transition-colors cursor-pointer shadow-sm"
          title={trans(
            "adaptiveLearning.roleSwitcher.quickSwitch",
            "快速切至{$role}",
            { role: isTeacherMode ? studentLabel : teacherLabel },
          )}
        >
          <ArrowLeftRight className="w-3 h-3" />
          <span>
            {trans("adaptiveLearning.roleSwitcher.switchShort", "切为{$role}", {
              role: isTeacherMode
                ? trans("adaptiveLearning.roleSwitcher.studentShort", "学生")
                : trans("adaptiveLearning.roleSwitcher.teacherShort", "教师"),
            })}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="role-switcher-minimize text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors ml-0.5"
          title={trans("adaptiveLearning.roleSwitcher.minimize", "最小化")}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
