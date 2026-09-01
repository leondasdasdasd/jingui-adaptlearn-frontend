import {
  buildPreAssessmentBlueprint,
  diagnosticSlotForQuestion,
} from "../../../shared/domain/preAssessmentBlueprint.js";
import {
  compositeReviewBlueprint,
  compositeReviewCount,
  DIFFICULTY_LEVELS,
  PRACTICE_POOL_DIFFICULTY_COUNTS,
  practicePoolBlueprint,
} from "../../../shared/domain/questionPoolPolicy.js";
import {
  buildLessonGenerationModules,
  difficultyNumber,
  LESSON_GENERATION_MODULE_KIND,
  orderedActions,
  questionKnowledgeIds,
  questionModuleId,
} from "./modules.js";
import { hasIndependentEvidenceMap } from "./taskValidation.js";

export const MAX_AUTOMATIC_REPAIR_ROUNDS = 4;

const QUESTION_ISSUE_CODES = new Set([
  "QUESTION_POOL_MISSING",
  "QUESTION_QUANTITY_INSUFFICIENT",
  "QUESTION_STEM_MISSING",
  "QUESTION_TYPE_MISSING",
  "QUESTION_DIFFICULTY_INVALID",
  "QUESTION_DIFFICULTY_VERSION_INVALID",
  "QUESTION_DIFFICULTY_STRUCTURE_INVALID",
  "QUESTION_SCOPE_MISSING",
  "QUESTION_SCOPE_OUT_OF_RANGE",
  "ANSWER_MISSING",
  "RUBRIC_MISSING",
  "PRIMARY_KNOWLEDGE_MISSING",
  "PRIMARY_KNOWLEDGE_WEIGHT_INVALID",
  "SECONDARY_KNOWLEDGE_WEIGHT_INVALID",
  "DUPLICATE_QUESTION",
  "POOL_QUANTITY_INSUFFICIENT",
  "POOL_TYPE_INSUFFICIENT",
  "POOL_DIFFICULTY_INSUFFICIENT",
  "PRE_ASSESSMENT_SLOT_MISSING",
  "PRE_ASSESSMENT_SLOT_DUPLICATED",
  "PRE_ASSESSMENT_SLOT_DIFFICULTY_INVALID",
  "ADAPTIVE_POOL_QUANTITY_INSUFFICIENT",
  "ADAPTIVE_POOL_DIFFICULTY_INSUFFICIENT",
  "BLUEPRINT_MISMATCH",
  "ANSWER_RUBRIC_INCONSISTENT",
  "QUESTION_AMBIGUOUS",
  "UNINTENDED_MULTIPLE_SOLUTIONS",
  "QUESTION_QUALITY_LOW",
  "QUESTION_DIFFICULTY_MISMATCH",
  "QUESTION_REASONING_TOO_SHALLOW",
  "QUESTION_DISTRACTORS_WEAK",
  "QUESTION_OUT_OF_SCOPE",
  "GENERIC_SHORT_ANSWER",
  "QUESTION_MIX_INSUFFICIENT",
  "APPLICATION_CONTEXT_FAKE",
  "APPLICATION_REASONING_INCOMPLETE",
  "CONCEPT_EXPLANATION_OVERUSED",
]);

const COMPOSITE_REVIEW_ISSUE_CODES = new Set([
  "COMPOSITE_REVIEW_MISSING",
  "COMPOSITE_REVIEW_QUANTITY_INSUFFICIENT",
  "COMPOSITE_REVIEW_SCOPE_INVALID",
  "COMPOSITE_EVIDENCE_MAP_MISSING",
  "COMPOSITE_REVIEW_EVIDENCE_INVALID",
  "COMPOSITE_REVIEW_TYPE_DISTRIBUTION_INVALID",
]);

