import {
  clientEvents,
  storageKeys,
} from "../../shared/contracts/storageKeys.js";
import { course } from "../../shared/domain/courseCatalog.js";
import {
  createDefaultContent,
  normalizeLessonContent,
} from "../../shared/domain/defaultLessonContent.js";
import { normalizeLearningContentRuntimes } from "../../shared/domain/publishedLearningContent.js";
import {
  emitClientEvent,
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";
import { adaptOpenMaicLearningContent } from "../../shared/infrastructure/openMaicRuntimeAdapter.js";
import { teacherStorageKey } from "./teacherStoragePartition.js";

/**
 *
 * @param stored
 * @param fallback
 */
function preferNonEmptyObject(stored, fallback) {
  return stored && Object.keys(stored).length > 0 ? stored : fallback;
}

/**
 *
 * @param stored
 * @param fallback
 */
function preferNonEmptyArray(stored, fallback) {
  return Array.isArray(stored) && stored.length > 0 ? stored : fallback;
}

/**
 *
 * @param defaultItem
 * @param storedItem
 */
function mergeStoredLessonContent(defaultItem, storedItem = {}) {
  return {
    ...defaultItem,
    ...storedItem,
    // 草稿是教师生成矩阵、题目和学习内容后的权威本地状态，重新进入时不能降级成发布态。
    status: storedItem.status || defaultItem.status || "published",
    assessmentMatrices: preferNonEmptyObject(
      storedItem.assessmentMatrices,
      defaultItem.assessmentMatrices,
    ),
    assessmentQuestionSlots: preferNonEmptyObject(
      storedItem.assessmentQuestionSlots,
      defaultItem.assessmentQuestionSlots,
    ),
    preQuestions: preferNonEmptyArray(
      storedItem.preQuestions,
      defaultItem.preQuestions,
    ),
    postQuestions: preferNonEmptyArray(
      storedItem.postQuestions,
      defaultItem.postQuestions,
    ),
    learningUnits: preferNonEmptyArray(
      storedItem.learningUnits,
      defaultItem.learningUnits,
    ),
  };
}

/**
 *
 * @param content
 */
function normalizeTeacherContentRuntimes(content) {
  return Object.fromEntries(
    Object.entries(content).map(([lessonId, lessonContent]) => [
      lessonId,
      {
        ...lessonContent,
        learningContent: adaptOpenMaicLearningContent(
          normalizeLearningContentRuntimes(
            lessonContent.learningContent || {
              composite: lessonContent.openMaic,
              knowledgePoints: [],
            },
          ),
        ),
      },
    ]),
  );
}

// 教师端唯一可写的课时内容仓储。迁移后只需把这里替换成教师内容 API。
/**
 *
 */
export function readTeacherContent() {
  const defaults = createDefaultContent();
  const stored = readJson(teacherStorageKey(storageKeys.teacherContent), {});
  const merged = { ...defaults };

  for (const [id, defaultItem] of Object.entries(defaults)) {
    merged[id] = mergeStoredLessonContent(defaultItem, stored[id]);
  }

  for (const [id, storedItem] of Object.entries(stored)) {
    if (!merged[id]) {
      merged[id] = storedItem;
    }
  }

  return normalizeTeacherContentRuntimes(normalizeLessonContent(merged));
}

/**
 *
 * @param content
 */
export function writeTeacherContent(content) {
  const stored = writeJson(
    teacherStorageKey(storageKeys.teacherContent),
    content,
  );
  if (stored)
    emitClientEvent(clientEvents.contentUpdated, {
      lessonIds: Object.keys(content),
    });
  return stored;
}

/**
 *
 * @param targetCourse
 */
export function curriculumLessons(targetCourse = course) {
  const activeCourse = targetCourse || course;
  return (activeCourse.chapters || []).flatMap((chapter) =>
    (chapter.sections || []).map((section) => ({
      ...section,
      chapter,
      grade: section.grade || activeCourse.grade,
      subject: section.subject || activeCourse.subject,
    })),
  );
}
