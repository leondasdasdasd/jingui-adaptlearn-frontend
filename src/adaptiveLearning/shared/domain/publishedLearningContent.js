import { repairEmbeddedChoiceDescriptions } from "../question-platform/questionContract.js";
import {
  repairGrade7QuestionContract,
  repairGrade7VisualQuestion,
} from "./grade7VisualQuestionRepairs.js";
import { normalizeLearningGenerationPolicy } from "./learningGenerationPolicy.js";
import { normalizeKnowledgePracticeQuestion } from "./questionPurpose.js";

const normalizeQuestions = (questions = []) =>
  questions.map((question) =>
    repairEmbeddedChoiceDescriptions(
      repairGrade7QuestionContract(repairGrade7VisualQuestion(question)),
    ),
  );

const normalizePracticePools = (pools = {}) =>
  Object.fromEntries(
    Object.entries(pools).map(([knowledgePointId, questions]) => [
      knowledgePointId,
      normalizeQuestions(questions || []).map((question) =>
        normalizeKnowledgePracticeQuestion(question),
      ),
    ]),
  );

const withFallback = (value, fallback) => value || fallback;

const readyRuntime = (runtime = {}) => {
  const source = runtime || {};
  return {
    status:
      source.status || (source.classroomUrl ? "READY" : "UNAVAILABLE"),
    classroomId: source.classroomId || "",
    classroomUrl: source.classroomUrl || "",
    coveredKnowledgeObjectiveIds: source.coveredKnowledgeObjectiveIds || [],
  };
};

/**
 *
 * @param learningContent
 */
export function normalizeLearningContentRuntimes(learningContent = {}) {
  return {
    composite: readyRuntime(learningContent.composite),
    knowledgePoints: withFallback(learningContent.knowledgePoints, []).map(
      (item) => ({
        knowledgeObjectiveId: item.knowledgeObjectiveId,
        openMaic: readyRuntime(item.openMaic),
      }),
    ),
  };
}

/**
 *
 * @param content
 */
function normalizeCurrentContentPackage(content) {
  return {
    planType: content.planType,
    title: content.title,
    sourceLessons: withFallback(content.sourceLessons, []),
    generationPolicy: normalizeLearningGenerationPolicy(
      content.generationPolicy,
    ),
    questionDistribution: withFallback(content.questionDistribution, null),
    lesson: content.lesson,
    knowledgeObjectives: withFallback(content.knowledgeObjectives, []),
    assessmentMatrices: withFallback(content.assessmentMatrices, {}),
    assessmentQuestionSlots: withFallback(content.assessmentQuestionSlots, {}),
    diagnosticQuestionPool: normalizeQuestions(
      withFallback(content.diagnosticQuestionPool, []),
    ),
    learningContent: normalizeLearningContentRuntimes(content.learningContent),
    knowledgePracticePools: normalizePracticePools(
      withFallback(content.knowledgePracticePools, {}),
    ),
    compositeReviewPool: normalizeQuestions(
      withFallback(content.compositeReviewPool, []),
    ),
    unconfirmedItems: withFallback(content.unconfirmedItems, []),
  };
}

/**
 *
 * @param questions
 * @param objectives
 */
function legacyPracticePools(questions, objectives) {
  const practicePools = Object.fromEntries(
    objectives.map((objective) => [objective.id, []]),
  );
  for (const question of questions.filter(
    (item) =>
      ["PRACTICE", "POST", "REVALIDATION"].includes(
        String(item.purpose).toUpperCase(),
      ) && item.phase !== "review",
  )) {
    const objectiveId =
      question.knowledgeObjectiveIds?.[0] || question.knowledgePointIds?.[0];
    if (practicePools[objectiveId]) practicePools[objectiveId].push(question);
  }
  return practicePools;
}

/**
 *
 * @param content
 */
function normalizeLegacyContentPackage(content) {
  const questions = content.questionPool || [];
  const objectives = content.knowledgeObjectives || [];
  return {
    planType: content.planType,
    title: content.title,
    sourceLessons: content.sourceLessons || [],
    generationPolicy: normalizeLearningGenerationPolicy(
      content.generationPolicy,
    ),
    questionDistribution: content.questionDistribution || null,
    lesson: content.lesson,
    knowledgeObjectives: objectives,
    assessmentMatrices: content.assessmentMatrices || {},
    assessmentQuestionSlots: content.assessmentQuestionSlots || {},
    diagnosticQuestionPool: normalizeQuestions(
      questions.filter((item) => String(item.purpose).toUpperCase() === "PRE"),
    ),
    learningContent: {
      composite: readyRuntime(content.openMaic),
      knowledgePoints: [],
    },
    knowledgePracticePools: normalizePracticePools(
      legacyPracticePools(questions, objectives),
    ),
    compositeReviewPool: normalizeQuestions(
      questions.filter((item) => item.phase === "review"),
    ),
    unconfirmedItems: content.unconfirmedItems || [],
    legacySource: true,
  };
}

/**
 *
 * @param content
 */
export function normalizePublishedContentPackage(content = {}) {
  return content.learningContent
    ? normalizeCurrentContentPackage(content)
    : normalizeLegacyContentPackage(content);
}

/**
 *
 * @param content
 */
export function flattenPublishedQuestions(content = {}) {
  const normalized = normalizePublishedContentPackage(content);
  return [
    ...normalized.diagnosticQuestionPool,
    ...Object.values(normalized.knowledgePracticePools).flat(),
    ...normalized.compositeReviewPool,
  ];
}

/**
 *
 * @param content
 * @param knowledgeObjectiveId
 */
export function findKnowledgeRuntime(content, knowledgeObjectiveId) {
  const normalized = normalizePublishedContentPackage(content);
  return (
    normalized.learningContent.knowledgePoints.find(
      (item) => item.knowledgeObjectiveId === knowledgeObjectiveId,
    )?.openMaic || null
  );
}