const QUESTION_QUANTITY_ISSUE_CODES = new Set([
  "QUESTION_POOL_MISSING",
  "QUESTION_QUANTITY_INSUFFICIENT",
  "POOL_QUANTITY_INSUFFICIENT",
  "ADAPTIVE_POOL_QUANTITY_INSUFFICIENT",
  "COMPOSITE_REVIEW_MISSING",
  "COMPOSITE_REVIEW_QUANTITY_INSUFFICIENT",
]);

const TYPE_DISTRIBUTION_ISSUE_CODES = new Set([
  "COMPOSITE_REVIEW_TYPE_DISTRIBUTION_INVALID",
  "POOL_TYPE_INSUFFICIENT",
  "QUESTION_MIX_INSUFFICIENT",
]);

const COMPOSITE_CLASSROOM_ISSUE_CODES = new Set([
  "OPENMAIC_COVERAGE_MISSING",
  "OPENMAIC_NOT_READY",
  "OPENMAIC_CLASSROOM_ID_MISSING",
  "OPENMAIC_CLASSROOM_URL_MISSING",
]);

const KNOWLEDGE_CLASSROOM_ISSUE_CODES = new Set([
  "KNOWLEDGE_OPENMAIC_NOT_READY",
  "KNOWLEDGE_OPENMAIC_SCOPE_INVALID",
]);

/**
 *
 * @param issue
 * @param lesson
 */
function findKnowledgePointIds(issue, lesson) {
  const message = String(issue?.message || "");
  return (lesson?.knowledgePoints || [])
    .filter(
      (knowledgePoint) =>
        message.includes(knowledgePoint.id) ||
        message.includes(knowledgePoint.name),
    )
    .map((knowledgePoint) => knowledgePoint.id);
}

/**
 *
 * @param issue
 * @param questions
 */
function explicitIssueQuestionId(issue, questions) {
  const explicit = String(issue?.questionId || "").trim();
  if (explicit) return explicit;
  const message = String(issue?.message || "");
  // Quality-review messages place the affected current id immediately after
  // “题目”.  Older ids can be embedded inside that id after several repair
  // rounds, so substring matching may select both the current record and an
  // obsolete ancestor. Prefer the longest exact id occurring at that marker.
  return (
    questions
      .map((question) => String(question?.id || ""))
      .filter(Boolean)
      .filter(
        (id) => message.includes(`题目 ${id}`) || message.includes(`题 ${id}`),
      )
      .sort((left, right) => right.length - left.length)[0] || ""
  );
}

/**
 *
 * @param issue
 * @param lesson
 * @param content
 */
function findQuestionModuleIds(issue, lesson, content) {
  const message = String(issue?.message || "");
  const questions = [
    ...(content?.preQuestions || []),
    ...(content?.postQuestions || []),
  ];
  const explicitQuestionId = explicitIssueQuestionId(issue, questions);
  return [
    ...new Set(
      questions
        .filter((question) => {
          if (explicitQuestionId) return question?.id === explicitQuestionId;
          if (question?.id && message.includes(question.id)) return true;
          const stem = String(question?.stem || "")
            .replaceAll(/\s+/g, " ")
            .trim();
          return stem.length >= 4 && message.includes(stem.slice(0, 24));
        })
        .map((question) => questionModuleId(question, lesson))
        .filter(Boolean),
    ),
  ];
}

/**
 *
 * @param issue
 * @param content
 */
function findQuestionIds(issue, content) {
  const message = String(issue?.message || "");
  const questions = [
    ...(content?.preQuestions || []),
    ...(content?.postQuestions || []),
  ];
  const explicitQuestionId = explicitIssueQuestionId(issue, questions);
  if (explicitQuestionId) return [explicitQuestionId];
  const matchedIds = questions
    .map((question) => String(question?.id || ""))
    .filter((id) => id && message.includes(id));
  const longestMatchedIds = matchedIds.filter(
    (id) =>
      !matchedIds.some(
        (other) => other.length > id.length && other.startsWith(id),
      ),
  );
  if (longestMatchedIds.length > 0) return longestMatchedIds;
  return questions
    .filter((question) => {
      const stem = String(question?.stem || "")
        .replaceAll(/\s+/g, " ")
        .trim();
      return stem.length >= 4 && message.includes(stem.slice(0, 24));
    })
    .map((question) => question.id)
    .filter(Boolean);
}

