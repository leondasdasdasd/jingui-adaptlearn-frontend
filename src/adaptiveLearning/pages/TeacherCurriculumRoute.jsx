import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDashed,
  GraduationCap,
  Layers,
  LoaderCircle,
  Play,
  SlidersHorizontal,
  Sparkles,
  Square,
} from "lucide-react";

import StartClassDialog from "../components/StartClassDialog";
import TeacherShell from "../components/TeacherShell";
import {
  cancelGenerationRun,
  createLessonGenerationRuns,
  generationStateFromRun,
  getLessonGenerationRuns,
  mergeGenerationRunDraft,
} from "../lib/generationRunApi";
import {
  databaseGenerationState,
  getLessonGenerationTasks,
} from "../lib/generationTaskApi";
import { useNavigate } from "../routing";
import {
  AVAILABLE_GRADES,
  AVAILABLE_PUBLISHERS,
  AVAILABLE_SUBJECTS,
  findCourse,
} from "../shared/domain/courseCatalog";
import { fetchPublishedLessonVersions } from "../teacher/data/curriculumRepository";
import {
  curriculumLessons,
  readTeacherContent,
  writeTeacherContent,
} from "../teacher/data/teacherContentRepository";
import { generationStateForLesson } from "../teacher/domain/lessonBatchGeneration";
import { deriveCurriculumContentStatus } from "../teacher/domain/curriculumContentStatus";
import {
  curriculumCatalogLabel,
  curriculumContentStatus,
  curriculumGenerationStatus,
  curriculumOperationError,
  curriculumText,
} from "../teacher/presentation/curriculumPresentation";

import "../curriculum-batch.css";

const busyStatuses = new Set([
  "queued",
  "generating",
  "partial",
  "reconnecting",
  "validating",
  "repairing",
  "publishing",
]);
const cancelableStatuses = new Set([
  "queued",
  "generating",
  "partial",
  "reconnecting",
  "validating",
  "repairing",
]);

/**
 *
 * @param progress
 * @param active
 */
export function curriculumGenerationProgressText(progress, active = false) {
  const normalized = Math.round(Number(progress || 0));
  return active && normalized > 0 && normalized < 100 ? ` ${normalized}%` : "";
}

/**
 *
 * @param content
 * @param databaseTasks
 * @param run
 * @param backendChecked
 */
function generationForContent(
  content,
  databaseTasks = [],
  run = null,
  backendChecked = false,
) {
  const saved = content?.generationStatus;
  const backendRun = generationStateFromRun(run);
  if (backendRun) return { ...saved, ...backendRun };
  if (backendChecked) {
    return { status: "idle", progress: 0, error: "" };
  }
  const database = databaseGenerationState(databaseTasks);
  if (
    database &&
    (!saved?.runId ||
      database.runId === saved.runId ||
      busyStatuses.has(database.status))
  ) {
    return { ...saved, ...database };
  }
  if (saved?.status) {
    return { ...saved, progress: Number(saved.progress || 0) };
  }
  return generationStateForLesson(content);
}

/**
 *
 */
