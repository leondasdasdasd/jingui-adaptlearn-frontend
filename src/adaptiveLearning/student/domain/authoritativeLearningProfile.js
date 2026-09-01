import { isMasteredValue } from "../../shared/domain/masteryPolicy.js";
import { toHistoryAttemptView } from "./learningAttemptHistory";

/**
 *
 * @param course
 */
function catalogIndexes(course = {}) {
  const entries = (course.chapters || []).flatMap((chapter) =>
    (chapter.sections || []).flatMap((lesson) =>
      (lesson.knowledgePoints || []).map((knowledgePoint) => ({
        chapter,
        lesson,
        knowledgePoint,
      })),
    ),
  );
  return {
    knowledgeById: Object.fromEntries(
      entries.map((item) => [item.knowledgePoint.id, item]),
    ),
  };
}

/**
 *
 * @param attempt
 */
function attemptKnowledgePointIds(attempt = {}) {
  const snapshot = attempt.questionSnapshot || {};
  const ids = snapshot.knowledgePointIds?.length
    ? snapshot.knowledgePointIds
    : snapshot.knowledgeObjectiveIds?.length
      ? snapshot.knowledgeObjectiveIds
      : [
          attempt.knowledgeObjectiveId || snapshot.primaryKnowledgePointId,
        ].filter(Boolean);
  return [...new Set(ids.filter(Boolean))];
}

/**
 *
 * @param attempt
 */
function attemptOutcome(attempt = {}) {
  const disposition = String(
    attempt.answerContent?.disposition || "",
  ).toUpperCase();
  const gradingStatus = String(
    attempt.gradingResult?.gradingStatus || "",
  ).toLowerCase();
  if (["SKIPPED", "SKIPPED_DONT_KNOW"].includes(disposition))
    return "skipped";
  if (gradingStatus && gradingStatus !== "final") return "pending";
  const score = Number(attempt.score);
  const maxScore = Number(attempt.maxScore);
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0)
    return "pending";
  if (score >= maxScore) return "correct";
  if (score > 0) return "partial";
  return "incorrect";
}

/**
 *
 * @param attempt
 */
function attemptType(attempt = {}) {
  const purpose = String(attempt.purpose || "").toUpperCase();
  const phase = String(attempt.questionSnapshot?.phase || "").toLowerCase();
  if (purpose === "PRE") return "pre";
  if (purpose === "ENHANCEMENT") return "enhancement";
  if (phase === "review" || purpose === "COMPOSITE") return "composite";
  return "practice";
}

/**
 *
 * @param attempt
 */
function attemptAnswer(attempt = {}) {
  const content = attempt.answerContent;
  if (content == null) return "";
  if (typeof content !== "object" || Array.isArray(content)) return content;
  return content.text ?? content.value ?? content.answer ?? content;
}

/**
 *
 * @param profile
 * @param course
 */
export function knowledgeProfileFromAuthority(profile, course) {
  const { knowledgeById } = catalogIndexes(course);
  const attemptsByKnowledge = new Map();
  for (const attempt of profile?.attempts || []) {
    for (const id of attemptKnowledgePointIds(attempt)) {
      attemptsByKnowledge.set(id, (attemptsByKnowledge.get(id) || 0) + 1);
    }
  }
  const statesById = Object.fromEntries(
    (profile?.masteryStates || []).map((state) => [
      state.knowledgeObjectiveId,
      state,
    ]),
  );
  const ids = new Set([
    ...attemptsByKnowledge.keys(),
    ...Object.keys(statesById),
  ]);
  return Object.fromEntries(
    [...ids].map((id) => {
      const catalog = knowledgeById[id];
      const state = statesById[id];
      const mastery = Number.isFinite(Number(state?.mastery))
        ? Math.round(Number(state.mastery))
        : null;
      const evidenceCount = Number(
        state?.evidenceCount || attemptsByKnowledge.get(id) || 0,
      );
      const determined =
        String(state?.masteryStatus || "").toUpperCase() === "DETERMINED";
      const status =
        determined && mastery != null
          ? isMasteredValue(mastery)
            ? "mastered"
            : "needs_review"
          : "studying";
      return [
        id,
        {
          id,
          name: catalog?.knowledgePoint.name || id,
          lessonId: catalog?.lesson.id || "",
          mastery,
          masterySource: "authoritative",
          confidence: Number(state?.confidence || 0),
          evidenceCount,
          status,
          updatedAt: state?.updatedAt || profile?.generatedAt || "",
        },
      ];
    }),
  );
}

/**
 *
 * @param localProfile
 * @param authoritativeProfile
 */
