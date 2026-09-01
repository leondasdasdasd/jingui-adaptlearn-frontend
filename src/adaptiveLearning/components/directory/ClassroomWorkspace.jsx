import React from "react";
import {
  Presentation,
  Clock3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";

/**
 * 老师课堂自适应工作台
 */
export default function ClassroomWorkspace({
  classroom,
  directoryState,
  busy,
  onEnterClassroom,
  onRetry,
}) {
  if (directoryState?.status === "loading") {
    return (
      <section className="modern-lesson-stage text-center py-16">
        <Presentation size={36} className="mx-auto text-indigo-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">正在同步老师课堂</h2>
        <p className="text-slate-500 text-sm">请稍候，正在获取老师为你安排的自适应课堂方案…</p>
      </section>
    );
  }

  if (!classroom) {
    const isError = directoryState?.status === "error";
    return (
      <section className="modern-lesson-stage text-center py-16">
        <Presentation size={36} className="mx-auto text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {isError ? "课堂同步失败" : "暂时没有老师发布的课堂"}
        </h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
          {isError
            ? directoryState.message || "未能连接到课堂服务器，请检查网络后重试。"
            : "老师在教师端发布并分配给你的课堂会在此处显示，你可以先在左侧切换到「教材进阶」进行自主探索。"}
        </p>
        {isError && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-100"
            onClick={onRetry}
          >
            <RefreshCw size={15} />
            重新加载
          </button>
        )}
      </section>
    );
  }

  const sourceText =
    classroom.sourceLessons?.length > 0
      ? classroom.sourceLessons
          .map(
            (lesson) =>
              `${lesson.index ? `${lesson.index} ` : ""}${lesson.title}`,
          )
          .join(" · ")
      : "自适应教学方案";

  return (
    <div className="modern-workspace-container">
      <section className="modern-lesson-stage">
        {/* 顶部标签 */}
        <div className="stage-top-badge-row">
          <div className="chapter-breadcrumb-tag">
            <Presentation size={14} />
            <span>老师发布课堂</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`classroom-status-pill ${classroom.status.toLowerCase().replaceAll("_", "-")}`}
            >
              {classroom.statusLabel}
            </span>
            {classroom.estimatedMinutes && (
              <span className="lesson-time-pill">
                <Clock3 size={14} className="text-slate-400" />
                <span>约 {classroom.estimatedMinutes} 分钟</span>
              </span>
            )}
          </div>
        </div>

        {/* 课堂主标题 */}
        <h1 className="stage-lesson-title">{classroom.title}</h1>
        <p className="text-slate-500 text-sm mb-6">来源课时：{sourceText}</p>

        {/* 课堂知识点列表 */}
        <div className="knowledge-section-header">
          <h2 className="text-base font-bold text-slate-800">
            课堂包含的考点 ({classroom.knowledgePoints?.length || 0})
          </h2>
        </div>

        <div className="modern-knowledge-grid">
          {classroom.knowledgePoints?.length > 0 ? (
            classroom.knowledgePoints.map((kp, idx) => (
              <div key={kp.id} className="modern-kp-card">
                <div className="kp-card-top">
                  <span className="kp-badge-idx">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                    核心考点
                  </span>
                </div>
                <h3 className="kp-card-title">{kp.name}</h3>
                <div className="kp-card-footer">
                  <span className="text-xs text-indigo-600 font-medium">
                    {kp.statusLabel || "老师推荐掌握"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-6 text-center text-slate-400 text-sm bg-slate-50 rounded-xl">
              进入课堂后将自动加载知识点安排
            </div>
          )}
        </div>

        {/* 底部进入课堂操作 */}
        <div className="modern-action-dock">
          <div className="action-dock-info">
            <strong>准备好加入课堂了吗？</strong>
            <span>老师已布置自适应学习任务，点击即可开始答题与互动</span>
          </div>
          <button
            type="button"
            className="modern-cta-btn"
            disabled={busy || classroom.status === "CANCELLED"}
            onClick={() => onEnterClassroom(classroom)}
          >
            <Presentation size={18} />
            <span>{classroom.studentSessionId ? "继续课堂学习" : "立即进入课堂"}</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
