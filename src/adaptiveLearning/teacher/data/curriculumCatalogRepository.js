/* eslint-disable complexity -- 目录 repository 在单一边界严格校验并映射 BFF 树合同。 */
const CATALOG_CACHE_PREFIX = "adaptive-curriculum-catalog-v1:";

/**
 *
 */
function defaultCatalogEndpoint() {
  return "/adaptive-api/v1/curriculum-catalog";
}

/**
 *
 * @param scope
 */
function catalogCacheKey(scope) {
  return `${CATALOG_CACHE_PREFIX}${scope.subject}:${scope.publisher}:${scope.grade}`;
}

/**
 *
 * @param chapterIndex
 * @param lessonIndexValue
 */
function lessonIndex(chapterIndex, lessonIndexValue) {
  return `${chapterIndex + 1}.${lessonIndexValue + 1}`;
}

/**
 * 将 BFF 目录合同转换为现有课程领域模型。
 * @param payload
 */
export function curriculumCourseFromApi(payload) {
  if (!payload?.id || !Array.isArray(payload.chapters)) {
    throw new Error("教材目录响应不完整");
  }
  const course = {
    id: String(payload.id),
    catalogVersion: String(payload.catalogVersion || ""),
    subjectKey: String(payload.subject),
    subject: String(payload.subjectName || payload.subject),
    publisherKey: String(payload.publisher),
    publisher: String(payload.publisherName || payload.publisher),
    gradeKey: String(payload.grade),
    grade: String(payload.grade),
    volume: String(payload.volume || ""),
    questionSourceScope: {
      subject: String(payload.questionSourceScope?.subject || payload.subject),
      publisher: String(
        payload.questionSourceScope?.publisher || payload.publisher,
      ),
      grade: String(payload.questionSourceScope?.grade || payload.grade),
      volume: String(payload.questionSourceScope?.volume || payload.volume),
    },
    chapters: payload.chapters.map((chapter, chapterIndex) => ({
      id: String(chapter.id),
      index: chapterIndex + 1,
      title: String(chapter.title || ""),
      sections: (Array.isArray(chapter.lessons) ? chapter.lessons : []).map(
        (lesson, sectionIndex) => ({
          id: String(lesson.id),
          index: lessonIndex(chapterIndex, sectionIndex),
          title: String(lesson.title || ""),
          estimatedMinutes: Number(lesson.estimatedMinutes) || 45,
          knowledgePoints: (Array.isArray(lesson.knowledgePoints)
            ? lesson.knowledgePoints
            : []
          ).map((knowledgePoint) => ({
            id: String(knowledgePoint.id),
            name: String(knowledgePoint.name || ""),
            discipline: String(knowledgePoint.discipline || payload.subject),
          })),
        }),
      ),
    })),
  };
  if (
    course.chapters.every((chapter) => chapter.sections.length === 0) ||
    course.chapters.some((chapter) =>
      chapter.sections.some((lesson) => lesson.knowledgePoints.length === 0),
    )
  ) {
    throw new Error("真实教材目录缺少课时知识点映射");
  }
  return course;
}

/**
 * 读取真实科学或物理目录，不提供数学或 Mock 回退。
 * @param scope
 * @param options
 */
export async function fetchCurriculumCatalog(scope, options = {}) {
  const parameters = new URLSearchParams({
    subject: scope.subject,
    publisher: scope.publisher,
    grade: scope.grade,
    volume: scope.volume || (scope.grade.endsWith("-down") ? "down" : "up"),
  });
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const endpoint = options.endpoint || defaultCatalogEndpoint();
  const response = await fetchImpl(`${endpoint}?${parameters}`, {
    credentials: "include",
    signal: options.signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "教材目录加载失败");
  }
  const course = curriculumCourseFromApi(payload);
  globalThis.sessionStorage?.setItem(
    catalogCacheKey(scope),
    JSON.stringify(course),
  );
  return course;
}

/**
 * 从已成功加载的真实目录中恢复课时，供内容页刷新使用。
 * @param lessonId
 */
export function readCachedCurriculumLesson(lessonId) {
  if (!globalThis.sessionStorage) return null;
  for (let index = 0; index < globalThis.sessionStorage.length; index += 1) {
    const key = globalThis.sessionStorage.key(index);
    if (!key?.startsWith(CATALOG_CACHE_PREFIX)) continue;
    try {
      const cached = JSON.parse(globalThis.sessionStorage.getItem(key));
      for (const chapter of cached.chapters || []) {
        const lesson = (chapter.sections || []).find(
          (item) => item.id === lessonId,
        );
        if (lesson) {
          return {
            ...lesson,
            chapter,
            course: cached,
            grade: cached.grade,
            subject: cached.subject,
            publisher: cached.publisher,
          };
        }
      }
    } catch {
      // 损坏的会话缓存不是权威数据，忽略后继续查找其他真实目录。
    }
  }
  return null;
}

/**
 * 从真实目录会话缓存恢复章节，保持与本地章节查询相同的页面输入合同。
 * @param {string} chapterId 章节 ID
 * @param courseId
 * @returns {(object & {course: object})|null} 章节目录合同
 */
export function readCachedCurriculumChapter(chapterId, courseId) {
  if (!globalThis.sessionStorage) return null;
  for (let index = 0; index < globalThis.sessionStorage.length; index += 1) {
    const key = globalThis.sessionStorage.key(index);
    if (!key?.startsWith(CATALOG_CACHE_PREFIX)) continue;
    try {
      const cached = JSON.parse(globalThis.sessionStorage.getItem(key));
      if (String(cached.id) !== String(courseId)) continue;
      const chapter = (cached.chapters || []).find(
        (item) => String(item.id) === String(chapterId),
      );
      if (chapter) return { ...chapter, course: cached };
    } catch {
      // 损坏的会话缓存不进入页面领域对象，继续查找其他真实目录。
    }
  }
  return null;
}
