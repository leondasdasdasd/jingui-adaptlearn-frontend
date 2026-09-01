import React, { useEffect, useMemo, useState } from "react";

import AppShell from "./AppShell";
import ChapterNavigator from "./directory/ChapterNavigator";
import CourseSwitcher from "./directory/CourseSwitcher";
import LessonWorkspace from "./directory/LessonWorkspace";

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
}) {
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

  const [openChapter, setOpenChapter] = useState(
    () => progressLocation?.chapter.id || course.chapters[0]?.id || "",
  );
  const [selectedSection, setSelectedSection] = useState(
    () => progressLocation?.section || course.chapters[0]?.sections[0] || null,
  );

  useEffect(() => {
    if (!progressLocation) return;
    setSelectedSection(progressLocation.section);
    setOpenChapter(progressLocation.chapter.id);
  }, [progressLocation]);

  // 当课程切换时，重置选中的章节与课时
  useEffect(() => {
    if (course?.chapters?.[0]?.sections?.[0]) {
      setSelectedSection(course.chapters[0].sections[0]);
      setOpenChapter(course.chapters[0].id);
    }
  }, [course?.id]);

  const selectedChapter = useMemo(
    () =>
      course.chapters.find((chapter) =>
        chapter.sections.some((section) => section.id === selectedSection?.id),
      ) || course.chapters[0],
    [course.chapters, selectedSection],
  );

  const chooseSection = (chapter, section) => {
    setSelectedSection(section);
    setOpenChapter(chapter.id);
  };

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
      title="智能自适应学习"
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
              courseName={course.name}
              selectedChapter={selectedChapter}
              selectedSection={selectedSection}
              progress={progress}
              localExperience={localExperience}
              busy={busy}
              onStart={onStart}
              onContinue={onContinue}
              onLearnKnowledge={onLearnKnowledge}
              onOpenKnowledgeMap={onOpenKnowledgeMap}
              masteredKpCount={masteredKpCount}
              totalKpCount={totalKpCount}
            />
          ) : (
            <div className="p-12 text-center text-slate-400">
              请在左侧选择要学习的课时
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
