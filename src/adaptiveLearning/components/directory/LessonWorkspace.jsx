import React, { useMemo, useState } from "react";
import {
  BookMarked,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LockKeyhole,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { readKnowledgeProfile } from "../../student/data/knowledgeProfileRepository";

/**
 * 课时自适应核心工作台（分开的两段式结构 + 底部固定行动栏）
 * @param root0
 * @param root0.course
 * @param root0.courseName
 * @param root0.selectedChapter
 * @param root0.selectedSection
 * @param root0.progress
 * @param root0.busy
 * @param root0.onStart
 * @param root0.onStartNewLesson
 * @param root0.onContinue
 * @param root0.onLearnKnowledge
 * @param root0.onOpenKnowledgeMap
 * @param root0.masteredKpCount
 * @param root0.totalKpCount
 */
export default function LessonWorkspace({
  course,
  courseName = "七年级数学 · 上册",
  selectedChapter,
  selectedSection,
  progress,
  busy,
  onStart,
  onStartNewLesson,
  onContinue,
  onLearnKnowledge,
  onOpenKnowledgeMap,
  masteredKpCount = 0,
  totalKpCount = 0,
}) {
  const [toastMessage, setToastMessage] = useState("");
  const knowledgeProfile = readKnowledgeProfile();

  const currentLessonProgress =
    progress?.lessonId === selectedSection?.id ? progress : null;

  // 只要开始过测验、或已经学习过本课任一知识点、或有本地进度，课时即解锁
  const hasStartedAnyKp = useMemo(() => {
    if (!selectedSection?.knowledgePoints) return false;
    return selectedSection.knowledgePoints.some((kp) =>
      Boolean(knowledgeProfile[kp.id]),
    );
  }, [knowledgeProfile, selectedSection?.knowledgePoints]);

  const isUnlocked = Boolean(
    currentLessonProgress?.preAssessmentCompleted ||
      hasStartedAnyKp ||
      currentLessonProgress,
  );

  const progressByKp = Object.fromEntries(
    (currentLessonProgress?.items || []).map((item) => [item.id, item]),
  );
  const completedCount = (currentLessonProgress?.items || []).filter(
    (item) => item.state === "complete" || item.state === "mastered",
  ).length;

  // 判断上新课前置条件：上一课的内容已全部学完且知识点掌握度均达90%以上
  const newLessonEligibility = useMemo(() => {
    if (!course?.chapters?.length || !selectedSection?.id) {
      return { eligible: true };
    }
    const allSections = course.chapters.flatMap((ch) => ch.sections || []);
    const currentIndex = allSections.findIndex((s) => s.id === selectedSection.id);

    // 第一课无需前置条件，直接可上新课
    if (currentIndex <= 0) {
      return { eligible: true };
    }

    const prevSection = allSections[currentIndex - 1];
    const prevKps = prevSection?.knowledgePoints || [];
    if (prevKps.length === 0) {
      return { eligible: true };
    }

    // 检查上一课的所有考点是否已学习且掌握度>=90%
    const unmasteredKps = prevKps.filter((kp) => {
      const record = knowledgeProfile[kp.id];
      if (!record) return true;
      const mastery = record.mastery != null ? Number(record.mastery) : null;
      if (record.status === "mastered") return false;
      return mastery === null || mastery < 90;
    });

    const eligible = unmasteredKps.length === 0;
    return {
      eligible,
      prevSectionTitle: prevSection.title || "上一课",
      reason: eligible
        ? ""
        : `需上一课「${prevSection.title}」全部学完且掌握度达90%以上`,
    };
  }, [course?.chapters, knowledgeProfile, selectedSection?.id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "夜深了，注意休息";
    if (hour < 12) return "早晨好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  const handleStartNewLesson = () => {
    if (!newLessonEligibility.eligible) {
      setToastMessage(
        newLessonEligibility.reason || "需上一课全部学完且掌握度达90%以上",
      );
      setTimeout(() => setToastMessage(""), 3500);
      return;
    }
    if (onStartNewLesson) {
      onStartNewLesson({
        chapter: selectedChapter,
        section: selectedSection,
        knowledgePoints: selectedSection.knowledgePoints,
      });
    } else if (selectedSection.knowledgePoints?.[0]) {
      onLearnKnowledge(selectedSection.knowledgePoints[0].id);
    }
  };

  return (
    <div className="modern-workspace-container">
      {/* 提示消息 */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <LockKeyhole size={15} className="text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= 第一段：欢迎与概览卡片 ================= */}
      <section className="lesson-overview-card">
        <div className="overview-card-left">
          <div className="overview-sub-meta">
            <span className="overview-chapter-tag">
              <BookMarked size={13} className="overview-tag-icon" />
              <span>{selectedChapter?.title || "章节学习"}</span>
            </span>
          </div>
          <h1 className="overview-welcome-title">
            {getGreeting()}，开启今天的学习吧
          </h1>
        </div>

        <div className="overview-card-right">
          <button
            type="button"
            className="minimal-portrait-btn"
            onClick={onOpenKnowledgeMap}
            title="查看已掌握考点与学习进度"
            aria-label="查看已掌握考点与学习进度"
          >
            <Trophy size={16} className="portrait-trophy-icon" />
            <span className="portrait-label">已掌握考点</span>
            <span className="portrait-count">
              {masteredKpCount}/{totalKpCount}
            </span>
            <ChevronRight
              size={14}
              className="portrait-arrow-icon"
            />
          </button>
        </div>
      </section>

      {/* ================= 第二段：课时与核心考点梳理卡片（含底部固定操作条） ================= */}
      <section className="lesson-knowledge-card">
        <div className="knowledge-section-header">
          <div className="knowledge-header-left">
            <span className="lesson-index-tag">
              {selectedSection.index || "当前课时"}
            </span>
            <h2 className="knowledge-lesson-title">
              {selectedSection.title}
            </h2>
          </div>
          <div className="knowledge-header-right">
            <span className="knowledge-count-badge">
              <Target size={13} className="badge-icon badge-icon-indigo" />
              <span>共 {selectedSection.knowledgePoints.length} 个考点</span>
            </span>
            <span className="lesson-time-pill">
              <Clock3 size={13} className="badge-icon badge-icon-muted" />
              <span>
                建议用时 约 {selectedSection.estimatedMinutes || 20} 分钟
              </span>
            </span>
          </div>
        </div>

        {/* 考点网格 */}
        <div className="modern-knowledge-grid">
          {selectedSection.knowledgePoints.map((kp, index) => {
            const pItem = progressByKp[kp.id] || knowledgeProfile[kp.id];
            const isMastered =
              pItem?.state === "mastered" ||
              pItem?.status === "mastered" ||
              (pItem?.mastery != null && pItem.mastery >= 90);
            const isNeedsReview =
              pItem?.state === "needs_review" || pItem?.status === "needs_review";

            return (
              <div
                key={kp.id}
                className={`modern-kp-card ${
                  isMastered
                    ? "mastered"
                    : isNeedsReview
                      ? "needs-review"
                      : isUnlocked
                        ? ""
                        : "locked"
                }`}
                onClick={() => {
                  if (isUnlocked) onLearnKnowledge(kp.id);
                }}
                onKeyDown={(event) => {
                  if (
                    isUnlocked &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    onLearnKnowledge(kp.id);
                  }
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
                      {pItem.mastery == null
                        ? pItem.label || "已学习"
                        : `${pItem.mastery}% 掌握`}
                    </span>
                  ) : (
                    <span className="kp-mastery-pill locked">
                      <LockKeyhole size={13} />
                      待测验
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

        {/* ================= 底部固定操作行动条 ================= */}
        <div className="fixed-bottom-action-dock">
          <div className="action-dock-info">
            {currentLessonProgress ? (
              <strong>
                已完成 {completedCount}/{selectedSection.knowledgePoints.length}{" "}
                个考点测验
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
              <span>{currentLessonProgress.actionLabel || "继续学习"}</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <div className="action-dock-actions">
              {/* 上新课 按钮 */}
              <div className="action-dock-btn-wrapper">
                <button
                  type="button"
                  className={`modern-new-lesson-btn ${
                    !newLessonEligibility.eligible ? "disabled" : ""
                  }`}
                  disabled={busy}
                  onClick={handleStartNewLesson}
                  title={
                    !newLessonEligibility.eligible
                      ? newLessonEligibility.reason
                      : "从第 1 个知识点开始学习"
                  }
                >
                  {!newLessonEligibility.eligible ? (
                    <LockKeyhole size={16} className="text-slate-400 shrink-0" />
                  ) : (
                    <BookOpen size={16} className="text-emerald-600 shrink-0" />
                  )}
                  <span>上新课</span>
                </button>
                {!newLessonEligibility.eligible && (
                  <div className="new-lesson-tooltip">
                    {newLessonEligibility.reason}
                  </div>
                )}
              </div>

              {/* 开始课时测验 按钮 */}
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
                <span>开始课时测验</span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
