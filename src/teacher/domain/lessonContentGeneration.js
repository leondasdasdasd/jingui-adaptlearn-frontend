import {
  DIFFICULTY_LEVELS,
  compositeReviewCount,
  compositeReviewBlueprint,
  practicePoolBlueprint,
  PRACTICE_POOL_DIFFICULTY_COUNTS,
  PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
} from '../../shared/domain/questionPoolPolicy.js';
import {
  buildPreAssessmentBlueprint,
  diagnosticSlotForQuestion,
  hasCompletePreAssessmentBlueprint,
} from '../../shared/domain/preAssessmentBlueprint.js';

export const MAX_AUTOMATIC_REPAIR_ROUNDS = 4;

export const LESSON_GENERATION_MODULE_KIND = Object.freeze({
  PRE_ASSESSMENT: 'pre-assessment',
  KNOWLEDGE_QUESTIONS: 'knowledge-questions',
  COMPOSITE_REVIEW: 'composite-review',
  COMPOSITE_CLASSROOM: 'composite-classroom',
  KNOWLEDGE_CLASSROOM: 'knowledge-classroom',
});

const QUESTION_ISSUE_CODES = new Set([
  'QUESTION_POOL_MISSING',
  'QUESTION_QUANTITY_INSUFFICIENT',
  'QUESTION_STEM_MISSING',
  'QUESTION_TYPE_MISSING',
  'QUESTION_DIFFICULTY_INVALID',
  'QUESTION_DIFFICULTY_VERSION_INVALID',
  'QUESTION_DIFFICULTY_STRUCTURE_INVALID',
  'QUESTION_SCOPE_MISSING',
  'QUESTION_SCOPE_OUT_OF_RANGE',
  'ANSWER_MISSING',
  'RUBRIC_MISSING',
  'PRIMARY_KNOWLEDGE_MISSING',
  'PRIMARY_KNOWLEDGE_WEIGHT_INVALID',
  'SECONDARY_KNOWLEDGE_WEIGHT_INVALID',
  'DUPLICATE_QUESTION',
  'POOL_QUANTITY_INSUFFICIENT',
  'POOL_TYPE_INSUFFICIENT',
  'POOL_DIFFICULTY_INSUFFICIENT',
  'PRE_ASSESSMENT_SLOT_MISSING',
  'PRE_ASSESSMENT_SLOT_DUPLICATED',
  'PRE_ASSESSMENT_SLOT_DIFFICULTY_INVALID',
  'ADAPTIVE_POOL_QUANTITY_INSUFFICIENT',
  'ADAPTIVE_POOL_DIFFICULTY_INSUFFICIENT',
  'BLUEPRINT_MISMATCH',
  'ANSWER_RUBRIC_INCONSISTENT',
  'QUESTION_AMBIGUOUS',
  'UNINTENDED_MULTIPLE_SOLUTIONS',
  'QUESTION_QUALITY_LOW',
  'QUESTION_DIFFICULTY_MISMATCH',
  'QUESTION_REASONING_TOO_SHALLOW',
  'QUESTION_DISTRACTORS_WEAK',
  'QUESTION_OUT_OF_SCOPE',
  'GENERIC_SHORT_ANSWER',
  'QUESTION_MIX_INSUFFICIENT',
  'APPLICATION_CONTEXT_FAKE',
  'APPLICATION_REASONING_INCOMPLETE',
  'CONCEPT_EXPLANATION_OVERUSED',
]);

const COMPOSITE_REVIEW_ISSUE_CODES = new Set([
  'COMPOSITE_REVIEW_MISSING',
  'COMPOSITE_REVIEW_QUANTITY_INSUFFICIENT',
  'COMPOSITE_REVIEW_SCOPE_INVALID',
  'COMPOSITE_EVIDENCE_MAP_MISSING',
  'COMPOSITE_REVIEW_EVIDENCE_INVALID',
  'COMPOSITE_REVIEW_TYPE_DISTRIBUTION_INVALID',
]);

const QUESTION_QUANTITY_ISSUE_CODES = new Set([
  'QUESTION_POOL_MISSING',
  'QUESTION_QUANTITY_INSUFFICIENT',
  'POOL_QUANTITY_INSUFFICIENT',
  'ADAPTIVE_POOL_QUANTITY_INSUFFICIENT',
  'COMPOSITE_REVIEW_MISSING',
  'COMPOSITE_REVIEW_QUANTITY_INSUFFICIENT',
]);

const TYPE_DISTRIBUTION_ISSUE_CODES = new Set([
  'COMPOSITE_REVIEW_TYPE_DISTRIBUTION_INVALID',
  'POOL_TYPE_INSUFFICIENT',
  'QUESTION_MIX_INSUFFICIENT',
]);

const COMPOSITE_CLASSROOM_ISSUE_CODES = new Set([
  'OPENMAIC_COVERAGE_MISSING',
  'OPENMAIC_NOT_READY',
  'OPENMAIC_CLASSROOM_ID_MISSING',
  'OPENMAIC_CLASSROOM_URL_MISSING',
]);

const KNOWLEDGE_CLASSROOM_ISSUE_CODES = new Set([
  'KNOWLEDGE_OPENMAIC_NOT_READY',
  'KNOWLEDGE_OPENMAIC_SCOPE_INVALID',
]);

function questionKnowledgeIds(question) {
  return question?.knowledgePointIds || question?.knowledgeObjectiveIds || [];
}

const difficultyNumber = (value) => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (/^D[1-5]$/.test(normalized)) return Number(normalized.slice(1));
  if (/^[1-5]$/.test(normalized)) return Number(normalized);
  return 0;
};

function questionModuleId(question, lesson) {
  if (question?.purpose === 'PRE' || question?.purpose === 'pre') return 'pre-assessment';
  if (question?.phase === 'review') return 'composite-review';
  const knowledgePointId = questionKnowledgeIds(question)[0];
  return (lesson?.knowledgePoints || []).some((item) => item.id === knowledgePointId)
    ? `knowledge-questions:${knowledgePointId}`
    : '';
}

