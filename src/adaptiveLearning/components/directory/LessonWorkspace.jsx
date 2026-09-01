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
} from "lucide-react";

/**
 * 课时自适应核心工作台
 */
export default function LessonWorkspace({
  selectedChapter,
  selectedSection,
  progress,
  busy,
  onStart,
  onContinue,
  onLearnKnowledge,
}) {
  const currentLessonProgress =
    progress?.lessonId === selectedSection.id ? progress : null;
  const isUnlocked = Boolean(currentLessonProgress?.preAssessmentCompleted);
  const progressByKp = Object.fromEntries(
    (currentLessonProgress?.items || []).map((item) => [item.id, item]),
  );
  const completedCount = (currentLessonProgress?.items || []).filter(
    (item) => item.state === "complete" || item.state === "mastered",
  ).length;

  return (
    <div className="modern-workspace-container">
      <section className="modern-lesson-stage">
        {/* 顶部元数据与面包屑 */}
        <div className="stage-top-badge-row">
          <div className="chapter-breadcrumb-tag">
            <BookMarked size={14} />
            <span>
              {selectedChapter?.title} · {selectedSection?.index}
            </span>
          </div>
          <div className="lesson-time-pill">
            <Clock3 size={14} className="text-slate-400" />
            <span>建议用时 约 {selectedSection.estimatedMinutes || 20} 分钟</span>
          </div>
        </div>

        {/* 课时主标题 */}
        <h1 className="stage-lesson-title">{selectedSection.title}</h1>

        {/* 知识点网格 */}
        <div className="knowledge-section-header">
          <h2>
            <Target size={18} className="text-indigo-600" />
            <span>核心考点</span>
          </h2>
          <span className="knowledge-count-badge">
            共 {selectedSection.knowledgePoints.length} 个
          </span>
        </div>

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

        {/* 底部行动卡片 */}
        <div className="modern-action-dock">
          <div className="action-dock-info">
            <strong>
              {currentLessonProgress
                ? `已完成 ${completedCount}/${selectedSection.knowledgePoints.length} 个考点评测`
                : "本课自适应小测"}
            </strong>
          </div>

          {currentLessonProgress ? (
            <button
              type="button"
              className="modern-cta-btn"
              disabled={busy}
              onClick={onContinue}
            >
              <Zap size={18} />
              <span>{currentLessonProgress.actionLabel || "继续学习"}</span>
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
