import { normalizePublishedContentPackage } from "../../shared/domain/publishedLearningContent.js";
import { knowledgeEvidenceProfile } from "../../shared/domain/questionEvidence.js";
import {
  compositeReviewBlueprint,
  PRACTICE_POOL_MAX_SIZE_PER_KNOWLEDGE_POINT,
  practicePoolBlueprint,
} from "../../shared/domain/questionPoolPolicy.js";
import { toQuestionPlatformSerialized } from "../../shared/question-platform/questionContract.js";

const slotByDifficulty = {
  1: "D1_FOUNDATION",
  2: "D2_DIRECT",
  3: "D3_STANDARD",
  4: "D4_VARIANT",
  5: "D5_TRANSFER",
};

const COMMON_QUESTION_CONTENT_FIELDS = [
  "type",
  "stem",
  "answer",
  "analysis",
  "reasoningSteps",
  "hiddenConditions",
  "knowledgeEvidenceMap",
];

const QUESTION_TYPE_CONTENT_FIELDS = Object.freeze({
  single_choice: ["options"],
  multiple_choice: ["options"],
  fill_blank: ["answerKind", "acceptableAnswers", "numericPolicy"],
  short_answer: ["rubric", "maxScore"],
  judgement: [],
  ordering: ["options"],
  classification: ["categories", "items"],
  matching: ["columns"],
  line_connect: ["columns"],
  text_marker: ["segments"],
  word_builder: ["template", "candidateOptions"],
});

const QUESTION_TYPE_OWNED_FIELDS = new Set([
  ...COMMON_QUESTION_CONTENT_FIELDS,
  ...Object.values(QUESTION_TYPE_CONTENT_FIELDS).flat(),
  // Legacy generator aliases are content fields too. The canonical fields
  // above have already been normalized before a 2.0 candidate is built.
  "questionType",
  "choices",
  "correctAnswer",
  "standardAnswer",
  "platformQuestion",
]);

/**
 *
 * @param question
 */
function projectQuestionToTypeContract(question) {
  const allowedContentFields = new Set([
    ...COMMON_QUESTION_CONTENT_FIELDS,
    ...(QUESTION_TYPE_CONTENT_FIELDS[question?.type] || []),
  ]);
  return Object.fromEntries(
    Object.entries(question || {}).filter(
      ([field]) =>
        !QUESTION_TYPE_OWNED_FIELDS.has(field) ||
        allowedContentFields.has(field),
    ),
  );
}

/**
 *
 * @param value
 */
function clonePublishedValue(value) {
  if (Array.isArray(value)) return value.map(clonePublishedValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        clonePublishedValue(item),
      ]),
    );
  }
  return value;
}

/**
 *
 * @param matrices
 */
function approvedAssessmentMatrices(matrices = {}) {
  const approvedAt = new Date().toISOString();
  return Object.fromEntries(
    Object.entries(matrices || {}).map(([knowledgePointId, matrix]) => [
      knowledgePointId,
      {
        ...clonePublishedValue(matrix),
        knowledgePointId,
        reviewStatus: "APPROVED",
        approvedAt,
      },
    ]),
  );
}

/**
 *
 * @param question
 * @param phase
 */
function restoredQuestion(question, phase) {
  const restored = clonePublishedValue(question || {});
  return {
    ...restored,
    phase,
    knowledgePointIds: clonePublishedValue(
      restored.knowledgeObjectiveIds || restored.knowledgePointIds || [],
    ),
  };
}

/**
 * Restores the latest immutable content version into an isolated teacher draft.
 * The returned value has no shared object/array references with the published
 * package and does not perform storage or publication side effects.
 * @param root0
 * @param root0.id
 * @param root0.versionNumber
 * @param root0.contentPackage
 */