export function mergeKnowledgeProfiles(
  localProfile = {},
  authoritativeProfile = {},
) {
  const merged = { ...localProfile };
  for (const [id, authoritative] of Object.entries(authoritativeProfile)) {
    const local = localProfile[id] || {};
    const hasAuthoritativeMastery =
      authoritative.mastery != null &&
      Number.isFinite(Number(authoritative.mastery));
    const hasLocalMastery =
      local.mastery != null && Number.isFinite(Number(local.mastery));
    const mastery = hasAuthoritativeMastery
      ? Math.round(Number(authoritative.mastery))
      : hasLocalMastery
        ? Math.round(Number(local.mastery))
        : null;
    const localHasFinalStatus =
      local.masterySource === "authoritative" &&
      ["mastered", "needs_review"].includes(local.status);

    merged[id] = {
      ...local,
      ...authoritative,
      mastery,
      masterySource: hasAuthoritativeMastery
        ? authoritative.masterySource
        : hasLocalMastery
          ? local.masterySource
          : authoritative.masterySource,
      status: hasAuthoritativeMastery
        ? authoritative.status
        : localHasFinalStatus
          ? local.status
          : "studying",
    };
  }
  return merged;
}

/**
 *
 * @param profile
 * @param course
 */
export function attemptsFromAuthority(profile, course) {
  const { knowledgeById } = catalogIndexes(course);
  return (profile?.attempts || [])
    .map((attempt, index) => {
      const knowledgePointIds = attemptKnowledgePointIds(attempt);
      const catalog = knowledgeById[knowledgePointIds[0]];
      const maxScore = Number(attempt.maxScore);
      const score = Number(attempt.score);
      return toHistoryAttemptView({
        historyId:
          attempt.studentSessionId ||
          profile?.currentSession?.id ||
          "authoritative-history",
        attemptId:
          attempt.clientSubmissionId || attempt.id || `authoritative-${index}`,
        studentId: profile?.student?.id || "",
        source: "classroom",
        authority: "authoritative",
        syncStatus: "synced",
        sessionStatus: profile?.currentSession?.status || "",
        contentVersionId: profile?.currentSession?.contentVersionId || "",
        questionSnapshot: attempt.questionSnapshot || {
          id: attempt.questionId,
        },
        questionId:
          attempt.questionId ||
          attempt.questionSnapshot?.id ||
          `authoritative-${index}`,
        attemptType: attemptType(attempt),
        questionType: attempt.questionSnapshot?.type || "",
        outcome: attemptOutcome(attempt),
        scoreRatio:
          Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
            ? score / maxScore
            : null,
        knowledgePointIds,
        knowledgePoints: knowledgePointIds.map(
          (id) => knowledgeById[id]?.knowledgePoint.name || id,
        ),
        lesson: catalog
          ? {
              id: catalog.lesson.id,
              index: catalog.lesson.index || "",
              title: catalog.lesson.title || "",
              chapterId: catalog.chapter.id,
              chapterTitle: catalog.chapter.title || "",
            }
          : {
              id: "",
              index: "",
              title: "",
              chapterId: "",
              chapterTitle: "",
            },
        answer: attemptAnswer(attempt),
        recognizedAnswer: attempt.gradingResult?.recognizedAnswer,
        correctAnswer:
          attempt.gradingResult?.correctAnswer ??
          attempt.questionSnapshot?.answer,
        feedback: attempt.gradingResult?.feedback,
        feedbackSource: attempt.gradingResult?.feedbackSource,
        errorReason: attempt.gradingResult?.errorReason,
        improvements: attempt.gradingResult?.improvements,
        aiCommentary: attempt.gradingResult?.aiCommentary,
        gradedBy: attempt.gradingResult?.gradedBy,
        analysis: attempt.questionSnapshot?.analysis,
        submittedAt: attempt.submittedAt || attempt.createdAt || "",
      });
    })
    .sort((left, right) =>
      String(right.submittedAt).localeCompare(String(left.submittedAt)),
    );
}

/**
 *
 * @param localAttempts
 * @param authoritativeAttempts
 */
export function mergeLearningAttempts(
  localAttempts = [],
  authoritativeAttempts = [],
) {
  const authoritativeKeys = new Set(
    authoritativeAttempts
      .flatMap((attempt) => [
        attempt.attemptId,
        `${attempt.questionId}:${attempt.submittedAt}`,
      ])
      .filter(Boolean),
  );
  const localOnly = localAttempts.filter(
    (attempt) =>
      !authoritativeKeys.has(attempt.attemptId) &&
      !authoritativeKeys.has(`${attempt.questionId}:${attempt.submittedAt}`),
  );
  return [...authoritativeAttempts, ...localOnly].sort((left, right) =>
    String(right.submittedAt || "").localeCompare(
      String(left.submittedAt || ""),
    ),
  );
}
