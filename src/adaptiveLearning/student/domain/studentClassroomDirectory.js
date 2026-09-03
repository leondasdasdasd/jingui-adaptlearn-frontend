import { isMasteredValue } from "../../shared/domain/masteryPolicy.js";

const STATUS_LABELS = {
  ACTIVE: "进行中",
  IN_PROGRESS: "进行中",
  PUBLISHED: "待开始",
  READY: "待开始",
  SCHEDULED: "未开始",
  COMPLETED: "已结束",
  ENDED: "已结束",
  CANCELLED: "已取消",
};

const KNOWLEDGE_STATUS_LABELS = {
  MASTERED: "已掌握",
  COMPLETE: "已完成",
  COMPLETED: "已完成",
  CURRENT: "学习中",
  IN_PROGRESS: "学习中",
};

/**
 *
 * @param value
 */
function parseEntryUrl(value) {
  if (!value) return {};
  try {
    const url = new URL(
      value,
      typeof window === "undefined"
        ? "http://localhost"
        : window.location.origin,
    );
    return {
      periodId: url.searchParams.get("periodId") || undefined,
      accessToken: url.searchParams.get("accessToken") || undefined,
    };
  } catch {
    return {};
  }
}

/**
 *
 * @param payload
 */
function listFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  return (
    payload?.items ||
    payload?.learningPeriods ||
    payload?.periods ||
    payload?.classrooms ||
    []
  );
}

/**
 *
 * @param period
 */
function knowledgeFromPeriod(period) {
  const content =
    period.contentPackage ||
    period.contentVersion?.contentPackage ||
    period.classroomPlan?.contentPackage ||
    {};
  return (
    period.knowledgePoints ||
    period.knowledgeObjectives ||
    period.classroomPlan?.knowledgePoints ||
    period.classroomPlan?.knowledgeObjectives ||
    content.knowledgeObjectives ||
    []
  );
}

/**
 *
 * @param period
 */
function sourcesFromPeriod(period) {
  const content =
    period.contentPackage ||
    period.contentVersion?.contentPackage ||
    period.classroomPlan?.contentPackage ||
    {};
  const sources =
    period.sourceLessons ||
    period.classroomPlan?.sourceLessons ||
    content.sourceLessons ||
    [];
  if (sources.length > 0) return sources;
  const lessonId =
    period.textbookLessonId || period.contentVersion?.textbookLessonId;
  return lessonId ? [lessonId] : [];
}

/**
 *
 * @param payload
 * @param course
 */
export function normalizeStudentClassroomDirectory(payload, course) {
  const catalogLessons = course.chapters.flatMap((chapter) =>
    chapter.sections.map((section) => ({ chapter, section })),
  );
  const lessonById = Object.fromEntries(
    catalogLessons.map((item) => [item.section.id, item]),
  );

  return listFromPayload(payload)
    .map((period) => {
      const entry = parseEntryUrl(
        period.entryUrl || period.joinUrl || period.studentEntryUrl,
      );
      const status = String(
        period.status || period.state || "PUBLISHED",
      ).toUpperCase();
      const sourceLessons = sourcesFromPeriod(period).map((source) => {
        const lessonId =
          typeof source === "string"
            ? source
            : source.textbookLessonId || source.lessonId || source.id;
        const catalog = lessonById[lessonId];
        return {
          id: lessonId,
          index: source.index || catalog?.section.index || "",
          title:
            source.title ||
            source.lessonTitle ||
            catalog?.section.title ||
            lessonId,
        };
      });
      const knowledgePoints = knowledgeFromPeriod(period).map(
        (knowledgePoint, index) => {
          const knowledgeStatus = String(
            knowledgePoint.status ||
              knowledgePoint.masteryStatus ||
              (knowledgePoint.mastered ? "MASTERED" : ""),
          ).toUpperCase();
          return {
            id:
              knowledgePoint.id ||
              knowledgePoint.knowledgePointId ||
              knowledgePoint.objectiveId ||
              `knowledge-${index + 1}`,
            name:
              knowledgePoint.name ||
              knowledgePoint.title ||
              knowledgePoint.objective ||
              `知识点 ${index + 1}`,
            status: knowledgeStatus,
            statusLabel:
              knowledgePoint.statusLabel ||
              KNOWLEDGE_STATUS_LABELS[knowledgeStatus] ||
              "待学习",
          };
        },
      );
      const id =
        period.periodId ||
        period.learningPeriodId ||
        period.id ||
        entry.periodId;
      return {
        id,
        periodId: id,
        title:
          period.title ||
          period.name ||
          period.lessonTitle ||
          period.classroomPlan?.title ||
          "课堂学习",
        status,
        statusLabel: period.statusLabel || STATUS_LABELS[status] || "待开始",
        sourceLessons,
        knowledgePoints,
        estimatedMinutes:
          period.estimatedMinutes || period.durationMinutes || null,
        startsAt:
          period.startsAt || period.startAt || period.publishedAt || null,
        accessToken:
          period.accessToken ||
          period.studentAccessToken ||
          period.joinCredential?.accessToken ||
          entry.accessToken,
        studentSessionId: period.studentSessionId || period.sessionId || null,
      };
    })
    .filter((period) => period.id);
}