// Some Java gates report a version/metadata defect without embedding an
// individual question id. Resolve those defects deterministically from the
// current draft so a repair replaces only the affected records instead of
// regenerating an entire pool and damaging already-valid questions.
/**
 *
 * @param issue
 * @param content
 */
function metadataDefectQuestionIds(issue, content) {
  const code = String(issue?.code || "").toUpperCase();
  const questions = [
    ...(content?.preQuestions || []),
    ...(content?.postQuestions || []),
  ];
  if (code === "QUESTION_DIFFICULTY_VERSION_INVALID") {
    return questions
      .filter((question) => {
        const value = String(question?.difficulty ?? "")
          .trim()
          .toUpperCase();
        return /^[1-5]$/.test(value) && question?.id;
      })
      .map((question) => question.id);
  }
  if (
    code === "COMPOSITE_EVIDENCE_MAP_MISSING" ||
    code === "COMPOSITE_REVIEW_EVIDENCE_INVALID"
  ) {
    return questions
      .filter((question) => {
        if (question?.phase !== "review" || !question?.id) return false;
        return !hasIndependentEvidenceMap(question);
      })
      .map((question) => question.id);
  }
  return [];
}

/**
 *
 * @param issue
 * @param lesson
 */
function findPreAssessmentBlueprintSlots(issue, lesson) {
  const explicitSlotId = String(issue?.blueprintSlotId || "");
  const explicitKnowledgePointId = String(issue?.primaryKnowledgePointId || "");
  const explicitRole = String(issue?.diagnosticRole || "").toUpperCase();
  return buildPreAssessmentBlueprint(lesson?.knowledgePoints || []).filter(
    (slot) =>
      (explicitSlotId && slot.id === explicitSlotId) ||
      (explicitKnowledgePointId &&
        explicitRole &&
        slot.primaryKnowledgePointId === explicitKnowledgePointId &&
        slot.diagnosticRole === explicitRole),
  );
}

/**
 *
 * @param issue
 * @param lesson
 * @param content
 * @param reservedQuestionIds
 */
function difficultyQuotaRepairQuestionIds(
  issue,
  lesson,
  content,
  reservedQuestionIds = new Set(),
) {
  const quota = difficultyQuota(issue, lesson);
  if (!quota) return [];
  const pool = (content?.postQuestions || []).filter(
    (question) =>
      question?.phase !== "review" &&
      questionKnowledgeIds(question)[0] === quota.knowledgePointId &&
      question?.id,
  );
  return surplusDifficultyQuestions(pool, quota.missingDifficulty)
    .filter((question) => !reservedQuestionIds.has(question.id))
    .slice(0, quota.missingCount)
    .map((question) => question.id);
}

/**
 *
 * @param issue
 * @param lesson
 */
function difficultyQuota(issue, lesson) {
  const { code = "", message = "" } = issue || {};
  if (String(code).toUpperCase() !== "ADAPTIVE_POOL_DIFFICULTY_INSUFFICIENT")
    return null;
  const match = String(message).match(
    /(D[1-5]|基础|直接理解|标准|变式综合|进阶|迁移应用)(?:基础识别|直接理解|标准应用|变式综合|迁移应用)?题有\s*\d+\s*道\D*还需补充\s*(\d+)\s*道/,
  );
  const knowledgePointIds = findKnowledgePointIds(issue, lesson);
  if (!match || knowledgePointIds.length !== 1) return null;
  const difficultyByLabel = {
    D1: 1,
    D2: 2,
    D3: 3,
    D4: 4,
    D5: 5,
    基础: 1,
    直接理解: 2,
    标准: 2,
    变式综合: 4,
    进阶: 3,
    迁移应用: 5,
  };
  const missingDifficulty = difficultyByLabel[match[1]];
  const missingCount = Number(match[2] || 0);
  return missingDifficulty && missingCount > 0
    ? {
        missingDifficulty,
        missingCount,
        knowledgePointId: knowledgePointIds[0],
      }
    : null;
}