function isUsableClassroom(runtime) {
  const url = String(runtime?.classroomUrl || '');
  return Boolean(runtime?.classroomId)
    && (/^https?:\/\//.test(url) || /^\/openmaic\/classroom\/[A-Za-z0-9_-]+(?:[/?#]|$)/.test(url))
    && !runtime?.partial
    && runtime?.status !== 'partial';
}

function moduleRecord({ id, kind, label, complete, currentCount, requiredCount, knowledgePointId = '' }) {
  return {
    id,
    kind,
    label,
    knowledgePointId,
    complete,
    status: complete ? 'ready' : 'missing',
    currentCount,
    requiredCount,
  };
}

/**
 * Creates the single source of truth for the whole-lesson generation checklist.
 * This is intentionally structural. The server quality gate remains authoritative
 * for answer, rubric, blueprint and semantic completeness.
 */
export function buildLessonGenerationModules({ lesson, content }) {
  const knowledgePoints = lesson?.knowledgePoints || [];
  const preQuestions = content?.preQuestions || [];
  const postQuestions = content?.postQuestions || [];
  const knowledgeQuestions = postQuestions.filter((question) => question.phase !== 'review');
  const compositeQuestions = postQuestions.filter((question) => question.phase === 'review');
  const learningContent = content?.learningContent || {
    composite: content?.openMaic || null,
    knowledgePoints: [],
  };
  const requiredPreCount = buildPreAssessmentBlueprint(knowledgePoints).length;
  const preCoverageComplete = hasCompletePreAssessmentBlueprint(preQuestions, knowledgePoints);

  const modules = [moduleRecord({
    id: 'pre-assessment',
    kind: LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT,
    label: '课前测',
    complete: preQuestions.length >= requiredPreCount && preCoverageComplete,
    currentCount: preQuestions.length,
    requiredCount: requiredPreCount,
  })];

  knowledgePoints.forEach((knowledgePoint) => {
    const questions = knowledgeQuestions.filter((question) => (
      questionKnowledgeIds(question)[0] === knowledgePoint.id
    ));
    modules.push(moduleRecord({
      id: `knowledge-questions:${knowledgePoint.id}`,
      kind: LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS,
      label: `${knowledgePoint.name}·单点题池`,
      knowledgePointId: knowledgePoint.id,
      complete: questions.length >= PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
      currentCount: questions.length,
      requiredCount: PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
    }));
  });

  const compositeScopeComplete = compositeQuestions.every((question) => questionKnowledgeIds(question).length >= 2);
  const requiredCompositeReviewCount = compositeReviewCount(knowledgePoints.length);
  modules.push(moduleRecord({
    id: 'composite-review',
    kind: LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW,
    label: '综合练习',
    complete: compositeQuestions.length >= requiredCompositeReviewCount && compositeScopeComplete,
    currentCount: compositeQuestions.length,
    requiredCount: requiredCompositeReviewCount,
  }));

  modules.push(moduleRecord({
    id: 'composite-classroom',
    kind: LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM,
    label: '复合学习课堂',
    complete: isUsableClassroom(learningContent.composite),
    currentCount: isUsableClassroom(learningContent.composite) ? 1 : 0,
    requiredCount: 1,
  }));

  knowledgePoints.forEach((knowledgePoint) => {
    const runtime = (learningContent.knowledgePoints || [])
      .find((item) => item.knowledgeObjectiveId === knowledgePoint.id)?.openMaic;
    modules.push(moduleRecord({
      id: `knowledge-classroom:${knowledgePoint.id}`,
      kind: LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_CLASSROOM,
      label: `${knowledgePoint.name}·单点课堂`,
      knowledgePointId: knowledgePoint.id,
      complete: isUsableClassroom(runtime),
      currentCount: isUsableClassroom(runtime) ? 1 : 0,
      requiredCount: 1,
    }));
  });

  return modules;
}

function generationActionForModule(module) {
  switch (module.kind) {
    case LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT:
      return { id: 'generate-pre-assessment', type: 'questions', mode: 'pre', moduleIds: [module.id] };
    case LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS:
      return {
        id: `generate-knowledge-questions:${module.knowledgePointId}`,
        type: 'questions',
        mode: 'knowledge',
        scope: module.knowledgePointId,
        moduleIds: [module.id],
      };
    case LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW:
      return { id: 'generate-composite-review', type: 'questions', mode: 'review', moduleIds: [module.id] };
    case LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM:
      return { id: 'generate-composite-classroom', type: 'openmaic', scope: 'composite', moduleIds: [module.id] };
    case LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_CLASSROOM:
      return {
        id: `generate-knowledge-classroom:${module.knowledgePointId}`,
        type: 'openmaic',
        scope: module.knowledgePointId,
        moduleIds: [module.id],
      };
    default:
      return null;
  }
}

function orderedActions(modules, moduleIds) {
  const selected = new Set(moduleIds);
  return modules.filter((module) => selected.has(module.id)).map(generationActionForModule).filter(Boolean);
}

export function buildMissingContentGenerationPlan({ lesson, content }) {
  const modules = buildLessonGenerationModules({ lesson, content });
  const missingModuleIds = modules.filter((module) => !module.complete).map((module) => module.id);
  return {
    modules,
    missingModuleIds,
    actions: orderedActions(modules, missingModuleIds),
    complete: missingModuleIds.length === 0,
  };
}

/**
 * Keeps question and MAIC work in independent progress lanes while allowing every
 * module in both lanes to start immediately. There are intentionally no shared
 * prerequisites before the final quality check.
 */
export function buildParallelLessonGenerationLanes(actions = []) {
  const questions = actions.filter((action) => action.type === 'questions');
  const openMaic = actions.filter((action) => action.type === 'openmaic');
  return {
    questions,
    openMaic,
    totalConcurrency: questions.length + openMaic.length,
  };
}

function findKnowledgePointIds(issue, lesson) {
  const message = String(issue?.message || '');
  return (lesson?.knowledgePoints || [])
    .filter((knowledgePoint) => message.includes(knowledgePoint.id) || message.includes(knowledgePoint.name))
    .map((knowledgePoint) => knowledgePoint.id);
}

function explicitIssueQuestionId(issue, questions) {
  const explicit = String(issue?.questionId || '').trim();
  if (explicit) return explicit;
  const message = String(issue?.message || '');
  // Quality-review messages place the affected current id immediately after
  // “题目”.  Older ids can be embedded inside that id after several repair
  // rounds, so substring matching may select both the current record and an
  // obsolete ancestor. Prefer the longest exact id occurring at that marker.
  return questions
    .map((question) => String(question?.id || ''))
    .filter(Boolean)
    .filter((id) => message.includes(`题目 ${id}`) || message.includes(`题 ${id}`))
    .sort((left, right) => right.length - left.length)[0] || '';
}

function findQuestionModuleIds(issue, lesson, content) {
  const message = String(issue?.message || '');
  const questions = [...(content?.preQuestions || []), ...(content?.postQuestions || [])];
  const explicitQuestionId = explicitIssueQuestionId(issue, questions);
  return [...new Set(questions
    .filter((question) => {
      if (explicitQuestionId) return question?.id === explicitQuestionId;
      if (question?.id && message.includes(question.id)) return true;
      const stem = String(question?.stem || '').replace(/\s+/g, ' ').trim();
      return stem.length >= 4 && message.includes(stem.slice(0, 24));
    })
    .map((question) => questionModuleId(question, lesson))
    .filter(Boolean))];
}

function findQuestionIds(issue, content) {
  const message = String(issue?.message || '');
  const questions = [...(content?.preQuestions || []), ...(content?.postQuestions || [])];
  const explicitQuestionId = explicitIssueQuestionId(issue, questions);
  if (explicitQuestionId) return [explicitQuestionId];
  const matchedIds = questions.map((question) => String(question?.id || '')).filter((id) => (
    id && message.includes(id)
  ));
  const longestMatchedIds = matchedIds.filter((id) => !matchedIds.some((other) => (
    other.length > id.length && other.startsWith(id)
  )));
  if (longestMatchedIds.length) return longestMatchedIds;
  return questions.filter((question) => {
    const stem = String(question?.stem || '').replace(/\s+/g, ' ').trim();
    return stem.length >= 4 && message.includes(stem.slice(0, 24));
  }).map((question) => question.id).filter(Boolean);
}

// Some Java gates report a version/metadata defect without embedding an
// individual question id. Resolve those defects deterministically from the
// current draft so a repair replaces only the affected records instead of
// regenerating an entire pool and damaging already-valid questions.
function metadataDefectQuestionIds(issue, content) {
  const code = String(issue?.code || '').toUpperCase();
  const questions = [...(content?.preQuestions || []), ...(content?.postQuestions || [])];
  if (code === 'QUESTION_DIFFICULTY_VERSION_INVALID') {
    return questions.filter((question) => {
      const value = String(question?.difficulty ?? '').trim().toUpperCase();
      return /^[1-5]$/.test(value) && question?.id;
    }).map((question) => question.id);
  }
  if (code === 'COMPOSITE_EVIDENCE_MAP_MISSING' || code === 'COMPOSITE_REVIEW_EVIDENCE_INVALID') {
    return questions.filter((question) => {
      if (question?.phase !== 'review' || !question?.id) return false;
      return !hasIndependentEvidenceMap(question);
    }).map((question) => question.id);
  }
  return [];
}

function findPreAssessmentBlueprintSlots(issue, lesson) {
  const explicitSlotId = String(issue?.blueprintSlotId || '');
  const explicitKnowledgePointId = String(issue?.primaryKnowledgePointId || '');
  const explicitRole = String(issue?.diagnosticRole || '').toUpperCase();
  return buildPreAssessmentBlueprint(lesson?.knowledgePoints || []).filter((slot) => (
    (explicitSlotId && slot.id === explicitSlotId)
    || (explicitKnowledgePointId && explicitRole
      && slot.primaryKnowledgePointId === explicitKnowledgePointId
      && slot.diagnosticRole === explicitRole)
  ));
}

function difficultyQuotaRepairQuestionIds(issue, lesson, content, reservedQuestionIds = new Set()) {
  if (String(issue?.code || '').toUpperCase() !== 'ADAPTIVE_POOL_DIFFICULTY_INSUFFICIENT') return [];
  const message = String(issue?.message || '');
  const quotaMatch = message.match(/(D[1-5]|基础|直接理解|标准|变式综合|进阶|迁移应用)(?:基础识别|直接理解|标准应用|变式综合|迁移应用)?题有\s*\d+\s*道[^\d]*还需补充\s*(\d+)\s*道/);
  const knowledgePointIds = findKnowledgePointIds(issue, lesson);
  if (!quotaMatch || knowledgePointIds.length !== 1) return [];
  const missingDifficulty = ({ D1: 1, D2: 2, D3: 3, D4: 4, D5: 5, 基础: 1, 直接理解: 2, 标准: 2, 变式综合: 4, 进阶: 3, 迁移应用: 5 })[quotaMatch[1]];
  const missingCount = Number(quotaMatch[2] || 0);
  if (!missingDifficulty || missingCount <= 0) return [];

  const pool = (content?.postQuestions || []).filter((question) => (
    question?.phase !== 'review'
    && questionKnowledgeIds(question)[0] === knowledgePointIds[0]
    && question?.id
  ));
  const requiredByDifficulty = PRACTICE_POOL_DIFFICULTY_COUNTS;
  const surplusCandidates = DIFFICULTY_LEVELS
    .filter((difficulty) => difficulty !== missingDifficulty)
    .flatMap((difficulty) => {
      const questionsAtDifficulty = pool.filter((question) => difficultyNumber(question.difficulty) === difficulty);
      const surplus = Math.max(0, questionsAtDifficulty.length - Number(requiredByDifficulty[difficulty] || 0));
      return surplus > 0 ? questionsAtDifficulty.slice(-surplus) : [];
    })
    .filter((question) => !reservedQuestionIds.has(question.id));
  return surplusCandidates.slice(0, missingCount).map((question) => question.id);
}

function distributionRepairQuestionTypes(actionIssues, targetQuestionIds, lesson, content) {
  const distributionTargetIds = [...new Set(actionIssues
    .filter((item) => TYPE_DISTRIBUTION_ISSUE_CODES.has(item.code))
    .flatMap((item) => item.targetQuestionIds || []))];

  const questionById = new Map([...(content?.preQuestions || []), ...(content?.postQuestions || [])]
    .map((question) => [String(question?.id || ''), question]));
  const reviewSlotsById = new Map(compositeReviewBlueprint(
    compositeReviewCount(lesson?.knowledgePoints?.length || 0),
  ).map((slot) => [slot.id, slot]));
  const practiceSlotsById = new Map((lesson?.knowledgePoints || []).flatMap((knowledgePoint) => (
    practicePoolBlueprint(knowledgePoint.id).map((slot) => [slot.id, slot])
  )));
  const preferredTypes = ['ordering', 'multiple_choice', 'line_connect'];
  const requiredTypeByQuestionId = new Map();

  distributionTargetIds.forEach((questionId, index) => {
    const question = questionById.get(questionId);
    const slotId = String(question?.blueprintSlotId || '');
    const slot = question?.phase === 'review'
      ? reviewSlotsById.get(slotId)
      : practiceSlotsById.get(slotId);
    const allowedTypes = (slot?.recommendedQuestionTypes || question?.recommendedQuestionTypes || [])
      .filter((type) => type && type !== 'short_answer' && type !== question?.type);
    const difficulty = difficultyNumber(question?.difficulty || slot?.difficulty);
    const rotatedPreferredTypes = difficulty === 5
      ? ['multiple_choice', 'ordering']
      : preferredTypes.map((_, offset) => preferredTypes[(index + offset) % preferredTypes.length]);
    const requiredType = rotatedPreferredTypes.find((type) => allowedTypes.includes(type)) || allowedTypes[0];
    if (requiredType) requiredTypeByQuestionId.set(questionId, requiredType);
  });

  return targetQuestionIds.map((questionId) => (
    requiredTypeByQuestionId.get(questionId)
    || String(questionById.get(questionId)?.type || '')
  ));
}

export function classifyContentQualityIssue(issue, {
  lesson,
  content,
  modules = buildLessonGenerationModules({ lesson, content }),
  reservedQuestionIds = new Set(),
}) {
  const code = String(issue?.code || '').toUpperCase();
  const knowledgePointIds = findKnowledgePointIds(issue, lesson);
  const targetQuestionIds = [
    ...findQuestionIds(issue, content),
    ...metadataDefectQuestionIds(issue, content),
    ...difficultyQuotaRepairQuestionIds(issue, lesson, content, reservedQuestionIds),
  ];
  const targetBlueprintSlots = findPreAssessmentBlueprintSlots(issue, lesson);
  let moduleIds = [];
  let category = 'manual-review';

  if (code === 'OPENMAIC_COVERAGE_MISSING' && targetQuestionIds.length) {
    // The semantic reviewer historically reused `openmaic_coverage` for a
    // question's knowledge-evidence mismatch. A concrete question id means
    // this is a question repair, not a reason to regenerate the classroom.
    category = 'questions';
    moduleIds = findQuestionModuleIds(issue, lesson, content);
  } else if (COMPOSITE_CLASSROOM_ISSUE_CODES.has(code)) {
    category = 'composite-classroom';
    moduleIds = ['composite-classroom'];
  } else if (KNOWLEDGE_CLASSROOM_ISSUE_CODES.has(code)) {
    category = 'knowledge-classroom';
    const targetIds = knowledgePointIds.length
      ? knowledgePointIds
      : (lesson?.knowledgePoints || []).map((item) => item.id);
    moduleIds = targetIds.map((id) => `knowledge-classroom:${id}`);
  } else if (COMPOSITE_REVIEW_ISSUE_CODES.has(code)) {
    category = 'composite-review';
    moduleIds = ['composite-review'];
  } else if (QUESTION_ISSUE_CODES.has(code)) {
    category = 'questions';
    const locatedQuestionModules = findQuestionModuleIds(issue, lesson, content);
    if (code.startsWith('PRE_ASSESSMENT_SLOT_')) {
      moduleIds = ['pre-assessment'];
    } else if (locatedQuestionModules.length) {
      moduleIds = locatedQuestionModules;
    } else if (code === 'QUESTION_DIFFICULTY_VERSION_INVALID') {
      const targetSet = new Set(targetQuestionIds);
      moduleIds = [...new Set([...(content?.preQuestions || []), ...(content?.postQuestions || [])]
        .filter((question) => targetSet.has(question?.id))
        .map((question) => questionModuleId(question, lesson))
        .filter(Boolean))];
    } else if (code.startsWith('ADAPTIVE_POOL_')) {
      moduleIds = knowledgePointIds.length
        ? knowledgePointIds.map((id) => `knowledge-questions:${id}`)
        : [];
    } else if (code.startsWith('POOL_')) {
      const message = String(issue?.message || '');
      if (message.includes('课前测验')) moduleIds = ['pre-assessment'];
      else if (knowledgePointIds.length) moduleIds = knowledgePointIds.map((id) => `knowledge-questions:${id}`);
      else moduleIds = [];
    } else if (code === 'QUESTION_POOL_MISSING' && knowledgePointIds.length) {
      moduleIds = knowledgePointIds.map((id) => `knowledge-questions:${id}`);
    }
  } else if (code === 'COMPOSITE_EVIDENCE_MAP_MISSING' || code === 'COMPOSITE_REVIEW_EVIDENCE_INVALID') {
    category = 'composite-review';
    moduleIds = ['composite-review'];
  } else if (targetQuestionIds.length) {
    // Teacher-directed audits may use a more specific code than the built-in
    // taxonomy. A valid explicit question id is still an authoritative repair
    // target and must not fall through to manual review solely because its code
    // is newer than this classifier.
    category = 'questions';
    moduleIds = findQuestionModuleIds(issue, lesson, content);
  }

  const knownModuleIds = new Set(modules.map((module) => module.id));
  if (Array.isArray(issue?.moduleIds)) moduleIds.push(...issue.moduleIds);
  moduleIds = [...new Set(moduleIds)].filter((id) => knownModuleIds.has(id));
  const slotScopedQuestionRepair = targetQuestionIds.length > 0
    || targetBlueprintSlots.length > 0
    || QUESTION_QUANTITY_ISSUE_CODES.has(code);
  const questionCategory = category === 'questions' || category === 'composite-review';
  return {
    issue,
    code,
    category,
    moduleIds,
    targetQuestionIds: [...new Set(targetQuestionIds)],
    targetBlueprintSlots,
    repairable: moduleIds.length > 0 && (!questionCategory || slotScopedQuestionRepair),
  };
}

/**
 * Converts authoritative server issues into the smallest safe regeneration plan.
 * completedRepairRounds is zero before the first repair. Once four rounds have
 * completed, the remaining issues are returned for teacher-facing resolution.
 */
export function buildQualityRepairPlan({ issues = [], lesson, content, completedRepairRounds = 0 }) {
  const modules = buildLessonGenerationModules({ lesson, content });
  const reservedQuotaTargets = new Set();
  const classifiedIssues = issues.map((issue) => {
    const classified = classifyContentQualityIssue(issue, {
      lesson,
      content,
      modules,
      reservedQuestionIds: reservedQuotaTargets,
    });
    if (String(issue?.code || '').toUpperCase() === 'ADAPTIVE_POOL_DIFFICULTY_INSUFFICIENT') {
      classified.targetQuestionIds.forEach((questionId) => reservedQuotaTargets.add(questionId));
    }
    return classified;
  });
  const exhausted = completedRepairRounds >= MAX_AUTOMATIC_REPAIR_ROUNDS;
  const repairableIssues = classifiedIssues.filter((item) => item.repairable);
  const repairModuleIds = exhausted ? [] : [...new Set(repairableIssues.flatMap((item) => item.moduleIds))];
  const actions = orderedActions(modules, repairModuleIds).map((action) => {
    const actionIssues = repairableIssues
      .filter((item) => item.moduleIds.some((moduleId) => action.moduleIds.includes(moduleId)));
    const module = modules.find((item) => action.moduleIds.includes(item.id));
    const hasQuantityShortfall = actionIssues.some((item) => QUESTION_QUANTITY_ISSUE_CODES.has(item.code));
    const missingQuestionCount = hasQuantityShortfall
      ? Math.max(0, Number(module?.requiredCount || 0) - Number(module?.currentCount || 0))
      : 0;
    const targetQuestionIds = [...new Set(actionIssues
      .flatMap((item) => item.targetQuestionIds || []))];
    let targetBlueprintSlots = [...new Map(actionIssues
      .flatMap((item) => item.targetBlueprintSlots || [])
      .map((slot) => [slot.id, slot])).values()];
    if (module?.kind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT) {
      const questionById = new Map((content?.preQuestions || [])
        .map((question) => [String(question?.id || ''), question]));
      targetBlueprintSlots = [...new Map([
        ...targetQuestionIds
          .map((questionId) => diagnosticSlotForQuestion(questionById.get(questionId)))
          .filter(Boolean),
        ...targetBlueprintSlots,
      ].map((slot) => [slot.id, slot])).values()];
    }
    const repairMode = missingQuestionCount > 0
      ? targetQuestionIds.length || targetBlueprintSlots.length ? 'targeted-and-append' : 'append-missing'
      : 'targeted';
    const requestedQuestionCount = module?.kind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT && targetBlueprintSlots.length
        ? targetBlueprintSlots.length
        : targetQuestionIds.length + targetBlueprintSlots.length + missingQuestionCount;
    const targetQuestionTypes = distributionRepairQuestionTypes(actionIssues, targetQuestionIds, lesson, content);
    return {
      ...action,
      targetQuestionIds,
      ...(targetQuestionTypes.some(Boolean) ? { targetQuestionTypes } : {}),
      targetBlueprintSlots,
      repairMode,
      missingQuestionCount,
      requestedQuestionCount,
      qualityIssues: actionIssues.map((item) => item.issue),
    };
  });
  return {
    modules,
    classifiedIssues,
    actions,
    repairModuleIds,
    remainingIssues: classifiedIssues.filter((item) => exhausted || !item.repairable).map((item) => item.issue),
    exhausted,
    passed: issues.length === 0,
  };
}

export const LESSON_GENERATION_TASK_STATUS = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  PARTIAL: 'partial',
  FAILED: 'failed',
});

