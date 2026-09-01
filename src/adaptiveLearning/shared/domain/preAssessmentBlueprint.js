import { knowledgeEvidenceProfile } from "./questionEvidence.js";
import { DIFFICULTY_LEVELS } from "./questionPoolPolicy.js";

export const PRE_ASSESSMENT_DIAGNOSTIC_ROLE = Object.freeze({
  STANDARD_PROBE: "STANDARD_PROBE",
  FOUNDATION_BRANCH: "FOUNDATION_BRANCH",
  STANDARD_CONFIRMATION: "STANDARD_CONFIRMATION",
  TRANSFER_BRANCH: "TRANSFER_BRANCH",
});

export const PRE_ASSESSMENT_ROLE_DIFFICULTY = Object.freeze({
  // D3 is the first probe. D2 is only used as a foundation branch after a
  // miss; D4/D5 provide independent variation and transfer evidence.
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.STANDARD_PROBE]: "D3",
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.FOUNDATION_BRANCH]: "D2",
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.STANDARD_CONFIRMATION]: "D4",
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.TRANSFER_BRANCH]: "D5",
});

const ORDERED_ROLES = Object.freeze([
  PRE_ASSESSMENT_DIAGNOSTIC_ROLE.STANDARD_PROBE,
  PRE_ASSESSMENT_DIAGNOSTIC_ROLE.FOUNDATION_BRANCH,
  PRE_ASSESSMENT_DIAGNOSTIC_ROLE.STANDARD_CONFIRMATION,
  PRE_ASSESSMENT_DIAGNOSTIC_ROLE.TRANSFER_BRANCH,
]);

const PRE_ASSESSMENT_ROLE_QUESTION_TYPE = Object.freeze({
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.STANDARD_PROBE]: "multiple_choice",
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.FOUNDATION_BRANCH]: "fill_blank",
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.STANDARD_CONFIRMATION]: "short_answer",
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.TRANSFER_BRANCH]: "short_answer",
});

const PRE_ASSESSMENT_ROLE_ASSESSMENT_FOCUS = Object.freeze({
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.STANDARD_PROBE]:
    "用标准变式检查学生能否独立选择规则并完成至少两个依赖环节",
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.FOUNDATION_BRANCH]:
    "确认学生能否识别基本对象、调用直接规则并得到封闭结果",
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.STANDARD_CONFIRMATION]:
    "改变表述或条件后，检查学生能否修正中间量并完成三步依赖推理",
  [PRE_ASSESSMENT_DIAGNOSTIC_ROLE.TRANSFER_BRANCH]:
    "在陌生情境中检查建模、两次依赖计算、隐藏条件处理和结果验证",
});

export const PRE_ASSESSMENT_PRIMARY_SLOTS_PER_KNOWLEDGE_POINT =
  ORDERED_ROLES.length;

/**
 *
 * @param knowledgePointId
 * @param diagnosticRole
 */
export function preAssessmentSlotId(knowledgePointId, diagnosticRole) {
  return `${knowledgePointId}:${diagnosticRole}`;
}

/**
 *
 * @param knowledgePoints
 */
export function buildPreAssessmentBlueprint(knowledgePoints = []) {
  return knowledgePoints.flatMap((knowledgePoint) =>
    ORDERED_ROLES.map((diagnosticRole) => ({
      id: preAssessmentSlotId(knowledgePoint.id, diagnosticRole),
      primaryKnowledgePointId: knowledgePoint.id,
      diagnosticRole,
      difficulty: PRE_ASSESSMENT_ROLE_DIFFICULTY[diagnosticRole],
      questionType: PRE_ASSESSMENT_ROLE_QUESTION_TYPE[diagnosticRole],
      assessmentFocus: PRE_ASSESSMENT_ROLE_ASSESSMENT_FOCUS[diagnosticRole],
    })),
  );
}

/**
 *
 * @param question
 */
export function diagnosticSlotForQuestion(question = {}) {
  const primaryKnowledgePointId =
    knowledgeEvidenceProfile(question).primaryKnowledgePointId;
  const diagnosticRole = String(question.diagnosticRole || "").toUpperCase();
  if (!primaryKnowledgePointId || !ORDERED_ROLES.includes(diagnosticRole))
    return null;
  return {
    id: preAssessmentSlotId(primaryKnowledgePointId, diagnosticRole),
    primaryKnowledgePointId,
    diagnosticRole,
    difficulty: PRE_ASSESSMENT_ROLE_DIFFICULTY[diagnosticRole],
    questionType: PRE_ASSESSMENT_ROLE_QUESTION_TYPE[diagnosticRole],
    assessmentFocus: PRE_ASSESSMENT_ROLE_ASSESSMENT_FOCUS[diagnosticRole],
  };
}

/**
 *
 * @param value
 */
export function isValidDiagnosticDifficulty(value) {
  const normalized =
    typeof value === "string" && /^d[1-5]$/i.test(value.trim())
      ? Number(value.trim().slice(1))
      : Number(value);
  return DIFFICULTY_LEVELS.includes(normalized);
}

/**
 *
 * @param questions
 * @param knowledgePoints
 */
export function missingPreAssessmentBlueprintSlots(
  questions = [],
  knowledgePoints = [],
) {
  const occupied = new Set(
    questions
      .map(diagnosticSlotForQuestion)
      .filter(Boolean)
      .map((slot) => slot.id),
  );
  return buildPreAssessmentBlueprint(knowledgePoints).filter(
    (slot) => !occupied.has(slot.id),
  );
}

/**
 *
 * @param questions
 * @param knowledgePoints
 */
export function hasCompletePreAssessmentBlueprint(
  questions = [],
  knowledgePoints = [],
) {
  return (
    missingPreAssessmentBlueprintSlots(questions, knowledgePoints).length === 0
  );
}
