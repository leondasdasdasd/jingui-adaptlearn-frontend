import React from "react";
import {
  Clock3,
  BookMarked,
  LockKeyhole,
  CheckCircle2,
  ChevronRight,
  Target,
  Sparkles,
  Zap,
  Trophy,
  Network,
} from "lucide-react";

/**
 * 课时自适应核心工作台（分开的两段式结构 + 底部固定小测栏）
 * 第一段：独立课时概览卡片（包含问候、章节面包屑、课时大标题、用时与全书认知画像入口，避免误认为单课140考点）
 * 第二段：独立核心考点梳理卡片（整齐陈列本课的核心考点与评测状态）
 * 底部固定栏：固定在工作区底部的自适应小测行动栏，不随考点数量上下跳动
 */
export default function LessonWorkspace({
  courseName = "七年级数学 · 上册",
  selectedChapter,
  selectedSection,
  progress,
  busy,
  onStart,
  onContinue,
  onLearnKnowledge,
  onOpenKnowledgeMap,
  masteredKpCount = 0,
  totalKpCount = 0,
}) {
  const currentLessonProgress =
    progress?.lessonId === selectedSection?.id ? progress : null;
  const isUnlocked = Boolean(currentLessonProgress?.preAssessmentCompleted);
  const progressByKp = Object.fromEntries(
    (currentLessonProgress?.items || []).map((item) => [item.id, item]),
  );
  const completedCount = (currentLessonProgress?.items || []).filter(
    (item) => item.state === "complete" || item.state === "mastered",
  ).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "夜深了，注意休息";
    if (hour < 12) return "早晨好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <div className="modern-workspace-container">
      {/* ================= 第一段：欢迎与概览卡片 ================= */}
      <section className="lesson-overview-card">
        <div className="overview-card-left">
          <h1 className="overview-welcome-title">{getGreeting()}，开启今天的学习吧</h1>
        </div>

        <div className="overview-card-right">
          <button
            type="button"
            className="minimal-portrait-btn group"
            onClick={onOpenKnowledgeMap}
            title="查看已掌握考点与认知画像"
            aria-label="查看已掌握考点与认知画像"
          >
            <Trophy size={16} className="text-amber-500 flex-shrink-0" />
            <span className="portrait-label">已掌握考点</span>
            <span className="portrait-count">
              {masteredKpCount}/{totalKpCount}
            </span>
            <ChevronRight
              size={14}
              className="text-slate-400 group-hover:translate-x-0.5 group-hover:text-indigo-600 transition-transform"
            />
          </button>
        </div>
      </section>

      {/* ================= 第二段：课时与核心考点梳理卡片（含底部固定操作条） ================= */}
      <section className="lesson-knowledge-card">
        <div className="knowledge-section-header">
          <div className="flex items-center gap-3">
            <div className="lesson-index-tag">
              {selectedSection.index || "当前课时"}
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 m-0 tracking-tight">
              {selectedSection.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="knowledge-count-badge">
              共 {selectedSection.knowledgePoints.length} 个考点
            </span>
            <span className="lesson-time-pill">
              <Clock3 size={13} className="text-slate-400" />
              <span>建议用时 约 {selectedSection.estimatedMinutes || 20} 分钟</span>
            </span>
          </div>
        </div>

        {/* 考点网格 */}
        <div className="modern-knowledge-grid">
          {selectedSection.knowledgePoints.map((kp, index) => {
            const pItem = progressByKp[kp.id];
            const isMastered =
              pItem?.state === "mastered" || (pItem?.mastery >= 85);
            const isNeedsReview = pItem?.state === "needs_review";

            return (
              <div
                key={kp.id}
                className={`modern-kp-card ${
                  isMastered
                    ? "mastered"
                    : isNeedsReview
                      ? "needs-review"
                      : !isUnlocked
                        ? "locked"
                        : ""
                }`}
                onClick={() => {
                  if (isUnlocked) onLearnKnowledge(kp.id);
                }}
                role="button"
                tabIndex={isUnlocked ? 0 : -1}
                aria-disabled={!isUnlocked}
              >
                <div className="kp-card-top">
                  <span className="kp-badge-idx">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="kp-card-title">{kp.name}</h3>

                <div className="kp-card-footer">
                  {pItem ? (
                    <span
                      className={`kp-mastery-pill ${
                        isMastered
                          ? "mastered"
                          : isNeedsReview
                            ? "needs_review"
                            : "locked"
                      }`}
                    >
                      {isMastered && <CheckCircle2 size={13} />}
                      {pItem.mastery != null
                        ? `${pItem.mastery}% 掌握`
                        : pItem.label || "已评测"}
                    </span>
                  ) : (
                    <span className="kp-mastery-pill locked">
                      <LockKeyhole size={13} />
                      待小测
                    </span>
                  )}

                  {isUnlocked ? (
                    <span className="kp-action-hint">
                      针对练习 <ChevronRight size={14} />
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">待解锁</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 占位撑开，保证即使考点数量少，底部操作条也能稳定吸底 */}
        <div className="knowledge-card-spacer" />

        {/* ================= 底部固定小测行动条 ================= */}
        <div className="fixed-bottom-action-dock">
          <div className="action-dock-info">
            {currentLessonProgress ? (
              <strong>
                已完成 {completedCount}/{selectedSection.knowledgePoints.length} 个考点评测
              </strong>
            ) : null}
          </div>

          {currentLessonProgress ? (
            <button
              type="button"
              className="modern-cta-btn"
              disabled={busy}
              onClick={onContinue}
            >
              <Zap size={18} />
              <span>{currentLessonProgress.actionLabel || "继续小测"}</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="modern-cta-btn"
              disabled={busy}
              onClick={() =>
                onStart({
                  chapter: selectedChapter,
                  section: selectedSection,
                  knowledgePoints: selectedSection.knowledgePoints,
                })
              }
            >
              <Sparkles size={18} />
              <span>开始课前小测</span>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