const TERMINAL_TASK_STATUSES = new Set([
  LESSON_GENERATION_TASK_STATUS.COMPLETED,
  LESSON_GENERATION_TASK_STATUS.PARTIAL,
  LESSON_GENERATION_TASK_STATUS.FAILED,
]);

function isTerminalTask(task) {
  return TERMINAL_TASK_STATUSES.has(task.status);
}

function createModuleTask(module, {
  taskType = 'generation', round = 0, dependencies = [], targetQuestionIds = [], targetBlueprintSlots = [],
} = {}) {
  const action = generationActionForModule(module);
  return {
    id: `${taskType === 'repair' ? `repair:${round}` : 'generate'}:${module.id}`,
    taskType,
    round,
    moduleId: module.id,
    moduleKind: module.kind,
    label: module.label,
    knowledgePointId: module.knowledgePointId,
    requiredCount: taskType === 'repair' && (targetQuestionIds.length || targetBlueprintSlots.length)
      ? targetQuestionIds.length + targetBlueprintSlots.length
      : module.requiredCount,
    operation: action,
    dependencies,
    targetQuestionIds,
    targetBlueprintSlots,
    preserved: taskType === 'generation' && module.complete,
    status: taskType === 'generation' && module.complete
      ? LESSON_GENERATION_TASK_STATUS.COMPLETED
      : LESSON_GENERATION_TASK_STATUS.PENDING,
    issues: [],
    outputPatch: null,
  };
}

