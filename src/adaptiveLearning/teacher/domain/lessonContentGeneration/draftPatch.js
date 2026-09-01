import {
  LESSON_GENERATION_MODULE_KIND,
  questionKnowledgeIds,
} from "./modules.js";
export { applyLessonGenerationDraftPatch } from "./draftPatchApply.js";

const QUESTION_MODULE_KINDS = new Set([
  LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT,
  LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS,
  LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW,
]);

/**
 *
 * @param result
 */
function runtimeFromResult(result) {
  return result?.runtime || result?.openMaic || result || {};
}

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
 */
function rubricScore(question) {
  let score = 0;
  for (const item of Array.isArray(question.rubric) ? question.rubric : []) {
    score += Math.max(0, Number(item?.score || item?.maxScore || 0));
  }
  return score;
}

/**
 *
 * @param question
 */
function lockedCompositeEvidenceMap(question) {
  const ids = questionKnowledgeIds(question);
  if (ids.length < 2) return question.knowledgeEvidenceMap;
  const primary = ids.includes(question.primaryKnowledgePointId)
    ? question.primaryKnowledgePointId
    : ids[0];
  const score = rubricScore(question);
  const total = Math.max(
    0,
    Number(
      question.maxScore || question.score || (score > 0 ? score : ids.length),
    ),
  );
  const each = total / ids.length;
  const existing = Array.isArray(question.knowledgeEvidenceMap)
    ? question.knowledgeEvidenceMap
    : [];
  return ids.map((knowledgePointId, index) => {
    const prior =
      existing.find((item) => item?.knowledgePointId === knowledgePointId) ||
      {};
    return {
      scoringPointId: `K${index + 1}`,
      knowledgePointId,
      role: knowledgePointId === primary ? "PRIMARY" : "SECONDARY",
      weight: knowledgePointId === primary ? 1 : 0.3,
      maxScore: index === ids.length - 1 ? total - each * index : each,
      analysisPoint: String(
        prior.analysisPoint ||
          prior.evidence ||
          `完成第${index + 1}个知识点对应的数量关系、运算或结论。`,
      ).trim(),
    };
  });
}

/**
 *
 * @param task
 * @param question
 * @param index
 */
function lockGeneratedQuestionMetadata(task, question, index) {
  const normalized = {
    ...question,
    difficulty: lockedDifficulty(
      task.targetQuestionDifficulties?.[index] || question?.difficulty,
    ),
  };
  if (task.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW) {
    const map = lockedCompositeEvidenceMap(normalized);
    if (map) normalized.knowledgeEvidenceMap = map;
  }
  return normalized;
}

/**
 *
 * @param task
 */
function questionMergeMode(task) {
  if (task.targetBlueprintSlots?.length) return "append-slots";
  if (task.taskType !== "repair") return "replace";
  if (task.repairMode) return task.repairMode;
  return task.targetQuestionIds?.length ? "targeted" : "append-missing";
}

/**
 *
 * @param base
 * @param task
 * @param result
 */
function questionDraftPatch(base, task, result) {
  if (!Array.isArray(result?.questions) || result.questions.length === 0)
    return null;
  const {
    targetQuestionIds = [],
    targetBlueprintSlots = [],
    missingQuestionCount: rawMissingCount = 0,
    requiredCount = 0,
    taskType,
    moduleKind,
    knowledgePointId,
  } = task;
  const missingQuestionCount = Math.max(0, Number(rawMissingCount));
  const repairTargetCount =
    targetQuestionIds.length +
    targetBlueprintSlots.length +
    missingQuestionCount;
  if (taskType === "repair" && repairTargetCount === 0) return null;
  return {
    ...base,
    operations: [
      {
        type: "replace-question-module",
        moduleKind,
        knowledgePointId,
        targetQuestionIds,
        targetBlueprintSlots,
        mergeMode: questionMergeMode(task),
        missingQuestionCount,
        requiredCount: Math.max(0, Number(requiredCount)),
        questions: result.questions.map((question, index) =>
          lockGeneratedQuestionMetadata(task, question, index),
        ),
      },
    ],
  };
}

/**
 *
 * @param base
 * @param task
 * @param result
 */
function classroomDraftPatch(base, task, result) {
  const runtime = runtimeFromResult(result);
  if (
    !runtime ||
    typeof runtime !== "object" ||
    Object.keys(runtime).length === 0
  )
    return null;
  return {
    ...base,
    operations: [
      {
        type: "replace-classroom-module",
        moduleKind: task.moduleKind,
        knowledgePointId: task.knowledgePointId,
        runtime,
      },
    ],
  };
}

/**
 *
 * @param root0
 * @param root0.task
 * @param root0.result
 */
export function buildLessonGenerationDraftPatch({ task, result }) {
  const base = { schemaVersion: 1, taskId: task.id, moduleId: task.moduleId };
  return QUESTION_MODULE_KINDS.has(task.moduleKind)
    ? questionDraftPatch(base, task, result)
    : classroomDraftPatch(base, task, result);
}

/**
 *
 * @param patches
 */
export function mergeLessonGenerationDraftPatches(patches = []) {
  const operations = [];
  const operationIndex = new Map();
  for (const operation of patches
    .filter(Boolean)
    .flatMap((patch) => patch.operations || [])) {
    const key = `${operation.type}:${operation.moduleKind}:${operation.knowledgePointId || ""}:${(operation.targetQuestionIds || []).join(",")}:${(operation.targetBlueprintSlots || []).map((slot) => slot.id).join(",")}`;
    if (operationIndex.has(key))
      operations[operationIndex.get(key)] = operation;
    else {
      operationIndex.set(key, operations.length);
      operations.push(operation);
    }
  }
  return { schemaVersion: 1, operations };
}