/**
 *
 * @param pool
 * @param missingDifficulty
 */
function surplusDifficultyQuestions(pool, missingDifficulty) {
  return DIFFICULTY_LEVELS.filter(
    (difficulty) => difficulty !== missingDifficulty,
  ).flatMap((difficulty) => {
    const questionsAtDifficulty = pool.filter(
      (question) => difficultyNumber(question.difficulty) === difficulty,
    );
    const surplus = Math.max(
      0,
      questionsAtDifficulty.length -
        Number(PRACTICE_POOL_DIFFICULTY_COUNTS[difficulty] || 0),
    );
    return surplus > 0 ? questionsAtDifficulty.slice(-surplus) : [];
  });
}

/**
 *
 * @param actionIssues
 * @param targetQuestionIds
 * @param lesson
 * @param content
 */
function distributionRepairQuestionTypes(
  actionIssues,
  targetQuestionIds,
  lesson,
  content,
) {
  const distributionTargetIds = [
    ...new Set(
      actionIssues
        .filter((item) => TYPE_DISTRIBUTION_ISSUE_CODES.has(item.code))
        .flatMap((item) => item.targetQuestionIds || []),
    ),
  ];

  const questionById = new Map(
    [...(content?.preQuestions || []), ...(content?.postQuestions || [])].map(
      (question) => [String(question?.id || ""), question],
    ),
  );
  const reviewSlotsById = new Map(
    compositeReviewBlueprint(
      compositeReviewCount(lesson?.knowledgePoints?.length || 0),
    ).map((slot) => [slot.id, slot]),
  );
  const practiceSlotsById = new Map(
    (lesson?.knowledgePoints || []).flatMap((knowledgePoint) =>
      practicePoolBlueprint(knowledgePoint.id).map((slot) => [slot.id, slot]),
    ),
  );
  const preferredTypes = ["ordering", "multiple_choice", "line_connect"];
  const requiredTypeByQuestionId = new Map();

  for (const [index, questionId] of distributionTargetIds.entries()) {
    const requiredType = distributionTypeForQuestion({
      question: questionById.get(questionId),
      index,
      reviewSlotsById,
      practiceSlotsById,
      preferredTypes,
    });
    if (requiredType) requiredTypeByQuestionId.set(questionId, requiredType);
  }

  return targetQuestionIds.map(
    (questionId) =>
      requiredTypeByQuestionId.get(questionId) ||
      String(questionById.get(questionId)?.type || ""),
  );
}

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.index
 * @param root0.reviewSlotsById
 * @param root0.practiceSlotsById
 * @param root0.preferredTypes
 */
function distributionTypeForQuestion({
  question,
  index,
  reviewSlotsById,
  practiceSlotsById,
  preferredTypes,
}) {
  const slotId = String(question?.blueprintSlotId || "");
  const slot =
    question?.phase === "review"
      ? reviewSlotsById.get(slotId)
      : practiceSlotsById.get(slotId);
  const recommendedTypes =
    slot?.recommendedQuestionTypes || question?.recommendedQuestionTypes || [];
  const allowedTypes = recommendedTypes.filter(
    (type) => type && type !== "short_answer" && type !== question?.type,
  );
  const difficulty = difficultyNumber(question?.difficulty || slot?.difficulty);
  const preferred =
    difficulty === 5
      ? ["multiple_choice", "ordering"]
      : preferredTypes.map(
          (_type, offset) =>
            preferredTypes[(index + offset) % preferredTypes.length],
        );
  return (
    preferred.find((type) => allowedTypes.includes(type)) || allowedTypes[0]
  );
}