function taskDependenciesSettled(graph, task) {
  return task.dependencies.every((dependencyId) => {
    const dependency = graph.tasks.find((item) => item.id === dependencyId);
    return dependency && isTerminalTask(dependency);
  });
}

function ensureQualityCheckTask(graph, round) {
  const taskType = round === 0 ? 'generation' : 'repair';
  const stageTasks = graph.tasks.filter((task) => task.taskType === taskType && task.round === round);
  if (!stageTasks.length || stageTasks.some((task) => !isTerminalTask(task))) return graph;
  const qualityTaskId = `quality-check:${round}`;
  if (graph.tasks.some((task) => task.id === qualityTaskId)) return graph;
  return {
    ...graph,
    phase: 'quality_check',
    tasks: [...graph.tasks, {
      id: qualityTaskId,
      taskType: 'quality_check',
      round,
      label: round === 0 ? '整课质量检查' : `第 ${round} 轮修补质量检查`,
      dependencies: stageTasks.map((task) => task.id),
      status: LESSON_GENERATION_TASK_STATUS.PENDING,
      issues: [],
      passed: null,
    }],
  };
}

/** Creates one DAG per lesson. All generation nodes are independent and runnable in parallel. */
export function createLessonGenerationTaskGraph({ lesson, content }) {
  const modules = buildLessonGenerationModules({ lesson, content });
  const graph = {
    lessonId: lesson?.id || content?.lessonId || '',
    phase: 'generation',
    repairRound: 0,
    exhausted: false,
    tasks: modules.map((module) => createModuleTask(module)),
  };
  return ensureQualityCheckTask(graph, 0);
}

