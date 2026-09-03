import { diagnosticSlotForQuestion } from "../../../shared/domain/preAssessmentBlueprint.js";
import {
  LESSON_GENERATION_MODULE_KIND,
  questionKnowledgeIds,
} from "./modules.js";

/**
 *
 * @param value
 * @param fallback
 */
function lockedDifficulty(value, fallback = "D3") {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (/^D[1-5]$/.test(normalized)) return normalized;
  if (/^[1-5]$/.test(normalized)) return `D${normalized}`;
  return fallback;
}

/**
 *
 * @param question
 * @param moduleKind
 */
function questionBlueprintSlotId(question, moduleKind) {
  const explicit = String(question?.blueprintSlotId || "").trim();
  if (explicit) return explicit;
  return moduleKind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT
    ? diagnosticSlotForQuestion(question)?.id || ""
    : "";
}

/**
 *
 * @param generated
 * @param used
 */
function nextUnusedGeneratedIndex(generated, used) {
  return generated.findIndex((_question, index) => !used.has(index));
}

/**
 *
 * @param root0
 * @param root0.targetId
 * @param root0.generated
 * @param root0.generatedById
 * @param root0.used
 * @param root0.hasExactTargetIds
 */
function replacementIndexForTarget({
  targetId,
  generated,
  generatedById,
  used,
  hasExactTargetIds,
}) {
  const exactIndex = generatedById.get(targetId)?.index;
  if (hasExactTargetIds) return exactIndex;
  return exactIndex === undefined || used.has(exactIndex)
    ? nextUnusedGeneratedIndex(generated, used)
    : exactIndex;
}

/**
 *
 * @param existing
 * @param generated
 * @param targets
 * @param prepareReplacement
 */
function mergeTargetedQuestions(
  existing,
  generated,
  targets,
  prepareReplacement,
) {
  const generatedById = new Map(
    generated.map((question, index) => [question?.id, { question, index }]),
  );
  const used = new Set();
  const hasExactTargetIds = targets.some((targetId) =>
    generatedById.has(targetId),
  );
  for (const targetId of targets) {
    const existingIndex = existing.findIndex(
      (question) => question?.id === targetId,
    );
    if (existingIndex < 0) continue;
    const replacementIndex = replacementIndexForTarget({
      targetId,
      generated,
      generatedById,
      used,
      hasExactTargetIds,
    });
    if (
      replacementIndex === undefined ||
      replacementIndex < 0 ||
      used.has(replacementIndex)
    )
      continue;
    used.add(replacementIndex);
    existing[existingIndex] = prepareReplacement(
      existing[existingIndex],
      generated[replacementIndex],
    );
  }
  return used;
}

/**
 *
 * @param existingQuestions
 * @param generatedQuestions
 * @param operation
 * @param prepareReplacement
 */
function mergeRepairQuestionSet(
  existingQuestions,
  generatedQuestions,
  operation,
  prepareReplacement = (_original, question) => question,
) {
  const existing = [...existingQuestions];
  const generated = [...generatedQuestions];
  const targets = [...new Set(operation.targetQuestionIds || [])];
  const missingCount = Math.max(0, Number(operation.missingQuestionCount || 0));
  if (targets.length === 0) {
    return operation.mergeMode === "append-missing"
      ? [
          ...existing,
          ...generated
            .slice(0, missingCount)
            .map((question) => prepareReplacement(null, question)),
        ]
      : existing;
  }
  const used = mergeTargetedQuestions(
    existing,
    generated,
    targets,
    prepareReplacement,
  );
  existing.push(
    ...generated
      .filter((_question, index) => !used.has(index))
      .slice(0, missingCount)
      .map((question) => prepareReplacement(null, question)),
  );
  return existing;
}

/**
 *
 * @param generatedQuestions
 * @param operation
 * @param targets
 */
