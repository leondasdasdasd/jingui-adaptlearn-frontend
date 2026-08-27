import {
  BookOpenCheck, CheckCircle2, ChevronRight, CircleDashed, LoaderCircle, Sparkles, Square,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherShell from '../components/TeacherShell';
import { course } from '../shared/domain/courseCatalog';
import { getPublishedLessonVersions } from '../shared/infrastructure/classroomApi';
import { databaseGenerationState, getLessonGenerationTasks } from '../lib/generationTaskApi';
import {
  cancelGenerationRun,
  createLessonGenerationRuns,
  generationStateFromRun,
  getLessonGenerationRuns,
  mergeGenerationRunDraft,
} from '../lib/generationRunApi';
import {
  curriculumLessons, readTeacherContent, writeTeacherContent,
} from '../teacher/data/teacherContentRepository';
import { generationStateForLesson } from '../teacher/domain/lessonBatchGeneration';
import '../curriculum-batch.css';

const contentStatusMeta = {
  published: ['已发布', 'success'],
  unpublished: ['未发布', 'warning'],
  empty: ['未生成', 'muted'],
};

/**
 * The directory answers one question only: whether an immutable published
 * version exists. Draft freshness and generation history belong in detail.
 */
export function deriveCurriculumContentStatus(content = {}) {
  const hasPublishedVersion = Boolean(content.publishedVersionId || content.publishedSnapshot);
  if (hasPublishedVersion) return 'published';
  const hasDraftContent = Boolean(
    content.preQuestions?.length
    || content.postQuestions?.length
    || content.learningUnits?.length
    || content.learningContent?.composite
    || content.learningContent?.knowledgePoints?.length,
  );
  if (hasDraftContent) return 'unpublished';
  return 'empty';
}

const generationStatusMeta = {
  idle: { label: '暂无任务', tone: 'muted' },
  queued: { label: '排队中', tone: 'info' },
  generating: { label: '并行生成', tone: 'info' },
  partial: { label: '已保存部分内容', tone: 'info' },
  reconnecting: { label: '正在重连', tone: 'warning' },
  validating: { label: '规则 + AI 质检', tone: 'info' },
  repairing: { label: '定向返修', tone: 'warning' },
  publishing: { label: '教师确认发布中', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  canceled: { label: '已取消', tone: 'muted' },
  failed: { label: '需重试', tone: 'error' },
};

const busyStatuses = new Set(['queued', 'generating', 'partial', 'reconnecting', 'validating', 'repairing', 'publishing']);
const cancelableStatuses = new Set(['queued', 'generating', 'partial', 'reconnecting', 'validating', 'repairing']);

export function curriculumGenerationProgressText(progress, active = false) {
  const normalized = Math.round(Number(progress || 0));
  return active && normalized > 0 && normalized < 100 ? ` ${normalized}%` : '';
}

function generationForContent(content, databaseTasks = [], run = null, backendChecked = false) {
  const saved = content?.generationStatus;
  const backendRun = generationStateFromRun(run);
  if (backendRun) return { ...saved, ...backendRun };
  if (backendChecked) {
    return { status: 'idle', progress: 0, error: '' };
  }
  const database = databaseGenerationState(databaseTasks);
  if (database && (!saved?.runId || database.runId === saved.runId || busyStatuses.has(database.status))) {
    return { ...saved, ...database };
  }
  if (saved?.status && generationStatusMeta[saved.status]) {
    return { ...saved, progress: Number(saved.progress || 0) };
  }
  return generationStateForLesson(content);
}

export default function TeacherCurriculumRoute() {
  const navigate = useNavigate();
  const [contents, setContents] = useState(() => readTeacherContent());
  const [selectedLessonIds, setSelectedLessonIds] = useState(() => new Set());
  const [notice, setNotice] = useState(null);
  const [databaseTasksByLesson, setDatabaseTasksByLesson] = useState({});
  const [generationRunsByLesson, setGenerationRunsByLesson] = useState({});
  const [backendGenerationChecked, setBackendGenerationChecked] = useState(false);
  const lessons = useMemo(() => curriculumLessons(), []);
  const lessonById = useMemo(() => Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);
  const chapters = useMemo(() => [...new Map(lessons.map((item) => [item.chapter.id, item.chapter])).values()], [lessons]);

  useEffect(() => {
    let active = true;
    getPublishedLessonVersions(lessons.map((lesson) => lesson.id))
      .then((versions) => {
        if (!active) return;
        setContents((current) => {
          const next = { ...current };
          versions.forEach((version) => {
            const lessonId = version.textbookLessonId;
            const local = next[lessonId] || {};
            const merged = {
              ...local,
              lessonId,
              publishedVersionId: version.id,
              publishedVersionNumber: version.versionNumber,
              publishedAt: version.publishedAt,
            };
            const hasNewerDraft = deriveCurriculumContentStatus(merged) === 'draft';
            next[lessonId] = {
              ...merged,
              status: hasNewerDraft ? 'draft' : 'published',
              version: hasNewerDraft ? local.version || version.versionNumber + 1 : version.versionNumber,
            };
          });
          return next;
        });
      })
      .catch(() => setNotice({ tone: 'error', text: '暂时无法更新发布状态，当前草稿仍可继续处理' }));
    return () => { active = false; };
  }, [lessons]);

  useEffect(() => {
    const abortController = new AbortController();
    let stopped = false;
    const refresh = async () => {
      try {
        const taskMap = await getLessonGenerationTasks(lessons.map((lesson) => lesson.id), {
          signal: abortController.signal,
        });
        if (stopped) return;
        setDatabaseTasksByLesson(taskMap);
        const runMap = await getLessonGenerationRuns(
          lessons.map((lesson) => lesson.id),
          { signal: abortController.signal },
        );
        if (stopped) return;
        setGenerationRunsByLesson(runMap);
        setBackendGenerationChecked(true);
        setContents((current) => {
          let changed = false;
          const next = { ...current };
          Object.entries(runMap).forEach(([lessonId, run]) => {
            if (current[lessonId]?.generationStatus?.updatedAt === run.updatedAt) return;
            next[lessonId] = mergeGenerationRunDraft(current[lessonId] || {}, run);
            changed = true;
          });
          if (changed) writeTeacherContent(next);
          return changed ? next : current;
        });
      } catch (error) {
        if (!stopped && error.name !== 'AbortError') {
          setNotice((current) => current || { tone: 'error', text: error.message });
        }
      }
    };
    void refresh();
    const timer = setInterval(refresh, 1500);
    return () => {
      stopped = true;
      clearInterval(timer);
      abortController.abort();
    };
  }, [lessons]);

  const startGeneration = (lessonIds) => {
    const targets = lessons.filter((lesson) => (
      lessonIds.includes(lesson.id)
      && !busyStatuses.has(generationForContent(
        contents[lesson.id] || {}, databaseTasksByLesson[lesson.id], generationRunsByLesson[lesson.id],
        backendGenerationChecked,
      ).status)
    ));
    if (!targets.length) return;
    setNotice({
      tone: 'info',
      text: `已将 ${targets.length} 个完整课时同时入队；题目、单点 MAIC、复合 MAIC 按课时公平调度`,
    });
    const batchKey = `teacher-${Date.now()}`;
    void createLessonGenerationRuns(
      targets,
      Object.fromEntries(targets.map((lesson) => [lesson.id, contents[lesson.id] || {}])),
      { idempotencyKey: batchKey },
    ).then((result) => {
      const acceptedRuns = result.runs || [];
      setGenerationRunsByLesson((current) => ({
        ...current,
        ...Object.fromEntries(acceptedRuns.map((run) => [run.lessonId, run])),
      }));
      const failed = (result.results || []).filter((item) => !item.ok).length;
      setNotice(failed
        ? { tone: 'error', text: `${acceptedRuns.length} 个课时已进入后端队列，${failed} 个入队失败，可单独重试` }
        : { tone: 'success', text: `${acceptedRuns.length} 个课时已写入数据库，关闭页面也会继续生成` });
    }).catch((error) => {
      setNotice({ tone: 'error', text: error.message || '批量创建整课生成任务失败' });
    });
  };

  const cancelLessonGeneration = async (lessonId) => {
    const runId = generationRunsByLesson[lessonId]?.runId
      || databaseGenerationState(databaseTasksByLesson[lessonId])?.runId
      || contents[lessonId]?.generationStatus?.runId;
    if (!runId) return;
    try {
      const run = await cancelGenerationRun(runId);
      setGenerationRunsByLesson((current) => ({ ...current, [lessonId]: run }));
      setContents((current) => {
        const next = { ...current, [lessonId]: mergeGenerationRunDraft(current[lessonId] || {}, run) };
        writeTeacherContent(next);
        return next;
      });
      setNotice({ tone: 'info', text: `${lessonById[lessonId]?.title || '课时'}已取消，已完成内容保留，其他课时继续生成` });
    } catch (error) {
      setNotice({ tone: 'error', text: error.message || '取消整课生成失败' });
    }
  };

  const toggleLesson = (lessonId) => setSelectedLessonIds((current) => {
    const next = new Set(current);
    if (next.has(lessonId)) next.delete(lessonId); else next.add(lessonId);
    return next;
  });
  const setLessonSelection = (lessonIds, selected) => setSelectedLessonIds((current) => {
    const next = new Set(current);
    lessonIds.forEach((id) => { if (selected) next.add(id); else next.delete(id); });
    return next;
  });
  const allSelected = selectedLessonIds.size === lessons.length;
  const availableSelectedLessonIds = [...selectedLessonIds].filter((lessonId) => (
    !busyStatuses.has(generationForContent(
      contents[lessonId] || {}, databaseTasksByLesson[lessonId], generationRunsByLesson[lessonId],
      backendGenerationChecked,
    ).status)
  ));
  const activeLessonCount = lessons.filter((lesson) => busyStatuses.has(
    generationForContent(
      contents[lesson.id] || {}, databaseTasksByLesson[lesson.id], generationRunsByLesson[lesson.id],
      backendGenerationChecked,
    ).status,
  )).length;

  return (
    <TeacherShell title="教材课时内容">
      <div className="curriculum-batch-page">
        <section className="batch-toolbar" aria-label="课时批量生成" aria-busy={activeLessonCount > 0}>
          <div className="batch-course-title">
            <span><BookOpenCheck size={18} /></span>
            <div>
              <strong>{course.publisher} · {course.name}</strong>
              <small>已选 {selectedLessonIds.size}/{lessons.length} · 处理中 {activeLessonCount} 课时</small>
            </div>
          </div>
          <div className="batch-toolbar-actions">
            <button className="teacher-neutral" type="button" aria-pressed={allSelected} onClick={() => setLessonSelection(lessons.map((lesson) => lesson.id), !allSelected)}>
              {allSelected ? '取消全选' : '全册全选'}
            </button>
            <button className="teacher-primary batch-generate-selected" type="button" disabled={!availableSelectedLessonIds.length} onClick={() => startGeneration(availableSelectedLessonIds)}>
              {activeLessonCount > 0 ? <LoaderCircle size={15} className="batch-spin" /> : <Sparkles size={15} />}
              {activeLessonCount > 0
                ? `继续加入所选课时（${availableSelectedLessonIds.length}）`
                : `生成所选完整课时${availableSelectedLessonIds.length ? `（${availableSelectedLessonIds.length}）` : ''}`}
            </button>
          </div>
        </section>

        {notice && <div className={`batch-notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</div>}

        <div className="batch-chapter-list">
          {chapters.map((chapter) => {
            const chapterIds = chapter.sections.map((lesson) => lesson.id);
            const selectedCount = chapterIds.filter((id) => selectedLessonIds.has(id)).length;
            const chapterSelected = selectedCount === chapterIds.length;
            return (
              <section className="batch-chapter" key={chapter.id}>
                <header>
                  <div><span>{chapter.index}</span><h2>{chapter.title}</h2>{selectedCount > 0 && <small>已选 {selectedCount}/{chapterIds.length}</small>}</div>
                  <button className="batch-chapter-select" type="button" aria-pressed={chapterSelected} onClick={() => setLessonSelection(chapterIds, !chapterSelected)}>
                    {chapterSelected ? '取消本章' : '全选本章'}
                  </button>
                </header>
                <div className="batch-table" role="list">
                  {chapter.sections.map((lesson) => {
                    const content = contents[lesson.id] || {};
                    const contentStatus = deriveCurriculumContentStatus(content);
                    const [contentLabel, contentTone] = contentStatusMeta[contentStatus] || contentStatusMeta.empty;
                    const generation = generationForContent(
                      content, databaseTasksByLesson[lesson.id], generationRunsByLesson[lesson.id],
                      backendGenerationChecked,
                    );
                    const generationMeta = generationStatusMeta[generation.status] || generationStatusMeta.idle;
                    // The content-version service is authoritative. A historic
                    // generation run may still reference the version it once
                    // published after a teacher has manually published V(n+1).
                    const publishedVersionNumber = content.publishedVersionNumber
                      || generationRunsByLesson[lesson.id]?.draft?.publishedVersionNumber;
                    const generationRunVersionNumber = Number(
                      generationRunsByLesson[lesson.id]?.draft?.publishedVersionNumber || 0,
                    );
                    const generationTitle = generation.status === 'completed'
                      && Number(publishedVersionNumber || 0) > generationRunVersionNumber
                      ? `历史生成任务已完成，当前已发布 V${publishedVersionNumber}`
                      : generation.error || generation.message || generationMeta.label;
                    const busy = busyStatuses.has(generation.status);
                    const cancelable = cancelableStatuses.has(generation.status);
                    return (
                      <article className={`batch-row${selectedLessonIds.has(lesson.id) ? ' selected' : ''}`} key={lesson.id} role="listitem">
                        <label className="batch-checkbox" title={`选择 ${lesson.title}`}>
                          <input type="checkbox" checked={selectedLessonIds.has(lesson.id)} onChange={() => toggleLesson(lesson.id)} />
                          <span aria-hidden="true" />
                        </label>
                        <button className="batch-lesson-link" type="button" onClick={() => navigate(`/adaptive-learning/teacher/textbook-lessons/${lesson.id}/content`)}>
                          <span className="batch-lesson-code">{lesson.index}</span>
                          <span className="batch-lesson-name"><strong>{lesson.title}</strong><small>{lesson.knowledgePoints.length} 个知识点 · 约 {lesson.estimatedMinutes} 分钟</small></span>
                        </button>
                        <span className={`batch-content-status ${contentTone}`}>
                          {contentStatus === 'published' ? <CheckCircle2 size={14} /> : <CircleDashed size={14} />}{contentLabel}
                        </span>
                        <span className="batch-version">
                          {publishedVersionNumber
                            ? `V${publishedVersionNumber}`
                            : '—'}
                        </span>
                        <span className="batch-generation-slot">
                          {busy && <span className={`batch-generation-status ${generationMeta.tone}`} title={generationTitle}>
                            <LoaderCircle size={14} className="batch-spin" />
                            {generationMeta.label}{curriculumGenerationProgressText(generation.progress, true)}
                            {generation.queuePosition ? ` · 队列 ${generation.queuePosition}` : ''}
                          </span>}
                        </span>
                        <div className="batch-row-actions">
                          {cancelable && <button className="batch-generate-one" type="button" onClick={() => { void cancelLessonGeneration(lesson.id); }}><Square size={13} />取消</button>}
                          <button className="batch-review-link" type="button" onClick={() => navigate(`/adaptive-learning/teacher/textbook-lessons/${lesson.id}/content`)}>
                            打开<ChevronRight size={15} />
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
    </TeacherShell>
  );
}