export function restoreTeacherDraftFromPublishedVersion({
  id: contentVersionId = "",
  versionNumber = null,
  contentPackage = {},
} = {}) {
  const normalized = normalizePublishedContentPackage(contentPackage);
  const diagnosticQuestions = normalized.diagnosticQuestionPool || [];
  const knowledgeQuestions = Object.values(
    normalized.knowledgePracticePools || {},
  ).flat();
  const compositeQuestions = normalized.compositeReviewPool || [];

  return {
    lessonId: normalized.lesson?.id || "",
    preQuestions: diagnosticQuestions.map((question) =>
      restoredQuestion(question, "diagnostic"),
    ),
    postQuestions: [
      ...knowledgeQuestions.map((question) =>
        restoredQuestion(question, "knowledge"),
      ),
      ...compositeQuestions.map((question) =>
        restoredQuestion(question, "review"),
      ),
    ],
    learningContent: clonePublishedValue(
      contentPackage.learningContent ||
        normalized.learningContent || {
          composite: null,
          knowledgePoints: [],
        },
    ),
    assessmentMatrices: clonePublishedValue(
      normalized.assessmentMatrices || {},
    ),
    assessmentQuestionSlots: clonePublishedValue(
      normalized.assessmentQuestionSlots || {},
    ),
    baseContentVersionId: contentVersionId,
    baseVersionNumber: versionNumber,
    status: "draft",
  };
}

/**
 *
 * @param question
 * @param purpose
 * @param root0
 * @param root0.omitPoolPartition
 */
function normalizedQuestion(
  question,
  purpose,
  { omitPoolPartition = false } = {},
) {
  const evidenceProfile = knowledgeEvidenceProfile(question);
  const normalized = {
    ...question,
    purpose,
    knowledgeObjectiveIds:
      question.knowledgePointIds || question.knowledgeObjectiveIds || [],
    primaryKnowledgePointId: evidenceProfile.primaryKnowledgePointId,
    knowledgePointWeights: evidenceProfile.knowledgePointWeights,
    blueprintSlotId:
      question.blueprintSlotId ||
      slotByDifficulty[Number(question.difficulty)] ||
      "D3_STANDARD",
    poolPartition: question.poolPartition || purpose,
  };
  if (omitPoolPartition) delete normalized.poolPartition;
  const projected = projectQuestionToTypeContract(normalized);
  // The top-level question is the editable source of truth. A targeted repair
  // may change stem/answer while leaving an old serialized platform snapshot;
  // always rebuild the snapshot so quality review and runtime grading cannot
  // read contradictory versions of the same question.
  return {
    ...projected,
    platformQuestion: toQuestionPlatformSerialized(projected),
  };
}

/**
 *
 * @param questions
 */
function uniqueQuestionList(questions = []) {
  const seen = new Set();
  return questions.map((question, index) => {
    const originalId = String(question?.id || `question-${index + 1}`);
    let id = originalId;
    let suffix = 1;
    while (seen.has(id)) id = `${originalId}__dedupe-${suffix++}`;
    seen.add(id);
    if (id === originalId) return question;
    return {
      ...question,
      id,
      platformQuestion:
        question.platformQuestion &&
        typeof question.platformQuestion === "object"
          ? { ...question.platformQuestion, id }
          : question.platformQuestion,
    };
  });
}

/**
 *
 * @param questions
 * @param knowledgePoints
 */
