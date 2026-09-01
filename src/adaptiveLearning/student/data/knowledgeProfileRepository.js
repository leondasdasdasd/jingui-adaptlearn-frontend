import { storageKeys } from "../../shared/contracts/storageKeys.js";
import { isMasteredValue } from "../../shared/domain/masteryPolicy.js";
import {
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";

/**
 *
 * @param question
 */
function knowledgePointIdsForQuestion(question = {}) {
  return question.knowledgePointIds?.length
    ? question.knowledgePointIds
    : question.knowledgeObjectiveIds?.length
      ? question.knowledgeObjectiveIds
      : [
          question.primaryKnowledgePointId ||
            question.primaryKnowledgeObjectiveId,
        ].filter(Boolean);
}

/**
 *
 */
export function readKnowledgeProfile() {
  return readJson(storageKeys.knowledgeProfile, {});
}

/**
 *
 * @param knowledgePoint
 * @param lessonId
 */
export function markKnowledgePointLearned(knowledgePoint, lessonId = "") {
  if (!knowledgePoint?.id) return readKnowledgeProfile();
  const current = readKnowledgeProfile();
  const next = {
    ...current,
    [knowledgePoint.id]: {
      ...current[knowledgePoint.id],
      id: knowledgePoint.id,
      name:
        knowledgePoint.name ||
        current[knowledgePoint.id]?.name ||
        knowledgePoint.id,
      lessonId,
      status:
        current[knowledgePoint.id]?.mastery == null
          ? "learned"
          : current[knowledgePoint.id].status,
      learningCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
  writeJson(storageKeys.knowledgeProfile, next);
  return next;
}

/**
 *
 * @param session
 */
export function syncKnowledgeProfileFromSession(session) {
  const current = readKnowledgeProfile();
  const next = Object.fromEntries(
    Object.entries(current).map(([id, item]) => [
      id,
      item.status === "studying" ? { ...item, status: "learned" } : item,
    ]),
  );
  const knowledgePoints = session.selection?.knowledgePoints || [];
  const questions = [
    ...(session.preQuestions || []),
    ...(session.postQuestions || []),
  ];
  const attemptedQuestionIds = [
    ...Object.keys(session.preAttempts || {}),
    ...Object.keys(session.postAttempts || {}),
  ];
  const attemptedKnowledgePointIds = new Set(
    attemptedQuestionIds.flatMap((questionId) =>
      knowledgePointIdsForQuestion(
        questions.find((question) => question.id === questionId),
      ),
    ),
  );
  const lastAttemptedQuestion = questions.find(
    (question) => question.id === attemptedQuestionIds.at(-1),
  );
  const plannedUnit =
    session.learningFlow?.activeUnit ||
    session.learningFlow?.plan?.units?.[
      session.learningFlow?.plan?.currentIndex
    ];
  const currentKnowledgePointId =
    session.practiceIntervention?.knowledgePointId ||
    knowledgePointIdsForQuestion(lastAttemptedQuestion)[0] ||
    plannedUnit?.knowledgePointId;

  for (const knowledgePoint of knowledgePoints) {
    const finalResult =
      session.resultSource === "authoritative"
        ? session.result?.[knowledgePoint.id]
        : null;
    const mastery =
      finalResult?.mastery ?? next[knowledgePoint.id]?.mastery ?? null;
    const hasEvidence = Boolean(
      finalResult || attemptedKnowledgePointIds.has(knowledgePoint.id),
    );
    if (!hasEvidence && knowledgePoint.id !== currentKnowledgePointId) {
      if (
        next[knowledgePoint.id]?.mastery == null &&
        !next[knowledgePoint.id]?.learningCompletedAt &&
        ["studying", "learned"].includes(next[knowledgePoint.id]?.status)
      ) {
        delete next[knowledgePoint.id];
      }
      continue;
    }
    const status =
      finalResult?.mastery == null
        ? knowledgePoint.id === currentKnowledgePointId
          ? "studying"
          : "learned"
        : isMasteredValue(mastery)
          ? "mastered"
          : "needs_review";
    next[knowledgePoint.id] = {
      ...next[knowledgePoint.id],
      id: knowledgePoint.id,
      name: knowledgePoint.name,
      lessonId: session.selection?.section?.id || "",
      mastery:
        mastery != null && Number.isFinite(Number(mastery))
          ? Math.round(Number(mastery))
          : null,
      masterySource:
        finalResult?.mastery == null
          ? next[knowledgePoint.id]?.masterySource || ""
          : "authoritative",
      confidence:
        finalResult?.confidence ?? next[knowledgePoint.id]?.confidence ?? 0,
      evidenceCount:
        finalResult?.evidenceCount ??
        next[knowledgePoint.id]?.evidenceCount ??
        0,
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  writeJson(storageKeys.knowledgeProfile, next);
  return next;
}

/**
 *
 * @param session
 */
export function buildKnowledgeMapProfile(session) {
  const persisted = syncKnowledgeProfileFromSession(session);
  if (session.resultSource === "authoritative") return persisted;

  const preview = { ...persisted };
  const knowledgePoints = session.selection?.knowledgePoints || [];
  const attemptedPreQuestionIds = new Set(
    Object.keys(session.preAttempts || {}),
  );
  const attemptedQuestionIds = new Set(Object.keys(session.postAttempts || {}));
  const attemptedPreKnowledgePointIds = new Set(
    (session.preQuestions || []).flatMap((question) =>
      attemptedPreQuestionIds.has(question.id)
        ? knowledgePointIdsForQuestion(question)
        : [],
    ),
  );
  const attemptedKnowledgePointIds = new Set(
    (session.postQuestions || []).flatMap((question) =>
      attemptedQuestionIds.has(question.id)
        ? knowledgePointIdsForQuestion(question)
        : [],
    ),
  );

  for (const knowledgePoint of knowledgePoints) {
    const result = session.result?.[knowledgePoint.id];
    const practiceEvidenceCount = Number(
      result?.evidenceCount ?? result?.total ?? 0,
    );
    const preResult = session.preMastery?.[knowledgePoint.id];
    const practiceMastery = Number(result?.mastery);
    const preMastery = Number(preResult?.mastery);
    // A calculated mastery snapshot is already the evidence projection. It may
    // come from a published practice pool or accepted historical/server
    // evidence whose question IDs are not present in the current session
    // arrays, so question-ID matching cannot be the only visibility gate.
    const hasPracticeEvidence =
      Number.isFinite(practiceMastery) &&
      (practiceEvidenceCount > 0 ||
        attemptedKnowledgePointIds.has(knowledgePoint.id));
    const hasPreEvidence =
      Number.isFinite(preMastery) &&
      (Number(preResult?.evidenceCount ?? preResult?.total ?? 0) > 0 ||
        attemptedPreKnowledgePointIds.has(knowledgePoint.id) ||
        preResult?.diagnosisStatus === "provisionally_mastered" ||
        preResult?.historicalEvidenceUsed === true ||
        preResult?.masterySource === "authoritative");
    const source = hasPracticeEvidence
      ? "preview"
      : hasPreEvidence
        ? "pre_assessment_preview"
        : "";
    const mastery = hasPracticeEvidence ? practiceMastery : preMastery;
    if (!source || !Number.isFinite(mastery)) continue;
    if (
      source === "pre_assessment_preview" &&
      persisted[knowledgePoint.id]?.mastery != null
    )
      continue;

    preview[knowledgePoint.id] = {
      ...persisted[knowledgePoint.id],
      id: knowledgePoint.id,
      name: knowledgePoint.name,
      lessonId: session.selection?.section?.id || "",
      mastery: Math.round(mastery),
      masterySource: source,
      status: "preview",
    };
  }

  return preview;
}