const QUESTION_CATEGORY = "questions";
const COMPOSITE_REVIEW_CATEGORY = "composite-review";

/**
 *
 * @param targetQuestionIds
 * @param lesson
 * @param content
 */
function moduleIdsForTargetQuestions(targetQuestionIds, lesson, content) {
  const targetSet = new Set(targetQuestionIds);
  return [
    ...new Set(
      [...(content?.preQuestions || []), ...(content?.postQuestions || [])]
        .filter((question) => targetSet.has(question?.id))
        .map((question) => questionModuleId(question, lesson))
        .filter(Boolean),
    ),
  ];
}

/**
 *
 * @param issue
 * @param knowledgePointIds
 */
function poolIssueModuleIds(issue, knowledgePointIds) {
  const message = String(issue?.message || "");
  if (message.includes("课前测验")) return ["pre-assessment"];
  return knowledgePointIds.map((id) => `knowledge-questions:${id}`);
}

/**
 *
 * @param root0
 * @param root0.issue
 * @param root0.code
 * @param root0.lesson
 * @param root0.content
 * @param root0.targetQuestionIds
 * @param root0.knowledgePointIds
 */
function knownQuestionModuleIds({
  issue,
  code,
  lesson,
  content,
  targetQuestionIds,
  knowledgePointIds,
}) {
  const located = findQuestionModuleIds(issue, lesson, content);
  if (code.startsWith("PRE_ASSESSMENT_SLOT_")) return ["pre-assessment"];
  if (located.length > 0) return located;
  if (code === "QUESTION_DIFFICULTY_VERSION_INVALID") {
    return moduleIdsForTargetQuestions(targetQuestionIds, lesson, content);
  }
  if (code.startsWith("ADAPTIVE_POOL_")) {
    return knowledgePointIds.map((id) => `knowledge-questions:${id}`);
  }
  if (code.startsWith("POOL_"))
    return poolIssueModuleIds(issue, knowledgePointIds);
  return code === "QUESTION_POOL_MISSING"
    ? knowledgePointIds.map((id) => `knowledge-questions:${id}`)
    : [];
}

const CLASSIFICATION_RULES = [
  {
    matches: ({ code, targetQuestionIds }) =>
      code === "OPENMAIC_COVERAGE_MISSING" && targetQuestionIds.length > 0,
    resolve: ({ issue, lesson, content }) => ({
      category: QUESTION_CATEGORY,
      moduleIds: findQuestionModuleIds(issue, lesson, content),
    }),
  },
  {
    matches: ({ code }) => COMPOSITE_CLASSROOM_ISSUE_CODES.has(code),
    resolve: () => ({
      category: "composite-classroom",
      moduleIds: ["composite-classroom"],
    }),
  },
  {
    matches: ({ code }) => KNOWLEDGE_CLASSROOM_ISSUE_CODES.has(code),
    resolve: ({ knowledgePointIds, lesson }) => ({
      category: "knowledge-classroom",
      moduleIds: (knowledgePointIds.length > 0
        ? knowledgePointIds
        : (lesson?.knowledgePoints || []).map((item) => item.id)
      ).map((id) => `knowledge-classroom:${id}`),
    }),
  },
  {
    matches: ({ code }) => COMPOSITE_REVIEW_ISSUE_CODES.has(code),
    resolve: () => ({
      category: COMPOSITE_REVIEW_CATEGORY,
      moduleIds: [COMPOSITE_REVIEW_CATEGORY],
    }),
  },
  {
    matches: ({ code }) => QUESTION_ISSUE_CODES.has(code),
    resolve: (context) => ({
      category: QUESTION_CATEGORY,
      moduleIds: knownQuestionModuleIds(context),
    }),
  },
  {
    matches: ({ code }) =>
      [
        "COMPOSITE_EVIDENCE_MAP_MISSING",
        "COMPOSITE_REVIEW_EVIDENCE_INVALID",
      ].includes(code),
    resolve: () => ({
      category: COMPOSITE_REVIEW_CATEGORY,
      moduleIds: [COMPOSITE_REVIEW_CATEGORY],
    }),
  },
  {
    matches: ({ targetQuestionIds }) => targetQuestionIds.length > 0,
    resolve: ({ issue, lesson, content }) => ({
      category: QUESTION_CATEGORY,
      moduleIds: findQuestionModuleIds(issue, lesson, content),
    }),
  },
];

