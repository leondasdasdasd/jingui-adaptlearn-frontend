/**
 * Student-facing adapters for the U1 mastery contract.
 *
 * The estimator is server authoritative.  These helpers deliberately do not
 * recalculate mastery from correct answers; they only normalize the snapshot
 * returned with an answer/report so the UI can explain the change immediately.
 */

const clampPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, numeric <= 1 ? numeric * 100 : numeric));
};

/**
 * Normalize a mastery delta for student-facing display.  U1 keeps its full
 * precision in the evidence trace; this helper only prevents tiny floating
 * point residuals from being rendered as a misleading negative zero.
 * @param value
 */
export function normalizeMasteryDelta(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.abs(numeric) < 0.05 ? 0 : Number(numeric.toFixed(1));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 *
 * @param value
 * @param fallback
 */
export function formatMasteryDelta(value, fallback = "变化待补充") {
  const normalized = normalizeMasteryDelta(value);
  if (normalized == null) return fallback;
  if (normalized === 0) return "0.0%";
  return `${normalized > 0 ? "+" : ""}${normalized.toFixed(1)}%`;
}

/**
 *
 * @param value
 */
export function normalizeConfidence(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "high" || normalized === "高") return 80;
    if (normalized === "medium" || normalized === "中") return 55;
    if (normalized === "low" || normalized === "低") return 30;
    if (normalized === "none" || normalized === "待补充") return 0;
  }
  return clampPercent(value);
}

/**
 *
 * @param attempt
 * @param knowledgePointId
 */
function candidateUpdate(attempt = {}, knowledgePointId = "") {
  const containers = [
    attempt.unifiedMastery,
    attempt.masteryUpdate,
    attempt.masteryUpdates,
    attempt.knowledgePointUpdates,
    attempt.knowledgePointMastery,
    attempt.masteryByKnowledgePoint,
    attempt.u1,
    attempt.u1Preview,
  ].filter(Boolean);
  for (const container of containers) {
    const value =
      knowledgePointId && container[knowledgePointId] != null
        ? container[knowledgePointId]
        : container;
    if (
      value &&
      typeof value === "object" &&
      (value.masteryAfter != null ||
        value.mastery != null ||
        value.after != null ||
        value.confidenceAfter != null ||
        value.confidence != null)
    )
      return value;
  }
  if (
    attempt.masteryAfter != null ||
    attempt.mastery != null ||
    attempt.confidenceAfter != null
  ) {
    return attempt;
  }
  return null;
}

/**
 * Normalize one U1 result. `previous` is used only to show the before value;
 * it never manufactures an after value when the authoritative snapshot is
 * absent.
 * @param attempt
 * @param knowledgePointId
 * @param previous
 */
export function masteryUpdateFromAttempt(
  attempt = {},
  knowledgePointId,
  previous = {},
) {
  const update = candidateUpdate(attempt, knowledgePointId);
  const before = clampPercent(
    update?.masteryBefore ?? update?.before ?? previous.mastery,
  );
  const after = clampPercent(
    update?.masteryAfter ?? update?.after ?? update?.mastery,
  );
  const confidence = normalizeConfidence(
    update?.confidenceAfter ??
      update?.confidence ??
      attempt.confidenceAfter ??
      attempt.confidence,
  );
  const correctStreak = Number(
    update?.correctStreak ?? update?.streak ?? attempt.correctStreak,
  );
  const delta =
    after == null || before == null
      ? null
      : normalizeMasteryDelta(after - before);
  return {
    knowledgePointId,
    before,
    after,
    delta,
    confidence,
    confidenceBefore: normalizeConfidence(update?.confidenceBefore),
    correctStreak: Number.isFinite(correctStreak) ? correctStreak : null,
    lowerBound: clampPercent(update?.lowerBound),
    upperBound: clampPercent(update?.upperBound),
    reason: update?.reason || attempt.masteryReason || "",
    algorithmVersion:
      update?.algorithmVersion || attempt.algorithmVersion || "",
    hasAuthoritativeSnapshot: Boolean(
      update && (after != null || confidence != null),
    ),
  };
}

/**
 *
 * @param question
 */
export function questionKnowledgePointIds(question = {}) {
  const weighted = Object.keys(question.knowledgePointWeights || {});
  return weighted.length > 0
    ? weighted
    : (question.knowledgePointIds || []).filter(Boolean);
}

/**
 * 将已结算作答映射为得分率，并为未结算状态保留 null。
 * @param attempt
 * @returns {number | null} 0 到 1 的得分率，或待结算状态
 */
export function attemptScoreRatioOrNull(attempt = {}) {
  if (Object.prototype.hasOwnProperty.call(attempt, "scoreRatio")) {
    if (attempt.scoreRatio == null || attempt.scoreRatio === "") return null;
    const explicitRatio = Number(attempt.scoreRatio);
    return Number.isFinite(explicitRatio)
      ? Math.max(0, Math.min(1, explicitRatio))
      : null;
  }
  const score = Number(attempt.score);
  const maxScore = Number(attempt.maxScore);
  return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
    ? Math.max(0, Math.min(1, score / maxScore))
    : null;
}

/**
 * 将作答映射为聚合计算使用的得分率，未结算作答按 0 计。
 * @param attempt
 * @returns {number} 0 到 1 的得分率
 */
export function attemptScoreRatio(attempt = {}) {
  return attemptScoreRatioOrNull(attempt) ?? 0;
}

/**
 *
 * @param questions
 * @param attempts
 */
export function overallAttemptCorrectRate(questions = [], attempts = {}) {
  const answered = questions.filter((question) => attempts[question.id]);
  if (answered.length === 0) return null;
  const total = answered.reduce(
    (sum, question) => sum + attemptScoreRatio(attempts[question.id]),
    0,
  );
  return Math.round((total / answered.length) * 100);
}

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.attempts
 * @param root0.knowledgePointId
 */
export function evidenceRowsForKnowledgePoint({
  questions = [],
  attempts = {},
  knowledgePointId,
}) {
  return questions
    .map((question, index) => ({
      question,
      index,
      attempt: attempts[question.id],
    }))
    .filter(
      ({ question, attempt }) =>
        attempt &&
        questionKnowledgePointIds(question).includes(knowledgePointId),
    )
    .sort(
      (a, b) =>
        new Date(a.attempt.submittedAt || 0) -
        new Date(b.attempt.submittedAt || 0),
    );
}

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.attempt
 * @param root0.knowledgePoints
 * @param root0.previousMastery
 * @param root0.initialMastery
 */
export function masteryFeedbackForQuestion({
  question,
  attempt,
  knowledgePoints = [],
  previousMastery = {},
  initialMastery = {},
}) {
  return questionKnowledgePointIds(question)
    .map((knowledgePointId) => {
      const knowledgePoint = knowledgePoints.find(
        (item) => item.id === knowledgePointId,
      );
      return masteryUpdateFromAttempt(
        attempt,
        knowledgePointId,
        previousMastery[knowledgePointId] || {},
      );
    })
    .map((item) => {
      const initial = clampPercent(
        initialMastery[item.knowledgePointId]?.mastery,
      );
      return {
        ...item,
        cumulativeDelta:
          item.after == null || initial == null
            ? null
            : normalizeMasteryDelta(item.after - initial),
        knowledgePointName:
          knowledgePoints.find((kp) => kp.id === item.knowledgePointId)?.name ||
          item.knowledgePointId,
      };
    });
}
