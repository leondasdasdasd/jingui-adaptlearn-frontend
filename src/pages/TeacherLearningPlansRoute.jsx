import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BookOpenCheck, Check, CheckCircle2, ChevronDown, CircleDashed, ExternalLink,
  LoaderCircle, Plus, RefreshCw, Sparkles, Trash2,
} from 'lucide-react';
import TeacherShell from '../components/TeacherShell.jsx';
import TeacherClassroomContentOutline from '../components/TeacherClassroomContentOutline.jsx';
import DeleteClassroomPlanDialog from '../components/DeleteClassroomPlanDialog.jsx';
import { useNavigate } from 'react-router-dom';
import { createOpenMaicClassroom, getOpenMaicJob } from '../lib/openMaicApi.js';
import { generateQuestions } from '../lib/questionApi.js';
import { curriculumLessons } from '../teacher/data/teacherContentRepository.js';
import {
  clearMultiLessonPlanDraft, readMultiLessonPlanDraft, writeMultiLessonPlanDraft,
} from '../teacher/data/multiLessonPlanRepository.js';
import {
  DEFAULT_MULTI_LESSON_GENERATION_POLICY, enabledMultiLessonGenerationModules,
  hasReusableKnowledgeAssets, mergeSourceLessonAssets, multiLessonGenerationLessonId,
  normalizeMultiLessonGenerationPolicy, validateSelectedLessonVersions,
} from '../teacher/domain/multiLessonPlan.js';
import {
  deleteClassroomPlan, getClassroomPlans, getLatestLessonVersion, getPublishedLessonVersions,
  publishClassroomPlan,
} from '../shared/infrastructure/classroomApi.js';
import { compositeReviewCount } from '../shared/domain/questionPoolPolicy.js';
import { buildPreAssessmentBlueprint } from '../shared/domain/preAssessmentBlueprint.js';

const emptyDraft = {
  stage: 'list', selectedVersionIds: [], knowledgeConfirmed: false, title: '',
  classroom: null, diagnosticQuestions: [], reviewQuestions: [],
  generationPolicy: { ...DEFAULT_MULTI_LESSON_GENERATION_POLICY }, error: '',
};

const assessmentOptions = [
  { value: 'NONE', label: '不生成' },
  { value: 'PRE', label: '仅课前' },
  { value: 'POST', label: '仅课后' },
  { value: 'BOTH', label: '课前和课后' },
];

const masteredKnowledgeOptions = [
  { value: 'SKIP', label: '直接跳过' },
  { value: 'VERIFY_ONCE', label: '复核一次' },
  { value: 'FORCE_LEARN', label: '强制学习' },
];

function formalQuestion(question, purpose) {
  return {
    ...question,
    purpose,
    phase: purpose === 'POST' ? 'review' : 'diagnostic',
    knowledgeObjectiveIds: question.knowledgeObjectiveIds || question.knowledgePointIds || [],
  };
}

async function waitForClassroom(response, onProgress) {
  if (response.status === 'succeeded' && response.result?.classroomId) return response.result;
  if (!response.jobId) throw new Error('课堂学习还没有准备好');
  while (true) {
    const job = await getOpenMaicJob(response.jobId);
    onProgress?.(job);
    if (job.status === 'succeeded' && job.result?.classroomId) return job.result;
    if (job.status === 'failed') throw new Error(job.error || '课堂学习准备失败');
    await new Promise((resolve) => window.setTimeout(resolve, job.pollIntervalMs || 3000));
  }
}

async function generateQuestionsWithRetry(payload, options) {
  try {
    return await generateQuestions(payload, options);
  } catch {
    return generateQuestions(payload, options);
  }
}

