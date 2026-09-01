import React, { useState, useEffect, useRef } from "react";
import {
  GraduationCap,
  User,
  ArrowLeftRight,
  BookOpen,
  BarChart3,
  Users,
  MapPin,
  ChevronUp,
  ChevronDown,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import { useLocation, useNavigate } from "../routing";
import { routes } from "../routes/routePaths";

export default function RoleSwitcherFloat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const popoverRef = useRef(null);

  const isTeacherMode = location.pathname.includes("/teacher");

  // Close popover when clicking outside
  useEffect(() => {
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
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-all text-xs font-medium border border-slate-700 cursor-pointer"
          title="展开账号切换浮窗"
        >
          {isTeacherMode ? (
            <GraduationCap className="w-4 h-4 text-indigo-400" />
          ) : (
            <User className="w-4 h-4 text-emerald-400" />
          )}
          <span>{isTeacherMode ? "教师端" : "学生端"}</span>
          <ChevronUp className="w-3.5 h-3.5 opacity-70" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]" ref={popoverRef}>
      {/* Quick Menu Popover */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-slate-800 tracking-wide uppercase">
                身份视角与快速导航
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Role Switching Options */}
          <div className="p-3 bg-white">
            <div className="text-[11px] font-medium text-slate-400 px-2 mb-1.5">
              切换控制台
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  if (!isTeacherMode) handleToggleRole();
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
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
                  <span className="font-semibold">教师端</span>
                </div>
                {isTeacherMode && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 font-normal">
                    <Check className="w-3 h-3" /> 当前选定
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isTeacherMode) handleToggleRole();
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  !isTeacherMode
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-sm"
                    : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <User
                    className={`w-4 h-4 ${
                      !isTeacherMode ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  <span className="font-semibold">学生端</span>
                </div>
                {!isTeacherMode && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-normal">
                    <Check className="w-3 h-3" /> 当前选定
                  </span>
                )}
              </button>
            </div>

            {/* Sub Nav Links */}
            <div className="text-[11px] font-medium text-slate-400 px-2 mb-1">
              {isTeacherMode ? "教师端常用功能" : "学生端常用功能"}
            </div>

            <div className="space-y-1">
              {isTeacherMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.teacherHome)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors text-left"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>教材课时工作台</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleNavigate("/adaptive-learning/teacher/reports")
                    }
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors text-left"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>班级学情报表</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleNavigate(routes.teacherQuestionQuality)
                    }
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors text-left"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>题目质量分析</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.teacherClasses)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors text-left"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>班级成员管理</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.directory)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-emerald-50/50 hover:text-emerald-700 transition-colors text-left"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                    <span>今日学习目录</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.knowledgeMap)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-emerald-50/50 hover:text-emerald-700 transition-colors text-left"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>知识图谱总览</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate(routes.studentHome)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-emerald-50/50 hover:text-emerald-700 transition-colors text-left"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>学生个人中心</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Direct Switch CTA */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">一键直达模式</span>
            <button
              type="button"
              onClick={handleToggleRole}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer shadow-sm"
            >
              <ArrowLeftRight className="w-3 h-3 text-indigo-300" />
              <span>切换至{isTeacherMode ? "学生端" : "教师端"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Floating Trigger Pill */}
      <div className="flex items-center gap-1 bg-slate-900/95 text-white p-1.5 pl-3 rounded-full shadow-2xl border border-slate-700/80 backdrop-blur-md hover:border-slate-500 transition-all">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer select-none"
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
              <span>教师端模式</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-200">
              <User className="w-4 h-4 text-emerald-400" />
              <span>学生端模式</span>
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
          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-medium transition-colors cursor-pointer shadow-sm"
          title={`快速切至${isTeacherMode ? "学生端" : "教师端"}`}
        >
          <ArrowLeftRight className="w-3 h-3" />
          <span>切为{isTeacherMode ? "学生" : "教师"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors ml-0.5"
          title="最小化"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
