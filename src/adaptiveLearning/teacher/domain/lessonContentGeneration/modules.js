import {
  assessmentMatrixCellRequiredSlotCount,
  assessmentMatrixRequiredEvidenceCount,
} from "../../../shared/domain/knowledgeAssessmentMatrix.js";
import {
  buildPreAssessmentBlueprint,
  hasCompletePreAssessmentBlueprint,
} from "../../../shared/domain/preAssessmentBlueprint.js";
import {
  compositeReviewCount,
  PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
} from "../../../shared/domain/questionPoolPolicy.js";

const PRE_ASSESSMENT_MODULE_ID = "pre-assessment";
const COMPOSITE_REVIEW_MODULE_ID = "composite-review";

export const LESSON_GENERATION_MODULE_KIND = Object.freeze({
  PRE_ASSESSMENT: PRE_ASSESSMENT_MODULE_ID,
  KNOWLEDGE_QUESTIONS: "knowledge-questions",
  COMPOSITE_REVIEW: COMPOSITE_REVIEW_MODULE_ID,
  COMPOSITE_CLASSROOM: "composite-classroom",
  KNOWLEDGE_CLASSROOM: "knowledge-classroom",
});

const REVIEW_PHASE = "review";

/**
 *
 * @param question
 */
export function questionKnowledgeIds(question) {
  return question?.knowledgePointIds || question?.knowledgeObjectiveIds || [];
}

export const difficultyNumber = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (/^D[1-5]$/.test(normalized)) return Number(normalized.slice(1));
  if (/^[1-5]$/.test(normalized)) return Number(normalized);
  return 0;
};

/**
 *
 * @param question
 * @param lesson
 */
export function questionModuleId(question, lesson) {
  if (question?.purpose === "PRE" || question?.purpose === "pre")
    return "pre-assessment";
  if (question?.phase === "review") return "composite-review";
  const knowledgePointId = questionKnowledgeIds(question)[0];
  return (lesson?.knowledgePoints || []).some(
    (item) => item.id === knowledgePointId,
  )
    ? `knowledge-questions:${knowledgePointId}`
    : "";
}

/**
 *
 * @param runtime
 */
