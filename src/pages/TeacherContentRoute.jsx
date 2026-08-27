import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ExternalLink, History, LoaderCircle, Maximize2, Play, Sparkles } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherQuestionAgent from '../components/TeacherQuestionAgent';
import TeacherQuestionReview from '../components/TeacherQuestionReview';
import TeacherShell from '../components/TeacherShell';
import StatePanel from '../components/StatePanel';
import { course } from '../shared/domain/courseCatalog';
import { generateQuestions } from '../lib/questionApi';
import { planTeacherContentInstruction } from '../lib/teacherContentAgentApi';
import { cancelOpenMaicJob, createOpenMaicClassroom, getOpenMaicJob } from '../lib/openMaicApi';
import {
  cancelGenerationRun,
  createLessonGenerationRun,
  generationStateFromRun,
  getCurrentLessonGenerationRun,
  mergeGenerationRunDraft,
  presentGenerationQualityIssues,
  publishGenerationRun,
} from '../lib/generationRunApi';
import { createDefaultContent } from '../shared/domain/defaultLessonContent';
import { readTeacherContent, writeTeacherContent } from '../teacher/data/teacherContentRepository';
import { buildPublishedContentPackage } from '../teacher/domain/publishedContentPackage';
import {
  getLatestLessonVersion,
  getLessonVersions,
  publishLessonVersion,
  validateLessonVersion,
} from '../shared/infrastructure/classroomApi';
import { flattenPublishedQuestions, normalizePublishedContentPackage } from '../shared/domain/publishedLearningContent';
import {
  COMPOSITE_REVIEW_POOL_SIZE,
  PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
} from '../shared/domain/questionPoolPolicy';
import {
  buildPreAssessmentBlueprint,
  diagnosticSlotForQuestion,
} from '../shared/domain/preAssessmentBlueprint';
import { applyStyleSampleKnowledgeClassrooms } from '../teacher/domain/styleComparisonClassrooms';
import { publishedVersionToTeacherContent } from '../teacher/domain/publishedVersionView';
import KnowledgeAssessmentMatrix from '../teacher/components/KnowledgeAssessmentMatrix';
import {
  buildLessonGenerationModules,
  buildMissingContentGenerationPlan,
  buildParallelLessonGenerationLanes,
  buildQualityRepairPlan,
  MAX_AUTOMATIC_REPAIR_ROUNDS,
} from '../teacher/domain/lessonContentGeneration';

function normalizedQuestionStem(question) {
  return String(question?.stem || '').replace(/\s+/g, '').replace(/[，。！？,.!?]/g, '');
}

function ensureUniqueQuestionStems(questions) {
  const seen = new Set();
  for (const question of questions) {
    const stem = normalizedQuestionStem(question);
    if (stem && seen.has(stem)) throw new Error('生成题目中存在重复题干');
    if (stem) seen.add(stem);
  }
}

const openMaicStepCopy = {
  queued: '等待开始',
  initializing: '初始化课堂',
  researching: '整理教学主题',
  generating_outlines: '规划课堂结构',
  generating_scenes: '生成课堂场景',
  generating_media: '准备课堂素材',
  generating_tts: '生成讲解语音',
  persisting: '保存课堂内容',
  completed: '生成完成',
};

const contentSections = [
  { id: 'pre', label: '课前测验' },
  { id: 'openmaic', label: '学习内容' },
  { id: 'practice', label: '单点题池' },
  { id: 'review', label: '综合练习' },
];

function moveTabFocus(event, items, activeId, selectItem) {
  const supportedKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!supportedKeys.includes(event.key)) return;
  event.preventDefault();
  const currentIndex = Math.max(0, items.findIndex((item) => item.id === activeId));
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? items.length - 1
      : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
  selectItem(items[nextIndex].id);
  event.currentTarget.querySelector(`[data-tab-index="${nextIndex}"]`)?.focus();
}

function noticeTone(notice) {
  if (!notice) return 'info';
  if (typeof notice === 'object') return notice.tone || 'warning';
  const text = String(notice);
  if (/失败|无法|错误|未通过|入队失败/.test(text)) return 'error';
  if (/请先|需要|仍有|缺少/.test(text)) return 'warning';
  if (/已发布|已生成|已加载|已找回|已通过|已保存/.test(text)) return 'success';
  return 'info';
}

function noticeMessage(tone, message) {
  return { tone, message };
}

function generationCancelledError() {
  return new DOMException('生成已取消', 'AbortError');
}

function isGenerationCancelled(error) {
  return error?.name === 'AbortError' || error?.message === '生成已取消';
}

async function generateQuestionsWithRetry(payload, onProgress, validateResult, signal) {
  let latestError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await generateQuestions(payload, { onProgress, signal });
      validateResult?.(result);
      return result;
    } catch (error) {
      latestError = error;
      if (isGenerationCancelled(error)) throw error;
      if (attempt === 0) onProgress({ message: '题目没有通过完整性检查，正在重新准备' });
    }
  }
  throw latestError;
}

async function generatePracticeQuestionsByKnowledgePoint({
  lesson,
  knowledgePoints,
  teacherInstruction,
  existingQuestions,
  generationScope = 'all',
}, onProgress, signal) {
  let latestError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const includeKnowledgeQuestions = generationScope !== 'review';
      const includeReviewQuestions = generationScope !== 'knowledge';
      const [knowledgeResults, reviewResult] = await Promise.all([
        includeKnowledgeQuestions ? Promise.all(knowledgePoints.map((knowledgePoint) => generateQuestions({
          purpose: 'post',
          lesson,
          knowledgePoints: [knowledgePoint],
          countPerKnowledgePoint: PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
          reviewCount: 0,
          teacherInstruction,
        }, {
          onProgress: (status) => onProgress({ ...status, message: `正在准备“${knowledgePoint.name}”练习` }),
          signal,
        }))) : Promise.resolve([]),
        includeReviewQuestions ? generateQuestions({
          purpose: 'post',
          lesson,
          knowledgePoints,
          countPerKnowledgePoint: 0,
          reviewCount: COMPOSITE_REVIEW_POOL_SIZE,
          teacherInstruction,
        }, { onProgress: (status) => onProgress({ ...status, message: '正在准备综合练习' }), signal }) : Promise.resolve({ questions: [] }),
      ]);
      const result = {
        questions: [...knowledgeResults.flatMap((result) => result.questions), ...reviewResult.questions],
      };
      ensureUniqueQuestionStems([...result.questions, ...(existingQuestions || [])]);
      return result;
    } catch (error) {
      latestError = error;
      if (isGenerationCancelled(error)) throw error;
      if (attempt === 0) onProgress({ message: '题目没有通过完整性检查，正在重新准备' });
    }
  }
  throw latestError;
}

