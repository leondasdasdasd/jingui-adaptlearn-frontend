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
  if (Array.isArray(value))
    return value.map((item) => clonePublishedValue(item));
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
 */
function publishedBlueprintSlotId(question) {
  if (question.assessmentPolicyId) return question.blueprintSlotId ?? null;
  return (
    question.blueprintSlotId ||
    slotByDifficulty[Number(question.difficulty)] ||
    "D3_STANDARD"
  );
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
    // 新矩阵题目的 null 表示教师明确保留为未归槽；仅旧题迁移允许补 D1-D5 蓝图。
    blueprintSlotId: publishedBlueprintSlotId(question),
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
 * @param item
 */
function isMisboundDiagnostic(item) {
  return (
    item?.phase !== "review" &&
    String(item?.id || "").includes("__pre-assessment__") &&
    String(item?.purpose || "").toLowerCase() === "post"
  );
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
  for (const [knowledgePointId, items] of byKnowledgePoint) {
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
    // eslint-disable-next-line complexity -- 新矩阵插槽与旧 D1-D5 蓝图在此单点迁移边界汇合。
    const lockedItems = boundedItems.map((item, index) => {
      if (item.assessmentPolicyId) {
        return item;
      }
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
    if (item.assessmentPolicyId) {
      return normalizedQuestion(item, "POST");
    }
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
// eslint-disable-next-line complexity, sonarjs/cognitive-complexity -- 发布合同集中组装各不可变内容分区。
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
  const normalizedDiagnosticPool = diagnosticQuestionPool.map((question) =>
    globallyUnique(question),
  );
  const normalizedPracticePools = Object.fromEntries(
    Object.entries(knowledgePracticePools).map(([id, pool]) => [
      id,
      pool.map((question) => globallyUnique(question)),
    ]),
  );
  const normalizedCompositePool = compositeReviewPool.map((question) =>
    globallyUnique(question),
  );
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