export function getRunnableLessonGenerationTasks(graph) {
  return graph.tasks.filter((task) => (
    task.status === LESSON_GENERATION_TASK_STATUS.PENDING && taskDependenciesSettled(graph, task)
  ));
}

export function startLessonGenerationTask(graph, taskId) {
  const task = graph.tasks.find((item) => item.id === taskId);
  if (!task || task.status !== LESSON_GENERATION_TASK_STATUS.PENDING || !taskDependenciesSettled(graph, task)) return graph;
  return {
    ...graph,
    tasks: graph.tasks.map((item) => item.id === taskId
      ? { ...item, status: LESSON_GENERATION_TASK_STATUS.RUNNING }
      : item),
  };
}

function normalizedStem(value) {
  return String(value || '').replace(/\s+/g, '').replace(/[，。！？,.!?]/g, '').toLowerCase();
}

function hasAnswer(answer) {
  if (answer === null || answer === undefined) return false;
  if (typeof answer === 'string') return Boolean(answer.trim());
  if (Array.isArray(answer)) return answer.length > 0;
  return typeof answer === 'object' ? Object.keys(answer).length > 0 : true;
}

function hasIndependentEvidenceMap(question) {
  const ids = questionKnowledgeIds(question);
  if (ids.length <= 1) return true;
  const map = Array.isArray(question?.knowledgeEvidenceMap) ? question.knowledgeEvidenceMap : [];
  const mapped = new Set(map.filter((item) => item?.knowledgePointId && Number(item.maxScore) > 0)
    .map((item) => item.knowledgePointId));
  return ids.every((id) => mapped.has(id)) && map.some((item) => item?.role === 'primary');
}

function questionsOutsideTaskModule(content, task) {
  const preQuestions = content?.preQuestions || [];
  const postQuestions = content?.postQuestions || [];
  if (task.targetBlueprintSlots?.length) return [...preQuestions, ...postQuestions];
  if (task.targetQuestionIds?.length) {
    const targets = new Set(task.targetQuestionIds);
    return [...preQuestions, ...postQuestions].filter((question) => !targets.has(question.id));
  }
  if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT) return postQuestions;
  if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW) {
    return [...preQuestions, ...postQuestions.filter((question) => question.phase !== 'review')];
  }
  if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS) {
    return [
      ...preQuestions,
      ...postQuestions.filter((question) => question.phase === 'review'
        || questionKnowledgeIds(question)[0] !== task.knowledgePointId),
    ];
  }
  return [...preQuestions, ...postQuestions];
}

function taskIssue(task, code, message, questionId = '', details = {}) {
  return { code, message, moduleIds: [task.moduleId], questionId, ...details };
}