/**
 *
 * @param issue
 * @param root0
 * @param root0.lesson
 * @param root0.content
 * @param root0.modules
 * @param root0.reservedQuestionIds
 */
export function classifyContentQualityIssue(
  issue,
  {
    lesson,
    content,
    modules = buildLessonGenerationModules({ lesson, content }),
    reservedQuestionIds = new Set(),
  },
) {
  const code = String(issue?.code || "").toUpperCase();
  const knowledgePointIds = findKnowledgePointIds(issue, lesson);
  const targetQuestionIds = [
    ...findQuestionIds(issue, content),
    ...metadataDefectQuestionIds(issue, content),
    ...difficultyQuotaRepairQuestionIds(
      issue,
      lesson,
      content,
      reservedQuestionIds,
    ),
  ];
  const targetBlueprintSlots = findPreAssessmentBlueprintSlots(issue, lesson);
  const context = {
    issue,
    code,
    lesson,
    content,
    targetQuestionIds,
    knowledgePointIds,
  };
  const classification = CLASSIFICATION_RULES.find((rule) =>
    rule.matches(context),
  )?.resolve(context) || { category: "manual-review", moduleIds: [] };
  const { category } = classification;
  let { moduleIds } = classification;

  moduleIds = knownClassificationModuleIds(moduleIds, issue, modules);
  const slotScopedQuestionRepair =
    targetQuestionIds.length > 0 ||
    targetBlueprintSlots.length > 0 ||
    QUESTION_QUANTITY_ISSUE_CODES.has(code);
  const questionCategory =
    category === "questions" || category === "composite-review";
  return {
    issue,
    code,
    category,
    moduleIds,
    targetQuestionIds: [...new Set(targetQuestionIds)],
    targetBlueprintSlots,
    repairable:
      moduleIds.length > 0 && (!questionCategory || slotScopedQuestionRepair),
  };
}

/**
 *
 * @param moduleIds
 * @param issue
 * @param modules
 */
function knownClassificationModuleIds(moduleIds, issue, modules) {
  const candidates = Array.isArray(issue?.moduleIds)
    ? [...moduleIds, ...issue.moduleIds]
    : moduleIds;
  const known = new Set(modules.map((generationModule) => generationModule.id));
  return [...new Set(candidates)].filter((id) => known.has(id));
}

/**
 *
 * @param actionIssues
 */
function uniqueBlueprintSlots(actionIssues) {
  return [
    ...new Map(
      actionIssues
        .flatMap((item) => item.targetBlueprintSlots || [])
        .map((slot) => [slot.id, slot]),
    ).values(),
  ];
}

/**
 *
 * @param module
 * @param content
 * @param targetQuestionIds
 * @param slots
 */
function preAssessmentRepairSlots(module, content, targetQuestionIds, slots) {
  if (module?.kind !== LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT)
    return slots;
  const questionById = new Map(
    (content?.preQuestions || []).map((question) => [
      String(question?.id || ""),
      question,
    ]),
  );
  const questionSlots = targetQuestionIds
    .map((questionId) =>
      diagnosticSlotForQuestion(questionById.get(questionId)),
    )
    .filter(Boolean);
  return [
    ...new Map(
      [...questionSlots, ...slots].map((slot) => [slot.id, slot]),
    ).values(),
  ];
}

/**
 *
 * @param missingCount
 * @param targetIds
 * @param targetSlots
 */