export default function TeacherCurriculumRoute() {
  const navigate = useNavigate();
  const [contents, setContents] = useState(() => readTeacherContent());
  const [selectedLessonIds, setSelectedLessonIds] = useState(() => new Set());
  const [notice, setNotice] = useState(null);
  const [databaseTasksByLesson, setDatabaseTasksByLesson] = useState({});
  const [generationRunsByLesson, setGenerationRunsByLesson] = useState({});
  const [backendGenerationChecked, setBackendGenerationChecked] =
    useState(false);
  const [startClassOpen, setStartClassOpen] = useState(false);
  const [selectedStartLessonId, setSelectedStartLessonId] = useState("");

  // 教材筛选状态：学科、年级、版本与隐藏/展开
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("math");
  const [selectedGradeKey, setSelectedGradeKey] = useState("grade7-up");
  const [selectedPublisherKey, setSelectedPublisherKey] = useState("zhejiang");

  const selectedSubjectMeta = useMemo(
    () =>
      AVAILABLE_SUBJECTS.find((s) => s.id === selectedSubject) ||
      AVAILABLE_SUBJECTS[0],
    [selectedSubject],
  );
  const selectedGradeMeta = useMemo(
    () =>
      AVAILABLE_GRADES.find((g) => g.id === selectedGradeKey) ||
      AVAILABLE_GRADES[0],
    [selectedGradeKey],
  );
  const selectedPublisherMeta = useMemo(
    () =>
      AVAILABLE_PUBLISHERS.find((p) => p.id === selectedPublisherKey) ||
      AVAILABLE_PUBLISHERS[0],
    [selectedPublisherKey],
  );

  const currentCourse = useMemo(() => {
    return findCourse({
      subject: selectedSubjectMeta.name,
      grade: selectedGradeMeta.name,
      publisher: selectedPublisherMeta.name,
    });
  }, [
    selectedSubjectMeta.name,
    selectedGradeMeta.name,
    selectedPublisherMeta.name,
  ]);

  const lessons = useMemo(
    () => curriculumLessons(currentCourse),
    [currentCourse],
  );
  const lessonById = useMemo(
    () => Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );
  const chapters = useMemo(
    () => [
      ...new Map(
        lessons.map((item) => [item.chapter.id, item.chapter]),
      ).values(),
    ],
    [lessons],
  );

  const handleSubjectSelect = (sub) => {
    if (sub.enabled) {
      setSelectedSubject(sub.id);
      setSelectedLessonIds(new Set());
      setNotice(null);
    } else {
      setNotice({
        tone: "info",
        text: curriculumText(
          "notice.subjectUnavailable",
          "当前优先开放数学自适应题库与 AI 课时生成；{$subject}正在适配中。",
          {
            subject: curriculumCatalogLabel("subject", sub.id, sub.name),
          },
        ),
      });
    }
  };

  const handleGradeSelect = (gradeKey) => {
    setSelectedGradeKey(gradeKey);
    setSelectedLessonIds(new Set());
    setNotice(null);
  };

  const handlePublisherSelect = (pubKey) => {
    setSelectedPublisherKey(pubKey);
    setSelectedLessonIds(new Set());
    setNotice(null);
  };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetchPublishedLessonVersions(
      lessons.map((lesson) => lesson.id),
      { signal: controller.signal },
    )
      .then((versions) => {
        if (!active) return;
        setContents((current) => {
          const next = { ...current };
          for (const version of versions) {
            const lessonId = version.lessonId;
            const local = next[lessonId] || {};
            const merged = {
              ...local,
              lessonId,
              publishedVersionId: version.versionId,
              publishedVersionNumber: version.versionNumber,
              publishedAt: version.publishedAt,
            };
            const hasNewerDraft =
              deriveCurriculumContentStatus(merged) === "unpublished";
            next[lessonId] = {
              ...merged,
              status: hasNewerDraft ? "draft" : "published",
              version: hasNewerDraft
                ? local.version || version.versionNumber + 1
                : version.versionNumber,
            };
          }
          return next;
        });
      })
      .catch((error) => {
        if (!active || error?.name === "AbortError") return;
        setNotice({
          tone: "error",
          text: curriculumText(
            "notice.publishRefreshFailed",
            "暂时无法更新发布状态，当前草稿仍可继续处理。",
          ),
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [lessons]);

  useEffect(() => {
    const abortController = new AbortController();
    let stopped = false;
    const refresh = async () => {
      try {
        const taskMap = await getLessonGenerationTasks(
          lessons.map((lesson) => lesson.id),
          {
            signal: abortController.signal,
          },
        );
        if (stopped) return;
        setDatabaseTasksByLesson(taskMap);
        const runMap = await getLessonGenerationRuns(
          lessons.map((lesson) => lesson.id),
          { signal: abortController.signal },
        );
        if (stopped) return;
        setGenerationRunsByLesson(runMap);
        setBackendGenerationChecked(true);
      } catch (pollError) {
        if (stopped || pollError?.name === "AbortError") return;
        setBackendGenerationChecked(true);
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 2500);
    return () => {
      stopped = true;
      abortController.abort();
      window.clearInterval(interval);
    };
  }, [lessons]);

  useEffect(() => {
    const freshDrafts = Object.values(generationRunsByLesson)
      .map((run) => ({
        run,
        merged: mergeGenerationRunDraft(contents[run.lessonId] || {}, run),
      }))
      .filter(({ run, merged }) => merged && run.status === "completed");
    if (freshDrafts.length === 0) return;
    setContents((current) => {
      let changed = false;
      const next = { ...current };
      for (const { run, merged } of freshDrafts) {
        const local = next[run.lessonId] || {};
        if (
          local.generationStatus?.runId === run.id &&
          local.generationStatus?.status === "completed"
        )
          continue;
        next[run.lessonId] = {
          ...local,
          ...merged,
          generationStatus: {
            status: "completed",
            progress: 100,
            error: "",
            runId: run.id,
            completedAt: run.completedAt,
          },
        };
        changed = true;
      }
      if (changed) writeTeacherContent(next);
      return changed ? next : current;
    });
  }, [generationRunsByLesson, contents]);

  const toggleLesson = (lessonId) => {
    setSelectedLessonIds((current) => {
      const next = new Set(current);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const setLessonSelection = (lessonIds, selected) => {
    setSelectedLessonIds((current) => {
      const next = new Set(current);
      for (const id of lessonIds) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const allSelected =
    lessons.length > 0 && selectedLessonIds.size === lessons.length;

  const startGeneration = async (lessonIds) => {
    if (lessonIds.length === 0) return;
    const targetLessons = lessonIds.map((id) => lessonById[id]).filter(Boolean);
    setNotice(null);
    try {
      const runs = await createLessonGenerationRuns(targetLessons);
      setGenerationRunsByLesson((current) => {
        const next = { ...current };
        for (const run of runs) {
          next[run.lessonId] = run;
        }
        return next;
      });
      setContents((current) => {
        const next = { ...current };
        for (const run of runs) {
          const local = next[run.lessonId] || {};
          next[run.lessonId] = {
            ...local,
            generationStatus: {
              status: run.status || "queued",
              progress: 0,
              error: "",
              runId: run.id,
            },
          };
        }
        writeTeacherContent(next);
        return next;
      });
      setNotice({
        tone: "info",
        text: curriculumText(
          "notice.started",
          "已启动 {$count} 个课时的生成任务",
          { count: runs.length },
        ),
      });
    } catch {
      setNotice({
        tone: "error",
        text: curriculumOperationError("start"),
      });
    }
  };

  const cancelLessonGeneration = async (lessonId) => {
    const run = generationRunsByLesson[lessonId];
    if (!run?.id) return;
    try {
      await cancelGenerationRun(run.id);
      setNotice({
        tone: "info",
        text: curriculumText(
          "notice.cancelRequested",
          "已申请取消 {$lesson} 的生成任务",
          {
            lesson:
              lessonById[lessonId]?.title ||
              curriculumText("lessonFallback", "课时"),
          },
        ),
      });
    } catch {
      setNotice({
        tone: "error",
        text: curriculumOperationError("cancel"),
      });
    }
  };

  const availableSelectedLessonIds = lessons
    .map((l) => l.id)
    .filter((id) => selectedLessonIds.has(id));
  const activeLessonCount = lessons.filter((lesson) =>
    busyStatuses.has(
      generationForContent(
        contents[lesson.id] || {},
        databaseTasksByLesson[lesson.id],
        generationRunsByLesson[lesson.id],
        backendGenerationChecked,
      ).status,
    ),
  ).length;

  return (
    <TeacherShell>
      <div className="curriculum-batch-page">
        {/* 当前教材课时状态与批量操作条 */}
        <section
          className="batch-toolbar"
          aria-label={curriculumText("batchGeneration", "课时批量生成")}
          aria-busy={activeLessonCount > 0}
        >
          <div className="batch-course-title">
            <span>
              <BookOpenCheck size={18} />
            </span>
            <div>
              <div className="batch-course-name-row">
                <strong>
                  {curriculumCatalogLabel(
                    "publisher",
                    selectedPublisherKey,
                    currentCourse.publisher,
                  )} · {curriculumCatalogLabel(
                    "grade",
                    selectedGradeKey,
                    selectedGradeMeta.name,
                  )} · {curriculumCatalogLabel(
                    "subject",
                    selectedSubject,
                    selectedSubjectMeta.name,
                  )}
                </strong>
                <button
                  type="button"
                  className={`batch-switch-textbook-btn${isFilterOpen ? " active" : ""}`}
                  onClick={() => setIsFilterOpen((prev) => !prev)}
                  aria-expanded={isFilterOpen}
                  title={
                    isFilterOpen
                      ? curriculumText(
                          "collapseFilterHint",
                          "收起学科、年级与教材版本筛选",
                        )
                      : curriculumText(
                          "switchTextbookHint",
                          "切换教材版本、学科与年级",
                        )
                  }
                >
                  <SlidersHorizontal size={13} />
                  <span>
                    {isFilterOpen
                      ? curriculumText("collapseFilter", "收起筛选")
                      : curriculumText("switchTextbook", "切换教材")}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`filter-arrow${isFilterOpen ? " open" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>
          <div className="batch-toolbar-actions">
            <button
              className="teacher-neutral"
              type="button"
              aria-pressed={allSelected}
              onClick={() =>
                setLessonSelection(
                  lessons.map((lesson) => lesson.id),
                  !allSelected,
                )
              }
            >
              {allSelected
                ? curriculumText("deselectAll", "取消全选")
                : curriculumText("selectAll", "全册全选")}
            </button>
            <button
              className="teacher-primary batch-generate-selected"
              type="button"
              disabled={availableSelectedLessonIds.length === 0}
              onClick={() => startGeneration(availableSelectedLessonIds)}
            >
              {activeLessonCount > 0 ? (
                <LoaderCircle size={15} className="batch-spin" />
              ) : (
                <Sparkles size={15} />
              )}
              {activeLessonCount > 0
                ? curriculumText(
                    "enqueueSelected",
                    "继续加入所选课时（{$count}）",
                    { count: availableSelectedLessonIds.length },
                  )
                : curriculumText(
                    "generateSelected",
                    "生成所选完整课时（{$count}）",
                    { count: availableSelectedLessonIds.length || "—" },
                  )}
            </button>
          </div>
        </section>

        {/* 点击【切换教材】展开的学科学段与版本筛选面板 */}
        {isFilterOpen && (
          <section
            className="curriculum-filter-panel"
            aria-label={curriculumText(
              "filterAccessible",
              "教材版本、年级与学科筛选",
            )}
          >
            <div className="curriculum-filter-header">
              <h3>
                <BookOpen size={16} />
                <span>
                  {curriculumText("filterTitle", "选择教材体系、学科与年级")}
                </span>
              </h3>
              <button
                type="button"
                className="curriculum-filter-close-btn"
                onClick={() => setIsFilterOpen(false)}
                title={curriculumText(
                  "closeFilterHint",
                  "完成选择并收起面板",
                )}
              >
                <span>{curriculumText("closeFilter", "收起面板")}</span>
                <ChevronUp size={14} />
              </button>
            </div>

            {/* 第一行：学科选择 */}
            <div className="curriculum-filter-row">
              <span className="curriculum-filter-label">
                <Layers size={14} />
                <span>{curriculumText("subject", "学科")}</span>
              </span>
              <div className="curriculum-filter-options">
                {AVAILABLE_SUBJECTS.map((sub) => {
                  const isSelected = selectedSubject === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      className={`subject-filter-chip${isSelected ? " active" : ""}${sub.enabled ? "" : " disabled"}`}
                      onClick={() => handleSubjectSelect(sub)}
                      title={
                        sub.enabled
                          ? curriculumText(
                              "switchSubject",
                              "切换到{$subject}",
                              {
                                subject: curriculumCatalogLabel(
                                  "subject",
                                  sub.id,
                                  sub.name,
                                ),
                              },
                            )
                          : curriculumText(
                              "subjectUnavailableHint",
                              "{$subject}暂未开放",
                              {
                                subject: curriculumCatalogLabel(
                                  "subject",
                                  sub.id,
                                  sub.name,
                                ),
                              },
                            )
                      }
                    >
                      <span>
                        {curriculumCatalogLabel("subject", sub.id, sub.name)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="filter-divider" />

            {/* 第二行：年级选择 */}
            <div className="curriculum-filter-row">
              <span className="curriculum-filter-label">
                <GraduationCap size={14} />
                <span>{curriculumText("grade", "年级")}</span>
              </span>
              <div className="curriculum-filter-options">
                {AVAILABLE_GRADES.map((gradeItem) => {
                  const isSelected = selectedGradeKey === gradeItem.id;
                  return (
                    <button
                      key={gradeItem.id}
                      type="button"
                      className={`grade-filter-chip${isSelected ? " active" : ""}`}
                      onClick={() => handleGradeSelect(gradeItem.id)}
                    >
                      <span>
                        {curriculumCatalogLabel(
                          "grade",
                          gradeItem.id,
                          gradeItem.name,
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="filter-divider" />

            {/* 第三行：教材版本选择 */}
            <div className="curriculum-filter-row">
              <span className="curriculum-filter-label">
                <BookOpen size={14} />
                <span>{curriculumText("publisher", "教材版本")}</span>
              </span>
              <div className="curriculum-filter-options">
                {AVAILABLE_PUBLISHERS.map((pubItem) => {
                  const isSelected = selectedPublisherKey === pubItem.id;
                  return (
                    <button
                      key={pubItem.id}
                      type="button"
                      className={`publisher-filter-chip${isSelected ? " active" : ""}`}
                      onClick={() => handlePublisherSelect(pubItem.id)}
                      title={curriculumCatalogLabel(
                        "publisher",
                        pubItem.id,
                        pubItem.fullName,
                      )}
                    >
                      <span>
                        {curriculumCatalogLabel(
                          "publisher",
                          pubItem.id,
                          pubItem.name,
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {notice && (
          <div
            className={`batch-notice ${notice.tone}`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            {notice.text}
          </div>
        )}

        <div className="batch-chapter-list">
          {chapters.map((chapter) => {
            const chapterIds = chapter.sections.map((lesson) => lesson.id);
            const selectedCount = chapterIds.filter((id) =>
              selectedLessonIds.has(id),
            ).length;
            const chapterSelected = selectedCount === chapterIds.length;
            return (
              <section className="batch-chapter" key={chapter.id}>
                <header>
                  <div>
                    <span>{chapter.index}</span>
                    <h2>{chapter.title}</h2>
                    {selectedCount > 0 && (
                      <small>
                        {curriculumText(
                          "chapterSelected",
                          "已选 {$selected}/{$total}",
                          {
                            selected: selectedCount,
                            total: chapterIds.length,
                          },
                        )}
                      </small>
                    )}
                  </div>
                  <button
                    className="batch-chapter-select"
                    type="button"
                    aria-pressed={chapterSelected}
                    onClick={() =>
                      setLessonSelection(chapterIds, !chapterSelected)
                    }
                  >
                    {chapterSelected
                      ? curriculumText("deselectChapter", "取消本章")
                      : curriculumText("selectChapter", "全选本章")}
                  </button>
                </header>
                <div className="batch-table" role="list">
                  {chapter.sections.map((lesson) => {
                    const content = contents[lesson.id] || {};
                    const contentStatus =
                      deriveCurriculumContentStatus(content);
                    const contentMeta =
                      curriculumContentStatus(contentStatus);
                    const generation = generationForContent(
                      content,
                      databaseTasksByLesson[lesson.id],
                      generationRunsByLesson[lesson.id],
                      backendGenerationChecked,
                    );
                    const generationMeta =
                      curriculumGenerationStatus(generation.status);
                    const publishedVersionNumber =
                      content.publishedVersionNumber ||
                      generation.publishedVersionNumber;
                    const generationRunVersionNumber = Number(
                      generation.publishedVersionNumber || 0,
                    );
                    const generationTitle =
                      generation.status === "completed" &&
                      Number(publishedVersionNumber || 0) >
                        generationRunVersionNumber
                        ? curriculumText(
                            "generation.historicalCompleted",
                            "历史生成任务已完成，当前已发布 V{$version}",
                            { version: publishedVersionNumber },
                          )
                        : generation.status === "failed"
                          ? curriculumOperationError("start")
                          : generationMeta.label;
                    const busy = busyStatuses.has(generation.status);
                    const cancelable = cancelableStatuses.has(
                      generation.status,
                    );
                    const isPublished = contentStatus === "published";

                    return (
                      <article
                        className={`batch-row${selectedLessonIds.has(lesson.id) ? " selected" : ""}`}
                        key={lesson.id}
                        role="listitem"
                      >
                        <label
                          className="batch-checkbox"
                          title={curriculumText(
                            "selectLesson",
                            "选择 {$lesson}",
                            { lesson: lesson.title },
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedLessonIds.has(lesson.id)}
                            onChange={() => toggleLesson(lesson.id)}
                          />
                          <span aria-hidden="true" />
                        </label>
                        <button
                          className="batch-lesson-link"
                          type="button"
                          onClick={() =>
                            navigate(
                              `/adaptive-learning/teacher/textbook-lessons/${lesson.id}/content`,
                            )
                          }
                        >
                          <span className="batch-lesson-code">
                            {lesson.index}
                          </span>
                          <span className="batch-lesson-name">
                            <strong>{lesson.title}</strong>
                            <small>
                              {curriculumText(
                                "lessonSummary",
                                "{$knowledgeCount} 个知识点 · 约 {$minutes} 分钟",
                                {
                                  knowledgeCount: lesson.knowledgePoints.length,
                                  minutes: lesson.estimatedMinutes,
                                },
                              )}
                            </small>
                          </span>
                        </button>
                        <span
                          className={`batch-content-status ${contentMeta.tone}`}
                        >
                          {contentStatus === "published" ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <CircleDashed size={14} />
                          )}
                          {contentMeta.label}
                        </span>
                        <span className="batch-version">
                          {publishedVersionNumber
                            ? `V${publishedVersionNumber}`
                            : "—"}
                        </span>
                        <span className="batch-generation-slot">
                          {busy && (
                            <span
                              className={`batch-generation-status ${generationMeta.tone}`}
                              title={generationTitle}
                            >
                              <LoaderCircle size={14} className="batch-spin" />
                              {generationMeta.label}
                              {curriculumGenerationProgressText(
                                generation.progress,
                                true,
                              )}
                              {generation.queuePosition
                                ? curriculumText(
                                    "generation.queuePosition",
                                    " · 队列 {$position}",
                                    { position: generation.queuePosition },
                                  )
                                : ""}
                            </span>
                          )}
                        </span>
                        <div className="batch-row-actions">
                          {cancelable && (
                            <button
                              className="batch-generate-one"
                              type="button"
                              onClick={() => {
                                void cancelLessonGeneration(lesson.id);
                              }}
                            >
                              <Square size={13} />
                              {curriculumText("cancel", "取消")}
                            </button>
                          )}
                          {/* Direct Start Class button on each lesson */}
                          <button
                            className="batch-start-class-btn"
                            type="button"
                            onClick={() => {
                              setSelectedStartLessonId(lesson.id);
                              setStartClassOpen(true);
                            }}
                            title={curriculumText(
                              "startClassHint",
                              "选择班级并开始本课时",
                            )}
                          >
                            <Play size={13} fill="currentColor" />
                            <span>
                              {curriculumText("startClass", "开始上课")}
                            </span>
                          </button>
                          <button
                            className="batch-review-link"
                            type="button"
                            onClick={() =>
                              navigate(
                                `/adaptive-learning/teacher/textbook-lessons/${lesson.id}/content`,
                              )
                            }
                          >
                            <span>
                              {curriculumText("editContent", "编辑内容")}
                            </span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Start Class Modal */}
      <StartClassDialog
        open={startClassOpen}
        onClose={() => setStartClassOpen(false)}
        initialLessonId={selectedStartLessonId}
      />
    </TeacherShell>
  );
}
