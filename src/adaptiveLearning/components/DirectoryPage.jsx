import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  LockKeyhole,
  Presentation,
  RefreshCw,
} from "lucide-react";

import AppShell from "./AppShell";
import { ChevronDown, ChevronRight, Clock3, Sparkles } from "./Icons";

/**
 *
 * @param root0
 * @param root0.course
 * @param root0.openChapter
 * @param root0.selectedSection
 * @param root0.onToggleChapter
 * @param root0.onChooseSection
 */
function TextbookDirectory({
  course,
  openChapter,
  selectedSection,
  onToggleChapter,
  onChooseSection,
}) {
  return course.chapters.map((chapter) => (
    <div className="chapter-group" key={chapter.id}>
      <button
        className="chapter-button"
        type="button"
        onClick={() => onToggleChapter(chapter.id)}
        aria-expanded={openChapter === chapter.id}
      >
        <span>
          <small>{chapter.index}</small>
          {chapter.title}
        </span>
        <ChevronDown
          className={openChapter === chapter.id ? "rotate" : ""}
          size={17}
        />
      </button>
      {openChapter === chapter.id && (
        <div className="section-list">
          {chapter.sections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={
                selectedSection.id === section.id
                  ? "section-button active"
                  : "section-button"
              }
              onClick={() => onChooseSection(chapter, section)}
            >
              <span>{section.index}</span>
              <strong>{section.title}</strong>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      )}
    </div>
  ));
}

/**
 *
 * @param root0
 * @param root0.classrooms
 * @param root0.openClassroom
 * @param root0.selectedClassroom
 * @param root0.onToggleClassroom
 */
function ClassroomDirectory({
  classrooms,
  openClassroom,
  selectedClassroom,
  onToggleClassroom,
}) {
  return classrooms.map((classroom) => (
    <div className="chapter-group classroom-group" key={classroom.id}>
      <button
        className={`classroom-button${selectedClassroom?.id === classroom.id ? " active" : ""}`}
        type="button"
        onClick={() => onToggleClassroom(classroom)}
        aria-expanded={openClassroom === classroom.id}
      >
        <span>
          <span className="classroom-button-summary">
            <small
              className={`classroom-status ${classroom.status.toLowerCase().replaceAll("_", "-")}`}
            >
              {classroom.statusLabel}
            </small>
            <small>
              {classroom.sourceLessons.length > 0
                ? `${classroom.sourceLessons.length} 个课时`
                : "课堂方案"}{" "}
              · {classroom.knowledgePoints.length} 个知识点
            </small>
          </span>
          <strong>{classroom.title}</strong>
        </span>
        <ChevronDown
          className={openClassroom === classroom.id ? "rotate" : ""}
          size={17}
        />
      </button>
      {openClassroom === classroom.id && (
        <div
          className="classroom-knowledge-tree"
          aria-label={`${classroom.title}知识点`}
        >
          {classroom.knowledgePoints.length > 0 ? (
            classroom.knowledgePoints.map((knowledgePoint, index) => (
              <div key={knowledgePoint.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{knowledgePoint.name}</strong>
              </div>
            ))
          ) : (
            <p>进入课堂后查看知识点</p>
          )}
        </div>
      )}
    </div>
  ));
}

/**
 *
 * @param root0
 * @param root0.directoryState
 * @param root0.onRetry
 */
function ClassroomEmptyState({ directoryState, onRetry }) {
  const unavailable = directoryState.status === "unavailable";
  const failed = directoryState.status === "error";
  return (
    <section className="lesson-panel classroom-empty-panel" aria-live="polite">
      <span className="classroom-empty-icon">
        <Presentation size={24} />
      </span>
      <h1>
        {unavailable
          ? "课堂目录暂未接入"
          : failed
            ? "课堂目录加载失败"
            : "暂时没有老师发布的课堂"}
      </h1>
      <p>
        {unavailable
          ? "当前课堂服务还不能提供学生课堂列表，你仍可通过老师发出的课堂链接直接进入。"
          : failed
            ? directoryState.message
            : "老师发布并分配给你的课堂会显示在这里。"}
      </p>
      {failed && (
        <button
          className="secondary-button classroom-retry"
          type="button"
          onClick={onRetry}
        >
          <RefreshCw size={15} />
          重新加载
        </button>
      )}
    </section>
  );
}

/**
 *
 * @param root0
 * @param root0.classroom
 * @param root0.busy
 * @param root0.onEnterClassroom
 */
function ClassroomPanel({ classroom, busy, onEnterClassroom }) {
  const sourceText =
    classroom.sourceLessons.length > 0
      ? classroom.sourceLessons
          .map(
            (lesson) =>
              `${lesson.index ? `${lesson.index} ` : ""}${lesson.title}`,
          )
          .join(" · ")
      : "课堂方案";
  return (
    <section className="lesson-panel classroom-detail-panel">
      <div className="lesson-heading classroom-lesson-heading">
        <div>
          <span className="lesson-index">老师课堂</span>
          <h1>{classroom.title}</h1>
          <p>来源课时：{sourceText}</p>
        </div>
        <div className="classroom-heading-meta">
          <span
            className={`classroom-status large ${classroom.status.toLowerCase().replaceAll("_", "-")}`}
          >
            {classroom.statusLabel}
          </span>
          {classroom.estimatedMinutes && (
            <span className="lesson-time">
              <Clock3 size={16} />约 {classroom.estimatedMinutes} 分钟
            </span>
          )}
        </div>
      </div>

      <div className="knowledge-heading">
        <div>
          <h2>课堂知识点</h2>
          <p>
            {classroom.knowledgePoints.length > 0
              ? `本堂课共 ${classroom.knowledgePoints.length} 个知识点`
              : "知识点将在进入课堂后同步"}
          </p>
        </div>
      </div>

      <div className="knowledge-list">
        {classroom.knowledgePoints.length > 0 ? (
          classroom.knowledgePoints.map((knowledgePoint, index) => (
            <div
              className="knowledge-row classroom-knowledge-row"
              key={knowledgePoint.id}
            >
              <span className="kp-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="kp-content">
                <strong>{knowledgePoint.name}</strong>
              </span>
              <span
                className={`knowledge-point-status ${(knowledgePoint.status || "").toLowerCase()}`}
              >
                {knowledgePoint.statusLabel}
              </span>
            </div>
          ))
        ) : (
          <div className="classroom-knowledge-empty">
            进入课堂后查看老师安排的学习内容
          </div>
        )}
      </div>

      <div className="start-bar single-action">
        <button
          className="primary-button large"
          type="button"
          disabled={busy || classroom.status === "CANCELLED"}
          onClick={() => onEnterClassroom(classroom)}
        >
          <Presentation size={18} />
          {classroom.studentSessionId ? "继续课堂" : "进入课堂"}
        </button>
      </div>
    </section>
  );
}

/**
 *
 * @param root0
 * @param root0.course
 * @param root0.progress
 * @param root0.directoryMode
 * @param root0.classroomDirectory
 * @param root0.selectedClassroomId
 * @param root0.onModeChange
 * @param root0.onSelectClassroom
 * @param root0.onRetryClassrooms
 * @param root0.onEnterClassroom
 * @param root0.onContinue
 * @param root0.onOpenKnowledgeMap
 * @param root0.onStart
 * @param root0.onLearnKnowledge
 * @param root0.localExperience
 * @param root0.busy
 */
export default function DirectoryPage({
  course,
  progress,
  directoryMode,
  classroomDirectory,
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
    () => progressLocation?.chapter.id || course.chapters[0].id,
  );
  const [selectedSection, setSelectedSection] = useState(
    () => progressLocation?.section || course.chapters[0].sections[0],
  );
  const [openClassroom, setOpenClassroom] = useState(
    selectedClassroomId || classroomDirectory.items[0]?.id || "",
  );
  const [railExpanded, setRailExpanded] = useState(false);
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
        chapter.sections.some((section) => section.id === selectedSection.id),
      ),
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
  const currentLessonProgress =
    progress?.lessonId === selectedSection.id ? progress : null;
  const lessonLearningUnlocked = Boolean(
    currentLessonProgress?.preAssessmentCompleted,
  );
  const progressByKnowledgePoint = Object.fromEntries(
    (currentLessonProgress?.items || []).map((item) => [item.id, item]),
  );
  const completedCount = (currentLessonProgress?.items || []).filter(
    (item) => item.state === "complete",
  ).length;

  return (
    <AppShell
      title="智能学习"
      eyebrow={`${course.publisher} · ${course.name}`}
      actions={
        <button
          className="header-nav-button"
          type="button"
          disabled={busy}
          onClick={onOpenKnowledgeMap}
        >
          <BarChart3 size={16} />
          学习进度
        </button>
      }
      shellClassName="directory-app-shell"
    >
      <div
        className="directory-layout"
        aria-busy={busy}
        inert={busy || undefined}
      >
        <aside
          className={`chapter-rail${railExpanded ? " narrow-expanded" : ""}`}
          aria-label={
            directoryMode === "textbook" ? "教材目录" : "老师课堂目录"
          }
        >
          <div className="directory-rail-header">
            <div className="directory-segmented" aria-label="学习目录">
              <button
                type="button"
                aria-pressed={directoryMode === "textbook"}
                onClick={() => onModeChange("textbook")}
              >
                <BookOpen size={15} />
                教材目录
              </button>
              <button
                type="button"
                aria-pressed={directoryMode === "classroom"}
                onClick={() => onModeChange("classroom")}
              >
                <Presentation size={15} />
                老师课堂
              </button>
            </div>
            <button
              className="directory-narrow-toggle"
              type="button"
              aria-expanded={railExpanded}
              onClick={() => setRailExpanded((value) => !value)}
            >
              <span>{railExpanded ? "收起目录" : "展开目录"}</span>
              <ChevronDown className={railExpanded ? "rotate" : ""} size={17} />
            </button>
          </div>
          <div className="directory-rail-body">
            {directoryMode === "textbook" ? (
              <TextbookDirectory
                course={course}
                openChapter={openChapter}
                selectedSection={selectedSection}
                onToggleChapter={(chapterId) =>
                  setOpenChapter(openChapter === chapterId ? "" : chapterId)
                }
                onChooseSection={chooseSection}
              />
            ) : classroomDirectory.status === "loading" ? (
              <div className="classroom-directory-loading" role="status">
                正在加载课堂目录…
              </div>
            ) : (
              <ClassroomDirectory
                classrooms={classroomDirectory.items}
                openClassroom={openClassroom}
                selectedClassroom={selectedClassroom}
                onToggleClassroom={chooseClassroom}
              />
            )}
          </div>
        </aside>

        {directoryMode === "classroom" ? (
          classroomDirectory.status === "loading" ? (
            <section
              className="lesson-panel classroom-empty-panel"
              aria-busy="true"
            >
              <span className="classroom-empty-icon">
                <Presentation size={24} />
              </span>
              <h1>正在加载课堂</h1>
              <p>正在同步老师为你安排的课堂。</p>
            </section>
          ) : selectedClassroom ? (
            <ClassroomPanel
              classroom={selectedClassroom}
              busy={busy}
              onEnterClassroom={onEnterClassroom}
            />
          ) : (
            <ClassroomEmptyState
              directoryState={classroomDirectory}
              onRetry={onRetryClassrooms}
            />
          )
        ) : (
          <section className="lesson-panel textbook-lesson-panel">
            <div className="lesson-heading">
              <div>
                <span className="lesson-index">{selectedSection.index}</span>
                <h1>{selectedSection.title}</h1>
              </div>
              <div className="lesson-time">
                <Clock3 size={16} />约 {selectedSection.estimatedMinutes} 分钟
              </div>
            </div>

            {localExperience && (
              <div className="local-experience-notice" role="note">
                本机体验不会计入长期学习记录；通过老师提供的个人链接进入，可保存学习进度和正式结论。
              </div>
            )}

            <div
              className="knowledge-list directory-knowledge-list"
              tabIndex="0"
              aria-label={`${selectedSection.title}知识点`}
            >
              {selectedSection.knowledgePoints.map((kp, index) => {
                const progressItem = progressByKnowledgePoint[kp.id];
                const content = (
                  <>
                    <span className="kp-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="kp-content">
                      <strong>{kp.name}</strong>
                    </span>
                    {progressItem ? (
                      <span
                        className={`kp-inline-progress ${progressItem.state}`}
                      >
                        <strong>
                          {progressItem.mastery == null
                            ? "—"
                            : `${progressItem.mastery}%`}
                        </strong>
                        <small>{progressItem.label}</small>
                        <em>{lessonLearningUnlocked ? "学习" : "待前测"}</em>
                      </span>
                    ) : (
                      <span className="knowledge-row-action">
                        {lessonLearningUnlocked ? (
                          "学习"
                        ) : (
                          <>
                            <LockKeyhole size={14} />
                            待前测
                          </>
                        )}
                      </span>
                    )}
                  </>
                );
                return progressItem ? (
                  <button
                    type="button"
                    className={`knowledge-row progress-row ${progressItem.state}${lessonLearningUnlocked ? "" : " locked"}`}
                    key={kp.id}
                    disabled={!lessonLearningUnlocked}
                    onClick={() => onLearnKnowledge(kp.id)}
                  >
                    {content}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`knowledge-row fixed${lessonLearningUnlocked ? "" : " locked"}`}
                    key={kp.id}
                    disabled={!lessonLearningUnlocked}
                    onClick={() => onLearnKnowledge(kp.id)}
                  >
                    {content}
                  </button>
                );
              })}
            </div>

            <div
              className={`start-bar lesson-progress-footer${currentLessonProgress ? "" : " single-action"}`}
            >
              {currentLessonProgress ? (
                <>
                  <span>
                    本课已完成{" "}
                    <strong>
                      {completedCount}/{currentLessonProgress.items.length}
                    </strong>{" "}
                    个知识点
                  </span>
                  <button
                    className="primary-button large"
                    type="button"
                    onClick={onContinue}
                  >
                    {currentLessonProgress.actionLabel}
                    <ChevronRight size={16} />
                  </button>
                </>
              ) : (
                <button
                  className="primary-button large"
                  type="button"
                  onClick={() =>
                    onStart({
                      chapter: selectedChapter,
                      section: selectedSection,
                      knowledgePoints: selectedSection.knowledgePoints,
                    })
                  }
                >
                  <Sparkles size={18} />
                  开始课前小测
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