/** Performs fast deterministic checks before a generated result is merged into the draft. */
export function validateLessonGenerationTaskResult({ task, result, lesson, content }) {
  if ([LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM, LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_CLASSROOM].includes(task.moduleKind)) {
    const runtime = result?.runtime || result?.openMaic || result || {};
    const issues = [];
    if (!runtime.classroomId) issues.push(taskIssue(task, 'OPENMAIC_CLASSROOM_ID_MISSING', `${task.label}缺少课堂标识`));
    // The server normalizes OpenMAIC links to the same-origin public route
    // (`/openmaic/classroom/:id`) before persisting a generation run.  Treat
    // that route as a valid classroom address just like the provider's
    // absolute URL; otherwise every successful classroom is incorrectly sent
    // through an endless repair loop.
    const classroomUrl = String(runtime.classroomUrl || '').trim();
    const hasPublicClassroomPath = /^\/openmaic\/classroom\/[a-zA-Z0-9_-]+(?:[/?#]|$)/.test(classroomUrl);
    const hasAbsoluteClassroomUrl = /^https?:\/\/[^\s]+/.test(classroomUrl);
    if (!hasPublicClassroomPath && !hasAbsoluteClassroomUrl) {
      issues.push(taskIssue(task, 'OPENMAIC_CLASSROOM_URL_MISSING', `${task.label}缺少有效访问地址`));
    }
    return issues;
  }

  const questions = Array.isArray(result?.questions) ? result.questions : [];
  const issues = [];
  const targetedRepair = task.taskType === 'repair'
    && (task.targetQuestionIds?.length > 0 || task.targetBlueprintSlots?.length > 0);
  const requiredCount = Number(task.requiredCount || 0);
  if (questions.length < requiredCount) {
    issues.push(taskIssue(task, 'QUESTION_QUANTITY_INSUFFICIENT', `${task.label}只生成 ${questions.length} 道，需要 ${requiredCount} 道`));
  }

  const lessonKnowledgeIds = new Set((lesson?.knowledgePoints || []).map((item) => item.id));
  questions.forEach((question, index) => {
    const questionName = question?.id || `第 ${index + 1} 题`;
    if (!String(question?.stem || '').trim()) issues.push(taskIssue(task, 'QUESTION_STEM_MISSING', `${questionName} 缺少题干`, question?.id));
    if (!question?.type) issues.push(taskIssue(task, 'QUESTION_TYPE_MISSING', `${questionName} 缺少题型`, question?.id));
    if (!hasAnswer(question?.answer)) issues.push(taskIssue(task, 'ANSWER_MISSING', `${questionName} 缺少答案`, question?.id));
    if (question?.type === 'short_answer' && (!Array.isArray(question?.rubric) || question.rubric.length === 0)) {
      issues.push(taskIssue(task, 'RUBRIC_MISSING', `${questionName} 缺少评分点`, question?.id));
    }
    const knowledgeIds = questionKnowledgeIds(question);
    if (!knowledgeIds.length) issues.push(taskIssue(task, 'QUESTION_SCOPE_MISSING', `${questionName} 缺少知识点`, question?.id));
    else if (knowledgeIds.some((id) => !lessonKnowledgeIds.has(id))) {
      issues.push(taskIssue(task, 'QUESTION_SCOPE_OUT_OF_RANGE', `${questionName} 包含课时外知识点`, question?.id));
    }
    if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS
      && (knowledgeIds.length !== 1 || knowledgeIds[0] !== task.knowledgePointId)) {
      issues.push(taskIssue(task, 'QUESTION_SCOPE_OUT_OF_RANGE', `${questionName} 不属于当前单点题池`, question?.id));
    }
    if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW && knowledgeIds.length < 2) {
      issues.push(taskIssue(task, 'COMPOSITE_REVIEW_SCOPE_INVALID', `${questionName} 未混合至少两个知识点`, question?.id));
    }
    if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW && !hasIndependentEvidenceMap(question)) {
      issues.push(taskIssue(task, 'COMPOSITE_REVIEW_SCOPE_INVALID', `${questionName} 缺少按子题或评分点拆分的独立知识点证据`, question?.id));
    }
    if (!DIFFICULTY_LEVELS.includes(difficultyNumber(question?.difficulty))) {
      issues.push(taskIssue(task, 'QUESTION_DIFFICULTY_INVALID', `${questionName} 难度必须为 D1–D5（1–5）`, question?.id));
    }
  });

  const existingStems = new Set(questionsOutsideTaskModule(content, task).map((question) => normalizedStem(question.stem)).filter(Boolean));
  const resultStems = new Set();
  questions.forEach((question) => {
    const stem = normalizedStem(question?.stem);
    if (!stem) return;
    if (existingStems.has(stem) || resultStems.has(stem)) {
      issues.push(taskIssue(task, 'DUPLICATE_QUESTION', `${question?.id || '未命名题目'} 与已有题目重复`, question?.id));
    }
    resultStems.add(stem);
  });

  const distinctTypes = new Set(questions.map((question) => question.type).filter(Boolean));
  const distinctDifficulties = new Set(questions.map((question) => difficultyNumber(question.difficulty)).filter((value) => DIFFICULTY_LEVELS.includes(value)));
  if (!targetedRepair && questions.length && distinctTypes.size < 2) issues.push(taskIssue(task, 'POOL_TYPE_INSUFFICIENT', `${task.label}至少需要 2 种题型`));
  if (!targetedRepair && questions.length && distinctDifficulties.size < 2) issues.push(taskIssue(task, 'QUESTION_DIFFICULTY_STRUCTURE_INVALID', `${task.label}至少需要 2 个难度层级`));
  if (!targetedRepair && task.moduleKind === LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS) {
    Object.entries(PRACTICE_POOL_DIFFICULTY_COUNTS).forEach(([difficulty, count]) => {
      const currentCount = questions.filter((question) => difficultyNumber(question.difficulty) === Number(difficulty)).length;
      if (currentCount < count) issues.push(taskIssue(
        task,
        'ADAPTIVE_POOL_DIFFICULTY_INSUFFICIENT',
        `${task.label}的D${difficulty}题有 ${currentCount} 道，还需补充 ${count - currentCount} 道`,
      ));
    });
  }
  if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT) {
    const expectedSlots = task.targetBlueprintSlots?.length
      ? task.targetBlueprintSlots
      : buildPreAssessmentBlueprint(lesson?.knowledgePoints || []);
    const slotsById = new Map();
    questions.forEach((question) => {
      const slot = diagnosticSlotForQuestion(question);
      if (!slot) return;
      if (slotsById.has(slot.id)) {
        issues.push(taskIssue(
          task,
          'PRE_ASSESSMENT_SLOT_DUPLICATED',
          `${slot.primaryKnowledgePointId} 的 ${slot.diagnosticRole} 主证据槽位重复`,
          question.id,
          { blueprintSlotId: slot.id, primaryKnowledgePointId: slot.primaryKnowledgePointId, diagnosticRole: slot.diagnosticRole },
        ));
      }
      slotsById.set(slot.id, question);
    });
    expectedSlots.forEach((slot) => {
      const question = slotsById.get(slot.id);
      if (!question) {
        issues.push(taskIssue(
          task,
          'PRE_ASSESSMENT_SLOT_MISSING',
          `${slot.primaryKnowledgePointId} 的 ${slot.diagnosticRole} 主证据槽位缺失`,
          '',
          { blueprintSlotId: slot.id, primaryKnowledgePointId: slot.primaryKnowledgePointId, diagnosticRole: slot.diagnosticRole },
        ));
      } else if (difficultyNumber(question.difficulty) !== difficultyNumber(slot.difficulty)) {
        issues.push(taskIssue(
          task,
          'PRE_ASSESSMENT_SLOT_DIFFICULTY_INVALID',
          `${slot.primaryKnowledgePointId} 的 ${slot.diagnosticRole} 槽位应为 ${slot.difficulty} 级难度`,
          question.id,
          { blueprintSlotId: slot.id, primaryKnowledgePointId: slot.primaryKnowledgePointId, diagnosticRole: slot.diagnosticRole },
        ));
      }
    });
  }
  if (!targetedRepair && task.moduleKind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT) {
    (lesson?.knowledgePoints || []).forEach((knowledgePoint) => {
      const scoped = questions.filter((question) => (
        diagnosticSlotForQuestion(question)?.primaryKnowledgePointId === knowledgePoint.id
      ));
      if (scoped.length < 4) issues.push(taskIssue(
        task,
        'POOL_QUANTITY_INSUFFICIENT',
        `${knowledgePoint.name}的课前主证据题只有 ${scoped.length} 道，至少需要 4 道`,
      ));
      if (new Set(scoped.map((question) => question.type).filter(Boolean)).size < 2) issues.push(taskIssue(
        task,
        'POOL_TYPE_INSUFFICIENT',
        `${knowledgePoint.name}的课前测验至少需要 2 种题型`,
      ));
      if (new Set(scoped.map((question) => difficultyNumber(question.difficulty)).filter((value) => DIFFICULTY_LEVELS.includes(value))).size < 2) issues.push(taskIssue(
        task,
        'QUESTION_DIFFICULTY_STRUCTURE_INVALID',
        `${knowledgePoint.name}的课前测验至少需要 2 个难度层级`,
      ));
    });
  }
  return issues;
}

function runtimeFromResult(result) {
  return result?.runtime || result?.openMaic || result || {};
}

function lockedDifficulty(value, fallback = 'D3') {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (/^D[1-5]$/.test(normalized)) return normalized;
  if (/^[1-5]$/.test(normalized)) return `D${normalized}`;
  return fallback;
}

function lockedCompositeEvidenceMap(question) {
  const ids = questionKnowledgeIds(question);
  if (ids.length < 2) return question.knowledgeEvidenceMap;
  const primary = question.primaryKnowledgePointId && ids.includes(question.primaryKnowledgePointId)
    ? question.primaryKnowledgePointId : ids[0];
  const rubricScore = Array.isArray(question.rubric)
    ? question.rubric.reduce((sum, item) => sum + Math.max(0, Number(item?.score || item?.maxScore || 0)), 0)
    : 0;
  const total = Math.max(0, Number(question.maxScore || question.score || rubricScore || ids.length));
  const each = total / ids.length;
  const existing = Array.isArray(question.knowledgeEvidenceMap) ? question.knowledgeEvidenceMap : [];
  return ids.map((knowledgePointId, index) => {
    const prior = existing.find((item) => item?.knowledgePointId === knowledgePointId) || {};
    return {
      scoringPointId: `K${index + 1}`,
      knowledgePointId,
      role: knowledgePointId === primary ? 'PRIMARY' : 'SECONDARY',
      weight: knowledgePointId === primary ? 1 : 0.3,
      maxScore: index === ids.length - 1 ? total - each * index : each,
      analysisPoint: String(prior.analysisPoint || prior.evidence
        || `完成第${index + 1}个知识点对应的数量关系、运算或结论。`).trim(),
    };
  });
}

