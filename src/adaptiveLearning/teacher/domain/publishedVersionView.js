import {
  flattenPublishedQuestions,
  normalizePublishedContentPackage,
} from "../../shared/domain/publishedLearningContent.js";

/**
 *
 * @param version
 * @param current
 */
export function publishedVersionToTeacherContent(version, current = {}) {
  if (!version) return current;
  const contentPackage = normalizePublishedContentPackage(
    version.contentPackage || {},
  );
  const questions = flattenPublishedQuestions(contentPackage);
  return {
    ...current,
    lessonId: version.textbookLessonId || current.lessonId,
    preQuestions: questions
      .filter((item) => item.purpose === "PRE")
      .map((item) => ({
        ...item,
        knowledgePointIds: item.knowledgeObjectiveIds || item.knowledgePointIds,
      })),
    postQuestions: questions
      .filter((item) => ["PRACTICE", "POST"].includes(item.purpose))
      .map((item) => ({
        ...item,
        knowledgePointIds: item.knowledgeObjectiveIds || item.knowledgePointIds,
      })),
    learningContent: contentPackage.learningContent,
    assessmentMatrices: contentPackage.assessmentMatrices,
    assessmentQuestionSlots: contentPackage.assessmentQuestionSlots,
    status: "published",
    version: version.versionNumber,
    publishedAt: version.publishedAt,
    publishedVersionId: version.id,
    publishedVersionNumber: version.versionNumber,
    qualityReport: version.qualityReport,
  };
}
