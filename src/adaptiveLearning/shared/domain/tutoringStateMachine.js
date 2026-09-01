import { isMasteredValue, MASTERY_THRESHOLD } from "./masteryPolicy.js";

export const TUTORING_POLICY_VERSION = "tutoring-p0-v1";

export const tutoringStates = Object.freeze({
  PRACTICING: "PRACTICING",
  DIAGNOSING: "DIAGNOSING",
  READY_TO_CONTINUE: "READY_TO_CONTINUE",
  REMEDIATION: "REMEDIATION",
  REVALIDATING: "REVALIDATING",
  COMPLETE: "COMPLETE",
  NEEDS_SUPPORT: "NEEDS_SUPPORT",
});

const allowedTransitions = Object.freeze({
  PRACTICING: ["DIAGNOSING"],
  DIAGNOSING: ["READY_TO_CONTINUE", "REMEDIATION"],
  READY_TO_CONTINUE: ["REVALIDATING"],
  REMEDIATION: ["REVALIDATING"],
  REVALIDATING: ["COMPLETE", "NEEDS_SUPPORT"],
  COMPLETE: [],
  NEEDS_SUPPORT: [],
});

export const tutoringStateMeta = Object.freeze({
  DIAGNOSING: {
    label: "正在回顾错因",
    nextAction: "说清共同错误原因和下次检查方法",
  },
  READY_TO_CONTINUE: {
    label: "错因已经确认",
    nextAction: "用一道未见新题重新验证",
  },
  REMEDIATION: {
    label: "正在重点讲解",
    nextAction: "完成讲解后用未见新题重新验证",
  },
  REVALIDATING: {
    label: "正在重新验证",
    nextAction: "独立完成未见新题，不能依赖讲解或提示",
  },
  COMPLETE: { label: "重新验证通过", nextAction: "继续后续学习" },
  NEEDS_SUPPORT: {
    label: "重新验证未通过",
    nextAction: "保留为待巩固，建议教师后续关注",
  },
});

/**
 *
 * @param fromState
 * @param toState
 * @param details
 */
function transitionRecord(fromState, toState, details = {}) {
  return {
    fromState,
    toState,
    reasonCode: details.reasonCode || "STATE_RULE",
    occurredAt: details.occurredAt || new Date().toISOString(),
    promptVersion: details.promptVersion || "",
    summary: details.summary || "",
    causeType: details.causeType || "",
    studentTip: details.studentTip || "",
    evidenceQuestionIds: details.evidenceQuestionIds || [],
    policyVersion: TUTORING_POLICY_VERSION,
  };
}

/**
 *
 * @param intervention
 * @param details
 */
export function createTutoringSession(intervention, details = {}) {
  const transition = transitionRecord(
    tutoringStates.PRACTICING,
    tutoringStates.DIAGNOSING,
    {
      ...details,
      reasonCode: intervention?.trigger || "PRACTICE_INTERVENTION",
      evidenceQuestionIds: (intervention?.evidence || [])
        .map((item) => item.questionId)
        .filter(Boolean),
    },
  );
  return {
    id: details.id || `tutoring-${Date.now()}`,
    state: tutoringStates.DIAGNOSING,
    policyVersion: TUTORING_POLICY_VERSION,
    knowledgePointId: intervention?.knowledgePointId || "",
    revalidationQuestionId: intervention?.revalidationQuestionId || "",
    startedAt: transition.occurredAt,
    updatedAt: transition.occurredAt,
    transitions: [transition],
  };
}

/**
 *
 * @param session
 * @param toState
 * @param details
 */
export function transitionTutoringSession(session, toState, details = {}) {
  if (!session?.state) throw new Error("缺少当前教学状态");
  const allowed = allowedTransitions[session.state] || [];
  if (!allowed.includes(toState)) {
    throw new Error(`不允许从 ${session.state} 转到 ${toState}`);
  }
  const transition = transitionRecord(session.state, toState, details);
  return {
    ...session,
    state: toState,
    updatedAt: transition.occurredAt,
    completedAt: [
      tutoringStates.COMPLETE,
      tutoringStates.NEEDS_SUPPORT,
    ].includes(toState)
      ? transition.occurredAt
      : session.completedAt,
    transitions: [...(session.transitions || []), transition],
  };
}

/**
 *
 * @param diagnosis
 */
export function diagnosisTargetState(diagnosis) {
  if (!diagnosis?.ready) return tutoringStates.DIAGNOSING;
  return diagnosis.needsRemediation
    ? tutoringStates.REMEDIATION
    : tutoringStates.READY_TO_CONTINUE;
}

/**
 *
 * @param state
 * @param decision
 */
export function normalizeRevalidationDecision(state, decision) {
  if (
    state === tutoringStates.REVALIDATING &&
    decision?.status === "needs_intervention"
  ) {
    return {
      ...decision,
      status: "needs_support",
      reason: "REVALIDATION_NOT_PASSED",
    };
  }
  return decision;
}

/**
 *
 * @param scoreRatio
 * @param mastery
 */
export function revalidationDecisionForScore(scoreRatio, mastery) {
  const passedScore = Number(scoreRatio) >= 0.8;
  const targetMasteryReached = isMasteredValue(mastery);
  const passed = passedScore && targetMasteryReached;
  const reason = passed
    ? "REVALIDATION_PASSED"
    : passedScore
      ? "REVALIDATION_MASTERY_BELOW_TARGET"
      : "REVALIDATION_NOT_PASSED";
  return {
    status: passed ? "mastered" : "needs_support",
    answered: 1,
    correctStreak: passedScore ? 1 : 0,
    minimumQuestionsMet: true,
    stabilityGateMet: passedScore,
    targetMasteryReached,
    targetMastery: MASTERY_THRESHOLD,
    completionReason: reason,
    reason,
  };
}

/**
 *
 * @param state
 * @param decision
 */
export function terminalStateForPracticeDecision(state, decision) {
  if (state !== tutoringStates.REVALIDATING) return null;
  if (decision?.status === "mastered") return tutoringStates.COMPLETE;
  if (decision?.status === "needs_support") return tutoringStates.NEEDS_SUPPORT;
  return null;
}