export default function TeacherContentRoute() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const lesson = useMemo(() => course.chapters.flatMap((chapter) => chapter.sections).find((item) => item.id === lessonId) || course.chapters[0].sections[0], [lessonId]);
  const [allContent, setAllContent] = useState(readTeacherContent);
  const [activeSection, setActiveSection] = useState('pre');
  const [notice, setNotice] = useState('');
  const [openMaicJob, setOpenMaicJob] = useState(null);
  const [activeLearningScope, setActiveLearningScope] = useState('composite');
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewFrameState, setPreviewFrameState] = useState('loading');
  const [previewFrameKey, setPreviewFrameKey] = useState(0);
  const previewRef = useRef(null);
  const resumedJobs = useRef(new Set());
  const activeOpenMaicJobsRef = useRef(new Map());
  const generationRunRef = useRef(0);
  const generationAbortRef = useRef(null);
  const generationStartedAtRef = useRef(0);
  const [questionGeneration, setQuestionGeneration] = useState({ mode: '', scope: '', status: null, error: '' });
  const [teacherAgent, setTeacherAgent] = useState({ open: false, scope: 'whole' });
  const teacherAgentReturnFocusRef = useRef(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedVersions, setPublishedVersions] = useState([]);
  const [selectedPublishedVersionId, setSelectedPublishedVersionId] = useState('');

  const [lessonGeneration, setLessonGeneration] = useState({
    phase: 'idle', message: '', moduleStatuses: {}, moduleProgress: {}, issues: [], repairRound: 0,
  });
  const [backendGenerationRun, setBackendGenerationRun] = useState(null);
  const [backendRunChecked, setBackendRunChecked] = useState(false);
  const [backendPollRevision, setBackendPollRevision] = useState(0);
  const [loadedLessonId, setLoadedLessonId] = useState('');
  const recoveredLesson = useRef('');
  const defaultContent = createDefaultContent()['section-1-1'];
  const editableBase = allContent[lesson.id] || {
    ...defaultContent,
    lessonId: lesson.id,
    preQuestions: [],
    postQuestions: [],
    version: 1,
    status: 'draft',
  };
  const sortedPublishedVersions = useMemo(() => [...publishedVersions]
    .sort((left, right) => Number(right.versionNumber || 0) - Number(left.versionNumber || 0)), [publishedVersions]);
  const latestPublishedVersion = sortedPublishedVersions[0] || null;
  const selectedPublishedVersion = sortedPublishedVersions
    .find((version) => version.id === selectedPublishedVersionId) || latestPublishedVersion;
  const viewingHistoricalVersion = Boolean(
    selectedPublishedVersionId
    && latestPublishedVersion
    && selectedPublishedVersion?.id !== latestPublishedVersion.id,
  );
  const base = viewingHistoricalVersion
    ? publishedVersionToTeacherContent(selectedPublishedVersion, editableBase)
    : editableBase;
  const activeGenerationStatuses = ['queued', 'running', 'quality_check', 'repairing'];
  const contentMutationLocked = Boolean(
    viewingHistoricalVersion
    || (backendGenerationRun?.runId && activeGenerationStatuses.includes(backendGenerationRun.status))
    || (!backendRunChecked && base.generationStatus?.runId
      && activeGenerationStatuses.includes(base.generationStatus.phase)),
  );
  const storedLearningContent = base.learningContent || {
    composite: base.openMaic || null,
    knowledgePoints: [],
  };
  const learningContent = applyStyleSampleKnowledgeClassrooms(lesson.id, storedLearningContent);
  const runtime = activeLearningScope === 'composite'
    ? learningContent.composite
    : learningContent.knowledgePoints.find((item) => item.knowledgeObjectiveId === activeLearningScope)?.openMaic;
  useEffect(() => {
    if (!runtime?.classroomUrl) {
      setPreviewFrameState('idle');
      return undefined;
    }
    setPreviewFrameState('loading');
    const timer = window.setTimeout(() => {
      setPreviewFrameState((current) => current === 'loading' ? 'slow' : current);
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [activeLearningScope, previewFrameKey, runtime?.classroomUrl]);
  const openTeacherAgent = useCallback((scope = 'whole', trigger = null) => {
    teacherAgentReturnFocusRef.current = trigger || document.activeElement;
    setTeacherAgent({ open: true, scope });
  }, []);
  const closeTeacherAgent = useCallback(() => {
    setTeacherAgent((current) => ({ ...current, open: false }));
    window.requestAnimationFrame(() => teacherAgentReturnFocusRef.current?.focus?.());
  }, []);
  useEffect(() => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    generationStartedAtRef.current = 0;
    generationRunRef.current += 1;
    resumedJobs.current.clear();
    activeOpenMaicJobsRef.current.clear();
    const persistedInspection = readTeacherContent()[lesson.id]?.inspectionStatus;
    setLessonGeneration(persistedInspection?.inspectedAt ? {
      phase: persistedInspection.passed
        ? readTeacherContent()[lesson.id]?.status === 'published' ? 'published' : 'dirty'
        : 'failed',
      message: persistedInspection.message || '',
      moduleStatuses: {},
      moduleProgress: {},
      issues: persistedInspection.issues || [],
      repairRound: 0,
      inspectedAt: persistedInspection.inspectedAt,
    } : {
      phase: 'idle', message: '', moduleStatuses: {}, moduleProgress: {}, issues: [], repairRound: 0,
    });
    setBackendGenerationRun(null);
    setBackendRunChecked(false);
    setPublishedVersions([]);
    setSelectedPublishedVersionId('');
    setTeacherAgent({ open: false, scope: 'whole' });
    return () => {
      generationAbortRef.current?.abort();
    };
  }, [lesson.id]);

  const refreshPublishedVersions = useCallback(async () => {
    try {
      const versions = await getLessonVersions(lesson.id);
      setPublishedVersions(Array.isArray(versions) ? versions : []);
      return versions;
    } catch (error) {
      if (error.status === 404) {
        setPublishedVersions([]);
        return [];
      }
      throw error;
    }
  }, [lesson.id]);

  useEffect(() => {
    let cancelled = false;
    refreshPublishedVersions().catch((error) => {
      if (!cancelled) setNotice(noticeMessage('warning', error.message || '暂时无法读取发布版本记录'));
    });
    return () => { cancelled = true; };
  }, [refreshPublishedVersions]);

  useEffect(() => {
    let stopped = false;
    const abortController = new AbortController();
    const refreshBackendRun = async () => {
      try {
        const run = await getCurrentLessonGenerationRun(lesson.id, { signal: abortController.signal });
        if (stopped) return;
        if (!run) {
          setBackendGenerationRun(null);
          setBackendRunChecked(true);
          return false;
        }
        setBackendGenerationRun(run);
        setBackendRunChecked(true);
        const generation = generationStateFromRun(run);
        const phase = run.status === 'awaiting_review'
          ? 'ready'
          : run.status === 'quality_check'
            ? 'validating'
            : run.status === 'repairing'
              ? 'repairing'
              : run.status === 'running' || run.status === 'queued'
                ? 'generating'
                : run.status;
        const modules = Object.values(run.draft?.modules || {});
        const localContent = readTeacherContent()[lesson.id];
        const restoredContent = mergeGenerationRunDraft(localContent || {}, run);
        const visibleRunIssues = presentGenerationQualityIssues(run.qualityIssues || [], restoredContent);
        const localDraftIsNewer = localContent?.status === 'draft'
          && localContent.updatedAt && run.updatedAt
          && new Date(localContent.updatedAt) > new Date(run.updatedAt);
        if (!localDraftIsNewer) {
          setLessonGeneration((current) => ({
            ...(current.inspectedAt && run.updatedAt
              && new Date(current.inspectedAt) > new Date(run.updatedAt)
              ? current
              : {
                  ...current,
                  operation: run.checkpoint?.teacherAgent?.operation || '',
                  phase,
                  message: generation?.message || current.message,
                  issues: visibleRunIssues,
                  repairRound: Math.max(0, ...modules.map((module) => Number(module.repairRound || 0))),
                  moduleStatuses: {
                    ...current.moduleStatuses,
                    ...Object.fromEntries(modules.map((module) => [
                      module.targetModuleId || module.graphNodeId,
                      'ready',
                    ])),
                  },
                  completedAt: run.completedAt,
                }),
          }));
        }
        setAllContent((current) => {
          if (current[lesson.id]?.generationStatus?.updatedAt === run.updatedAt) return current;
          const next = {
            ...current,
            [lesson.id]: mergeGenerationRunDraft(current[lesson.id] || {}, run),
          };
          writeTeacherContent(next);
          return next;
        });
        return ['queued', 'running', 'quality_check', 'repairing'].includes(run.status);
      } catch (error) {
        if (error.name === 'AbortError') return;
        if (error.status === 404) {
          if (!stopped) {
            setBackendGenerationRun(null);
            setBackendRunChecked(true);
          }
          return false;
        }
        if (!stopped) setNotice(noticeMessage('error', error.message || '暂时无法读取后端生成进度'));
        return true;
      }
    };
    let timer;
    const pollBackendRun = async () => {
      const shouldContinue = await refreshBackendRun();
      if (!stopped && shouldContinue) timer = setTimeout(pollBackendRun, 1500);
    };
    void pollBackendRun();
    return () => {
      stopped = true;
      clearTimeout(timer);
      abortController.abort();
    };
  }, [backendPollRevision, lesson.id]);

  useEffect(() => {
    let cancelled = false;
    getLatestLessonVersion(lesson.id).then((published) => {
      if (cancelled) return;
      setAllContent(() => {
        const current = readTeacherContent();
        const local = current[lesson.id] || {};
        const terminalDatabaseRun = local.generationStatus?.databaseAuthoritative
          && ['canceled', 'failed'].includes(local.generationStatus.status);
        const hasBackendDraft = local.status === 'draft'
          && local.generationStatus?.databaseAuthoritative
          && !terminalDatabaseRun;
        const hasNewerDraft = hasBackendDraft || (local.status === 'draft'
          && !terminalDatabaseRun
          && (local.publishedVersionId || local.publishedSnapshot)
          && local.updatedAt && new Date(local.updatedAt) > new Date(published.publishedAt));
        const packageContent = normalizePublishedContentPackage(published.contentPackage || {});
        const publishedQuestions = flattenPublishedQuestions(packageContent);
        const restored = hasNewerDraft ? local : {
          ...local,
          lessonId: lesson.id,
          preQuestions: publishedQuestions.filter((item) => item.purpose === 'PRE').map((item) => ({ ...item, knowledgePointIds: item.knowledgeObjectiveIds || item.knowledgePointIds })),
          postQuestions: publishedQuestions.filter((item) => ['PRACTICE', 'POST'].includes(item.purpose)).map((item) => ({ ...item, knowledgePointIds: item.knowledgeObjectiveIds || item.knowledgePointIds })),
          learningContent: packageContent.learningContent,
          assessmentMatrices: packageContent.assessmentMatrices,
          status: 'published', publishedAt: published.publishedAt,
        };
        const next = { ...restored, version: published.versionNumber, publishedVersionId: published.id, publishedVersionNumber: published.versionNumber, qualityReport: published.qualityReport };
        const value = { ...current, [lesson.id]: next }; writeTeacherContent(value); return value;
      });
    }).catch((error) => {
      if (!cancelled && error.status !== 404) {
        setNotice(noticeMessage('warning', Number(error.status) >= 500
          ? '暂时无法读取已发布版本，当前仍可编辑本地草稿'
          : error.message));
      }
    })
      .finally(() => { if (!cancelled) setLoadedLessonId(lesson.id); });
    return () => { cancelled = true; };
  }, [lesson.id]);

  useEffect(() => {
    if (!backendRunChecked || loadedLessonId !== lesson.id || recoveredLesson.current === lesson.id) return undefined;
    if (['queued', 'running', 'quality_check', 'repairing'].includes(backendGenerationRun?.status)) {
      return undefined;
    }
    recoveredLesson.current = lesson.id;
    let cancelled = false;
    const recoverCachedSingleClassrooms = async () => {
      const currentKnowledgeContent = learningContent.knowledgePoints || [];
      const missing = lesson.knowledgePoints.filter((knowledgePoint) => !currentKnowledgeContent
        .find((item) => item.knowledgeObjectiveId === knowledgePoint.id)?.openMaic?.classroomUrl);
      const recovered = [];
      for (const knowledgePoint of missing) {
        try {
          const response = await createOpenMaicClassroom({
            lesson: lessonPayload,
            knowledgePoints: [knowledgePoint],
            generationMode: 'deep',
            cacheOnly: true,
            teacherInstruction: '',
          });
          if (response.status === 'succeeded' && response.result?.classroomId) {
            recovered.push({
              knowledgeObjectiveId: knowledgePoint.id,
              openMaic: {
                status: 'succeeded', progress: 100,
                classroomId: response.result.classroomId,
                classroomUrl: response.result.url,
                scenesCount: response.result.scenesCount,
                teacherInstruction: '', generatedAt: new Date().toISOString(),
              },
            });
          }
        } catch (error) {
          if (error.message !== '本课学习内容还在准备中，请稍后再来') {
            // 无缓存是正常草稿状态，不用错误打断教师编辑。
          }
        }
      }
      if (cancelled || !recovered.length) return;
      setAllContent(() => {
        const current = readTeacherContent();
        const currentLesson = current[lesson.id] || base;
        const currentLearning = currentLesson.learningContent || { composite: currentLesson.openMaic || null, knowledgePoints: [] };
        const recoveredIds = new Set(recovered.map((item) => item.knowledgeObjectiveId));
        const nextLesson = {
          ...currentLesson,
          learningContent: {
            ...currentLearning,
            knowledgePoints: [
              ...currentLearning.knowledgePoints.filter((item) => !recoveredIds.has(item.knowledgeObjectiveId)),
              ...recovered,
            ],
          },
          status: 'draft', updatedAt: new Date().toISOString(),
        };
        const value = { ...current, [lesson.id]: nextLesson };
        writeTeacherContent(value);
        return value;
      });
      setNotice(`已找回 ${recovered.length} 个生成完成的单点课堂，请预览确认`);
    };
    void recoverCachedSingleClassrooms();
    return () => { cancelled = true; };
    // 只在已发布内容恢复后执行一次，避免与教师正在编辑的状态竞争。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendGenerationRun?.status, backendRunChecked, loadedLessonId, lesson.id]);

  useEffect(() => {
    if (!previewExpanded) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setPreviewExpanded(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [previewExpanded]);

  const lessonPayload = {
    id: lesson.id,
    title: lesson.title,
    chapterTitle: course.chapters.find((chapter) => chapter.sections.some((item) => item.id === lesson.id))?.title || '',
    grade: lesson.grade || course.grade,
    subject: lesson.subject || course.subject,
  };
  const save = (next) => {
    setAllContent(() => {
      const current = readTeacherContent();
      const value = { ...current, [lesson.id]: next };
      writeTeacherContent(value);
      return value;
    });
  };
  const saveDraft = (patch) => {
    if (contentMutationLocked) {
      setNotice('整课后台任务正在处理，当前内容暂时只读；可在教师智能体中查看或停止任务');
      return false;
    }
    setAllContent(() => {
      const current = readTeacherContent();
      const currentLesson = current[lesson.id] || base;
      const value = {
        ...current,
        [lesson.id]: {
          ...currentLesson,
          ...patch,
          qualityReport: null,
          inspectionStatus: null,
          status: 'draft',
          updatedAt: new Date().toISOString(),
        },
      };
      writeTeacherContent(value);
      return value;
    });
    setLessonGeneration((current) => (
      ['generating', 'validating', 'repairing'].includes(current.phase)
        ? current
        : { ...current, phase: 'dirty', message: '内容有修改，正在准备重新校验并发布', issues: [] }
    ));
    return true;
  };

  const persistDraftContent = (content, patch = {}) => {
    if (contentMutationLocked) throw new Error('整课后台任务正在处理，本次本地修改未写入');
    const next = {
      ...content,
      qualityReport: null,
      inspectionStatus: null,
      ...patch,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    setAllContent(() => {
      const current = readTeacherContent();
      const value = { ...current, [lesson.id]: next };
      writeTeacherContent(value);
      return value;
    });
    return next;
  };

  const saveLearningRuntime = (scope, nextRuntime, extra = {}) => {
    if (contentMutationLocked) throw new Error('整课后台任务正在处理，本次学习内容未写入');
    setAllContent(() => {
      const current = readTeacherContent();
      const currentLesson = current[lesson.id] || base;
      const currentLearningContent = currentLesson.learningContent || { composite: currentLesson.openMaic || null, knowledgePoints: [] };
      const nextLearningContent = scope === 'composite'
        ? { ...currentLearningContent, composite: nextRuntime }
        : {
            ...currentLearningContent,
            knowledgePoints: [
              ...currentLearningContent.knowledgePoints.filter((item) => item.knowledgeObjectiveId !== scope),
              { knowledgeObjectiveId: scope, openMaic: nextRuntime },
            ],
          };
      const value = {
        ...current,
        [lesson.id]: {
          ...currentLesson, ...extra, learningContent: nextLearningContent,
          qualityReport: null, inspectionStatus: null,
          status: 'draft', updatedAt: new Date().toISOString(),
        },
      };
      writeTeacherContent(value);
      return value;
    });
    setLessonGeneration((current) => (
      ['generating', 'validating', 'repairing'].includes(current.phase)
        ? current
        : { ...current, phase: 'dirty', message: '内容有修改，正在准备重新校验并发布', issues: [] }
    ));
  };

  const contentVersionSnapshot = () => {
    const current = readTeacherContent()[lesson.id] || base;
    return {
      version: Number(current.version || 0),
      generationRunId: current.generationStatus?.runId || '',
      contentFingerprint: JSON.stringify([
        current.preQuestions || [],
        current.postQuestions || [],
        current.learningContent || null,
      ]),
    };
  };
  const assertContentVersion = (expected) => {
    const current = contentVersionSnapshot();
    if (current.version !== expected.version
      || current.generationRunId !== expected.generationRunId
      || current.contentFingerprint !== expected.contentFingerprint) {
      throw new Error('课时内容在智能体处理期间已发生变化，本次结果未写入；请基于最新内容重新发送要求');
    }
  };

  const saveOpenMaicJobCheckpoint = (scope, job) => {
    setAllContent(() => {
      const current = readTeacherContent();
      const currentLesson = current[lesson.id] || base;
      const openMaicJobs = { ...(currentLesson.openMaicJobs || {}) };
      if (job) openMaicJobs[scope] = job; else delete openMaicJobs[scope];
      const value = {
        ...current,
        [lesson.id]: {
          ...currentLesson,
          openMaicJobs,
          // Keep the legacy field while older drafts still depend on it.
          openMaicJob: job || (currentLesson.openMaicJob?.scope === scope ? null : currentLesson.openMaicJob),
          status: 'draft',
          updatedAt: new Date().toISOString(),
        },
      };
      writeTeacherContent(value);
      return value;
    });
  };

  const checkedGenerationProposalMatchesCurrentDraft = () => {
    if (!backendGenerationRun?.runId || backendGenerationRun.status !== 'awaiting_review') return false;
    if ((backendGenerationRun.qualityIssues || []).length) return false;
    if (base.updatedAt && backendGenerationRun.updatedAt) {
      return new Date(base.updatedAt) <= new Date(backendGenerationRun.updatedAt);
    }
    const proposal = backendGenerationRun.draft || {};
    return JSON.stringify([
      base.preQuestions || [],
      base.postQuestions || [],
      storedLearningContent,
    ]) === JSON.stringify([
      proposal.preQuestions || [],
      proposal.postQuestions || [],
      proposal.learningContent || { composite: null, knowledgePoints: [] },
    ]);
  };

  const publishReadyContent = async () => {
    if (backendGenerationRun?.runId && ['queued', 'running', 'quality_check', 'repairing'].includes(backendGenerationRun.status)) {
      setNotice('数据库整课任务正在处理，请等待提案完成');
      return;
    }
    if (checkedGenerationProposalMatchesCurrentDraft()) {
      setPublishing(true);
      setNotice('正在按教师确认发布这份提案…');
      try {
        const publishedRun = await publishGenerationRun(backendGenerationRun.runId, 'current-teacher');
        setBackendGenerationRun(publishedRun);
        const publishedContent = mergeGenerationRunDraft(base, publishedRun);
        save(publishedContent);
        await refreshPublishedVersions();
        setNotice(`V${publishedRun.draft?.publishedVersionNumber || publishedContent.publishedVersionNumber} 已经教师确认发布`);
      } catch (error) {
        setNotice(error.message || '教师确认发布失败');
      } finally {
        setPublishing(false);
      }
      return;
    }
    const classroom = storedLearningContent.composite?.classroomUrl ? storedLearningContent.composite : null;
    if (!classroom?.classroomUrl) {
      setActiveSection('openmaic');
      setNotice('请先生成真实学习课堂');
      return;
    }
    const missingKnowledgeContent = lesson.knowledgePoints.filter((knowledgePoint) => {
      const item = storedLearningContent.knowledgePoints.find((value) => value.knowledgeObjectiveId === knowledgePoint.id);
      return !item?.openMaic?.classroomUrl;
    });
    if (missingKnowledgeContent.length) {
      setActiveSection('openmaic');
      setNotice(`请先生成单点学习内容：${missingKnowledgeContent.map((item) => item.name).join('、')}`);
      return;
    }
    if (!base.preQuestions.length || !base.postQuestions.length) {
      setNotice('课前测验和知识点练习都需要有可用题目');
      return;
    }
    const qualityReport = base.qualityReport || {
      passed: true,
      issues: [],
      reviewMode: 'fast-deterministic',
      checkedAt: new Date().toISOString(),
    };
    setPublishing(true); setNotice('正在快速检查题量和结构并发布…');
    try {
      const contentPackage = buildPublishedContentPackage({ lesson, content: { ...base, learningContent: storedLearningContent } });
      const published = await publishLessonVersion(lesson.id, {
        schemaVersion: '2.0', contentPackage,
        qualityReport,
        publishedBy: 'current-teacher',
      });
      const publishedAt = published.publishedAt;
      const { publishedSnapshot: _previousSnapshot, ...snapshotSource } = base;
      const publishedSnapshot = { ...snapshotSource, learningContent: storedLearningContent, status: 'published', publishedAt };
      save({
        ...base, learningContent: storedLearningContent, status: 'published', publishedAt, publishedSnapshot,
        publishedVersionId: published.id, publishedVersionNumber: published.versionNumber,
        qualityReport: published.qualityReport,
      });
      await refreshPublishedVersions();
      setNotice(`V${published.versionNumber} 已发布，可前往“实时课堂”进入上课模式`);
    } catch (error) {
      const issues = error.payload?.issues;
      setLessonGeneration((current) => ({
        ...current,
        phase: 'failed',
        message: error.message || '发布失败',
        issues: Array.isArray(issues) ? issues : current.issues,
      }));
      setNotice(Array.isArray(issues) && issues.length
        ? { title: '当前版本还不能发布，请先处理：', items: issues.map((item) => item.message) }
        : error.message);
    } finally {
      setPublishing(false);
    }
  };

  const pollOpenMaic = async (
    jobId,
    teacherInstruction,
    scope = 'composite',
    runId = generationRunRef.current,
  ) => {
    let consecutiveFetchFailures = 0;
    while (true) {
      if (generationRunRef.current !== runId || generationAbortRef.current?.signal.aborted) {
        throw generationCancelledError();
      }
      let job;
      try {
        job = await getOpenMaicJob(jobId);
        if (generationRunRef.current !== runId || generationAbortRef.current?.signal.aborted) {
          throw generationCancelledError();
        }
        consecutiveFetchFailures = 0;
      } catch (error) {
        if (isGenerationCancelled(error)) throw error;
        consecutiveFetchFailures += 1;
        const reconnecting = {
          jobId, scope, status: 'reconnecting', progress: 0,
          message: '进度连接暂时中断，正在自动重连', teacherInstruction,
        };
        setOpenMaicJob(reconnecting);
        saveOpenMaicJobCheckpoint(scope, reconnecting);
        if (consecutiveFetchFailures >= 5) throw error;
        await new Promise((resolve) => window.setTimeout(resolve, 3000 * consecutiveFetchFailures));
        continue;
      }
      setOpenMaicJob({ ...job, jobId, scope });
      const moduleId = scope === 'composite' ? 'composite-classroom' : `knowledge-classroom:${scope}`;
      const scopeName = scope === 'composite'
        ? '复合 MAIC 课堂'
        : lesson.knowledgePoints.find((item) => item.id === scope)?.name || '单点 MAIC 课堂';
      const queuePosition = Number(job.queuePosition || job.queue?.position || 0);
      const queued = job.status === 'queued';
      setModuleStatus([moduleId], queued ? 'queued' : 'generating');
      setLessonGeneration((current) => ({
        ...current,
        message: queued
          ? `${scopeName}：排队中${queuePosition ? `（前面 ${Math.max(0, queuePosition - 1)} 个任务）` : ''} · 不影响其他题目继续生成`
          : `${scopeName}：${openMaicStepCopy[job.step] || job.message || '正在生成'} ${Math.round(job.progress || 0)}% · 已完成内容会持续保存`,
        moduleProgress: {
          ...(current.moduleProgress || {}),
          [moduleId]: {
            ...(current.moduleProgress?.[moduleId] || {}),
            status: queued ? 'queued' : 'generating',
            progress: Math.round(job.progress || 0),
            step: job.step,
            message: job.message,
            queuePosition: queuePosition || null,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      saveOpenMaicJobCheckpoint(scope, {
        ...job, jobId, scope, teacherInstruction,
      });
      if (job.partialResult?.classroomId) {
        saveLearningRuntime(scope, {
          jobId,
          status: 'partial',
          progress: job.progress,
          classroomId: job.partialResult.classroomId,
          classroomUrl: job.partialResult.url,
          scenesCount: job.partialResult.scenesCount,
          totalScenes: job.partialResult.totalScenes,
          teacherInstruction,
          generatedAt: new Date().toISOString(),
          partial: true,
        });
      }
      if (job.status === 'succeeded') {
        saveOpenMaicJobCheckpoint(scope, null);
        return {
          jobId,
          status: 'succeeded',
          progress: 100,
          classroomId: job.result.classroomId,
          classroomUrl: job.result.url,
          scenesCount: job.result.scenesCount,
          teacherInstruction,
          generatedAt: new Date().toISOString(),
        };
      } else if (job.status === 'canceled' || job.status === 'cancelled') {
        throw generationCancelledError();
      } else if (job.status === 'failed') {
        throw new Error(job.error || '课堂生成失败');
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, job.pollIntervalMs || 3000));
      }
    }
  };

  const savedOpenMaicJobs = {
    ...(base.openMaicJobs || {}),
    ...(base.openMaicJob?.jobId ? { [base.openMaicJob.scope || 'composite']: base.openMaicJob } : {}),
  };
  const savedOpenMaicJobKey = Object.values(savedOpenMaicJobs)
    .map((job) => job?.jobId || '').filter(Boolean).sort().join('|');

  useEffect(() => {
    const pendingJobs = Object.entries(savedOpenMaicJobs).filter(([, savedJob]) => (
      savedJob?.jobId && !resumedJobs.current.has(savedJob.jobId)
    ));
    if (!pendingJobs.length) return undefined;
    const recoveryRunId = generationRunRef.current + 1;
    generationRunRef.current = recoveryRunId;
    generationAbortRef.current?.abort();
    generationAbortRef.current = new AbortController();
    const restoringStatuses = Object.fromEntries(pendingJobs.map(([scope]) => [
      scope === 'composite' ? 'composite-classroom' : `knowledge-classroom:${scope}`,
      'generating',
    ]));
    setLessonGeneration((current) => ({
      ...current,
      phase: 'generating',
      message: `正在恢复 ${pendingJobs.length} 个 MAIC 子任务，已完成内容不会重做`,
      moduleStatuses: { ...current.moduleStatuses, ...restoringStatuses },
    }));
    const recoveries = pendingJobs.map(([scope, savedJob]) => {
      resumedJobs.current.add(savedJob.jobId);
      activeOpenMaicJobsRef.current.set(savedJob.jobId, scope);
      setOpenMaicJob(savedJob);
      const moduleId = scope === 'composite' ? 'composite-classroom' : `knowledge-classroom:${scope}`;
      return pollOpenMaic(savedJob.jobId, savedJob.teacherInstruction || '', scope, recoveryRunId)
        .then((nextRuntime) => {
          saveLearningRuntime(scope, nextRuntime, {
            version: Number(base.version || 0) + 1, lastInstruction: savedJob.teacherInstruction || '',
          });
          saveOpenMaicJobCheckpoint(scope, null);
          setModuleStatus([moduleId], 'ready');
          setOpenMaicJob(nextRuntime);
          setNotice('已找回后台生成任务，完成内容已保存到草稿');
        })
        .catch((error) => {
          saveOpenMaicJobCheckpoint(scope, null);
          setModuleStatus([moduleId], isGenerationCancelled(error) ? 'missing' : 'failed');
          setOpenMaicJob({
            ...savedJob,
            status: isGenerationCancelled(error) ? 'cancelled' : 'failed',
            message: error.message,
          });
          return Promise.reject(error);
        })
        .finally(() => {
          activeOpenMaicJobsRef.current.delete(savedJob.jobId);
        });
    });
    Promise.allSettled(recoveries).then(() => {
      // 清除已完成 checkpoint 会改变 savedOpenMaicJobKey 并重跑本 effect，
      // 但不应取消同一课时、同一批恢复任务结束后的自动质检。
      if (generationRunRef.current !== recoveryRunId) return;
      const latest = readTeacherContent()[lesson.id] || base;
      void validateAndAutomaticallyRepair({
        ...latest,
        learningContent: latest.learningContent || { composite: latest.openMaic || null, knowledgePoints: [] },
      }, [], recoveryRunId);
    });
    // pollOpenMaic 使用 jobId 恢复长任务，支持多个 MAIC 子任务并行恢复。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return undefined;
  }, [savedOpenMaicJobKey]);

  const createOpenMaicRuntime = async (
    scope = activeLearningScope,
    runId = generationRunRef.current,
    teacherInstruction = '',
  ) => {
    setOpenMaicJob({ status: 'queued', progress: 2, message: '正在提交课堂生成任务', scope });
    const response = await createOpenMaicClassroom({
      lesson: lessonPayload,
      knowledgePoints: scope === 'composite' ? lesson.knowledgePoints : lesson.knowledgePoints.filter((item) => item.id === scope),
      generationMode: 'deep',
      cacheOnly: false,
      teacherInstruction,
    });
    if (response.status === 'succeeded' && response.result?.classroomId) {
      saveOpenMaicJobCheckpoint(scope, null);
      return {
        status: 'succeeded', progress: 100,
        classroomId: response.result.classroomId,
        classroomUrl: response.result.url,
        scenesCount: response.result.scenesCount,
        teacherInstruction,
        generatedAt: new Date().toISOString(),
        cached: Boolean(response.cached),
      };
    }
    resumedJobs.current.add(response.jobId);
    activeOpenMaicJobsRef.current.set(response.jobId, scope);
    saveOpenMaicJobCheckpoint(scope, {
      jobId: response.jobId, status: response.status || 'queued',
      progress: response.progress || 2, teacherInstruction, scope,
    });
    try {
      return await pollOpenMaic(response.jobId, teacherInstruction, scope, runId);
    } catch (error) {
      saveOpenMaicJobCheckpoint(scope, null);
      throw error;
    } finally {
      activeOpenMaicJobsRef.current.delete(response.jobId);
    }
  };

  const generateOpenMaic = async (scope = activeLearningScope, teacherInstruction = '') => {
    const sourceSnapshot = contentVersionSnapshot();
    setNotice('');
    try {
      if (contentMutationLocked) throw new Error('整课后台任务正在处理，完成后才能重新生成学习内容');
      const nextRuntime = await createOpenMaicRuntime(scope, generationRunRef.current, teacherInstruction);
      assertContentVersion(sourceSnapshot);
      saveLearningRuntime(scope, nextRuntime, {
        openMaicJob: null, version: sourceSnapshot.version + 1, lastInstruction: nextRuntime.teacherInstruction,
      });
      setOpenMaicJob(nextRuntime);
      setNotice(nextRuntime.cached ? '已加载匹配的学习课堂，可直接使用' : '新的学习课堂已生成，可直接使用，也可以继续预览调整');
      return nextRuntime;
    } catch (error) {
      setOpenMaicJob({ status: 'failed', progress: 0, message: error.message });
      setNotice(noticeMessage('error', error.message || '学习课堂生成失败'));
      throw error;
    }
  };

  const generateQuestionSet = async (mode, teacherInstruction, requestedScope = mode) => {
    const sourceContent = readTeacherContent()[lesson.id] || base;
    const sourceSnapshot = contentVersionSnapshot();
    const generationScope = mode === 'pre' ? 'pre' : requestedScope === 'review' ? 'review' : 'practice';
    setQuestionGeneration({ mode, scope: generationScope, status: { message: '正在提交生成任务' }, error: '' });
    setNotice('');
    try {
      if (contentMutationLocked) throw new Error('整课后台任务正在处理，完成后才能重新生成题目');
      const payload = mode === 'pre' ? {
        purpose: 'pre',
        lesson: lessonPayload,
        knowledgePoints: lesson.knowledgePoints,
        count: buildPreAssessmentBlueprint(lesson.knowledgePoints).length,
        diagnosticBlueprintSlots: buildPreAssessmentBlueprint(lesson.knowledgePoints),
        teacherInstruction,
      } : {
        purpose: 'post',
        lesson: lessonPayload,
        knowledgePoints: lesson.knowledgePoints,
        countPerKnowledgePoint: PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
        reviewCount: COMPOSITE_REVIEW_POOL_SIZE,
        teacherInstruction,
      };
      const updateProgress = (status) => setQuestionGeneration({ mode, scope: generationScope, status, error: '' });
      const existingKnowledgeQuestions = sourceContent.postQuestions.filter((item) => item.phase !== 'review');
      const existingReviewQuestions = sourceContent.postQuestions.filter((item) => item.phase === 'review');
      const response = mode === 'pre'
        ? await generateQuestionsWithRetry(payload, updateProgress, (result) => ensureUniqueQuestionStems([
            ...result.questions,
            ...sourceContent.postQuestions,
          ]))
        : await generatePracticeQuestionsByKnowledgePoint({
            lesson: lessonPayload,
            knowledgePoints: lesson.knowledgePoints,
            teacherInstruction,
            generationScope: generationScope === 'review' ? 'review' : 'knowledge',
            existingQuestions: [
              ...sourceContent.preQuestions,
              ...(generationScope === 'review' ? existingKnowledgeQuestions : existingReviewQuestions),
            ],
          }, updateProgress);
      const nextQuestions = mode === 'pre'
        ? response.questions
        : generationScope === 'review'
          ? [...existingKnowledgeQuestions, ...response.questions.map((item) => ({ ...item, phase: 'review' }))]
          : [...response.questions.filter((item) => item.phase !== 'review'), ...existingReviewQuestions];
      assertContentVersion(sourceSnapshot);
      saveDraft({
        [mode === 'pre' ? 'preQuestions' : 'postQuestions']: nextQuestions,
        version: sourceSnapshot.version + 1,
      });
      setQuestionGeneration({ mode: '', scope: '', status: null, error: '' });
      const scopeLabel = generationScope === 'pre' ? '课前测验题' : generationScope === 'review' ? '综合练习题' : '单点题池';
      const message = `已生成${scopeLabel}，可直接查看和调整`;
      setNotice(message);
      return { ok: true, message, count: response.questions.length };
    } catch (error) {
      setQuestionGeneration({ mode: '', scope: '', status: null, error: error.message });
      setNotice(noticeMessage('error', error.message || '题目生成失败'));
      return { ok: false, message: error.message };
    }
  };

  const friendlyTaskError = (error, stage) => {
    const raw = String(error?.message || '');
    const unavailable = raw === 'Failed to fetch'
      || /fetch|network|网络|课堂服务请求失败（5\d\d）/i.test(raw)
      || [500, 502, 503, 504].includes(Number(error?.status));
    if (unavailable) {
      if (stage === 'validation') return '内容已生成，但暂时无法完成校验。已生成内容已保存，请稍后重新校验。';
      return '生成服务暂时无法连接，已完成内容已经保存，可以稍后继续补全。';
    }
    return raw || (stage === 'validation' ? '暂时无法完成内容校验' : '内容生成暂未完成');
  };

  const setModuleStatus = (moduleIds, status) => {
    setLessonGeneration((current) => ({
      ...current,
      moduleStatuses: {
        ...current.moduleStatuses,
        ...Object.fromEntries(moduleIds.map((moduleId) => [moduleId, status])),
      },
    }));
  };

  const mergeLearningRuntime = (content, scope, nextRuntime) => {
    const currentLearningContent = content.learningContent || {
      composite: content.openMaic || null,
      knowledgePoints: [],
    };
    return {
      ...content,
      learningContent: scope === 'composite'
        ? { ...currentLearningContent, composite: nextRuntime }
        : {
            ...currentLearningContent,
            knowledgePoints: [
              ...(currentLearningContent.knowledgePoints || [])
                .filter((item) => item.knowledgeObjectiveId !== scope),
              { knowledgeObjectiveId: scope, openMaic: nextRuntime },
            ],
          },
      openMaicJob: null,
      lastInstruction: nextRuntime.teacherInstruction || '',
    };
  };

  const generateQuestionAction = async (action, content, runId) => {
    const updateProgress = (status) => {
      if (generationRunRef.current !== runId) return;
      setQuestionGeneration({ mode: 'whole-lesson', scope: 'whole', status, error: '' });
      const elapsed = Number(status?.elapsedSeconds || 0);
      const elapsedCopy = elapsed >= 5 ? ` · 已等待 ${elapsed} 秒，可随时取消并保留已有内容` : '';
      setLessonGeneration((current) => ({
        ...current,
        message: `${status?.message || current.message}${elapsedCopy}`,
      }));
    };
    const applyTargetedReplacements = (existing, candidates) => {
      const targetIds = action.targetQuestionIds || [];
      if (!targetIds.length) return candidates;
      const targets = new Set(targetIds);
      let candidateIndex = 0;
      return existing.map((question) => {
        if (!targets.has(question.id)) return question;
        const replacement = candidates[candidateIndex];
        candidateIndex += 1;
        return replacement ? {
          ...replacement,
          id: question.id,
          phase: question.phase,
          purpose: question.purpose,
        } : question;
      });
    };
    const retainedQuestions = (questions) => {
      const targets = new Set(action.targetQuestionIds || []);
      if (!targets.size) return [];
      return questions.filter((question) => !targets.has(question.id));
    };
    const repairInstruction = (questions) => {
      if (!action.qualityIssues?.length) return '';
      const issueCopy = action.qualityIssues.map((issue) => issue.message).filter(Boolean).join('；');
      const forbiddenStems = questions
        .map((question) => String(question.stem || '').trim())
        .filter(Boolean)
        .slice(0, 60);
      return `这是发布前自动返修。必须解决：${issueCopy}。不要复用下列已有题干或只替换数字改写：${JSON.stringify(forbiddenStems)}`;
    };
    if (action.mode === 'pre') {
      const existingPre = content.preQuestions || [];
      const targetIds = new Set(action.targetQuestionIds || []);
      const replacementSlots = existingPre
        .filter((question) => targetIds.has(question.id))
        .map(diagnosticSlotForQuestion)
        .filter(Boolean);
      const diagnosticBlueprintSlots = action.targetBlueprintSlots?.length
        ? action.targetBlueprintSlots
        : replacementSlots.length ? replacementSlots : buildPreAssessmentBlueprint(lesson.knowledgePoints);
      const isSlotAppend = !targetIds.size && action.targetBlueprintSlots?.length > 0;
      const targetSlotIds = new Set(diagnosticBlueprintSlots.map((item) => item.id));
      const protectedPre = isSlotAppend ? existingPre : retainedQuestions(existingPre);
      const protectedQuestions = [...protectedPre, ...(content.postQuestions || [])];
      const response = await generateQuestionsWithRetry({
        purpose: 'pre', lesson: lessonPayload, knowledgePoints: lesson.knowledgePoints,
        count: diagnosticBlueprintSlots.length,
        diagnosticBlueprintSlots,
        targetQuestionIds: action.targetQuestionIds || [],
        generationTaskType: 'repair',
        teacherInstruction: repairInstruction(protectedQuestions),
      }, updateProgress, (result) => ensureUniqueQuestionStems([
        ...result.questions, ...protectedQuestions,
      ]), generationAbortRef.current?.signal);
      return {
        ...content,
        preQuestions: isSlotAppend
          ? [
              ...existingPre.filter((question) => {
                const slot = diagnosticSlotForQuestion(question);
                return !slot || !targetSlotIds.has(slot.id);
              }),
              ...response.questions,
            ]
          : applyTargetedReplacements(existingPre, response.questions),
      };
    }

    if (action.mode === 'knowledge') {
      const knowledgePoint = lesson.knowledgePoints.find((item) => item.id === action.scope);
      const preserved = (content.postQuestions || []).filter((question) => (
        question.phase === 'review' || !((question.knowledgePointIds || question.knowledgeObjectiveIds || [])[0] === action.scope)
      ));
      const existingScope = (content.postQuestions || []).filter((question) => (
        question.phase !== 'review'
        && (question.knowledgePointIds || question.knowledgeObjectiveIds || [])[0] === action.scope
      ));
      const protectedQuestions = [...preserved, ...retainedQuestions(existingScope)];
      const response = await generateQuestionsWithRetry({
        purpose: 'post', lesson: lessonPayload, knowledgePoints: [knowledgePoint],
        countPerKnowledgePoint: action.targetQuestionIds?.length || PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
        reviewCount: 0, targetQuestionIds: action.targetQuestionIds || [],
        teacherInstruction: repairInstruction(protectedQuestions),
      }, updateProgress, (result) => ensureUniqueQuestionStems([
        ...protectedQuestions,
        ...result.questions,
      ]), generationAbortRef.current?.signal);
      if (generationRunRef.current !== runId) throw generationCancelledError();
      const review = preserved.filter((question) => question.phase === 'review');
      const otherKnowledge = preserved.filter((question) => question.phase !== 'review');
      const nextScope = applyTargetedReplacements(existingScope, response.questions);
      return { ...content, postQuestions: [...otherKnowledge, ...nextScope, ...review] };
    }

    const knowledgeQuestions = (content.postQuestions || []).filter((question) => question.phase !== 'review');
    const existingReview = (content.postQuestions || []).filter((question) => question.phase === 'review');
    const protectedQuestions = [...knowledgeQuestions, ...retainedQuestions(existingReview)];
    const response = await generateQuestionsWithRetry({
      purpose: 'post', lesson: lessonPayload, knowledgePoints: lesson.knowledgePoints,
      countPerKnowledgePoint: 0,
      reviewCount: action.targetQuestionIds?.length || COMPOSITE_REVIEW_POOL_SIZE,
      targetQuestionIds: action.targetQuestionIds || [],
      teacherInstruction: repairInstruction(protectedQuestions),
    }, updateProgress, (result) => ensureUniqueQuestionStems([
      ...protectedQuestions,
      ...result.questions,
    ]), generationAbortRef.current?.signal);
    const candidates = response.questions.map((question) => ({ ...question, phase: 'review' }));
    return {
      ...content,
      postQuestions: [...knowledgeQuestions, ...applyTargetedReplacements(existingReview, candidates)],
    };
  };

  const mergeGeneratedActionContent = (current, action, generated) => {
    if (action.type === 'openmaic') {
      const generatedLearning = generated.learningContent || {};
      const runtime = action.scope === 'composite'
        ? generatedLearning.composite
        : (generatedLearning.knowledgePoints || [])
          .find((item) => item.knowledgeObjectiveId === action.scope)?.openMaic;
      return runtime ? mergeLearningRuntime(current, action.scope, runtime) : current;
    }
    if (action.mode === 'pre') return { ...current, preQuestions: generated.preQuestions || [] };
    if (action.mode === 'knowledge') {
      const generatedQuestions = (generated.postQuestions || []).filter((question) => (
        question.phase !== 'review'
        && (question.knowledgePointIds || question.knowledgeObjectiveIds || [])[0] === action.scope
      ));
      const currentQuestions = (current.postQuestions || []).filter((question) => (
        question.phase === 'review'
        || (question.knowledgePointIds || question.knowledgeObjectiveIds || [])[0] !== action.scope
      ));
      const review = currentQuestions.filter((question) => question.phase === 'review');
      return {
        ...current,
        postQuestions: [
          ...currentQuestions.filter((question) => question.phase !== 'review'),
          ...generatedQuestions,
          ...review,
        ],
      };
    }
    const currentKnowledgeQuestions = (current.postQuestions || []).filter((question) => question.phase !== 'review');
    const generatedReview = (generated.postQuestions || []).filter((question) => question.phase === 'review');
    return { ...current, postQuestions: [...currentKnowledgeQuestions, ...generatedReview] };
  };

  const runGenerationActions = async (actions, initialContent, phase, runId) => {
    let workingContent = initialContent;
    const failures = [];
    let completedCount = 0;
    let commitQueue = Promise.resolve();
    actions.forEach((action) => setModuleStatus(action.moduleIds, 'queued'));
    const runLane = async (laneActions, concurrency) => {
      let cursor = 0;
      const runner = async () => {
        while (cursor < laneActions.length && generationRunRef.current === runId) {
          const index = cursor;
          cursor += 1;
          const action = laneActions[index];
          const startedAt = Date.now();
        setModuleStatus(action.moduleIds, 'generating');
        setLessonGeneration((current) => ({
          ...current,
          phase,
          message: `${phase === 'repairing' ? '正在并行修改问题内容' : 'MAIC 和题目子任务正在并行生成'} · 已完成 ${completedCount}/${actions.length}`,
          moduleProgress: {
            ...(current.moduleProgress || {}),
            ...Object.fromEntries(action.moduleIds.map((moduleId) => [moduleId, {
              ...(current.moduleProgress?.[moduleId] || {}),
              status: 'generating',
              startedAt: new Date(startedAt).toISOString(),
              updatedAt: new Date(startedAt).toISOString(),
            }])),
          },
        }));
        try {
          const snapshot = workingContent;
          let generated;
          if (action.type === 'questions') {
            generated = await generateQuestionAction(action, snapshot, runId);
          } else {
            const runtime = await createOpenMaicRuntime(action.scope, runId);
            generated = mergeLearningRuntime(snapshot, action.scope, runtime);
            setOpenMaicJob(runtime);
          }
          commitQueue = commitQueue.then(() => {
            if (generationRunRef.current !== runId) return;
            workingContent = mergeGeneratedActionContent(workingContent, action, generated);
            workingContent = persistDraftContent(workingContent, {
              version: Number(workingContent.version || 0) + 1,
            });
            completedCount += 1;
            setModuleStatus(action.moduleIds, 'ready');
            setLessonGeneration((current) => ({
              ...current,
              message: `已完成 ${completedCount}/${actions.length} 个子任务，结果已保存到草稿`,
              moduleProgress: {
                ...(current.moduleProgress || {}),
                ...Object.fromEntries(action.moduleIds.map((moduleId) => [moduleId, {
                  ...(current.moduleProgress?.[moduleId] || {}),
                  status: 'ready',
                  progress: 100,
                  durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
                  updatedAt: new Date().toISOString(),
                }])),
              },
            }));
          });
          await commitQueue;
        } catch (error) {
          if (isGenerationCancelled(error) || generationRunRef.current !== runId) {
            setModuleStatus(action.moduleIds, 'missing');
            continue;
          }
          setModuleStatus(action.moduleIds, 'failed');
          setLessonGeneration((current) => ({
            ...current,
            moduleProgress: {
              ...(current.moduleProgress || {}),
              ...Object.fromEntries(action.moduleIds.map((moduleId) => [moduleId, {
                ...(current.moduleProgress?.[moduleId] || {}),
                status: 'failed',
                durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
                updatedAt: new Date().toISOString(),
              }])),
            },
          }));
          failures.push({
            code: 'GENERATION_FAILED',
            message: friendlyTaskError(error, 'generation'),
            moduleIds: action.moduleIds,
          });
        }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, laneActions.length) }, () => runner()));
    };
    const lanes = buildParallelLessonGenerationLanes(actions);
    // 所有模块级任务同时起跑。以 3 个知识点为例：课前测 1 +
    // 单点题池 3 + 综合练习 1 + 单点 MAIC 3 + 综合 MAIC 1 = 9 路并发。
    // 两条通道只用于隔离进度与失败，不限制彼此的并发数。
    await Promise.all([
      runLane(lanes.questions, Math.max(1, lanes.questions.length)),
      runLane(lanes.openMaic, Math.max(1, lanes.openMaic.length)),
    ]);
    await commitQueue;
    setQuestionGeneration({ mode: '', scope: '', status: null, error: '' });
    return { content: workingContent, failures };
  };

  const validateContent = async (content) => {
    const contentPackage = buildPublishedContentPackage({ lesson, content });
    return validateLessonVersion(lesson.id, {
      schemaVersion: '2.0',
      contentPackage,
      qualityReport: { reviewMode: 'fast-deterministic', reviewedBy: 'current-teacher' },
    }, { signal: generationAbortRef.current?.signal });
  };

  const validateAndAutomaticallyRepair = async (initialContent, initialFailures = [], runId) => {
    let workingContent = initialContent;
    let failures = initialFailures;
    for (let completedRepairRounds = 0; completedRepairRounds <= MAX_AUTOMATIC_REPAIR_ROUNDS; completedRepairRounds += 1) {
      if (generationRunRef.current !== runId) return workingContent;
      setLessonGeneration((current) => ({
        ...current, phase: 'validating', issues: [], repairRound: completedRepairRounds,
        message: '内容已生成，正在检查完整性',
      }));
      let quality;
      try {
        quality = await validateContent(workingContent);
      } catch (error) {
        if (isGenerationCancelled(error) || generationRunRef.current !== runId) {
          return workingContent;
        }
        const message = friendlyTaskError(error, 'validation');
        setLessonGeneration((current) => ({ ...current, phase: 'failed', message, issues: failures }));
        setNotice(noticeMessage('error', message));
        return workingContent;
      }
      if (generationRunRef.current !== runId) return workingContent;
      if (quality.passed) {
        const checkedAt = new Date().toISOString();
        workingContent = {
          ...workingContent,
          qualityReport: {
            passed: true,
            issues: [],
            semanticReview: null,
            reviewMode: 'fast-deterministic',
            checkedAt,
          },
          inspectionStatus: {
            passed: true,
            message: '检查完成，没有发现阻碍发布的问题',
            issues: [],
            inspectedAt: checkedAt,
          },
        };
        persistDraftContent(workingContent, {
          qualityReport: workingContent.qualityReport,
          inspectionStatus: workingContent.inspectionStatus,
        });
        const durationSeconds = generationStartedAtRef.current
          ? Math.max(1, Math.round((Date.now() - generationStartedAtRef.current) / 1000))
          : 0;
        setLessonGeneration((current) => ({
          ...current, phase: 'ready',
          message: durationSeconds
            ? `内容完整，等待教师预览确认 · 本次共用时 ${durationSeconds} 秒`
            : '内容完整，等待教师预览确认',
          issues: [], durationSeconds, completedAt: new Date().toISOString(),
        }));
        setNotice('整课内容已通过快速结构检查，请预览后由教师确认发布');
        return workingContent;
      }

      const repairPlan = buildQualityRepairPlan({
        issues: quality.issues,
        lesson,
        content: workingContent,
        completedRepairRounds,
      });
      if (!repairPlan.actions.length) {
        const issues = [...quality.issues, ...failures];
        setLessonGeneration((current) => ({
          ...current, phase: 'failed',
          message: `已保留完成内容，${issues.length} 项仍需处理`, issues,
        }));
        setNotice({ title: '自动补全后仍有以下问题：', items: issues.map((issue) => issue.message) });
        return workingContent;
      }

      setLessonGeneration((current) => ({
        ...current, phase: 'repairing', repairRound: completedRepairRounds + 1,
        message: `发现 ${quality.issues.length} 项缺口，正在自动补全（第 ${completedRepairRounds + 1}/${MAX_AUTOMATIC_REPAIR_ROUNDS} 轮）`,
      }));
      const repaired = await runGenerationActions(repairPlan.actions, workingContent, 'repairing', runId);
      workingContent = repaired.content;
      failures = repaired.failures;
    }
    return workingContent;
  };

  const generateWholeLesson = async ({
    operation = 'generate_whole_lesson',
    teacherInstruction = '',
    sourceIssues = [],
  } = {}) => {
    if (['generating', 'validating', 'repairing'].includes(lessonGeneration.phase)) {
      return { background: true, alreadyRunning: true };
    }
    setNotice('');
    generationStartedAtRef.current = Date.now();
    const sourceContent = { ...base, learningContent: storedLearningContent };
    setLessonGeneration({
      operation,
      phase: 'generating',
      message: '正在把整课任务写入数据库，关闭页面后仍会继续',
      moduleStatuses: {}, moduleProgress: {}, issues: [], repairRound: 0,
      startedAt: new Date(generationStartedAtRef.current).toISOString(), durationSeconds: 0,
    });
    try {
      const run = await createLessonGenerationRun(lesson, sourceContent, {
        idempotencyKey: `teacher-content-${operation}-${lesson.id}-${generationStartedAtRef.current}`,
        operation,
        teacherInstruction,
        sourceIssues,
      });
      setBackendGenerationRun(run);
      setBackendPollRevision((current) => current + 1);
      return {
        ...run,
        background: true,
        toolOperation: operation,
        requestedInstruction: teacherInstruction,
        sourceIssueCount: sourceIssues.length,
      };
    } catch (error) {
      setLessonGeneration((current) => ({ ...current, phase: 'failed', message: error.message }));
      setNotice(noticeMessage('error', error.message || '整课任务入队失败'));
      throw error;
    }
  };

  const validateAndRepairCurrentLesson = async (operation, teacherInstruction = '') => {
    return generateWholeLesson({
      operation,
      teacherInstruction,
      sourceIssues: lessonGeneration.issues || [],
    });
  };

  const stopWholeLessonGeneration = async () => {
    const runId = backendGenerationRun?.runId || base.generationStatus?.runId;
    if (runId) {
      try {
        const run = await cancelGenerationRun(runId);
        setBackendGenerationRun(run);
        setLessonGeneration((current) => ({
          ...current,
          phase: 'stopped',
          message: '已取消未完成任务，完成内容仍保存在数据库草稿中',
        }));
        setNotice('已取消未完成任务，完成内容仍保留；其他课时不受影响');
      } catch (error) {
        setNotice(noticeMessage('error', error.message || '取消整课生成失败'));
        throw error;
      }
      return;
    }
    generationRunRef.current += 1;
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    const latestLesson = readTeacherContent()[lesson.id] || base;
    const persistedJobs = {
      ...(latestLesson.openMaicJobs || {}),
      ...(latestLesson.openMaicJob?.jobId
        ? { [latestLesson.openMaicJob.scope || 'composite']: latestLesson.openMaicJob }
        : {}),
    };
    const activeJobMap = new Map(activeOpenMaicJobsRef.current);
    Object.entries(persistedJobs).forEach(([scope, job]) => {
      if (job?.jobId) activeJobMap.set(job.jobId, scope);
    });
    const activeJobs = [...activeJobMap.entries()];
    activeOpenMaicJobsRef.current.clear();
    setQuestionGeneration({ mode: '', scope: '', status: null, error: '' });
    setOpenMaicJob((current) => (current ? {
      ...current,
      status: 'cancelled',
      message: '已取消生成，完成内容已保留',
    } : current));
    setLessonGeneration((current) => ({
      ...current,
      phase: 'stopped',
      message: '正在取消未完成任务，已完成内容已经保存在草稿中',
      moduleStatuses: Object.fromEntries(Object.entries(current.moduleStatuses)
        .map(([moduleId, status]) => [moduleId, status === 'ready' ? 'ready' : 'missing'])),
    }));
    setNotice('正在取消未完成任务，完成内容已保存');
    const cancelled = await Promise.allSettled(activeJobs.map(([jobId]) => cancelOpenMaicJob(jobId)));
    activeJobs.forEach(([, scope]) => saveOpenMaicJobCheckpoint(scope, null));
    const failedCount = cancelled.filter((result) => result.status === 'rejected').length;
    const message = failedCount
      ? `已停止页面生成；${failedCount} 个后台任务暂时无法确认取消，刷新后会自动核对状态`
      : activeJobs.length
        ? `已取消 ${activeJobs.length} 个未完成任务，完成内容已保存，可稍后继续补全`
        : '已取消当前处理，完成内容已保存，可稍后继续校验或补全';
    setLessonGeneration((current) => ({ ...current, phase: 'stopped', message }));
    setNotice(message);
  };

  const inspectCurrentLesson = async () => {
    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    generationAbortRef.current?.abort();
    generationAbortRef.current = new AbortController();
    const latest = readTeacherContent()[lesson.id] || base;
    setLessonGeneration((current) => ({
      ...current,
      operation: 'fast_publish',
      phase: 'validating',
      message: '正在快速检查题量、JSON 结构和重复题',
      issues: [],
    }));
    const result = await validateContent({
      ...latest,
      learningContent: latest.learningContent || storedLearningContent,
    });
    if (generationRunRef.current !== runId) throw generationCancelledError();
    const inspectedAt = new Date().toISOString();
    const reviewQuestions = (latest.postQuestions || []).filter((question) => question.phase === 'review');
    const knowledgeQuestions = (latest.postQuestions || []).filter((question) => question.phase !== 'review');
    const questionLabels = new Map([
      ...(latest.preQuestions || []).map((question, index) => [question.id, `课前测验第 ${index + 1} 题`]),
      ...knowledgeQuestions.map((question, index) => [question.id, `单点题池第 ${index + 1} 题`]),
      ...reviewQuestions.map((question, index) => [question.id, `综合练习第 ${index + 1} 题`]),
    ]);
    const visibleIssues = (result.issues || []).map((issue) => {
      const label = questionLabels.get(issue.questionId);
      if (!label || !issue.message) return issue;
      return {
        ...issue,
        message: issue.message.replace(`题目 ${issue.questionId}：`, `${label}：`),
      };
    });
    const visibleResult = { ...result, issues: visibleIssues };
    const qualityReport = {
      passed: result.passed,
      issues: visibleIssues,
      semanticReview: null,
      reviewMode: 'fast-deterministic',
      checkedAt: inspectedAt,
    };
    const persistInspectionStatus = (inspectionStatus) => {
      setAllContent((current) => {
        const next = {
          ...current,
          [lesson.id]: {
            ...(current[lesson.id] || latest),
            inspectionStatus,
            qualityReport,
          },
        };
        writeTeacherContent(next);
        return next;
      });
    };
    if (result.passed) {
      persistInspectionStatus({
        passed: true,
        message: '快速检查通过，可以发布',
        issues: [],
        inspectedAt,
      });
      setLessonGeneration((current) => ({
        ...current,
        phase: latest.status === 'published' ? 'published' : 'dirty',
        message: '快速检查通过，可以发布',
        issues: [],
        inspectedAt,
      }));
      setNotice('题量和结构检查通过，可以发布');
      return visibleResult;
    }
    persistInspectionStatus({
      passed: false,
      message: `检查发现 ${visibleIssues.length} 项需要处理`,
      issues: visibleIssues,
      inspectedAt,
    });
    setLessonGeneration((current) => ({
      ...current,
      phase: 'failed',
      message: `检查发现 ${visibleIssues.length} 项需要处理`,
      issues: visibleIssues,
      inspectedAt,
    }));
    setNotice({ title: '快速检查发现以下问题：', items: visibleIssues.map((issue) => issue.message) });
    return visibleResult;
  };

  const removeQuestionTargets = async (questionIds) => {
    const targets = new Set(questionIds || []);
    const latest = readTeacherContent()[lesson.id] || base;
    const removedCount = [...(latest.preQuestions || []), ...(latest.postQuestions || [])]
      .filter((question) => targets.has(question.id)).length;
    if (!removedCount) throw new Error('没有找到要删除的题目，内容可能已经发生变化');
    saveDraft({
      preQuestions: (latest.preQuestions || []).filter((question) => !targets.has(question.id)),
      postQuestions: (latest.postQuestions || []).filter((question) => !targets.has(question.id)),
      version: Number(latest.version || 0) + 1,
    });
    setNotice(`已删除 ${removedCount} 道题并保存到草稿`);
    return { removedCount };
  };

  const reviseQuestionTargets = async (questionIds, instruction) => {
    const targets = new Set(questionIds || []);
    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    generationAbortRef.current?.abort();
    generationAbortRef.current = new AbortController();
    let workingContent = readTeacherContent()[lesson.id] || base;
    const sourceSnapshot = contentVersionSnapshot();
    const preIds = (workingContent.preQuestions || []).filter((question) => targets.has(question.id)).map((question) => question.id);
    const reviewIds = (workingContent.postQuestions || []).filter((question) => question.phase === 'review' && targets.has(question.id)).map((question) => question.id);
    const knowledgeGroups = new Map();
    (workingContent.postQuestions || []).filter((question) => question.phase !== 'review' && targets.has(question.id)).forEach((question) => {
      const knowledgePointId = (question.knowledgePointIds || question.knowledgeObjectiveIds || [])[0];
      if (!knowledgeGroups.has(knowledgePointId)) knowledgeGroups.set(knowledgePointId, []);
      knowledgeGroups.get(knowledgePointId).push(question.id);
    });
    const actions = [
      ...(preIds.length ? [{ mode: 'pre', moduleIds: ['pre-assessment'], targetQuestionIds: preIds }] : []),
      ...[...knowledgeGroups.entries()].map(([scope, ids]) => ({
        mode: 'knowledge', scope, moduleIds: [`knowledge-questions:${scope}`], targetQuestionIds: ids,
      })),
      ...(reviewIds.length ? [{ mode: 'review', moduleIds: ['composite-review'], targetQuestionIds: reviewIds }] : []),
    ];
    if (!actions.length) throw new Error('没有找到要修改的题目，内容可能已经发生变化');
    setLessonGeneration((current) => ({
      ...current,
      phase: 'repairing',
      message: `正在按要求改写 ${questionIds.length} 道题`,
      issues: [],
    }));
    try {
      for (const action of actions) {
        workingContent = await generateQuestionAction({
          ...action,
          qualityIssues: [{ message: instruction || '按教师要求改写题目，并与现有题目保持明显差异' }],
        }, workingContent, runId);
      }
      assertContentVersion(sourceSnapshot);
      persistDraftContent(workingContent, {
        version: sourceSnapshot.version + 1,
        lastInstruction: instruction,
      });
      setQuestionGeneration({ mode: '', scope: '', status: null, error: '' });
      setLessonGeneration((current) => ({
        ...current,
        phase: 'dirty',
        message: `已改写 ${questionIds.length} 道题，等待教师检查`,
        issues: [],
      }));
      setNotice(`已按要求改写 ${questionIds.length} 道题并保存到草稿`);
      return { revisedCount: questionIds.length };
    } catch (error) {
      setQuestionGeneration({ mode: '', scope: '', status: null, error: '' });
      setLessonGeneration((current) => ({
        ...current,
        phase: 'failed',
        message: error?.message || '题目改写没有完成，请基于最新内容重试',
      }));
      throw error;
    }
  };

  const knowledgeQuestions = base.postQuestions.filter((item) => item.phase !== 'review');
  const reviewQuestions = base.postQuestions.filter((item) => item.phase === 'review');
  const updatePostQuestionGroup = (phase, questions) => saveDraft({
    postQuestions: phase === 'review'
      ? [...knowledgeQuestions, ...questions.map((item) => ({ ...item, phase: 'review' }))]
      : [...questions.filter((item) => item.phase !== 'review'), ...reviewQuestions],
    version: base.version + 1,
  });
  const activeScopeName = activeLearningScope === 'composite'
    ? '复合学习课堂'
    : lesson.knowledgePoints.find((item) => item.id === activeLearningScope)?.name || '单点学习课堂';
  const lessonGenerationModules = buildLessonGenerationModules({
    lesson,
    content: { ...base, learningContent: storedLearningContent },
  });
  const lessonGenerationRunning = ['generating', 'validating', 'repairing'].includes(lessonGeneration.phase);
  const lessonGenerationComplete = lessonGenerationModules.every((module) => (
    module.complete || lessonGeneration.moduleStatuses?.[module.id] === 'ready'
  ));
  const teacherAgentQuestions = [
    ...base.preQuestions.map((question, index) => ({
      id: question.id, section: 'pre', number: index + 1, stem: question.stem,
      type: question.type, difficulty: question.difficulty,
      knowledgePointIds: question.knowledgePointIds || question.knowledgeObjectiveIds || [],
    })),
    ...knowledgeQuestions.map((question, index) => ({
      id: question.id, section: 'practice', number: index + 1, stem: question.stem,
      type: question.type, difficulty: question.difficulty,
      knowledgePointIds: question.knowledgePointIds || question.knowledgeObjectiveIds || [],
    })),
    ...reviewQuestions.map((question, index) => ({
      id: question.id, section: 'review', number: index + 1, stem: question.stem,
      type: question.type, difficulty: question.difficulty,
      knowledgePointIds: question.knowledgePointIds || question.knowledgeObjectiveIds || [],
    })),
  ];
  const planTeacherAgentInstruction = (message, history, recentToolResult = null) => planTeacherContentInstruction({
    message,
    history,
    context: {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        chapterTitle: lessonPayload.chapterTitle,
        knowledgePoints: lesson.knowledgePoints,
      },
      activeScope: teacherAgent.scope,
      task: {
        phase: lessonGeneration.phase,
        message: lessonGeneration.message,
        issues: lessonGeneration.issues || [],
        running: lessonGenerationRunning,
      },
      modules: lessonGenerationModules.map((module) => ({
        id: module.id,
        kind: module.kind,
        label: module.label,
        complete: module.complete || lessonGeneration.moduleStatuses?.[module.id] === 'ready',
        currentCount: module.currentCount,
        requiredCount: module.requiredCount,
      })),
      questions: teacherAgentQuestions,
      publication: { status: base.status, version: base.version, updatedAt: base.updatedAt },
      recentToolResult,
    },
  });

  const executeTeacherAgentStep = async (step) => {
    if (publishing && step.kind !== 'inspect_lesson') throw new Error('当前正在发布，请等待发布完成后再修改内容');
    if (contentMutationLocked && !['inspect_lesson', 'cancel_generation'].includes(step.kind)) {
      throw new Error('整课后台任务正在处理；当前只支持查看状态、检查或停止任务，完成后再修改内容');
    }
    if (step.kind === 'inspect_lesson') return inspectCurrentLesson();
    if (step.kind === 'generate_whole_lesson') {
      return generateWholeLesson({ operation: step.kind, teacherInstruction: step.instruction });
    }
    if (['complete_missing_content', 'repair_quality_issues'].includes(step.kind)) {
      return validateAndRepairCurrentLesson(step.kind, step.instruction);
    }
    if (step.kind === 'generate_question_section') {
      const mode = step.scope === 'pre' ? 'pre' : 'practice';
      const result = await generateQuestionSet(mode, step.instruction, step.scope);
      if (result?.ok === false) throw new Error(result.message || '题目生成没有完成');
      return result;
    }
    if (step.kind === 'revise_questions') return reviseQuestionTargets(step.questionIds, step.instruction);
    if (step.kind === 'remove_questions') return removeQuestionTargets(step.questionIds);
    if (['generate_learning_content', 'revise_learning_content'].includes(step.kind)) {
      return generateOpenMaic(step.scope, step.instruction);
    }
    if (step.kind === 'cancel_generation') return stopWholeLessonGeneration();
    throw new Error('这项操作暂未开放，请换一种方式描述');
  };
  const validateTeacherAgentPlan = async (plan) => {
    if (plan.baseLessonId && plan.baseLessonId !== lesson.id) {
      throw new Error('这份计划来自另一个课时，已停止执行');
    }
    const latest = readTeacherContent()[lesson.id] || base;
    if (plan.baseVersion !== null && plan.baseVersion !== undefined
      && Number(latest.version || 0) !== Number(plan.baseVersion)) {
      throw new Error('课时内容在计划生成后已发生变化，请基于最新内容重新发送要求');
    }
    if (plan.baseUpdatedAt && latest.updatedAt && latest.updatedAt !== plan.baseUpdatedAt) {
      throw new Error('这份计划基于旧版本内容，已停止执行以避免覆盖教师的新修改');
    }
  };
  const runInspection = async () => {
    try {
      return await inspectCurrentLesson();
    } catch (error) {
      if (isGenerationCancelled(error)) return null;
      const message = error?.message || '整课检查失败，请稍后重试';
      setLessonGeneration((current) => ({
        ...current,
        phase: 'failed',
        message,
      }));
      setNotice(noticeMessage('error', message));
      return null;
    }
  };
  const runAiQualityRepair = async () => {
    if (publishing || lessonGenerationRunning || base.status === 'published') return;
    setNotice('AI 将按前测、各单知识点题池和综合训练分别轻量检查，发现明确问题后只修改对应题目');
    try {
      await generateWholeLesson({
        operation: 'ai_quality_repair',
        teacherInstruction: '按模块轻量检查题目语义是否完整、答案与解析是否明显不一致、题型结构是否缺失；只返修明确命中的题目槽位。',
      });
    } catch (error) {
      setNotice(noticeMessage('error', error?.message || 'AI 质检任务未能启动，请稍后重试'));
    }
  };
  const completeCurrentLesson = async () => {
    if (publishing || lessonGenerationRunning || base.status === 'published') return;
    openTeacherAgent('whole');
    setNotice('正在补齐当前缺失的题目或学习内容，完成后请预览结果');
    try {
      await validateAndRepairCurrentLesson(
        'complete_missing_content',
        '只补齐当前明确缺失的内容，保留已经完成的题目和学习内容',
      );
    } catch (error) {
      setNotice(noticeMessage('error', error?.message || '自动补全未完成，请稍后重试'));
    }
  };
  const publish = async () => {
    if (publishing || lessonGenerationRunning || base.status === 'published') return;
    setPublishing(true);
    try {
      const checkedGenerationProposal = checkedGenerationProposalMatchesCurrentDraft();
      if (!checkedGenerationProposal) {
        setNotice('正在执行发布前快速检查…');
        const inspected = await runInspection();
        if (!inspected?.passed) {
          const issues = inspected?.issues || [];
          setNotice(issues.length
            ? {
                title: '发布已暂停，请先处理以下结构问题，或点击“补齐缺失”：',
                items: issues.map((issue) => issue.message),
              }
            : noticeMessage('error', '发布前快速检查未完成，本次未发布'));
          return;
        }
        if (!lessonGenerationComplete) {
          setNotice(noticeMessage('warning', '发布已暂停，当前还有缺失内容，请先点击“补齐缺失”'));
          return;
        }
      }
      await publishReadyContent();
    } finally {
      setPublishing(false);
    }
  };

  const hasLessonContent = Boolean(base.preQuestions.length || base.postQuestions.length || storedLearningContent.composite);
  const aiQualityRunning = lessonGenerationRunning && lessonGeneration.operation === 'ai_quality_repair';
  const missingCompletionRunning = lessonGenerationRunning
    && ['complete_missing_content', 'repair_quality_issues'].includes(lessonGeneration.operation);
  const publishStatus = base.status === 'published'
    ? ['已发布', 'published']
    : publishing || lessonGeneration.phase === 'ready'
      ? [publishing ? '发布中' : '待确认发布', publishing ? 'processing' : 'draft']
      : lessonGenerationRunning || lessonGeneration.phase === 'dirty'
        ? [lessonGeneration.phase === 'dirty' ? '有未发布修改' : '处理中', lessonGeneration.phase === 'dirty' ? 'draft' : 'processing']
        : hasLessonContent ? ['需处理', 'draft'] : ['尚未生成', 'empty'];
  const publishActionLabel = publishing
    ? lessonGeneration.phase === 'validating' ? '快速检查中…' : '发布中…'
    : '发布';

  return (
    <TeacherShell
      title={lesson.title}
      leadingAction={(
        <button
          className="teacher-header-back"
          type="button"
          onClick={() => navigate('/adaptive-learning/teacher/textbook-lessons')}
        >
          <ArrowLeft size={16} />
          <span>返回</span>
        </button>
      )}
      actions={<>
        {latestPublishedVersion && (
          <label className="teacher-version-switch">
            <History size={15} aria-hidden="true" />
            <span>版本</span>
            <select
              aria-label="切换已发布版本"
              value={selectedPublishedVersion?.id || ''}
              onChange={(event) => setSelectedPublishedVersionId(event.target.value)}
            >
              {sortedPublishedVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {`V${version.versionNumber}${version.id === latestPublishedVersion.id ? ' · 当前发布' : ''}`}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className={`teacher-header-publish-status ${publishStatus[1]}`}>{publishStatus[0]}</span>
        {base.status !== 'published' && hasLessonContent && !viewingHistoricalVersion && (
          <button
            className="teacher-neutral"
            type="button"
            aria-busy={aiQualityRunning}
            onClick={() => { void runAiQualityRepair(); }}
            disabled={publishing || lessonGenerationRunning || contentMutationLocked}
          >
            {aiQualityRunning ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
            {aiQualityRunning ? 'AI 质检中…' : 'AI 质检并补齐'}
          </button>
        )}
        {base.status !== 'published' && hasLessonContent && (
          <button
            className="teacher-secondary"
            type="button"
            aria-busy={missingCompletionRunning}
            onClick={() => { void completeCurrentLesson(); }}
            disabled={publishing || lessonGenerationRunning || contentMutationLocked}
          >
            {missingCompletionRunning ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
            {missingCompletionRunning ? '补齐中…' : '补齐缺失'}
          </button>
        )}
        {base.status !== 'published' && hasLessonContent && (
          <button className="teacher-primary" type="button" aria-busy={publishing} onClick={() => { void publish(); }} disabled={publishing || lessonGenerationRunning || contentMutationLocked}>
            {publishing ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
            {publishActionLabel}
          </button>
        )}
      </>}
    >
      {viewingHistoricalVersion && (
        <div className="teacher-version-readonly" role="status">
          <History size={18} aria-hidden="true" />
          <div>
            <strong>{`正在查看 V${selectedPublishedVersion.versionNumber} 历史版本`}</strong>
            <span>{`该版本只读；切回 V${latestPublishedVersion.versionNumber} 后可继续编辑。`}</span>
          </div>
        </div>
      )}
      {notice && <div className={`teacher-notice ${noticeTone(notice)}${typeof notice === 'object' && notice.items ? ' has-list' : ''}`} role={noticeTone(notice) === 'error' ? 'alert' : 'status'}>
        {typeof notice === 'object' && notice.items
          ? <><strong>{notice.title}</strong><ul>{notice.items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></>
          : typeof notice === 'object' ? notice.message : notice}
      </div>}
      <div
        className="content-object-summary"
        role="tablist"
        aria-label="课时内容"
        onKeyDown={(event) => moveTabFocus(event, contentSections, activeSection, setActiveSection)}
      >
        {contentSections.map((section, index) => (
          <button
            id={`content-tab-${section.id}`}
            key={section.id}
            data-tab-index={index}
            role="tab"
            aria-controls={`content-panel-${section.id}`}
            aria-selected={activeSection === section.id}
            tabIndex={activeSection === section.id ? 0 : -1}
            className={activeSection === section.id ? 'active' : ''}
            type="button"
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      <section
        className="content-tab-panel"
        id={`content-panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`content-tab-${activeSection}`}
        tabIndex={0}
      >
        {activeSection === 'pre' && (
          <TeacherQuestionReview
            mode="pre"
            questions={base.preQuestions}
            knowledgePoints={lesson.knowledgePoints}
            disabled={contentMutationLocked}
            onChange={(preQuestions) => saveDraft({ preQuestions, version: base.version + 1 })}
          />
        )}

        {activeSection === 'practice' && (
          <>
            <KnowledgeAssessmentMatrix
              assessmentMatrices={base.assessmentMatrices || selectedPublishedVersion?.contentPackage?.assessmentMatrices}
              knowledgePoints={lesson.knowledgePoints}
              questions={knowledgeQuestions}
            />
            <TeacherQuestionReview
              key="single-practice-pool"
              mode="practice"
              questions={knowledgeQuestions}
              knowledgePoints={lesson.knowledgePoints}
              disabled={contentMutationLocked}
              onChange={(questions) => updatePostQuestionGroup('knowledge', questions)}
            />
          </>
        )}

        {activeSection === 'review' && (
          <TeacherQuestionReview
            key="composite-review-pool"
            mode="practice"
            initialScope="review"
            questions={reviewQuestions}
            knowledgePoints={lesson.knowledgePoints}
            disabled={contentMutationLocked}
            onChange={(questions) => updatePostQuestionGroup('review', questions)}
          />
        )}

        {activeSection === 'openmaic' && (
        <div className="openmaic-learning-review">
          <nav className="openmaic-scope-tabs" aria-label="学习内容范围">
            <button type="button" aria-pressed={activeLearningScope === 'composite'} className={activeLearningScope === 'composite' ? 'active' : ''} onClick={() => setActiveLearningScope('composite')}><strong>复合学习</strong><small>覆盖全部知识点</small></button>
            {lesson.knowledgePoints.map((knowledgePoint) => {
              const item = learningContent.knowledgePoints.find((value) => value.knowledgeObjectiveId === knowledgePoint.id)?.openMaic;
              return <button type="button" aria-pressed={activeLearningScope === knowledgePoint.id} className={activeLearningScope === knowledgePoint.id ? 'active' : ''} key={knowledgePoint.id} onClick={() => setActiveLearningScope(knowledgePoint.id)}><strong>{knowledgePoint.name}</strong><small>{item?.classroomUrl ? '可用' : '尚未生成'}</small></button>;
            })}
          </nav>
          <div className="openmaic-review-workspace">
          <section className={`openmaic-review-preview${previewExpanded ? ' expanded' : ''}`} ref={previewRef} aria-busy={runtime?.classroomUrl && previewFrameState !== 'ready'}>
            <header><div><Play size={16} /><strong>{activeScopeName}</strong>{runtime?.classroomUrl && <span className="openmaic-confirm-status confirmed">已生成可用</span>}</div>{runtime?.classroomUrl && <div className="openmaic-preview-actions"><button type="button" onClick={() => setPreviewExpanded((value) => !value)}><Maximize2 size={14} />{previewExpanded ? '退出全屏' : '全屏预览'}</button><a href={runtime.classroomUrl} target="_blank" rel="noreferrer">新窗口打开 <ExternalLink size={14} /></a></div>}</header>
            {runtime?.classroomUrl ? (
              <>
                <div className="openmaic-mobile-preview-note">
                  <StatePanel
                    compact
                    title="请在桌面端预览学习课堂"
                    description="学习课堂画布需要更宽的屏幕，当前可在新窗口打开。"
                    action={<a className="teacher-neutral" href={runtime.classroomUrl} target="_blank" rel="noreferrer">新窗口打开 <ExternalLink size={14} /></a>}
                  />
                </div>
                <div className="openmaic-review-frame-wrap">
                  {previewFrameState !== 'ready' && (
                    <div className="openmaic-review-frame-state">
                      <StatePanel
                        compact
                        tone={previewFrameState === 'error' ? 'error' : 'loading'}
                        title={previewFrameState === 'slow' ? '预览加载时间较长' : previewFrameState === 'error' ? '预览加载失败' : '正在加载学习课堂'}
                        description={previewFrameState === 'slow' ? '可以继续等待、重新加载，或在新窗口打开' : undefined}
                        action={['slow', 'error'].includes(previewFrameState) ? <button className="teacher-neutral" type="button" onClick={() => setPreviewFrameKey((value) => value + 1)}>重新加载</button> : null}
                      />
                    </div>
                  )}
                  <iframe
                    key={previewFrameKey}
                  title="学习课堂预览"
                  src={runtime.classroomUrl}
                  allow="fullscreen; autoplay; microphone"
                  onLoad={() => setPreviewFrameState('ready')}
                    onError={() => setPreviewFrameState('error')}
                  />
                </div>
              </>
            ) : openMaicJob?.scope === activeLearningScope && openMaicJob?.status && !['failed', 'succeeded'].includes(openMaicJob.status) ? (
              <div className="openmaic-generating"><LoaderCircle className="spin" size={28} /><strong>正在生成学习课堂</strong>{(openMaicJob.message || openMaicJob.step) && <p>{openMaicJob.message || openMaicJob.step}</p>}<div><span style={{ width: `${openMaicJob.progress || 4}%` }} /></div><small>{openMaicJob.progress || 0}% · 生成完成前可以离开本页</small></div>
            ) : (
              <div className="openmaic-empty"><Sparkles size={30} /><strong>还没有可预览的学习课堂</strong><button className="teacher-primary" type="button" disabled={contentMutationLocked} onClick={() => generateOpenMaic(activeLearningScope)}><Sparkles size={15} />生成学习课堂</button></div>
            )}
          </section>
          </div>
        </div>
        )}
      </section>

      {!viewingHistoricalVersion && <TeacherQuestionAgent
        key={lesson.id}
        lessonId={lesson.id}
        scope={teacherAgent.scope}
        open={teacherAgent.open}
        onOpen={() => openTeacherAgent('whole')}
        onClose={closeTeacherAgent}
        onPlanInstruction={planTeacherAgentInstruction}
        onExecuteStep={executeTeacherAgentStep}
        onValidatePlan={validateTeacherAgentPlan}
        generating={questionGeneration.scope === teacherAgent.scope}
        generationStatus={questionGeneration.scope === teacherAgent.scope ? questionGeneration.status : null}
        lessonModules={lessonGenerationModules}
        questions={teacherAgentQuestions}
        lessonTask={{
          ...lessonGeneration,
          runId: backendGenerationRun?.runId || base.generationStatus?.runId || '',
          backendStatus: backendGenerationRun?.status || base.generationStatus?.phase || '',
          updatedAt: backendGenerationRun?.updatedAt || base.generationStatus?.updatedAt || '',
          completedAt: backendGenerationRun?.completedAt || base.generationStatus?.completedAt || '',
        }}
        onCancelLesson={stopWholeLessonGeneration}
        lessonActionsDisabled={publishing}
      />}
    </TeacherShell>
  );
}
