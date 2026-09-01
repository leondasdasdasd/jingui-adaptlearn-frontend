import {
  cancelOpenMaicJob,
  createOpenMaicClassroom,
  getOpenMaicJob,
} from "../../lib/openMaicApi.js";
import {
  generateQuestions,
  reviewLessonContentQuality,
} from "../../lib/questionApi.js";
import {
  flattenPublishedQuestions,
  normalizePublishedContentPackage,
} from "../../shared/domain/publishedLearningContent.js";
import {
  getLatestLessonVersion,
  validateLessonVersion,
} from "../../shared/infrastructure/classroomApi.js";
import {
  readTeacherContent,
  writeTeacherContent,
} from "../data/teacherContentRepository.js";
import { resolveClassroomGeneration } from "../domain/lessonBatchGeneration.js";
import { buildPublishedContentPackage } from "../domain/publishedContentPackage.js";
import { createWholeLessonGenerationController } from "./wholeLessonGenerationController.js";

/**
 *
 * @param version
 * @param existing
 */
function contentFromPublishedVersion(version, existing) {
  if (!version) return existing;
  const normalized = normalizePublishedContentPackage(
    version.contentPackage || {},
  );
  const questions = flattenPublishedQuestions(normalized);
  return {
    ...existing,
    lessonId: version.textbookLessonId || existing.lessonId,
    preQuestions: questions
      .filter((item) => String(item.purpose).toUpperCase() === "PRE")
      .map((item) => ({
        ...item,
        knowledgePointIds:
          item.knowledgePointIds || item.knowledgeObjectiveIds || [],
      })),
    postQuestions: questions
      .filter((item) =>
        ["PRACTICE", "POST"].includes(String(item.purpose).toUpperCase()),
      )
      .map((item) => ({
        ...item,
        knowledgePointIds:
          item.knowledgePointIds || item.knowledgeObjectiveIds || [],
      })),
    learningContent: normalized.learningContent || existing.learningContent,
    assessmentMatrices:
      normalized.assessmentMatrices || existing.assessmentMatrices || {},
    version: version.versionNumber,
    status: "published",
    publishedVersionId: version.id,
    publishedVersionNumber: version.versionNumber,
    publishedAt: version.publishedAt,
    qualityReport: version.qualityReport,
  };
}

/**
 *
 * @param lesson
 * @param existing
 * @param root0
 * @param root0.signal
 */
async function prepareBrowserContent(lesson, existing, { signal } = {}) {
  let published;
  try {
    const timeoutSignal = AbortSignal.timeout(2000);
    published = await getLatestLessonVersion(lesson.id, {
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });
  } catch {
    // Published-version refresh is an enhancement, not a prerequisite for
    // generation. When the classroom service is temporarily unavailable the
    // teacher must still be able to generate from the local recoverable draft.
    return existing;
  }
  const localIsNewerDraft =
    existing.status === "draft" &&
    existing.updatedAt &&
    (!published.publishedAt ||
      new Date(existing.updatedAt) > new Date(published.publishedAt));
  return localIsNewerDraft
    ? existing
    : contentFromPublishedVersion(published, existing);
}

let singleton = null;

/** Keeps cross-lesson generation alive while the teacher navigates between routes. */
export function getBrowserWholeLessonGenerationController() {
  if (singleton) return singleton;
  singleton = createWholeLessonGenerationController({
    loadContents: readTeacherContent,
    saveContents: writeTeacherContent,
    prepareContent: prepareBrowserContent,
    generateQuestions,
    createOpenMaicClassroom,
    pollOpenMaicJob: (jobId, options) =>
      resolveClassroomGeneration(
        { jobId },
        {
          getJob: getOpenMaicJob,
          lessonId: options.lessonId,
          signal: options.signal,
          onProgress: options.onProgress,
        },
      ),
    cancelOpenMaicJob,
    validateLessonVersion,
    reviewLessonContentQuality,
    buildPublishedContentPackage,
  });
  return singleton;
}