// Difficulty and evidence metadata are server-owned. AI may return a numeric
// legacy value or omit the composite map; normalize it before the draft patch
// reaches the authoritative quality gate.
function lockGeneratedQuestionMetadata(task, question, index) {
  const targetDifficulty = task.targetQuestionDifficulties?.[index];
  const normalized = {
    ...question,
    difficulty: lockedDifficulty(targetDifficulty || question?.difficulty),
  };
  if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW) {
    const map = lockedCompositeEvidenceMap(normalized);
    if (map) normalized.knowledgeEvidenceMap = map;
  }
  return normalized;
}

export function buildLessonGenerationDraftPatch({ task, result }) {
  const base = { schemaVersion: 1, taskId: task.id, moduleId: task.moduleId };
  if ([
    LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT,
    LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS,
    LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW,
  ].includes(task.moduleKind)) {
    if (!Array.isArray(result?.questions) || result.questions.length === 0) return null;
    const repairTargetCount = (task.targetQuestionIds?.length || 0)
      + (task.targetBlueprintSlots?.length || 0)
      + Math.max(0, Number(task.missingQuestionCount || 0));
    if (task.taskType === 'repair' && repairTargetCount === 0) return null;
    const lockedQuestions = result.questions.map((question, index) => lockGeneratedQuestionMetadata(task, question, index));
    const assessmentMatrix = result.assessmentMatrix
      || result.assessmentMatrices?.[task.knowledgePointId]
      || null;
    const operations = [{
      type: 'replace-question-module',
      moduleKind: task.moduleKind,
      knowledgePointId: task.knowledgePointId,
      targetQuestionIds: task.targetQuestionIds || [],
      targetBlueprintSlots: task.targetBlueprintSlots || [],
      mergeMode: task.targetBlueprintSlots?.length
        ? 'append-slots'
        : task.taskType === 'repair'
          ? task.repairMode || (task.targetQuestionIds?.length ? 'targeted' : 'append-missing')
          : 'replace',
      missingQuestionCount: Math.max(0, Number(task.missingQuestionCount || 0)),
      requiredCount: Math.max(0, Number(task.requiredCount || 0)),
      questions: lockedQuestions,
    }];
    if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS
      && assessmentMatrix && typeof assessmentMatrix === 'object') {
      operations.push({
        type: 'replace-assessment-matrix',
        moduleKind: task.moduleKind,
        knowledgePointId: task.knowledgePointId,
        assessmentMatrix,
      });
    }
    return {
      ...base,
      operations,
    };
  }
  const runtime = runtimeFromResult(result);
  if (!runtime || typeof runtime !== 'object' || !Object.keys(runtime).length) return null;
  return {
    ...base,
    operations: [{
      type: 'replace-classroom-module',
      moduleKind: task.moduleKind,
      knowledgePointId: task.knowledgePointId,
      runtime,
    }],
  };
}

export function mergeLessonGenerationDraftPatches(patches = []) {
  const operations = [];
  const operationIndex = new Map();
  patches.filter(Boolean).flatMap((patch) => patch.operations || []).forEach((operation) => {
    const key = `${operation.type}:${operation.moduleKind}:${operation.knowledgePointId || ''}:${(operation.targetQuestionIds || []).join(',')}:${(operation.targetBlueprintSlots || []).map((slot) => slot.id).join(',')}`;
    if (operationIndex.has(key)) operations[operationIndex.get(key)] = operation;
    else {
      operationIndex.set(key, operations.length);
      operations.push(operation);
    }
  });
  return { schemaVersion: 1, operations };
}

function mergeRepairQuestionSet(existingQuestions, generatedQuestions, operation, prepareReplacement = (_original, question) => question) {
  const existing = [...existingQuestions];
  const generated = [...generatedQuestions];
  const targets = [...new Set(operation.targetQuestionIds || [])];
  const missingQuestionCount = Math.max(0, Number(operation.missingQuestionCount || 0));

  if (targets.length) {
    const generatedById = new Map(generated.map((question, index) => [question?.id, { question, index }]));
    const usedGenerated = new Set();
    const hasExactTargetIds = targets.some((targetId) => generatedById.has(targetId));
    targets.forEach((targetId) => {
      const existingIndex = existing.findIndex((question) => question?.id === targetId);
      if (existingIndex < 0) return;
      let replacementIndex = generatedById.get(targetId)?.index;
      if (!hasExactTargetIds && (replacementIndex === undefined || usedGenerated.has(replacementIndex))) {
        replacementIndex = generated.findIndex((_question, index) => !usedGenerated.has(index));
      }
      if (replacementIndex === undefined || replacementIndex < 0 || usedGenerated.has(replacementIndex)) return;
      usedGenerated.add(replacementIndex);
      existing[existingIndex] = prepareReplacement(existing[existingIndex], generated[replacementIndex]);
    });
    const remaining = generated.filter((_question, index) => !usedGenerated.has(index));
    existing.push(...remaining.slice(0, missingQuestionCount).map((question) => prepareReplacement(null, question)));
    return existing;
  }

  if (operation.mergeMode === 'append-missing') {
    return [
      ...existing,
      ...generated.slice(0, missingQuestionCount).map((question) => prepareReplacement(null, question)),
    ];
  }

  // A repair without an authoritative question id or missing-slot count is not
  // allowed to mutate the pool. Keep it for review instead of guessing scope.
  return existing;
}

function questionBlueprintSlotId(question, moduleKind) {
  const explicit = String(question?.blueprintSlotId || '').trim();
  if (explicit) return explicit;
  return moduleKind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT
    ? diagnosticSlotForQuestion(question)?.id || ''
    : '';
}

function mergeQuestionSlotRepairs(
  existingQuestions,
  generatedQuestions,
  operation,
  prepareReplacement = (_original, question) => question,
) {
  const targetBlueprintSlots = operation.targetBlueprintSlots || [];
  const targets = new Set((targetBlueprintSlots || []).map((slot) => slot.id));
  const generatedBySlot = new Map();
  generatedQuestions.forEach((question) => {
    const slotId = questionBlueprintSlotId(question, operation.moduleKind);
    if (slotId && targets.has(slotId) && !generatedBySlot.has(slotId)) {
      generatedBySlot.set(slotId, question);
    }
  });
  const retainedTargetSlots = new Set();
  const merged = existingQuestions.flatMap((question) => {
    const slotId = questionBlueprintSlotId(question, operation.moduleKind);
    if (!slotId || !targets.has(slotId)) return [question];
    if (retainedTargetSlots.has(slotId)) return [];
    retainedTargetSlots.add(slotId);
    const generated = generatedBySlot.get(slotId);
    return [generated ? prepareReplacement(question, generated) : question];
  });
  targetBlueprintSlots.forEach((slot) => {
    if (!retainedTargetSlots.has(slot.id) && generatedBySlot.has(slot.id)) {
      merged.push(prepareReplacement(null, generatedBySlot.get(slot.id)));
      retainedTargetSlots.add(slot.id);
    }
  });
  return merged;
}

