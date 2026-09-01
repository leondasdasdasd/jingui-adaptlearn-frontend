import {
  enabledLearningModules,
  normalizeLearningGenerationPolicy,
} from "../../shared/domain/learningGenerationPolicy.js";
import { normalizePublishedContentPackage } from "../../shared/domain/publishedLearningContent.js";

const MAX_LESSONS = 3;
const MIN_LESSONS = 2;
const GENERATION_LESSON_ID_MAX_LENGTH = 64;

export const normalizeMultiLessonGenerationPolicy =
  normalizeLearningGenerationPolicy;

/**
 *
 * @param policy
 */
export function enabledMultiLessonGenerationModules(policy = {}) {
  const enabled = enabledLearningModules(policy);
  return {
    compositeExplanation: enabled.compositeExplanation,
    preAssessment: enabled.preAssessment,
    postAssessment: enabled.postAssessment,
  };
}

/**
 *
 * @param items
 * @param keyOf
 * @param conflictMessage
 */
function uniqueBy(items, keyOf, conflictMessage) {
  const values = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const current = values.get(key);
    if (current && JSON.stringify(current) !== JSON.stringify(item))
      throw new Error(conflictMessage(item));
    if (!current) values.set(key, item);
  }
  return [...values.values()];
}

/**
 *
 * @param question
 */
function questionKey(question) {
  return (
    String(question.id || "").trim() ||
    String(question.stem || "").replaceAll(/\s+/g, "")
  );
}

/**
 *
 * @param question
 * @param version
 * @param lessonId
 */
function reusedQuestion(question, version, lessonId) {
  return {
    ...question,
    sourceContentVersionId: question.sourceContentVersionId || version.id,
    sourceTextbookLessonId: question.sourceTextbookLessonId || lessonId,
  };
}

/**
 *
 * @param version
 */
export function hasReusableKnowledgeAssets(version) {
  const content = version?.contentPackage;
  const objectives = content?.knowledgeObjectives || [];
  const runtimes = new Map(
    (content?.learningContent?.knowledgePoints || []).map((item) => [
      item.knowledgeObjectiveId,
      item.openMaic,
    ]),
  );
  return (
    objectives.length > 0 &&
    objectives.every(
      (objective) =>
        runtimes.get(objective.id)?.classroomUrl &&
        Array.isArray(content?.knowledgePracticePools?.[objective.id]) &&
        content.knowledgePracticePools[objective.id].length > 0,
    )
  );
}

/**
 *
 * @param versions
 */
export function validateSelectedLessonVersions(versions = []) {
  if (versions.length < MIN_LESSONS || versions.length > MAX_LESSONS) {
    throw new Error("请选择 2–3 个课时");
  }
  if (new Set(versions.map((version) => version.id)).size !== versions.length) {
    throw new Error("请勿重复选择同一课时");
  }
  for (const version of versions) {
    if (
      !version?.id ||
      !version?.textbookLessonId ||
      !version?.contentPackage
    ) {
      throw new Error("所选课时还没有可用内容");
    }
    if (!hasReusableKnowledgeAssets(version)) {
      throw new Error("所选课时需要先更新学习内容");
    }
  }
  return versions;
}

/**
 *
 * @param versions
 */
export function multiLessonGenerationLessonId(versions = []) {
  const sourceIds = versions
    .map((version) =>
      String(typeof version === "string" ? version : version?.id || "").trim(),
    )
    .filter(Boolean)
    .slice(0, MAX_LESSONS);
  const compactIds = sourceIds.map(
    (id) => id.replaceAll(/[^\w-]/g, "").slice(0, 12) || "source",
  );
  return `multi:${compactIds.join(":") || "lesson"}`.slice(
    0,
    GENERATION_LESSON_ID_MAX_LENGTH,
  );
}

/**
 *
 * @param versions
 * @param lessonById
 */
export function sourceLessonSummaries(versions = [], lessonById = {}) {
  return versions.map((version, index) => ({
    order: index + 1,
    lessonId: version.textbookLessonId,
    title:
      lessonById[version.textbookLessonId]?.title ||
      version.contentPackage?.lesson?.title ||
      "教材课时",
    index: lessonById[version.textbookLessonId]?.index || "",
    contentVersionId: version.id,
    versionNumber: version.versionNumber,
  }));
}

/**
 *
 * @param versions
 * @param lessonById
 */
