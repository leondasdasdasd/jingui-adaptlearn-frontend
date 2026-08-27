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
 */
export function normalizeMasteryDelta(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.abs(numeric) < 0.05 ? 0 : Number(numeric.toFixed(1));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatMasteryDelta(value, fallback = '变化待补充') {
  const normalized = normalizeMasteryDelta(value);
  if (normalized == null) return fallback;
  if (normalized === 0) return '0.0%';
  return `${normalized > 0 ? '+' : ''}${normalized.toFixed(1)}%`;
}

export function normalizeConfidence(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'high' || normalized === '高') return 80;
    if (normalized === 'medium' || normalized === '中') return 55;
    if (normalized === 'low' || normalized === '低') return 30;
    if (normalized === 'none' || normalized === '待补充') return 0;
  }
  return clampPercent(value);
}

function candidateUpdate(attempt = {}, knowledgePointId = '') {
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
    const value = knowledgePointId && container[knowledgePointId] != null
      ? container[knowledgePointId]
      : container;
    if (value && typeof value === 'object'
      && (value.masteryAfter != null || value.mastery != null || value.after != null
        || value.confidenceAfter != null || value.confidence != null)) return value;
  }
  if (attempt.masteryAfter != null || attempt.mastery != null || attempt.confidenceAfter != null) {
    return attempt;
  }
  return null;
}

/**
 * Normalize one U1 result. `previous` is used only to show the before value;
 * it never manufactures an after value when the authoritative snapshot is
 * absent.
 */
export function masteryUpdateFromAttempt(attempt = {}, knowledgePointId, previous = {}) {
  const update = candidateUpdate(attempt, knowledgePointId);
  const before = clampPercent(update?.masteryBefore ?? update?.before ?? previous.mastery);
  const after = clampPercent(update?.masteryAfter ?? update?.after ?? update?.mastery);
  const confidence = normalizeConfidence(
    update?.confidenceAfter ?? update?.confidence ?? attempt.confidenceAfter ?? attempt.confidence,
  );
  const correctStreak = Number(update?.correctStreak ?? update?.streak ?? attempt.correctStreak);
  const delta = after == null || before == null ? null : normalizeMasteryDelta(after - before);
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
    reason: update?.reason || attempt.masteryReason || '',
    algorithmVersion: update?.algorithmVersion || attempt.algorithmVersion || '',
    hasAuthoritativeSnapshot: Boolean(update && (after != null || confidence != null)),
  };
}

export function questionKnowledgePointIds(question = {}) {
  const weighted = Object.keys(question.knowledgePointWeights || {});
  return weighted.length ? weighted : (question.knowledgePointIds || []).filter(Boolean);
}

export function attemptScoreRatio(attempt = {}) {
  const ratio = Number(attempt.scoreRatio);
  if (Number.isFinite(ratio)) return Math.max(0, Math.min(1, ratio));
  const score = Number(attempt.score);
  const maxScore = Number(attempt.maxScore);
  return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
    ? Math.max(0, Math.min(1, score / maxScore)) : 0;
}

export function overallAttemptCorrectRate(questions = [], attempts = {}) {
  const answered = questions.filter((question) => attempts[question.id]);
  if (!answered.length) return null;
  const total = answered.reduce((sum, question) => sum + attemptScoreRatio(attempts[question.id]), 0);
  return Math.round((total / answered.length) * 100);
}

export function evidenceRowsForKnowledgePoint({ questions = [], attempts = {}, knowledgePointId }) {
  return questions
    .map((question, index) => ({ question, index, attempt: attempts[question.id] }))
    .filter(({ question, attempt }) => attempt && questionKnowledgePointIds(question).includes(knowledgePointId))
    .sort((a, b) => new Date(a.attempt.submittedAt || 0) - new Date(b.attempt.submittedAt || 0));
}

export function masteryFeedbackForQuestion({
  question, attempt, knowledgePoints = [], previousMastery = {}, initialMastery = {},
}) {
  return questionKnowledgePointIds(question).map((knowledgePointId) => {
    const knowledgePoint = knowledgePoints.find((item) => item.id === knowledgePointId);
    return masteryUpdateFromAttempt(
      attempt,
      knowledgePointId,
      previousMastery[knowledgePointId] || {},
    );
  }).map((item) => {
    const initial = clampPercent(initialMastery[item.knowledgePointId]?.mastery);
    return {
      ...item,
      cumulativeDelta: item.after == null || initial == null
        ? null : normalizeMasteryDelta(item.after - initial),
      knowledgePointName: knowledgePoints.find((kp) => kp.id === item.knowledgePointId)?.name || item.knowledgePointId,
    };
  });
}
