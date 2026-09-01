import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Presentation, BookOpen } from "lucide-react";

import AppShell from "./AppShell";
import DirectoryHeaderBanner from "./directory/DirectoryHeaderBanner";
import ChapterNavigator from "./directory/ChapterNavigator";
import LessonWorkspace from "./directory/LessonWorkspace";
import ClassroomWorkspace from "./directory/ClassroomWorkspace";
import "../styles/directory-modern.css";

/**
 * 现代自适应学习首页
 */
export default function DirectoryPage({
  course,
  progress,
  directoryMode = "textbook",
  classroomDirectory = { status: "idle", items: [] },
  selectedClassroomId,
  onModeChange,
  onSelectClassroom,
  onRetryClassrooms,
  onEnterClassroom,
  onContinue,
  onOpenKnowledgeMap,
  onStart,
  onLearnKnowledge,
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
  const [openClassroom, setOpenClassroom] = useState(
    selectedClassroomId || classroomDirectory.items[0]?.id || "",
  );

  const selectedClassroom =
    classroomDirectory.items.find((item) => item.id === selectedClassroomId) ||
    classroomDirectory.items.find((item) => item.id === openClassroom) ||
    classroomDirectory.items[0] ||
    null;

  useEffect(() => {
    if (selectedClassroomId) setOpenClassroom(selectedClassroomId);
  }, [selectedClassroomId]);

  useEffect(() => {
    if (!progressLocation) return;
    setSelectedSection(progressLocation.section);
    setOpenChapter(progressLocation.chapter.id);
  }, [progressLocation]);

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

  const chooseClassroom = (classroom) => {
    setOpenClassroom(openClassroom === classroom.id ? "" : classroom.id);
    onSelectClassroom(classroom.id);
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
    >
      <div
        className="modern-directory-root"
        aria-busy={busy}
        inert={busy || undefined}
      >
        {/* 顶部学生氛围激励横幅 */}
        <DirectoryHeaderBanner
          courseName={course.name}
          masteredCount={masteredKpCount}
          totalCount={totalKpCount}
          onOpenKnowledgeMap={onOpenKnowledgeMap}
        />

        {/* 主双栏布局 */}
        <div className="modern-directory-layout">
          {/* 左侧：章节树 & 课堂列表 */}
          <ChapterNavigator
            course={course}
            openChapter={openChapter}
            selectedSection={selectedSection}
            onToggleChapter={(chapterId) =>
              setOpenChapter(openChapter === chapterId ? "" : chapterId)
            }
            onChooseSection={chooseSection}
            directoryMode={directoryMode}
            onModeChange={onModeChange}
            classroomDirectory={classroomDirectory}
            openClassroom={openClassroom}
            selectedClassroom={selectedClassroom}
            onToggleClassroom={chooseClassroom}
          />

          {/* 右侧：课时/课堂工作台 */}
          {directoryMode === "classroom" ? (
            <ClassroomWorkspace
              classroom={selectedClassroom}
              directoryState={classroomDirectory}
              busy={busy}
              onEnterClassroom={onEnterClassroom}
              onRetry={onRetryClassrooms}
            />
          ) : selectedSection ? (
            <LessonWorkspace
              selectedChapter={selectedChapter}
              selectedSection={selectedSection}
              progress={progress}
              localExperience={localExperience}
              busy={busy}
              onStart={onStart}
              onContinue={onContinue}
              onLearnKnowledge={onLearnKnowledge}
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