function buildKnowledgePracticePools(questions, knowledgePoints) {
  const byKnowledgePoint = new Map();
  // A malformed provider response can carry a diagnostic question into the
  // post pool while retaining a knowledge-pool-looking slot id. The generated
  // namespace is authoritative here: exclude that leaked item rather than
  // counting it as an extra PRACTICE question and shifting the 10/3/2 gate.
  const isMisboundDiagnostic = (item) =>
    item?.phase !== "review" &&
    String(item?.id || "").includes("__pre-assessment__") &&
    String(item?.purpose || "").toLowerCase() === "post";
  for (const question of questions.filter(
    (item) => item.phase !== "review" && !isMisboundDiagnostic(item),
  )) {
    const id = question.knowledgePointIds?.[0];
    if (!byKnowledgePoint.has(id)) byKnowledgePoint.set(id, []);
    byKnowledgePoint.get(id).push(question);
  }
  const result = Object.fromEntries(
    knowledgePoints.map((item) => [item.id, []]),
  );
  for (const items of byKnowledgePoint) {
    const knowledgePointId = items[0]?.knowledgePointIds?.[0];
    if (!knowledgePointId) continue;
    // Re-lock every single-point item to the server-owned difficulty
    // blueprint. A repair response can omit or corrupt blueprintSlotId; using
    // the declared slot when it is valid and then filling the remaining slots
    // in stable order preserves the D1-D5 distribution without changing
    // question content. This is a migration/normalization step, not a quality
    // bypass.
    // Fifteen is the publishable floor, not the pool capacity. Keep additional
    // planned slots for unseen adaptive selection; the session policy still
    // caps how many questions one student answers.
    const boundedItems = items.slice(
      0,
      PRACTICE_POOL_MAX_SIZE_PER_KNOWLEDGE_POINT,
    );
    const blueprint = practicePoolBlueprint(
      knowledgePointId,
      boundedItems.length,
    );
    const bySlot = new Map(blueprint.map((slot) => [slot.id, slot]));
    const usedSlots = new Set();
    const lockedItems = boundedItems.map((item, index) => {
      const declaredSlot = bySlot.get(String(item.blueprintSlotId || ""));
      const slot =
        declaredSlot && !usedSlots.has(declaredSlot.id)
          ? declaredSlot
          : blueprint.find((candidate) => !usedSlots.has(candidate.id)) ||
            blueprint[index] ||
            null;
      if (slot) usedSlots.add(slot.id);
      if (!slot) return item;
      const hasPlannedBlueprint = Boolean(
        item.plannedQuestionType && item.assessmentFocus,
      );
      return {
        ...item,
        blueprintSlotId: slot.id,
        difficulty: hasPlannedBlueprint ? item.difficulty : slot.difficulty,
        adaptiveRole: hasPlannedBlueprint
          ? item.adaptiveRole
          : slot.adaptiveRole,
      };
    });
    result[knowledgePointId] = uniqueQuestionList(lockedItems).map((item) =>
      normalizedQuestion(item, "PRACTICE", { omitPoolPartition: true }),
    );
  }
  return result;
}

/**
 *
 * @param questions
 */
function buildCompositeReviewPool(questions) {
  const reviewItems = uniqueQuestionList(
    (questions || []).filter((item) => item.phase === "review"),
  );
  const blueprint = compositeReviewBlueprint(reviewItems.length);
  return reviewItems.slice(0, blueprint.length).map((item, index) => {
    const slot = blueprint[index];
    const hasPlannedBlueprint = Boolean(
      item.plannedQuestionType && item.assessmentFocus,
    );
    return normalizedQuestion(
      {
        ...item,
        blueprintSlotId: slot.id,
        difficulty: hasPlannedBlueprint ? item.difficulty : slot.difficulty,
        taskCategory: hasPlannedBlueprint
          ? item.taskCategory
          : slot.taskCategory,
        adaptiveRole: hasPlannedBlueprint
          ? item.adaptiveRole
          : slot.adaptiveRole,
        recommendedQuestionTypes: hasPlannedBlueprint
          ? item.recommendedQuestionTypes
          : slot.recommendedQuestionTypes,
      },
      "POST",
    );
  });
}

/**
 *
 * @param root0
 * @param root0.lesson
 * @param root0.content
 * @param root0.coveredKnowledgeObjectiveIds
 */