/** Applies operation patches against the latest draft, so parallel results never overwrite siblings. */
export function applyLessonGenerationDraftPatch(content, patch) {
  return (patch?.operations || []).reduce((current, operation) => {
    if (operation.type === 'replace-assessment-matrix') {
      if (!operation.knowledgePointId || !operation.assessmentMatrix) return current;
      return {
        ...current,
        assessmentMatrices: {
          ...(current.assessmentMatrices || {}),
          [operation.knowledgePointId]: operation.assessmentMatrix,
        },
      };
    }
    if (operation.type === 'replace-question-module') {
      if (operation.moduleKind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT) {
        if (operation.mergeMode === 'append-slots' && operation.targetBlueprintSlots?.length) {
          return {
            ...current,
            preQuestions: mergeQuestionSlotRepairs(
              current.preQuestions || [],
              operation.questions,
              operation,
            ),
          };
        }
        if (operation.mergeMode !== 'replace') {
          return {
            ...current,
            preQuestions: mergeRepairQuestionSet(current.preQuestions || [], operation.questions, operation),
          };
        }
        return { ...current, preQuestions: [...operation.questions] };
      }
      const postQuestions = current.postQuestions || [];
      if (operation.mergeMode !== 'replace') {
        const moduleQuestions = postQuestions.filter((question) => (
          operation.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW
            ? question.phase === 'review'
            : question.phase !== 'review' && questionKnowledgeIds(question)[0] === operation.knowledgePointId
        ));
        const otherQuestions = postQuestions.filter((question) => !moduleQuestions.includes(question));
        // Runtime metadata is server-owned. A targeted repair response may
        // contain only the newly written stem/answer and omit the original
        // blueprint fields. Preserve the stable difficulty and evidence slot
        // across successive repair rounds.
        const prepareReplacement = (original, question) => {
          const tagged = operation.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW
            ? { ...question, phase: 'review' }
            : question;
          if (!original || operation.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW) return tagged;
          const targetSlot = (operation.targetBlueprintSlots || []).find((slot) => (
            String(slot?.id || '') === String(original.blueprintSlotId || '')
          ));
          return {
            ...original,
            ...tagged,
            ...(original.blueprintSlotId ? {
              id: original.id,
              phase: original.phase || 'knowledge',
              purpose: original.purpose || 'post',
              difficulty: lockedDifficulty(targetSlot?.difficulty || original.difficulty),
              adaptiveRole: original.adaptiveRole,
              blueprintSlotId: original.blueprintSlotId,
              primaryKnowledgePointId: original.primaryKnowledgePointId,
              knowledgePointIds: original.knowledgePointIds,
              knowledgePointWeights: original.knowledgePointWeights,
              knowledgeEvidenceMap: original.knowledgeEvidenceMap,
            } : {}),
          };
        };
        const mergedModule = operation.mergeMode === 'append-slots'
          && operation.targetBlueprintSlots?.length
          ? mergeQuestionSlotRepairs(
              moduleQuestions,
              operation.questions,
              operation,
              prepareReplacement,
            )
          : mergeRepairQuestionSet(
              moduleQuestions,
              operation.questions,
              operation,
              prepareReplacement,
            );
        return {
          ...current,
          postQuestions: [...otherQuestions, ...mergedModule],
        };
      }
      if (operation.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW) {
        return {
          ...current,
          postQuestions: [
            ...postQuestions.filter((question) => question.phase !== 'review'),
            ...operation.questions.map((question) => ({ ...question, phase: 'review' })),
          ],
        };
      }
      return {
        ...current,
        postQuestions: [
          ...postQuestions.filter((question) => question.phase === 'review'
            || questionKnowledgeIds(question)[0] !== operation.knowledgePointId),
          ...operation.questions.filter((question) => question.phase !== 'review'),
        ],
      };
    }
    if (operation.type === 'replace-classroom-module') {
      const learningContent = current.learningContent || { composite: current.openMaic || null, knowledgePoints: [] };
      if (operation.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM) {
        return { ...current, learningContent: { ...learningContent, composite: operation.runtime } };
      }
      return {
        ...current,
        learningContent: {
          ...learningContent,
          knowledgePoints: [
            ...(learningContent.knowledgePoints || []).filter((item) => item.knowledgeObjectiveId !== operation.knowledgePointId),
            { knowledgeObjectiveId: operation.knowledgePointId, openMaic: operation.runtime },
          ],
        },
      };
    }
    return current;
  }, { ...content });
}

export function settleLessonGenerationTask({ graph, taskId, result, error, lesson, content }) {
  const task = graph.tasks.find((item) => item.id === taskId);
  if (!task || !['generation', 'repair'].includes(task.taskType) || isTerminalTask(task)) {
    return { graph, task, patch: null };
  }
  const issues = error
    ? [taskIssue(task, 'GENERATION_FAILED', error.message || String(error))]
    : validateLessonGenerationTaskResult({ task, result, lesson, content });
  const patch = error ? null : buildLessonGenerationDraftPatch({ task, result });
  const status = error || !patch
    ? LESSON_GENERATION_TASK_STATUS.FAILED
    : issues.length
      ? LESSON_GENERATION_TASK_STATUS.PARTIAL
      : LESSON_GENERATION_TASK_STATUS.COMPLETED;
  const settledTask = { ...task, status, issues, outputPatch: patch, error: error?.message || '' };
  const updated = { ...graph, tasks: graph.tasks.map((item) => item.id === taskId ? settledTask : item) };
  return { graph: ensureQualityCheckTask(updated, task.round), task: settledTask, patch };
}

function repairTargetsForModule(classifiedIssues, moduleId) {
  return [...new Set(classifiedIssues
    .filter((item) => item.moduleIds.includes(moduleId))
    .flatMap((item) => item.targetQuestionIds || []))];
}

function repairBlueprintSlotsForModule(classifiedIssues, moduleId) {
  return [...new Map(classifiedIssues
    .filter((item) => item.moduleIds.includes(moduleId))
    .flatMap((item) => item.targetBlueprintSlots || [])
    .map((slot) => [slot.id, slot])).values()];
}

export function settleLessonQualityCheck({ graph, taskId, issues = [], lesson, content }) {
  const task = graph.tasks.find((item) => item.id === taskId);
  if (!task || task.taskType !== 'quality_check' || isTerminalTask(task)) return graph;
  const passed = issues.length === 0;
  const settledQualityTask = {
    ...task,
    status: LESSON_GENERATION_TASK_STATUS.COMPLETED,
    passed,
    issues,
  };
  let updated = { ...graph, tasks: graph.tasks.map((item) => item.id === taskId ? settledQualityTask : item) };
  if (passed) return { ...updated, phase: 'ready', exhausted: false };

  const plan = buildQualityRepairPlan({
    issues,
    lesson,
    content,
    completedRepairRounds: task.round,
  });
  if (plan.exhausted || !plan.actions.length) {
    return { ...updated, phase: 'failed', exhausted: plan.exhausted, remainingIssues: plan.remainingIssues.length ? plan.remainingIssues : issues };
  }

  const nextRound = task.round + 1;
  const modulesById = new Map(plan.modules.map((module) => [module.id, module]));
  const repairTasks = plan.repairModuleIds.map((moduleId) => {
    const action = plan.actions.find((item) => item.moduleIds.includes(moduleId));
    return createModuleTask(modulesById.get(moduleId), {
      taskType: 'repair',
      round: nextRound,
      dependencies: [task.id],
      targetQuestionIds: action?.targetQuestionIds
        || repairTargetsForModule(plan.classifiedIssues, moduleId),
      targetBlueprintSlots: action?.targetBlueprintSlots
        || repairBlueprintSlotsForModule(plan.classifiedIssues, moduleId),
    });
  });
  updated = {
    ...updated,
    phase: 'repair',
    repairRound: nextRound,
    exhausted: false,
    tasks: [...updated.tasks, ...repairTasks],
  };
  return updated;
}