function repairModeFor(missingCount, targetIds, targetSlots) {
  if (missingCount === 0) return "targeted";
  return targetIds.length > 0 || targetSlots.length > 0
    ? "targeted-and-append"
    : "append-missing";
}

/**
 *
 * @param action
 * @param repairableIssues
 * @param modules
 * @param lesson
 * @param content
 */
function repairAction(action, repairableIssues, modules, lesson, content) {
  const actionIssues = repairableIssues.filter((item) =>
    item.moduleIds.some((moduleId) => action.moduleIds.includes(moduleId)),
  );
  const module = modules.find((item) => action.moduleIds.includes(item.id));
  const hasShortfall = actionIssues.some((item) =>
    QUESTION_QUANTITY_ISSUE_CODES.has(item.code),
  );
  const missingQuestionCount = hasShortfall
    ? Math.max(
        0,
        Number(module?.requiredCount || 0) - Number(module?.currentCount || 0),
      )
    : 0;
  const targetQuestionIds = [
    ...new Set(actionIssues.flatMap((item) => item.targetQuestionIds || [])),
  ];
  const targetBlueprintSlots = preAssessmentRepairSlots(
    module,
    content,
    targetQuestionIds,
    uniqueBlueprintSlots(actionIssues),
  );
  const blueprintCount =
    module?.kind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT &&
    targetBlueprintSlots.length > 0
      ? targetBlueprintSlots.length
      : null;
  const targetQuestionTypes = distributionRepairQuestionTypes(
    actionIssues,
    targetQuestionIds,
    lesson,
    content,
  );
  return {
    ...action,
    targetQuestionIds,
    ...(targetQuestionTypes.some(Boolean) ? { targetQuestionTypes } : {}),
    targetBlueprintSlots,
    repairMode: repairModeFor(
      missingQuestionCount,
      targetQuestionIds,
      targetBlueprintSlots,
    ),
    missingQuestionCount,
    requestedQuestionCount:
      blueprintCount ??
      targetQuestionIds.length +
        targetBlueprintSlots.length +
        missingQuestionCount,
    qualityIssues: actionIssues.map((item) => item.issue),
  };
}

/**
 * Converts authoritative server issues into the smallest safe regeneration plan.
 * completedRepairRounds is zero before the first repair. Once four rounds have
 * completed, the remaining issues are returned for teacher-facing resolution.
 * @param root0
 * @param root0.issues
 * @param root0.lesson
 * @param root0.content
 * @param root0.completedRepairRounds
 */
export function buildQualityRepairPlan({
  issues = [],
  lesson,
  content,
  completedRepairRounds = 0,
}) {
  const modules = buildLessonGenerationModules({ lesson, content });
  const reservedQuotaTargets = new Set();
  const classifiedIssues = issues.map((issue) => {
    const classified = classifyContentQualityIssue(issue, {
      lesson,
      content,
      modules,
      reservedQuestionIds: reservedQuotaTargets,
    });
    if (
      String(issue?.code || "").toUpperCase() ===
      "ADAPTIVE_POOL_DIFFICULTY_INSUFFICIENT"
    ) {
      for (const questionId of classified.targetQuestionIds)
        reservedQuotaTargets.add(questionId);
    }
    return classified;
  });
  const exhausted = completedRepairRounds >= MAX_AUTOMATIC_REPAIR_ROUNDS;
  const repairableIssues = classifiedIssues.filter((item) => item.repairable);
  const repairModuleIds = exhausted
    ? []
    : [...new Set(repairableIssues.flatMap((item) => item.moduleIds))];
  const actions = orderedActions(modules, repairModuleIds).map((action) =>
    repairAction(action, repairableIssues, modules, lesson, content),
  );
  return {
    modules,
    classifiedIssues,
    actions,
    repairModuleIds,
    remainingIssues: classifiedIssues
      .filter((item) => exhausted || !item.repairable)
      .map((item) => item.issue),
    exhausted,
    passed: issues.length === 0,
  };
}
