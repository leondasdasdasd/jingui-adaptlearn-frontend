import React, { useEffect, useMemo, useState } from "react";

import { trans } from "../../utils/i18n";
import { DEFAULT_CLASSROOM_LEARNING_MODE } from "../shared/domain/classroomLearningMode";
import {
  readPreferredLearningMode,
  savePreferredLearningMode,
} from "../student/data/studentLearningModePreference";
import AppShell from "./AppShell";
import ChapterNavigator from "./directory/ChapterNavigator";
import CourseSwitcher from "./directory/CourseSwitcher";
import LessonWorkspace from "./directory/LessonWorkspace";
import StudentLearningModeSelector from "./StudentLearningModeSelector";

import "../styles/directory-modern.css";

/**
 * 现代自适应学习首页
 * @param root0
 * @param root0.course
 * @param root0.progress
 * @param root0.onContinue
 * @param root0.onOpenKnowledgeMap
 * @param root0.onStart
 * @param root0.onLearnKnowledge
 * @param root0.onSelectCourse
 * @param root0.localExperience
 * @param root0.busy
 * @param root0.knowledgeProfile
 * @param root0.onStartNewLesson
 */
export default function DirectoryPage({
  course,
  progress,
  onContinue,
  onOpenKnowledgeMap,
  onStart,
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

  const [selectedSection, setSelectedSection] = useState(
    () => progressLocation?.section || course.chapters[0]?.sections[0] || null,
  );

  // 课程或活动会话变化时统一定位；恢复进度优先于课程首课。
  useEffect(() => {
    setSelectedSection(
      progressLocation?.section || course.chapters[0]?.sections[0] || null,
    );
  }, [course.chapters, course.id, progressLocation]);

  const selectedChapter = useMemo(
    () =>
      course.chapters.find((chapter) =>
        chapter.sections.some((section) => section.id === selectedSection?.id),
      ) || course.chapters[0],
    [course.chapters, selectedSection],
  );

  const chooseSection = (_chapter, section) => {
    setSelectedSection(section);
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

  return (
    <AppShell
      title={trans("adaptiveLearning.directory.title", "智能自适应学习")}
      shellClassName="directory-app-shell"
      actions={
        <CourseSwitcher
          currentCourse={course}
          onSelectCourse={onSelectCourse}
        />
      }
    >
      <div
        className="modern-directory-root"
        aria-busy={busy}
        inert={busy || undefined}
      >
        {!currentLessonProgress && (
          <StudentLearningModeSelector
            value={learningMode}
            onChange={handleLearningModeChange}
            onOpenModePage={onOpenModePage}
          />
        )}
        <div className="modern-directory-layout">
          {/* 左侧：章节课时导航 */}
          <ChapterNavigator
            course={course}
            selectedSection={selectedSection}
            onChooseSection={chooseSection}
          />

          {/* 右侧：课时自适应工作台 */}
          {selectedSection ? (
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