/**
 *
 * @param session
 */
export function classroomDirectoryItemFromSession(session) {
  const selection = session?.selection;
  if (!selection?.learningPeriodId || !selection?.section) return null;
  const plan = session.learningFlow?.plan;
  const units = plan?.units || [];
  const clientCompleted =
    units.length > 0 && Number(plan.currentIndex || 0) >= units.length;
  const settled = session.resultSource === "authoritative" || clientCompleted;
  const completedKnowledgePointIds = new Set(
    units
      .slice(0, Number(plan?.currentIndex || 0))
      .filter((unit) => unit.kind === "knowledge_checkpoint")
      .map((unit) => unit.knowledgePointId)
      .filter(Boolean),
  );
  return {
    id: selection.learningPeriodId,
    periodId: selection.learningPeriodId,
    title: selection.section.title || "课堂学习",
    status: settled ? "COMPLETED" : "IN_PROGRESS",
    statusLabel: settled ? "已结束" : "进行中",
    sourceLessons: (selection.sourceLessons?.length
      ? selection.sourceLessons
      : [selection.section]
    ).map((source) => ({
      id: source.textbookLessonId || source.lessonId || source.id,
      index: source.index || "",
      title:
        source.title ||
        source.lessonTitle ||
        source.textbookLessonId ||
        source.lessonId ||
        "",
    })),
    knowledgePoints: (selection.knowledgePoints || []).map((knowledgePoint) => {
      const completed =
        settled || completedKnowledgePointIds.has(knowledgePoint.id);
      const mastery = session.preMastery?.[knowledgePoint.id];
      const mastered = isMasteredValue(
        typeof mastery === "number"
          ? mastery
          : (mastery?.mastery ?? mastery?.score),
      );
      return {
        id: knowledgePoint.id,
        name: knowledgePoint.name || knowledgePoint.title,
        status: completed ? "COMPLETED" : mastered ? "MASTERED" : "",
        statusLabel: completed ? "已完成" : mastered ? "已掌握" : "待学习",
      };
    }),
    estimatedMinutes: selection.section.estimatedMinutes || null,
    startsAt: selection.startedAt || null,
    accessToken: selection.classroomAccessToken,
    studentSessionId: selection.studentSessionId,
  };
}

/**
 *
 * @param items
 * @param activeItem
 */
export function mergeStudentClassrooms(items, activeItem) {
  if (!activeItem) return items;
  const existing = items.find((item) => item.id === activeItem.id);
  if (!existing) return [activeItem, ...items];
  return items.map((item) =>
    item.id === activeItem.id
      ? {
          ...item,
          ...activeItem,
          sourceLessons:
            activeItem.sourceLessons.length > 0
              ? activeItem.sourceLessons
              : item.sourceLessons,
          knowledgePoints:
            activeItem.knowledgePoints.length > 0
              ? activeItem.knowledgePoints
              : item.knowledgePoints,
        }
      : item,
  );
}
