import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { trans } from "../../utils/i18n";
import { DEFAULT_CLASSROOM_LEARNING_MODE } from "../shared/domain/classroomLearningMode";
import {
  readPreferredLearningMode,
  savePreferredLearningMode,
} from "../student/data/studentLearningModePreference";
import { resolveStudentLearningModePresentation } from "../student/presentation/studentLearningModePresentation";
import { routes } from "../routes/routePaths";
import { useNavigate } from "../routing";
import AppShell from "./AppShell";
import ChapterNavigator from "./directory/ChapterNavigator";
import CourseSwitcher from "./directory/CourseSwitcher";
import LessonWorkspace from "./directory/LessonWorkspace";
import UnitAssessmentWorkspace from "./directory/UnitAssessmentWorkspace";
import LearningModeIcon from "./LearningModeIcon";

import "../styles/directory-modern.css";

/**
 * 构建单元测试虚拟课时结构
 * @param chapter
 */
export function createUnitAssessmentSection(chapter) {
  if (!chapter) return null;
  const kps = (chapter.sections || []).flatMap((s) => s.knowledgePoints || []);
  return {
    id: `unit-assessment-${chapter.id}`,
    isUnitAssessment: true,
    chapterId: chapter.id,
    title: `${chapter.title} · 单元测试`,
    index: "单元测试",
    knowledgePoints: kps,
  };
}

/**
 * 现代自适应学习首页
 * @param root0
 * @param root0.course
 * @param root0.progress
 * @param root0.onContinue
 * @param root0.onOpenKnowledgeMap
 * @param root0.onStart
 * @param root0.onStartUnitAssessment
 * @param root0.onLearnKnowledge
 * @param root0.onSelectCourse
 * @param root0.localExperience
 * @param root0.busy
 * @param root0.knowledgeProfile
 * @param root0.onStartNewLesson
 * @param root0.initialLearningMode
 * @param root0.onLearningModeChange
 * @param root0.onOpenModePage
 */
