import React, { useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LockKeyhole,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { trans } from "../../../utils/i18n";
import { getNewLessonEligibility } from "../../student/domain/newLessonEligibility";
import StudentLearningModeAction from "./StudentLearningModeAction";

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
 * @param root0.knowledgeProfile
 * @param root0.learningMode
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
  knowledgeProfile = {},
  learningMode,
}) {
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

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

  const newLessonEligibility = useMemo(() => {
    return getNewLessonEligibility({
      course,
      selectedSection,
      knowledgeProfile,
    });
  }, [course?.chapters, knowledgeProfile, selectedSection?.id]);
  const newLessonBlockReason = newLessonEligibility.eligible
    ? ""
    : trans(
        "adaptiveLearning.directory.previousLessonRequirement",
        "需上一课「{$lesson}」全部学完且掌握度达90%以上",
        { lesson: newLessonEligibility.previousSectionTitle || "上一课" },
      );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6)
      return trans(
        "adaptiveLearning.directory.greetingLate",
        "夜深了，注意休息",
      );
    if (hour < 12)
      return trans("adaptiveLearning.directory.greetingMorning", "早晨好");
    if (hour < 14)
      return trans("adaptiveLearning.directory.greetingNoon", "中午好");
    if (hour < 18)
      return trans("adaptiveLearning.directory.greetingAfternoon", "下午好");
    return trans("adaptiveLearning.directory.greetingEvening", "晚上好");
  };

  const handleStartNewLesson = () => {
    if (!newLessonEligibility.eligible) {
      setToastMessage(
        newLessonBlockReason ||
          trans(
            "adaptiveLearning.directory.previousLessonRequirementFallback",
            "需上一课全部学完且掌握度达90%以上",
          ),
      );
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

  const handleStartRemediation = () => {
    setToastMessage(
      trans(
        "adaptiveLearning.learningMode.unitAssessmentUnavailable",
        "这个单元还没有可用的单元测试",
      ),
    );
  };

  return (
    <div className="modern-workspace-container">
      {/* 提示消息 */}
      {toastMessage && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
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
              <span>
                {selectedChapter?.title ||
                  trans(
                    "adaptiveLearning.directory.chapterLearning",
                    "章节学习",
                  )}
              </span>
            </span>
          </div>
          <h1 className="overview-welcome-title">
            {trans(
              "adaptiveLearning.directory.welcome",
              "{$greeting}，开启今天的学习吧",
              { greeting: getGreeting() },
            )}
          </h1>
        </div>

        <div className="overview-card-right">
          <button
            type="button"
            className="minimal-portrait-btn"
            onClick={onOpenKnowledgeMap}
            title={trans(
              "adaptiveLearning.directory.viewMastery",
              "查看已掌握考点与学习进度",
            )}
            aria-label={trans(
              "adaptiveLearning.directory.viewMastery",
              "查看已掌握考点与学习进度",
            )}
          >
            <Trophy size={16} className="portrait-trophy-icon" />
            <span className="portrait-label">
              {trans("adaptiveLearning.directory.masteredPoints", "已掌握考点")}
            </span>
            <span className="portrait-count">
              {masteredKpCount}/{totalKpCount}
            </span>
            <ChevronRight size={14} className="portrait-arrow-icon" />
          </button>
        </div>
      </section>

      {/* ================= 第二段：课时与核心考点梳理卡片（含底部固定操作条） ================= */}
      <section className="lesson-knowledge-card">
        <div className="knowledge-section-header">
          <div className="knowledge-header-left">
            <span className="lesson-index-tag">
              {selectedSection.index ||
                trans("adaptiveLearning.directory.currentLesson", "当前课时")}
            </span>
            <h2 className="knowledge-lesson-title">{selectedSection.title}</h2>
          </div>
          <div className="knowledge-header-right">
            <span className="knowledge-count-badge">
              <Target size={13} className="badge-icon badge-icon-indigo" />
              <span>
                {trans(
                  "adaptiveLearning.directory.knowledgePointCount",
                  "共 {$count} 个考点",
                  { count: selectedSection.knowledgePoints.length },
                )}
              </span>
            </span>
            <span className="lesson-time-pill">
              <Clock3 size={13} className="badge-icon badge-icon-muted" />
              <span>
                {trans(
                  "adaptiveLearning.directory.estimatedTime",
                  "建议用时 约 {$minutes} 分钟",
                  { minutes: selectedSection.estimatedMinutes || 20 },
                )}
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
              pItem?.state === "needs_review" ||
              pItem?.status === "needs_review";

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
                        ? pItem.label ||
                          trans("adaptiveLearning.directory.learned", "已学习")
                        : trans(
                            "adaptiveLearning.directory.masteryPercent",
                            "{$mastery}% 掌握",
                            { mastery: pItem.mastery },
                          )}
                    </span>
                  ) : (
                    <span className="kp-mastery-pill locked">
                      <LockKeyhole size={13} />
                      {trans(
                        "adaptiveLearning.directory.pendingQuiz",
                        "待测验",
                      )}
                    </span>
                  )}

                  {isUnlocked ? (
                    <span className="kp-action-hint">
                      {trans(
                        "adaptiveLearning.directory.targetedPractice",
                        "针对练习",
                      )}{" "}
                      <ChevronRight size={14} />
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {trans("adaptiveLearning.directory.locked", "待解锁")}
                    </span>
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
                {trans(
                  "adaptiveLearning.directory.completedQuizCount",
                  "已完成 {$completed}/{$total} 个考点测验",
                  {
                    completed: completedCount,
                    total: selectedSection.knowledgePoints.length,
                  },
                )}
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
              <span>
                {currentLessonProgress.actionLabel ||
                  trans(
                    "adaptiveLearning.directory.continueLearning",
                    "继续学习",
                  )}
              </span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <StudentLearningModeAction
              learningMode={learningMode}
              busy={busy}
              newLessonEligible={newLessonEligibility.eligible}
              newLessonBlockReason={newLessonBlockReason}
              onStartNewLesson={handleStartNewLesson}
              onStartFoundation={() =>
                onStart({
                  chapter: selectedChapter,
                  section: selectedSection,
                  knowledgePoints: selectedSection.knowledgePoints,
                })
              }
              onStartRemediation={handleStartRemediation}
            />
          )}
        </div>
      </section>
    </div>
  );
}
