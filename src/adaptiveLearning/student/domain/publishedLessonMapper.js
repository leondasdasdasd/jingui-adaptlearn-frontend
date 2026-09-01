import {
  flattenPublishedQuestions,
  normalizePublishedContentPackage,
} from "../../shared/domain/publishedLearningContent.js";

/**
 *
 * @param version
 */
export function mapContentVersionToStudentLesson(version) {
  const content = normalizePublishedContentPackage(
    version?.contentPackage || {},
  );
  const questionPool = flattenPublishedQuestions(content);
  const withContentVersion = (question) => ({
    ...question,
    knowledgePointIds: question.knowledgePointIds?.length
      ? question.knowledgePointIds
      : question.knowledgeObjectiveIds || [],
    contentVersionId: version.id,
  });
  return {
    planType: content.planType,
    title: content.title || content.lesson?.title,
    sourceLessons: content.sourceLessons || [],
    generationPolicy: content.generationPolicy,
    lessonId: version.textbookLessonId,
    version: version.versionNumber,
    versionId: version.id,
    status: "published",
    publishedAt: version.publishedAt,
    questionDistribution: content.questionDistribution || null,
    knowledgeObjectives: content.knowledgeObjectives || [],
    preQuestions: questionPool
      .filter((item) => item.purpose?.toUpperCase() === "PRE")
      .map(withContentVersion),
    postQuestions: questionPool
      .filter((item) =>
        ["PRACTICE", "POST"].includes(item.purpose?.toUpperCase()),
      )
      .map(withContentVersion),
    learningContent: content.learningContent,
    knowledgePracticePools: Object.fromEntries(
      Object.entries(content.knowledgePracticePools || {}).map(
        ([knowledgePointId, questions]) => [
          knowledgePointId,
          (questions || []).map(withContentVersion),
        ],
      ),
    ),
    compositeReviewPool: (content.compositeReviewPool || []).map(
      withContentVersion,
    ),
  };
}