export default function DirectoryPage({
  course,
  progress,
  onContinue,
  onOpenKnowledgeMap,
  onStart,
  onStartUnitAssessment,
  onLearnKnowledge,
  onSelectCourse,
  localExperience = false,
  busy = false,
  knowledgeProfile = {},
  onStartNewLesson,
  initialLearningMode,
  onLearningModeChange,
  onOpenModePage,
}) {
  const [learningMode, setLearningMode] = useState(() => {
    return (
      initialLearningMode ||
      readPreferredLearningMode() ||
      DEFAULT_CLASSROOM_LEARNING_MODE
    );
  });

  useEffect(() => {
    if (initialLearningMode) {
      setLearningMode(initialLearningMode);
    }
  }, [initialLearningMode]);

  const handleLearningModeChange = (nextMode) => {
    setLearningMode(nextMode);
    savePreferredLearningMode(nextMode);
    if (onLearningModeChange) {
      onLearningModeChange(nextMode);
    }
  };
  // 根据学习进度定位当前章节和课时
  const progressLocation = useMemo(() => {
    for (const chapter of course.chapters) {
      const section = chapter.sections.find(
        (item) => item.id === progress?.lessonId,
      );
      if (section) return { chapter, section };
    }
    return null;
  }, [course.chapters, progress?.lessonId]);

  const [selectedSection, setSelectedSection] = useState(() => {
    if (progressLocation?.section) return progressLocation.section;
    const initialMode =
      initialLearningMode ||
      readPreferredLearningMode() ||
      DEFAULT_CLASSROOM_LEARNING_MODE;
    if (initialMode === "REMEDIATION") {
      return createUnitAssessmentSection(course.chapters[0]);
    }
    return course.chapters[0]?.sections[0] || null;
  });

  // 课程或活动会话变化时统一定位；恢复进度优先于课程首课。
  useEffect(() => {
    if (progressLocation?.section) {
      setSelectedSection(progressLocation.section);
      return;
    }
    if (learningMode === "REMEDIATION") {
      setSelectedSection((prev) => {
        if (prev?.isUnitAssessment) return prev;
        return createUnitAssessmentSection(course.chapters[0]);
      });
      return;
    }
    setSelectedSection((prev) => {
      if (prev && !prev.isUnitAssessment) return prev;
      return course.chapters[0]?.sections[0] || null;
    });
  }, [course.chapters, course.id, learningMode, progressLocation]);

  const selectedChapter = useMemo(() => {
    if (selectedSection?.chapterId) {
      const ch = course.chapters.find(
        (chapter) => chapter.id === selectedSection.chapterId,
      );
      if (ch) return ch;
    }
    return (
      course.chapters.find((chapter) =>
        chapter.sections.some((section) => section.id === selectedSection?.id),
      ) || course.chapters[0]
    );
  }, [course.chapters, selectedSection]);

  const chooseSection = (_chapter, section) => {
    setSelectedSection(section);
  };

  const chooseUnitAssessment = (chapter) => {
    setSelectedSection(createUnitAssessmentSection(chapter));
  };

  // 学习模式只作用于当前选中的课时，其他课时的历史进度不能锁住新入口。
  const currentLessonProgress =
    progress?.lessonId === selectedSection?.id ? progress : null;

  // 统计掌握知识点数
  const totalKpCount = useMemo(() => {
    return course.chapters.reduce(
      (total, ch) =>
        total +
        ch.sections.reduce(
          (secTotal, s) => secTotal + (s.knowledgePoints?.length || 0),
          0,
        ),
      0,
    );
  }, [course.chapters]);

  const masteredKpCount = useMemo(() => {
    if (!progress?.items) return 0;
    return progress.items.filter(
      (item) => item.state === "mastered" || item.state === "complete",
    ).length;
  }, [progress]);

  const activeMode = resolveStudentLearningModePresentation(learningMode);
  const navigate = useNavigate();

  const handleOpenModePage = () => {
    if (onOpenModePage) {
      onOpenModePage(learningMode);
      return;
    }
    navigate(`${routes.modeSelection}?mode=${learningMode}`);
  };

  return (
    <AppShell
      title={trans("adaptiveLearning.directory.title", "智能自适应学习")}
      shellClassName="directory-app-shell"
      actions={
        <div className="directory-header-actions">
          <button
            type="button"
            className="directory-learning-mode-badge-btn"
            onClick={handleOpenModePage}
            title={trans(
              "adaptiveLearning.learningMode.switchTooltip",
              "当前模式：{$mode}模式（点击切换学习模式）",
              { mode: activeMode.label },
            )}
            aria-label={trans(
              "adaptiveLearning.learningMode.currentAria",
              "当前学习模式：{$mode}模式，点击切换",
              { mode: activeMode.label },
            )}
          >
            <LearningModeIcon name={activeMode.icon} size={14} />
            <span className="directory-learning-mode-badge-name">
              {activeMode.label}模式
            </span>
            <Sparkles size={12} className="directory-learning-mode-badge-sparkle" />
          </button>
          <CourseSwitcher
            currentCourse={course}
            onSelectCourse={onSelectCourse}
          />
        </div>
      }
    >
      <div
        className="modern-directory-root"
        aria-busy={busy}
        inert={busy || undefined}
      >
        <div className="modern-directory-layout">
          {/* 左侧：章节课时导航 */}
          <ChapterNavigator
            course={course}
            selectedSection={selectedSection}
            onChooseSection={chooseSection}
            onChooseUnitAssessment={chooseUnitAssessment}
            learningMode={learningMode}
          />

          {/* 右侧：课时自适应工作台 或 单元测试专属工作台 */}
          {selectedSection?.isUnitAssessment ? (
            <UnitAssessmentWorkspace
              course={course}
              courseName={course.name}
              chapter={selectedChapter}
              knowledgeProfile={knowledgeProfile}
              busy={busy}
              learningMode={learningMode}
              onStart={onStart}
              onStartUnitAssessment={onStartUnitAssessment}
              onChooseSection={chooseSection}
              onOpenKnowledgeMap={onOpenKnowledgeMap}
            />
          ) : selectedSection ? (
            <LessonWorkspace
              course={course}
              courseName={course.name}
              selectedChapter={selectedChapter}
              selectedSection={selectedSection}
              progress={currentLessonProgress}
              knowledgeProfile={knowledgeProfile}
              localExperience={localExperience}
              busy={busy}
              onStart={onStart}
              onStartNewLesson={onStartNewLesson}
              onContinue={onContinue}
              onLearnKnowledge={onLearnKnowledge}
              onOpenKnowledgeMap={onOpenKnowledgeMap}
              masteredKpCount={masteredKpCount}
              totalKpCount={totalKpCount}
              learningMode={learningMode}
            />
          ) : (
            <div className="p-12 text-center text-slate-400">
              {trans(
                "adaptiveLearning.directory.selectLesson",
                "请在左侧选择要学习的课时",
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
