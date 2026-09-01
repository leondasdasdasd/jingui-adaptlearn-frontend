import { enabledLearningModules } from "../../shared/domain/learningGenerationPolicy.js";
import { isMasteredValue } from "../../shared/domain/masteryPolicy.js";

// Only the numeric 90% mastery line can mark a knowledge point as mastered.
// A provisional diagnosis may bypass repeated teaching, but it still needs an
// independent verification question before the lesson can move on.
const hasMastered = (mastery = {}) =>
  Number(mastery.evidenceCount || 0) >= 3 && isMasteredValue(mastery.mastery);
const isProvisionallyMastered = (mastery = {}) =>
  mastery.diagnosisStatus === "provisionally_mastered" && !hasMastered(mastery);

/**
 *
 * @param knowledgePoints
 * @param mastery
 * @param generationPolicy
 */
export function createAutomaticLearningPlan(
  knowledgePoints,
  mastery,
  generationPolicy,
) {
  const modules = enabledLearningModules(generationPolicy);
  const forceLearn = modules.masteredKnowledgePointPolicy === "FORCE_LEARN";
  const targetIds = knowledgePoints
    .filter(
      (item) =>
        forceLearn ||
        (!hasMastered(mastery[item.id]) &&
          !isProvisionallyMastered(mastery[item.id])),
    )
    .map((item) => item.id);
  const masteredIds = forceLearn
    ? []
    : knowledgePoints
        .filter((item) => hasMastered(mastery[item.id]))
        .map((item) => item.id);
  const provisionalIds = forceLearn
    ? []
    : knowledgePoints
        .filter((item) => isProvisionallyMastered(mastery[item.id]))
        .map((item) => item.id);
  // Once every knowledge point is mastered, the lesson is complete. Do not
  // make the student repeat verification inside this lesson; the next action
  // is decided by the lesson directory and advances to the next lesson.
  if (targetIds.length === 0 && provisionalIds.length === 0) {
    return {
      source: "lesson_flow",
      targetKnowledgePointIds: [],
      masteredKnowledgePointIds: masteredIds,
      generationPolicy,
      units: [],
      currentIndex: 0,
      createdAt: new Date().toISOString(),
    };
  }
  const units = [];
  if (
    targetIds.length === knowledgePoints.length &&
    modules.compositeExplanation
  ) {
    units.push({ id: "composite-learning", kind: "composite_learning" });
  }
  for (const knowledgePointId of targetIds) {
    if (
      targetIds.length !== knowledgePoints.length ||
      !modules.compositeExplanation
    ) {
      units.push({
        id: `learn-${knowledgePointId}`,
        kind: "knowledge_learning",
        knowledgePointId,
      });
    }
    units.push(
      {
        id: `practice-${knowledgePointId}`,
        kind: "knowledge_practice",
        knowledgePointId,
      },
      {
        id: `checkpoint-${knowledgePointId}`,
        kind: "knowledge_checkpoint",
        knowledgePointId,
      },
    );
  }
  const verificationIds = [
    ...provisionalIds,
    ...(modules.masteredKnowledgePointPolicy === "VERIFY_ONCE"
      ? masteredIds
      : []),
  ];
  for (const knowledgePointId of verificationIds) {
    units.push({
      id: `verify-${knowledgePointId}`,
      kind: "knowledge_verification",
      knowledgePointId,
    });
  }
  if (
    modules.postAssessment &&
    (targetIds.length > 0 || verificationIds.length > 0)
  ) {
    units.push({ id: "composite-review", kind: "composite_review" });
  }
  return {
    source: "lesson_flow",
    targetKnowledgePointIds: targetIds,
    masteredKnowledgePointIds: masteredIds,
    generationPolicy,
    units,
    currentIndex: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 *
 * @param questions
 * @param attempts
 * @param knowledgePointId
 */
export function selectIndependentVerificationQuestion(
  questions = [],
  attempts = {},
  knowledgePointId = "",
) {
  const candidates = questions.filter(
    (question) =>
      question.phase !== "review" &&
      question.knowledgePointIds?.[0] === knowledgePointId,
  );
  const unseen = candidates.filter((question) => !attempts[question.id]);
  const difficultyRank = (value) => {
    const normalized = String(value ?? "")
      .trim()
      .toUpperCase();
    const match = normalized.match(/^D?([1-5])$/);
    return match ? Number(match[1]) : 1;
  };
  return (
    [...(unseen.length > 0 ? unseen : candidates)].sort(
      (left, right) =>
        difficultyRank(right.difficulty) - difficultyRank(left.difficulty) ||
        String(left.id).localeCompare(String(right.id)),
    )[0] || null
  );
}

/**
 *
 * @param flow
 * @param result
 * @param verificationUnitId
 */
export function resolveKnowledgeVerification(
  flow,
  result = {},
  verificationUnitId = "",
) {
  const plan = flow?.plan;
  const unit = currentLearningUnit(plan);
  if (
    unit?.kind !== "knowledge_verification" ||
    (verificationUnitId && unit.id !== verificationUnitId)
  ) {
    return { flow, outcome: { status: "not_applicable" } };
  }

  const evidenceIsFinal =
    result.gradingStatus === "final" && result.evidenceEligible !== false;
  const firstAttemptWasFullyCorrect =
    result.correctionAttempted !== true &&
    (result.initialScoreRatio == null ||
      Number(result.initialScoreRatio) >= 0.999);
  const fullyCorrect =
    result.correct === true &&
    Number(result.scoreRatio) >= 0.999 &&
    firstAttemptWasFullyCorrect;
  if (evidenceIsFinal && fullyCorrect) {
    return {
      flow: advanceLessonFlow(flow),
      outcome: { status: "passed", knowledgePointId: unit.knowledgePointId },
    };
  }

  const knowledgePointId = unit.knowledgePointId;
  const replacement = [
    {
      id: `learn-${knowledgePointId}`,
      kind: "knowledge_learning",
      knowledgePointId,
    },
    {
      id: `practice-${knowledgePointId}`,
      kind: "knowledge_practice",
      knowledgePointId,
    },
    {
      id: `checkpoint-${knowledgePointId}`,
      kind: "knowledge_checkpoint",
      knowledgePointId,
    },
  ];
  const units = plan.units.flatMap((candidate, index) =>
    index === plan.currentIndex ? replacement : [candidate],
  );
  const nextPlan = {
    ...plan,
    units,
    masteredKnowledgePointIds: (plan.masteredKnowledgePointIds || []).filter(
      (id) => id !== knowledgePointId,
    ),
    targetKnowledgePointIds: [
      ...new Set([...(plan.targetKnowledgePointIds || []), knowledgePointId]),
    ],
  };
  return {
    flow: {
      ...flow,
      mode: "lesson_flow",
      plan: nextPlan,
      activeUnit: null,
      context: null,
      returnTo: "",
      returnUnit: null,
      returnMode: null,
    },
    outcome: {
      status: "relearning_required",
      knowledgePointId,
      reason: evidenceIsFinal ? "NOT_FULLY_CORRECT" : "EVIDENCE_NOT_ELIGIBLE",
    },
  };
}

/**
 *
 * @param plan
 */
export function ensureLearningPlanCheckpoints(plan) {
  if (
    !plan?.units?.length ||
    plan.units.some((unit) => unit.kind === "knowledge_checkpoint")
  )
    return plan;
  const currentUnitId = plan.units[plan.currentIndex]?.id;
  const units = plan.units.flatMap((unit) =>
    unit.kind === "knowledge_practice"
      ? [
          unit,
          {
            id: `checkpoint-${unit.knowledgePointId}`,
            kind: "knowledge_checkpoint",
            knowledgePointId: unit.knowledgePointId,
          },
        ]
      : [unit],
  );
  const currentIndex = currentUnitId
    ? Math.max(
        0,
        units.findIndex((unit) => unit.id === currentUnitId),
      )
    : Math.min(units.length, plan.currentIndex || 0);
  return { ...plan, units, currentIndex };
}

/**
 *
 * @param plan
 */
export function createLessonLearningFlow(plan) {
  return {
    mode: "lesson_flow",
    plan,
    activeUnit: null,
    context: null,
    returnTo: "",
    returnUnit: null,
    returnMode: null,
  };
}

/**
 *
 * @param flow
 * @param knowledgePointId
 * @param context
 * @param returnTo
 */
export function startDirectLearning(flow, knowledgePointId, context, returnTo) {
  return {
    ...flow,
    mode: "direct",
    context,
    returnTo,
    returnUnit: null,
    activeUnit: {
      id: `direct-learn-${knowledgePointId}`,
      kind: "knowledge_learning",
      knowledgePointId,
    },
  };
}

/**
 *
 * @param flow
 */
export function startDirectPractice(flow) {
  const knowledgePointId = flow?.activeUnit?.knowledgePointId;
  return {
    ...flow,
    activeUnit: {
      id: `direct-practice-${knowledgePointId}`,
      kind: "knowledge_practice",
      knowledgePointId,
    },
  };
}

/**
 *
 * @param flow
 */
export function startDirectCheckpoint(flow) {
  const knowledgePointId = flow?.activeUnit?.knowledgePointId;
  return {
    ...flow,
    activeUnit: {
      id: `direct-checkpoint-${knowledgePointId}`,
      kind: "knowledge_checkpoint",
      knowledgePointId,
    },
  };
}

/**
 *
 * @param flow
 * @param knowledgePointId
 */
export function startRelearning(flow, knowledgePointId) {
  return {
    ...flow,
    mode: "relearn",
    returnMode: flow?.mode || "lesson_flow",
    returnUnit: activeLearningUnit(flow),
    activeUnit: {
      id: `relearn-${knowledgePointId}`,
      kind: "knowledge_learning",
      knowledgePointId,
    },
  };
}

/**
 *
 * @param flow
 */
export function activeLearningUnit(flow) {
  return flow?.activeUnit || currentLearningUnit(flow?.plan);
}

/**
 *
 * @param flow
 */
export function finishTemporaryLearning(flow) {
  if (flow?.mode === "relearn") {
    return {
      ...flow,
      mode: flow.returnMode || "lesson_flow",
      activeUnit: flow.returnUnit || null,
      returnUnit: null,
      returnMode: null,
    };
  }
  return {
    ...flow,
    mode: "lesson_flow",
    activeUnit: null,
    context: null,
    returnTo: "",
    returnUnit: null,
    returnMode: null,
  };
}

/**
 *
 * @param flow
 */
export function advanceLessonFlow(flow) {
  const plan = advanceLearningPlan(ensureLearningPlanCheckpoints(flow?.plan));
  return {
    ...flow,
    mode: "lesson_flow",
    plan,
    activeUnit: null,
    context: null,
    returnTo: "",
    returnUnit: null,
    returnMode: null,
  };
}

/**
 *
 * @param plan
 */
export function currentLearningUnit(plan) {
  return plan?.units?.[plan.currentIndex] || null;
}

/**
 *
 * @param plan
 */
export function advanceLearningPlan(plan) {
  if (!plan) return null;
  return {
    ...plan,
    currentIndex: Math.min(plan.units.length, plan.currentIndex + 1),
  };
}

/**
 *
 * @param unit
 * @param fallback
 */
export function routeForLearningUnit(
  unit,
  fallback = "/adaptive-learning/session/complete",
) {
  if (!unit) return fallback;
  if (unit.kind === "knowledge_checkpoint")
    return "/adaptive-learning/session/knowledge-checkpoint";
  return ["composite_learning", "knowledge_learning"].includes(unit.kind)
    ? "/adaptive-learning/session/learning"
    : "/adaptive-learning/session/post-assessment";
}

/**
 *
 * @param snapshotRoute
 * @param flow
 * @param fallback
 */
export function restoredStudentRoute(
  snapshotRoute,
  flow,
  fallback = "/adaptive-learning/session/pre-assessment",
) {
  const route = String(snapshotRoute || "");
  const safeStudentRoute =
    route.startsWith("/adaptive-learning/") &&
    !route.startsWith("/adaptive-learning/teacher/") &&
    !route.startsWith("/adaptive-learning/family/");
  if (!safeStudentRoute) return fallback;
  const path = route.split(/[#?]/, 1)[0].replace(/\/$/, "");
  const resumableLearningRoute =
    /^\/adaptive-learning\/session\/(?:pre-assessment|pre-result|learning|check-in|remediation|post-assessment|knowledge-checkpoint|complete)$/.test(
      path,
    ) || /^\/adaptive-learning\/knowledge\/[^/]+\/learn$/.test(path);
  if (resumableLearningRoute) return route;
  return routeForLearningUnit(activeLearningUnit(flow), fallback);
}

export { MASTERY_THRESHOLD } from "../../shared/domain/masteryPolicy.js";