export function buildPublishedContentPackage({
  lesson,
  content,
  coveredKnowledgeObjectiveIds = [],
}) {
  const composite =
    content.learningContent?.composite || content.openMaic || {};
  const compositeCoverage =
    coveredKnowledgeObjectiveIds.length > 0
      ? coveredKnowledgeObjectiveIds
      : lesson.knowledgePoints.map((knowledgePoint) => knowledgePoint.id);
  const knowledgeContent = content.learningContent?.knowledgePoints || [];
  const unavailableItems = [];
  const compositeReady =
    Boolean(composite.classroomUrl) &&
    !composite.partial &&
    composite.status !== "partial";
  if (!compositeReady) unavailableItems.push("COMPOSITE_OPENMAIC");
  for (const knowledgePoint of lesson.knowledgePoints) {
    const runtime = knowledgeContent.find(
      (item) => item.knowledgeObjectiveId === knowledgePoint.id,
    )?.openMaic;
    if (
      !runtime?.classroomUrl ||
      runtime.partial ||
      runtime.status === "partial"
    )
      unavailableItems.push(`KNOWLEDGE_OPENMAIC:${knowledgePoint.id}`);
  }
  const diagnosticQuestionPool = uniqueQuestionList(
    content.preQuestions || [],
  ).map((item) => normalizedQuestion(item, "PRE"));
  const knowledgePracticePools = buildKnowledgePracticePools(
    content.postQuestions || [],
    lesson.knowledgePoints,
  );
  const compositeReviewPool = buildCompositeReviewPool(
    content.postQuestions || [],
  );
  // IDs are authoritative across the entire package, not only inside one
  // sub-pool. Keep the first occurrence and suffix later collisions while
  // preserving the corresponding platform snapshot.
  const globalIds = new Set();
  const globallyUnique = (question) => {
    const originalId = String(question?.id || "question");
    let id = originalId;
    let suffix = 1;
    while (globalIds.has(id)) id = `${originalId}__dedupe-${suffix++}`;
    globalIds.add(id);
    return id === originalId
      ? question
      : {
          ...question,
          id,
          platformQuestion:
            question.platformQuestion &&
            typeof question.platformQuestion === "object"
              ? { ...question.platformQuestion, id }
              : question.platformQuestion,
        };
  };
  const normalizedDiagnosticPool = diagnosticQuestionPool.map(globallyUnique);
  const normalizedPracticePools = Object.fromEntries(
    Object.entries(knowledgePracticePools).map(([id, pool]) => [
      id,
      pool.map(globallyUnique),
    ]),
  );
  const normalizedCompositePool = compositeReviewPool.map(globallyUnique);
  return {
    lesson: { id: lesson.id, title: lesson.title },
    knowledgeObjectives: lesson.knowledgePoints.map(
      ({ id, name, objective }) => ({ id, name, objective }),
    ),
    assessmentMatrices: approvedAssessmentMatrices(
      content.assessmentMatrices || {},
    ),
    assessmentQuestionSlots: clonePublishedValue(
      content.assessmentQuestionSlots || {},
    ),
    diagnosticQuestionPool: normalizedDiagnosticPool,
    learningContent: {
      composite: {
        status: compositeReady ? "READY" : "UNAVAILABLE",
        classroomId: composite.classroomId || "",
        classroomUrl: composite.classroomUrl || "",
        coveredKnowledgeObjectiveIds: compositeCoverage,
      },
      knowledgePoints: lesson.knowledgePoints.map((knowledgePoint) => {
        const runtime =
          knowledgeContent.find(
            (item) => item.knowledgeObjectiveId === knowledgePoint.id,
          )?.openMaic || {};
        const runtimeReady =
          Boolean(runtime.classroomUrl) &&
          !runtime.partial &&
          runtime.status !== "partial";
        return {
          knowledgeObjectiveId: knowledgePoint.id,
          openMaic: {
            status: runtimeReady ? "READY" : "UNAVAILABLE",
            classroomId: runtime.classroomId || "",
            classroomUrl: runtime.classroomUrl || "",
            coveredKnowledgeObjectiveIds: [knowledgePoint.id],
          },
        };
      }),
    },
    knowledgePracticePools: normalizedPracticePools,
    compositeReviewPool: normalizedCompositePool,
    unconfirmedItems: unavailableItems,
  };
}