export function mergeSourceLessonAssets(versions = [], lessonById = {}) {
  validateSelectedLessonVersions(versions);
  const normalized = versions.map((version) => ({
    version,
    lessonId: version.textbookLessonId,
    content: normalizePublishedContentPackage(version.contentPackage),
  }));
  const objectives = uniqueBy(
    normalized.flatMap(({ content }) => content.knowledgeObjectives || []),
    (item) => item.id,
    (item) => `知识点“${item.name || item.id}”在所选课时中不一致`,
  );
  const knowledgeRuntimes = uniqueBy(
    normalized.flatMap(
      ({ content }) => content.learningContent?.knowledgePoints || [],
    ),
    (item) => item.knowledgeObjectiveId,
    (item) =>
      `知识点“${objectives.find((value) => value.id === item.knowledgeObjectiveId)?.name || item.knowledgeObjectiveId}”的学习内容版本不一致`,
  );
  const knowledgePracticePools = {};
  for (const { version, lessonId, content } of normalized) {
    for (const [knowledgePointId, questions] of Object.entries(
      content.knowledgePracticePools || {},
    )) {
      knowledgePracticePools[knowledgePointId] ||= [];
      const existing = new Set(
        knowledgePracticePools[knowledgePointId].map(questionKey),
      );
      for (const question of questions || []) {
        const value = reusedQuestion(question, version, lessonId);
        const key = questionKey(value);
        if (!existing.has(key)) {
          knowledgePracticePools[knowledgePointId].push(value);
          existing.add(key);
        }
      }
    }
  }
  return {
    sourceLessons: sourceLessonSummaries(versions, lessonById),
    knowledgeObjectives: objectives,
    knowledgeRuntimes,
    knowledgePracticePools,
  };
}

/**
 *
 * @param question
 * @param purpose
 */
function formalQuestion(question, purpose) {
  return {
    ...question,
    purpose,
    phase: purpose === "POST" ? "review" : "diagnostic",
    knowledgeObjectiveIds:
      question.knowledgeObjectiveIds || question.knowledgePointIds || [],
  };
}

/**
 *
 * @param root0
 * @param root0.planId
 * @param root0.title
 * @param root0.versions
 * @param root0.lessonById
 * @param root0.classroom
 * @param root0.diagnosticQuestions
 * @param root0.reviewQuestions
 * @param root0.generationPolicy
 */
export function buildMultiLessonContentPackage({
  planId,
  title,
  versions,
  lessonById,
  classroom,
  diagnosticQuestions,
  reviewQuestions,
  generationPolicy,
}) {
  const assets = mergeSourceLessonAssets(versions, lessonById);
  const knowledgeIds = assets.knowledgeObjectives.map((item) => item.id);
  const policy = normalizeMultiLessonGenerationPolicy(generationPolicy);
  const enabled = enabledMultiLessonGenerationModules(policy);
  if (
    enabled.compositeExplanation &&
    (!classroom?.classroomId || !classroom?.classroomUrl)
  ) {
    throw new Error("课堂学习还没有准备好");
  }
  if (enabled.preAssessment && !diagnosticQuestions?.length)
    throw new Error("课前测验还没有准备好");
  if (enabled.postAssessment && !reviewQuestions?.length)
    throw new Error("课时巩固还没有准备好");
  return {
    planType: "MULTI_LESSON",
    planId,
    generationPolicy: policy,
    lesson: { id: `classroom-plan:${planId}`, title },
    sourceLessons: assets.sourceLessons,
    knowledgeObjectives: assets.knowledgeObjectives,
    diagnosticQuestionPool: enabled.preAssessment
      ? (diagnosticQuestions || []).map((item) => formalQuestion(item, "PRE"))
      : [],
    learningContent: {
      composite: enabled.compositeExplanation
        ? {
            status: "READY",
            classroomId: classroom.classroomId,
            classroomUrl: classroom.classroomUrl,
            coveredKnowledgeObjectiveIds: knowledgeIds,
          }
        : null,
      knowledgePoints: assets.knowledgeRuntimes,
    },
    knowledgePracticePools: assets.knowledgePracticePools,
    compositeReviewPool: enabled.postAssessment
      ? (reviewQuestions || []).map((item) => formalQuestion(item, "POST"))
      : [],
    unconfirmedItems: [],
  };
}

export { DEFAULT_LEARNING_GENERATION_POLICY as DEFAULT_MULTI_LESSON_GENERATION_POLICY } from "../../shared/domain/learningGenerationPolicy.js";
