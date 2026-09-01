import {
  getClassroomPlans,
  publishClassroomPlan,
} from "../../shared/infrastructure/classroomApi";
import {
  START_CLASS_ISSUES,
  startClassIssue,
} from "../domain/startClassIssue";

export const MAX_LINKED_LESSON_COUNT = 3;

const sourceLessonIds = (plan) =>
  (plan?.sourceLessons || []).map((item) => item.textbookLessonId);

const hasSameLessonScope = (plan, lessonIds) => {
  const planLessonIds = sourceLessonIds(plan);
  return (
    planLessonIds.length === lessonIds.length &&
    lessonIds.every((lessonId) => planLessonIds.includes(lessonId))
  );
};

/**
 *
 * @param lessonIds
 */
function normalizedLessonScope(lessonIds) {
  const uniqueLessonIds = [...new Set(lessonIds.filter(Boolean))];
  if (
    uniqueLessonIds.length === 0 ||
    uniqueLessonIds.length > MAX_LINKED_LESSON_COUNT
  ) {
    throw startClassIssue(START_CLASS_ISSUES.SELECT_LESSONS);
  }
  return uniqueLessonIds;
}

/**
 *
 * @param lessonIds
 * @param versionsByLessonId
 */
function publishedVersions(lessonIds, versionsByLessonId) {
  const versions = lessonIds.map((lessonId) => versionsByLessonId[lessonId]);
  if (versions.some((version) => !version?.id)) {
    throw startClassIssue(START_CLASS_ISSUES.PUBLISH_LESSONS);
  }
  return versions;
}

const classroomContent = (contentVersionId, title, lessonIds) => ({
  contentVersionId,
  sourceLessonIds: lessonIds,
  title,
});

/**
 *
 * @param title
 * @param versions
 */
async function publishReusableMultiLessonContent(title, versions) {
  return publishClassroomPlan({
    title,
    sourceContentVersionIds: versions.map((version) => version.id),
    generatedContent: {
      generationPolicy: {
        assessment: "NONE",
        compositeExplanation: "OMIT",
        masteredKnowledgePointPolicy: "VERIFY_ONCE",
      },
      learningContent: { composite: null },
      diagnosticQuestionPool: [],
      compositeReviewPool: [],
    },
  });
}

/**
 * 将 1–3 个已发布教材课时解析为课堂服务可直接使用的内容版本。
 * 多课时仅复用各课时已发布内容，不触发 OpenMAIC 或 AI 生成。
 * @param {object} input 课时范围、课时元数据和已发布版本。
 * @param input.lessonIds
 * @param input.lessonsById
 * @param input.versionsByLessonId
 * @returns {Promise<{contentVersionId:string,title:string,sourceLessonIds:string[]}>} 可执行课堂内容。
 */
export async function ensureStartClassContent({
  lessonIds,
  lessonsById,
  versionsByLessonId,
}) {
  const uniqueLessonIds = normalizedLessonScope(lessonIds);
  const versions = publishedVersions(uniqueLessonIds, versionsByLessonId);

  const title = uniqueLessonIds
    .map((lessonId) => lessonsById[lessonId]?.title)
    .filter(Boolean)
    .join(" · ");
  if (uniqueLessonIds.length === 1) {
    return classroomContent(versions[0].id, title, uniqueLessonIds);
  }

  const plans = await getClassroomPlans();
  const existingPlan = (Array.isArray(plans) ? plans : []).find((plan) =>
    hasSameLessonScope(plan, uniqueLessonIds),
  );
  if (existingPlan?.versionId) {
    return classroomContent(
      existingPlan.versionId,
      existingPlan.title || title,
      uniqueLessonIds,
    );
  }

  const createdPlan = await publishReusableMultiLessonContent(title, versions);
  if (!createdPlan?.versionId) {
    throw startClassIssue(START_CLASS_ISSUES.PREPARE_CONTENT_FAILED);
  }
  return classroomContent(
    createdPlan.versionId,
    createdPlan.title || title,
    uniqueLessonIds,
  );
}