function generatedQuestionsBySlot(generatedQuestions, operation, targets) {
  const bySlot = new Map();
  for (const question of generatedQuestions) {
    const slotId = questionBlueprintSlotId(question, operation.moduleKind);
    if (slotId && targets.has(slotId) && !bySlot.has(slotId))
      bySlot.set(slotId, question);
  }
  return bySlot;
}

/**
 *
 * @param existingQuestions
 * @param generatedQuestions
 * @param operation
 * @param prepareReplacement
 */
function mergeQuestionSlotRepairs(
  existingQuestions,
  generatedQuestions,
  operation,
  prepareReplacement = (_original, question) => question,
) {
  const targetSlots = operation.targetBlueprintSlots || [];
  const targets = new Set(targetSlots.map((slot) => slot.id));
  const generatedBySlot = generatedQuestionsBySlot(
    generatedQuestions,
    operation,
    targets,
  );
  const { merged, retained } = mergeExistingSlotQuestions(
    existingQuestions,
    operation,
    targets,
    generatedBySlot,
    prepareReplacement,
  );
  appendMissingSlotQuestions(
    merged,
    retained,
    targetSlots,
    generatedBySlot,
    prepareReplacement,
  );
  return merged;
}

/**
 *
 * @param existingQuestions
 * @param operation
 * @param targets
 * @param generatedBySlot
 * @param prepareReplacement
 */
function mergeExistingSlotQuestions(
  existingQuestions,
  operation,
  targets,
  generatedBySlot,
  prepareReplacement,
) {
  const retained = new Set();
  const merged = [];
  for (const question of existingQuestions) {
    const slotId = questionBlueprintSlotId(question, operation.moduleKind);
    if (!slotId || !targets.has(slotId)) merged.push(question);
    else if (!retained.has(slotId)) {
      retained.add(slotId);
      const generated = generatedBySlot.get(slotId);
      merged.push(
        generated ? prepareReplacement(question, generated) : question,
      );
    }
  }
  return { merged, retained };
}

/**
 *
 * @param merged
 * @param retained
 * @param targetSlots
 * @param generatedBySlot
 * @param prepareReplacement
 */
function appendMissingSlotQuestions(
  merged,
  retained,
  targetSlots,
  generatedBySlot,
  prepareReplacement,
) {
  for (const slot of targetSlots) {
    if (retained.has(slot.id) || !generatedBySlot.has(slot.id)) continue;
    merged.push(prepareReplacement(null, generatedBySlot.get(slot.id)));
    retained.add(slot.id);
  }
}

/**
 *
 * @param operation
 * @param original
 * @param question
 */
function preserveQuestionMetadata(operation, original, question) {
  const review =
    operation.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW;
  const tagged = review ? { ...question, phase: "review" } : question;
  if (!original || review || !original.blueprintSlotId) return tagged;
  return {
    ...original,
    ...tagged,
    ...stableQuestionMetadata(operation, original),
  };
}

/**
 *
 * @param operation
 * @param original
 */
function stableQuestionMetadata(operation, original) {
  const targetSlot = (operation.targetBlueprintSlots || []).find(
    (slot) => String(slot?.id || "") === String(original.blueprintSlotId || ""),
  );
  return {
    id: original.id,
    phase: original.phase || "knowledge",
    purpose: original.purpose || "post",
    difficulty: lockedDifficulty(targetSlot?.difficulty || original.difficulty),
    adaptiveRole: original.adaptiveRole,
    blueprintSlotId: original.blueprintSlotId,
    primaryKnowledgePointId: original.primaryKnowledgePointId,
    knowledgePointIds: original.knowledgePointIds,
    knowledgePointWeights: original.knowledgePointWeights,
    knowledgeEvidenceMap: original.knowledgeEvidenceMap,
  };
}

/**
 *
 * @param question
 * @param operation
 */
function isOperationModuleQuestion(question, operation) {
  if (operation.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW) {
    return question.phase === "review";
  }
  return (
    question.phase !== "review" &&
    questionKnowledgeIds(question)[0] === operation.knowledgePointId
  );
}

/**
 *
 * @param content
 * @param operation
 */