export default function TeacherLearningPlansRoute() {
  const navigate = useNavigate();
  const lessons = useMemo(() => curriculumLessons(), []);
  const chapters = useMemo(() => [...new Map(lessons.map((item) => [item.chapter.id, item.chapter])).values()], [lessons]);
  const lessonById = useMemo(() => Object.fromEntries(lessons.map((item) => [item.id, item])), [lessons]);
  const restored = useRef(readMultiLessonPlanDraft());
  const [draft, setDraftState] = useState(() => ({ ...emptyDraft, ...(restored.current || {}) }));
  const [versions, setVersions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState('checking');
  const [generationStatus, setGenerationStatus] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [openedPlanId, setOpenedPlanId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [listNotice, setListNotice] = useState('');
  const [expandedChapterIds, setExpandedChapterIds] = useState(() => new Set(chapters[0] ? [chapters[0].id] : []));

  const setDraft = (next) => setDraftState((current) => {
    const value = typeof next === 'function' ? next(current) : next;
    writeMultiLessonPlanDraft(value);
    return value;
  });

  const refresh = async () => {
    setLoading(true);
    const [planResult, summaryResult] = await Promise.allSettled([
      getClassroomPlans(),
      getPublishedLessonVersions(lessons.map((lesson) => lesson.id)),
    ]);
    if (planResult.status === 'fulfilled') {
      setPermission('allowed');
      setPlans(Array.isArray(planResult.value) ? planResult.value : []);
    } else {
      setPermission(planResult.reason?.status === 403 ? 'denied' : 'unavailable');
    }
    if (summaryResult.status === 'fulfilled') {
      const versionResults = await Promise.allSettled(
        summaryResult.value.map((item) => getLatestLessonVersion(item.textbookLessonId)),
      );
      setVersions(versionResults.filter((item) => item.status === 'fulfilled').map((item) => item.value));
    } else {
      setVersions([]);
    }
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const versionById = useMemo(() => Object.fromEntries(versions.map((item) => [item.id, item])), [versions]);
  const versionByLessonId = useMemo(() => Object.fromEntries(versions.map((item) => [item.textbookLessonId, item])), [versions]);
  const selectedVersions = draft.selectedVersionIds.map((id) => versionById[id]).filter(Boolean);
  useEffect(() => {
    if (loading || !draft.selectedVersionIds.length) return;
    const validIds = draft.selectedVersionIds.filter((id) => versionById[id]);
    if (validIds.length === draft.selectedVersionIds.length) return;
    setDraft((current) => ({
      ...current,
      stage: ['select', 'list'].includes(current.stage) ? current.stage : 'select',
      selectedVersionIds: validIds,
      knowledgeConfirmed: false,
      classroom: null,
      diagnosticQuestions: [],
      reviewQuestions: [],
      error: '',
    }));
  }, [loading, versionById]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedAssets = useMemo(() => {
    if (selectedVersions.length < 2) return null;
    try { return mergeSourceLessonAssets(selectedVersions, lessonById); } catch { return null; }
  }, [selectedVersions, lessonById]);
  const generationPolicy = normalizeMultiLessonGenerationPolicy(draft.generationPolicy);
  const enabledGenerationModules = enabledMultiLessonGenerationModules(generationPolicy);
  const reviewContentPackage = selectedAssets ? {
    planType: 'MULTI_LESSON',
    title: draft.title,
    generationPolicy,
    sourceLessons: selectedAssets.sourceLessons,
    knowledgeObjectives: selectedAssets.knowledgeObjectives,
    diagnosticQuestionPool: draft.diagnosticQuestions,
    learningContent: {
      composite: draft.classroom,
      knowledgePoints: selectedAssets.knowledgeRuntimes,
    },
    knowledgePracticePools: selectedAssets.knowledgePracticePools,
    compositeReviewPool: draft.reviewQuestions,
  } : null;

  const toggleLesson = (versionId) => {
    setDraft((current) => {
      const selected = current.selectedVersionIds.includes(versionId);
      const validSelectedIds = current.selectedVersionIds.filter((id) => versionById[id]);
      if (!selected && validSelectedIds.length >= 3) return current;
      return {
        ...current,
        selectedVersionIds: selected
          ? validSelectedIds.filter((id) => id !== versionId)
          : [...validSelectedIds, versionId],
        knowledgeConfirmed: false,
        error: '',
      };
    });
  };

  const openCreate = () => {
    const next = { ...emptyDraft, stage: 'select' };
    clearMultiLessonPlanDraft();
    setDraft(next);
    setExpandedChapterIds(new Set(chapters[0] ? [chapters[0].id] : []));
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapterIds((current) => {
      const next = new Set(current);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const backToList = () => {
    clearMultiLessonPlanDraft();
    setDraftState({ ...emptyDraft });
  };

  const openDelete = (plan) => {
    setDeleteError('');
    setDeleteTarget(plan);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteError('');
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteClassroomPlan(deleteTarget.planId);
      setPlans((current) => current.filter((plan) => plan.planId !== deleteTarget.planId));
      setOpenedPlanId((current) => current === deleteTarget.planId ? '' : current);
      setListNotice(`已删除“${deleteTarget.title}”`);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error?.message || '课堂方案删除失败，请稍后重试');
    } finally {
      setDeleting(false);
    }
  };

  const confirmScope = () => {
    try {
      validateSelectedLessonVersions(selectedVersions);
      const defaultTitle = selectedVersions
        .map((version) => lessonById[version.textbookLessonId]?.title)
        .filter(Boolean).join('·');
      setDraft((current) => ({ ...current, stage: 'confirm', title: current.title || defaultTitle, error: '' }));
    } catch {
      setDraft((current) => ({ ...current, error: '课堂方案暂时不能发布，请检查所选课时内容' }));
    }
  };

  const generate = async () => {
    if (!draft.knowledgeConfirmed || !selectedAssets) return;
    setDraft((current) => ({ ...current, stage: 'generating', error: '' }));
    setGenerationStatus('正在准备课堂学习');
    const sourceVersionIds = selectedVersions.map((item) => item.id);
    const lesson = {
      id: multiLessonGenerationLessonId(sourceVersionIds),
      title: draft.title,
      chapterTitle: selectedVersions.map((item) => lessonById[item.textbookLessonId]?.chapter?.title).filter(Boolean).join('·'),
    };
    const knowledgePoints = selectedAssets.knowledgeObjectives;
    const confirmedTitle = draft.title.trim();
    // 题池供给与学生实际作答量分开。课前按主证据蓝图准备，
    // 综合复习按知识点数和可独立评分的复合题覆盖能力计算。
    const diagnosticBlueprintSlots = buildPreAssessmentBlueprint(knowledgePoints);
    const reviewCount = compositeReviewCount(knowledgePoints.length);
    try {
      const generationRequests = [];
      if (enabledGenerationModules.compositeExplanation) generationRequests.push({
        type: 'classroom',
        promise: createOpenMaicClassroom({
          lesson, knowledgePoints, sourceVersionIds, generationMode: 'multi_lesson',
          cacheOnly: false, teacherInstruction: '',
        }),
      });
      if (enabledGenerationModules.preAssessment) generationRequests.push({
        type: 'diagnostic',
        promise: generateQuestionsWithRetry({
          purpose: 'pre', lesson, knowledgePoints, count: diagnosticBlueprintSlots.length,
          diagnosticBlueprintSlots, teacherInstruction: '', multiLesson: true,
        }, { onProgress: (status) => setGenerationStatus(status.message) }),
      });
      if (enabledGenerationModules.postAssessment) generationRequests.push({
        type: 'review',
        promise: generateQuestionsWithRetry({
          purpose: 'review', lesson, knowledgePoints, reviewCount,
          teacherInstruction: '', multiLesson: true,
        }, { onProgress: (status) => setGenerationStatus(status.message) }),
      });
      const generatedEntries = await Promise.all(generationRequests.map(async ({ type, promise }) => ({
        type, result: await promise,
      })));
      const generatedByType = Object.fromEntries(generatedEntries.map((item) => [item.type, item.result]));
      const classroom = generatedByType.classroom
        ? await waitForClassroom(generatedByType.classroom, () => {
          setGenerationStatus('正在准备课堂学习');
        })
        : null;
      setDraft((current) => ({
        ...current,
        stage: 'review',
        selectedVersionIds: sourceVersionIds,
        knowledgeConfirmed: true,
        title: confirmedTitle,
        generationPolicy,
        classroom: classroom ? {
          status: 'READY', classroomId: classroom.classroomId,
          classroomUrl: classroom.url, coveredKnowledgeObjectiveIds: knowledgePoints.map((item) => item.id),
        } : null,
        diagnosticQuestions: (generatedByType.diagnostic?.questions || []).map((item) => formalQuestion(item, 'PRE')),
        reviewQuestions: (generatedByType.review?.questions || []).map((item) => formalQuestion(item, 'POST')),
      }));
      setGenerationStatus('');
    } catch (error) {
      setDraft((current) => ({
        ...current,
        stage: 'confirm',
        error: error?.message || '课堂内容暂时生成失败，请重试',
      }));
      setGenerationStatus('');
    }
  };

  const publish = async () => {
    setPublishing(true);
    setDraft((current) => ({ ...current, error: '' }));
    try {
      const plan = await publishClassroomPlan({
        title: draft.title,
        sourceContentVersionIds: selectedVersions.map((item) => item.id),
        generatedContent: {
          generationPolicy,
          learningContent: { composite: draft.classroom },
          diagnosticQuestionPool: draft.diagnosticQuestions,
          compositeReviewPool: draft.reviewQuestions,
        },
        publishedBy: 'current-teacher',
      });
      clearMultiLessonPlanDraft();
      navigate(`/adaptive-learning/teacher/live?planId=${encodeURIComponent(plan.planId)}&contentVersionId=${encodeURIComponent(plan.versionId)}&versionNumber=${encodeURIComponent(plan.versionNumber)}`);
    } catch (error) {
      setDraft((current) => ({ ...current, error: error.message }));
    } finally {
      setPublishing(false);
    }
  };

  const showList = draft.stage === 'list';
  const headerActions = showList
    ? <button className="teacher-primary" type="button" disabled={permission !== 'allowed'} onClick={openCreate}><Plus size={16} />新建方案</button>
    : <button className="teacher-neutral" type="button" onClick={backToList}><ArrowLeft size={16} />返回方案</button>;

  return (
    <TeacherShell title="课堂方案" actions={headerActions}>
      {permission === 'denied' && <div className="teacher-notice warning" role="alert">暂无多课时生成权限</div>}
      {permission === 'unavailable' && <div className="teacher-notice error" role="alert">课堂方案暂时无法使用</div>}
      {draft.error && <div className="teacher-notice error" role="alert">{draft.error}</div>}
      {showList && listNotice && <div className="teacher-notice success" role="status">{listNotice}</div>}

      {showList && <section className="classroom-plan-list">
        <header><div><h2>已发布方案</h2><span>{plans.length} 个</span></div><button className="teacher-neutral" type="button" onClick={() => { void refresh(); }}><RefreshCw size={15} />刷新</button></header>
        {loading ? <div className="teacher-empty"><LoaderCircle className="spin" size={28} />正在加载课堂方案</div>
          : plans.length ? <div className="classroom-plan-table">
            <div className="classroom-plan-table-head"><span>方案名称</span><span>课时</span><span>发布时间</span><span>状态</span><span>操作</span></div>
            {plans.map((plan) => <div className="classroom-plan-table-item" key={plan.planId}>
              <article>
                <div><strong>{plan.title}</strong><small>{plan.sourceLessons.map((item) => item.title).join('·')}</small></div>
                <span>{plan.sourceLessons.length} 个</span>
                <time>{new Date(plan.publishedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                <b><CheckCircle2 size={14} />已发布</b>
                <div className="classroom-plan-table-actions">
                  <button type="button" onClick={() => setOpenedPlanId((current) => current === plan.planId ? '' : plan.planId)}>{openedPlanId === plan.planId ? '收起' : '查看'}</button>
                  <button className="primary" type="button" onClick={() => navigate(`/adaptive-learning/teacher/live?planId=${encodeURIComponent(plan.planId)}&contentVersionId=${encodeURIComponent(plan.versionId)}&versionNumber=${encodeURIComponent(plan.versionNumber)}`)}>进入课堂</button>
                  {plan.canDelete && <button className="danger-icon" type="button" aria-label={`删除方案：${plan.title}`} title="删除方案" onClick={() => openDelete(plan)}><Trash2 size={16} /></button>}
                </div>
              </article>
              {openedPlanId === plan.planId && <div className="classroom-plan-table-detail"><TeacherClassroomContentOutline contentPackage={plan.contentPackage} /></div>}
            </div>)}
          </div> : <div className="teacher-empty"><BookOpenCheck size={28} />还没有课堂方案</div>}
      </section>}

      {deleteTarget && <DeleteClassroomPlanDialog
        plan={deleteTarget}
        pending={deleting}
        error={deleteError}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />}

      {draft.stage === 'select' && <section className="classroom-plan-create">
        <header><div><h2>选择上课内容</h2><span>已选 {selectedVersions.length}/3</span></div></header>
        <div className="classroom-plan-selector">
          <div className="classroom-plan-lessons" role="tree" aria-label="教材章节与课时">
            {chapters.map((chapter) => {
              const chapterLessons = chapter.sections.map((section) => lessonById[section.id]).filter(Boolean);
              const readyCount = chapterLessons.filter((lesson) => {
                const version = versionByLessonId[lesson.id];
                return version && hasReusableKnowledgeAssets(version);
              }).length;
              const selectedCount = chapterLessons.filter((lesson) => {
                const version = versionByLessonId[lesson.id];
                return version && draft.selectedVersionIds.includes(version.id);
              }).length;
              const expanded = expandedChapterIds.has(chapter.id);
              return <section className="classroom-plan-chapter" key={chapter.id} role="treeitem" aria-expanded={expanded}>
                <button className="classroom-plan-chapter-toggle" type="button" onClick={() => toggleChapter(chapter.id)}>
                  <ChevronDown className="classroom-plan-chapter-chevron" size={17} aria-hidden="true" />
                  <span><strong>{chapter.index} · {chapter.title}</strong><small>{readyCount}/{chapterLessons.length} 个课时可用</small></span>
                  {selectedCount > 0 && <b>已选 {selectedCount}</b>}
                </button>
                {expanded && <div className="classroom-plan-chapter-lessons" role="group" aria-label={`${chapter.title}课时`}>
                  {chapterLessons.map((lesson) => {
                    const version = versionByLessonId[lesson.id];
                    const ready = version && hasReusableKnowledgeAssets(version);
                    const selected = ready && draft.selectedVersionIds.includes(version.id);
                    const disabled = !ready || (!selected && selectedVersions.length >= 3);
                    return <button key={lesson.id} type="button" aria-pressed={Boolean(selected)} disabled={disabled} className={`classroom-plan-lesson${selected ? ' selected' : ''}`} onClick={() => ready && toggleLesson(version.id)}>
                      <span>{selected ? <Check size={16} /> : <CircleDashed size={16} />}</span><div><strong>{lesson.index} {lesson.title}</strong></div><b>{ready ? `V${version.versionNumber}` : version ? '需更新' : '未发布'}</b>
                    </button>;
                  })}
                </div>}
              </section>;
            })}
          </div>
          <aside><strong>已选课时</strong>{selectedVersions.map((version) => <button type="button" key={version.id} onClick={() => toggleLesson(version.id)}><span>{lessonById[version.textbookLessonId]?.title}</span><b>移除</b></button>)}{!selectedVersions.length && <p>请选择 2–3 个可用课时</p>}</aside>
        </div>
        <footer><button className="teacher-primary" type="button" disabled={selectedVersions.length < 2} onClick={confirmScope}>确认学习内容</button></footer>
      </section>}

      {['confirm', 'generating'].includes(draft.stage) && selectedAssets && <section className="classroom-plan-confirm">
        <header><div><h2>确认学习内容</h2></div></header>
        <label className="classroom-plan-title"><span>方案名称</span><input value={draft.title} disabled={draft.stage === 'generating'} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
        <div className="classroom-plan-knowledge">
          {selectedVersions.map((version) => <section key={version.id}><h3>{lessonById[version.textbookLessonId]?.index} {lessonById[version.textbookLessonId]?.title}</h3><div>{version.contentPackage.knowledgeObjectives.map((item) => <span key={item.id}>{item.name}</span>)}</div></section>)}
        </div>
        <section className="classroom-plan-policy" aria-labelledby="classroom-plan-policy-title">
          <header>
            <div><h3 id="classroom-plan-policy-title">本堂课额外内容</h3><p>知识点讲解与单点练习始终复用已发布内容。</p></div>
          </header>
          <div className="classroom-plan-policy-row">
            <div><strong>综合讲解</strong><small>生成一份串联本堂课全部知识点的讲解</small></div>
            <button
              className="classroom-plan-switch"
              type="button"
              role="switch"
              aria-checked={enabledGenerationModules.compositeExplanation}
              disabled={draft.stage === 'generating'}
              onClick={() => setDraft((current) => ({
                ...current,
                generationPolicy: {
                  ...normalizeMultiLessonGenerationPolicy(current.generationPolicy),
                  compositeExplanation: enabledGenerationModules.compositeExplanation ? 'OMIT' : 'GENERATE',
                },
              }))}
            ><span aria-hidden="true" /><b>{enabledGenerationModules.compositeExplanation ? '生成' : '不生成'}</b></button>
          </div>
          <div className="classroom-plan-policy-row stacked">
            <div><strong>综合测验</strong><small>选择是否在课堂前后加入整堂课测验</small></div>
            <div className="classroom-plan-segmented" role="group" aria-label="综合测验生成方式">
              {assessmentOptions.map((option) => <button key={option.value} type="button" aria-pressed={generationPolicy.assessment === option.value} disabled={draft.stage === 'generating'} onClick={() => setDraft((current) => ({ ...current, generationPolicy: { ...normalizeMultiLessonGenerationPolicy(current.generationPolicy), assessment: option.value } }))}>{option.label}</button>)}
            </div>
          </div>
          <div className="classroom-plan-policy-row stacked">
            <div><strong>已掌握知识点</strong><small>依据学生的权威掌握记录安排学习</small></div>
            <div className="classroom-plan-segmented" role="group" aria-label="已掌握知识点处理方式">
              {masteredKnowledgeOptions.map((option) => <button key={option.value} type="button" aria-pressed={generationPolicy.masteredKnowledgePointPolicy === option.value} disabled={draft.stage === 'generating'} onClick={() => setDraft((current) => ({ ...current, generationPolicy: { ...normalizeMultiLessonGenerationPolicy(current.generationPolicy), masteredKnowledgePointPolicy: option.value } }))}>{option.label}</button>)}
            </div>
          </div>
        </section>
        <label className="classroom-plan-confirm-check"><input type="checkbox" checked={draft.knowledgeConfirmed} disabled={draft.stage === 'generating'} onChange={(event) => setDraft((current) => ({ ...current, knowledgeConfirmed: event.target.checked }))} /><span>已确认上述知识点</span></label>
        {draft.stage === 'generating' && <div className="classroom-plan-generating" role="status"><LoaderCircle className="spin" size={22} /><strong>{generationStatus || '正在准备课堂内容'}</strong></div>}
        <footer><button className="teacher-neutral" type="button" disabled={draft.stage === 'generating'} onClick={() => setDraft((current) => ({ ...current, stage: 'select' }))}>重新选择</button><button className="teacher-primary" type="button" aria-busy={draft.stage === 'generating'} disabled={!draft.knowledgeConfirmed || !draft.title.trim() || draft.stage === 'generating'} onClick={() => { void generate(); }}><Sparkles size={16} />{enabledGenerationModules.compositeExplanation || enabledGenerationModules.preAssessment || enabledGenerationModules.postAssessment ? '生成课堂内容' : '预览课堂内容'}</button></footer>
      </section>}

      {draft.stage === 'review' && <section className="classroom-plan-review">
        <header><div><h2>{draft.title}</h2></div>{draft.classroom?.classroomUrl && <a href={draft.classroom.classroomUrl} target="_blank" rel="noreferrer">预览综合讲解 <ExternalLink size={14} /></a>}</header>
        <TeacherClassroomContentOutline contentPackage={reviewContentPackage} />
        <footer><button className="teacher-neutral" type="button" onClick={() => setDraft((current) => ({ ...current, stage: 'confirm' }))}>重新生成</button><button className="teacher-primary" type="button" aria-busy={publishing} disabled={publishing} onClick={() => { void publish(); }}><Check size={16} />{publishing ? '正在发布…' : '发布课堂方案'}</button></footer>
      </section>}

    </TeacherShell>
  );
}