function isUsableClassroom(runtime) {
  const url = String(runtime?.classroomUrl || "");
  return (
    Boolean(runtime?.classroomId) &&
    (/^https?:\/\//.test(url) ||
      /^\/openmaic\/classroom\/[\w-]+(?:[#/?]|$)/.test(url)) &&
    !runtime?.partial &&
    runtime?.status !== "partial"
  );
}

/**
 *
 * @param root0
 * @param root0.id
 * @param root0.kind
 * @param root0.label
 * @param root0.complete
 * @param root0.currentCount
 * @param root0.requiredCount
 * @param root0.knowledgePointId
 */
function moduleRecord({
  id,
  kind,
  label,
  complete,
  currentCount,
  requiredCount,
  knowledgePointId = "",
}) {
  return {
    id,
    kind,
    label,
    knowledgePointId,
    complete,
    status: complete ? "ready" : "missing",
    currentCount,
    requiredCount,
  };
}

/**
 * Creates the single source of truth for the whole-lesson generation checklist.
 * This is intentionally structural. The server quality gate remains authoritative
 * for answer, rubric, blueprint and semantic completeness.
 * @param root0
 * @param root0.lesson
 * @param root0.content
 */
export function buildLessonGenerationModules({ lesson, content }) {
  const knowledgePoints = lesson?.knowledgePoints || [];
  const preQuestions = content?.preQuestions || [];
  const postQuestions = content?.postQuestions || [];
  const knowledgeQuestions = postQuestions.filter(
    (question) => question.phase !== REVIEW_PHASE,
  );
  const compositeQuestions = postQuestions.filter(
    (question) => question.phase === REVIEW_PHASE,
  );
  const learningContent = content?.learningContent || {
    composite: content?.openMaic || null,
    knowledgePoints: [],
  };
  const requiredPreCount = buildPreAssessmentBlueprint(knowledgePoints).length;
  const preCoverageComplete = hasCompletePreAssessmentBlueprint(
    preQuestions,
    knowledgePoints,
  );

  const modules = [
    moduleRecord({
      id: PRE_ASSESSMENT_MODULE_ID,
      kind: LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT,
      label: "课前测",
      complete: preQuestions.length >= requiredPreCount && preCoverageComplete,
      currentCount: preQuestions.length,
      requiredCount: requiredPreCount,
    }),
  ];

  modules.push(
    ...knowledgePoints.map((knowledgePoint) =>
      knowledgeQuestionModule({
        knowledgePoint,
        knowledgeQuestions,
        assessmentMatrix: content?.assessmentMatrices?.[knowledgePoint.id],
      }),
    ),
  );

  const compositeScopeComplete = compositeQuestions.every(
    (question) => questionKnowledgeIds(question).length >= 2,
  );
  const requiredCompositeReviewCount = compositeReviewCount(
    knowledgePoints.length,
  );
  modules.push(
    moduleRecord({
      id: COMPOSITE_REVIEW_MODULE_ID,
      kind: LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW,
      label: "综合练习",
      complete:
        compositeQuestions.length >= requiredCompositeReviewCount &&
        compositeScopeComplete,
      currentCount: compositeQuestions.length,
      requiredCount: requiredCompositeReviewCount,
    }),
    classroomModule(learningContent.composite),
    ...knowledgePoints.map((knowledgePoint) =>
      knowledgeClassroomModule(knowledgePoint, learningContent),
    ),
  );

  return modules;
}

/**
 *
 * @param knowledgePointId
 * @param cell
 */
function matrixCellId(knowledgePointId, cell) {
  return String(
    cell.matrixCellId ||
      `${knowledgePointId}:${cell.domain}:${cell.targetLevel || cell.level}`,
  );
}

/**
 *
 * @param question
 */
function questionMatrixCellId(question) {
  return String(
    question.matrixCellId ||
      question.assessmentMatrixCellId ||
      question.blueprint?.matrixCellId ||
      "",
  );
}

/**
 *
 * @param questions
 * @param knowledgePointId
 * @param assessmentMatrix
 */
function hasMatrixCoverage(questions, knowledgePointId, assessmentMatrix) {
  if (!assessmentMatrix?.cells?.length) return true;
  return assessmentMatrix.cells.every((cell) => {
    const evidenceCount = questions.filter(
      (question) =>
        questionMatrixCellId(question) === matrixCellId(knowledgePointId, cell),
    ).length;
    return evidenceCount >= assessmentMatrixCellRequiredSlotCount(cell);
  });
}

/**
 *
 * @param root0
 * @param root0.knowledgePoint
 * @param root0.knowledgeQuestions
 * @param root0.assessmentMatrix
 */
function knowledgeQuestionModule({
  knowledgePoint,
  knowledgeQuestions,
  assessmentMatrix,
}) {
  const questions = knowledgeQuestions.filter(
    (question) => questionKnowledgeIds(question)[0] === knowledgePoint.id,
  );
  const requiredCount = assessmentMatrix?.cells?.length
    ? assessmentMatrixRequiredEvidenceCount(assessmentMatrix)
    : PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT;
  return moduleRecord({
    id: `knowledge-questions:${knowledgePoint.id}`,
    kind: LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS,
    label: `${knowledgePoint.name}·单点题池`,
    knowledgePointId: knowledgePoint.id,
    complete:
      questions.length >= requiredCount &&
      hasMatrixCoverage(questions, knowledgePoint.id, assessmentMatrix),
    currentCount: questions.length,
    requiredCount,
  });
}

/**
 *
 * @param runtime
 */
function classroomModule(runtime) {
  const complete = isUsableClassroom(runtime);
  return moduleRecord({
    id: "composite-classroom",
    kind: LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM,
    label: "复合学习课堂",
    complete,
    currentCount: complete ? 1 : 0,
    requiredCount: 1,
  });
}

/**
 *
 * @param knowledgePoint
 * @param learningContent
 */
function knowledgeClassroomModule(knowledgePoint, learningContent) {
  const runtime = (learningContent.knowledgePoints || []).find(
    (item) => item.knowledgeObjectiveId === knowledgePoint.id,
  )?.openMaic;
  const complete = isUsableClassroom(runtime);
  return moduleRecord({
    id: `knowledge-classroom:${knowledgePoint.id}`,
    kind: LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_CLASSROOM,
    label: `${knowledgePoint.name}·单点课堂`,
    knowledgePointId: knowledgePoint.id,
    complete,
    currentCount: complete ? 1 : 0,
    requiredCount: 1,
  });
}

/**
 *
 * @param generationModule
 */
export function generationActionForModule(generationModule) {
  switch (generationModule.kind) {
    case LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT: {
      return {
        id: `generate-${PRE_ASSESSMENT_MODULE_ID}`,
        type: "questions",
        mode: "pre",
        moduleIds: [generationModule.id],
      };
    }
    case LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS: {
      return {
        id: `generate-knowledge-questions:${generationModule.knowledgePointId}`,
        type: "questions",
        mode: "knowledge",
        scope: generationModule.knowledgePointId,
        moduleIds: [generationModule.id],
      };
    }
    case LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW: {
      return {
        id: "generate-composite-review",
        type: "questions",
        mode: "review",
        moduleIds: [generationModule.id],
      };
    }
    case LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM: {
      return {
        id: "generate-composite-classroom",
        type: "openmaic",
        scope: "composite",
        moduleIds: [generationModule.id],
      };
    }
    case LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_CLASSROOM: {
      return {
        id: `generate-knowledge-classroom:${generationModule.knowledgePointId}`,
        type: "openmaic",
        scope: generationModule.knowledgePointId,
        moduleIds: [generationModule.id],
      };
    }
    default: {
      return null;
    }
  }
}

/**
 *
 * @param modules
 * @param moduleIds
 */
export function orderedActions(modules, moduleIds) {
  const selected = new Set(moduleIds);
  return modules
    .filter((module) => selected.has(module.id))
    .map((generationModule) => generationActionForModule(generationModule))
    .filter(Boolean);
}

/**
 *
 * @param root0
 * @param root0.lesson
 * @param root0.content
 */
export function buildMissingContentGenerationPlan({ lesson, content }) {
  const modules = buildLessonGenerationModules({ lesson, content });
  const missingModuleIds = modules
    .filter((module) => !module.complete)
    .map((module) => module.id);
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
 * @param actions
 */
export function buildParallelLessonGenerationLanes(actions = []) {
  const questions = actions.filter((action) => action.type === "questions");
  const openMaic = actions.filter((action) => action.type === "openmaic");
  return {
    questions,
    openMaic,
    totalConcurrency: questions.length + openMaic.length,
  };
}