function applyPreQuestionOperation(content, operation) {
  const existing = content.preQuestions || [];
  if (operation.mergeMode === "replace") {
    return { ...content, preQuestions: [...operation.questions] };
  }
  const questions =
    operation.mergeMode === "append-slots" &&
    operation.targetBlueprintSlots?.length
      ? mergeQuestionSlotRepairs(existing, operation.questions, operation)
      : mergeRepairQuestionSet(existing, operation.questions, operation);
  return { ...content, preQuestions: questions };
}

/**
 *
 * @param content
 * @param operation
 */
function applyPostQuestionRepair(content, operation) {
  const postQuestions = content.postQuestions || [];
  const moduleQuestions = postQuestions.filter((question) =>
    isOperationModuleQuestion(question, operation),
  );
  const otherQuestions = postQuestions.filter(
    (question) => !moduleQuestions.includes(question),
  );
  const prepare = (original, question) =>
    preserveQuestionMetadata(operation, original, question);
  const repaired =
    operation.mergeMode === "append-slots" &&
    operation.targetBlueprintSlots?.length
      ? mergeQuestionSlotRepairs(
          moduleQuestions,
          operation.questions,
          operation,
          prepare,
        )
      : mergeRepairQuestionSet(
          moduleQuestions,
          operation.questions,
          operation,
          prepare,
        );
  return { ...content, postQuestions: [...otherQuestions, ...repaired] };
}

/**
 *
 * @param content
 * @param operation
 */
function applyPostQuestionReplacement(content, operation) {
  const postQuestions = content.postQuestions || [];
  const review =
    operation.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW;
  const retained = postQuestions.filter(
    (question) => !isOperationModuleQuestion(question, operation),
  );
  const generated = review
    ? operation.questions.map((question) => ({ ...question, phase: "review" }))
    : operation.questions.filter((question) => question.phase !== "review");
  return { ...content, postQuestions: [...retained, ...generated] };
}

/**
 *
 * @param content
 * @param operation
 */
function applyQuestionOperation(content, operation) {
  if (operation.moduleKind === LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT) {
    return applyPreQuestionOperation(content, operation);
  }
  return operation.mergeMode === "replace"
    ? applyPostQuestionReplacement(content, operation)
    : applyPostQuestionRepair(content, operation);
}

/**
 *
 * @param content
 * @param operation
 */
function applyClassroomOperation(content, operation) {
  const learningContent = content.learningContent || {
    composite: content.openMaic || null,
    knowledgePoints: [],
  };
  if (
    operation.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM
  ) {
    return {
      ...content,
      learningContent: { ...learningContent, composite: operation.runtime },
    };
  }
  const knowledgePoints = (learningContent.knowledgePoints || []).filter(
    (item) => item.knowledgeObjectiveId !== operation.knowledgePointId,
  );
  knowledgePoints.push({
    knowledgeObjectiveId: operation.knowledgePointId,
    openMaic: operation.runtime,
  });
  return {
    ...content,
    learningContent: { ...learningContent, knowledgePoints },
  };
}

/**
 *
 * @param content
 * @param operation
 */
function applyAssessmentMatrixOperation(content, operation) {
  if (!operation.knowledgePointId || !operation.assessmentMatrix)
    return content;
  return {
    ...content,
    assessmentMatrices: {
      ...content.assessmentMatrices,
      [operation.knowledgePointId]: operation.assessmentMatrix,
    },
  };
}

const OPERATION_APPLIERS = {
  "replace-assessment-matrix": applyAssessmentMatrixOperation,
  "replace-question-module": applyQuestionOperation,
  "replace-classroom-module": applyClassroomOperation,
};

/**
 *
 * @param content
 * @param patch
 */
export function applyLessonGenerationDraftPatch(content, patch) {
  let current = { ...content };
  for (const operation of patch?.operations || []) {
    current =
      OPERATION_APPLIERS[operation.type]?.(current, operation) || current;
  }
  return current;
}
