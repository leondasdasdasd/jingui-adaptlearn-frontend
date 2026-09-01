const GRID_MIN = -4.5;
const GRID_MAX = 4.5;
const GRID_STEP = 0.05;

export const U1_ALGORITHM_VERSION =
  "U1-R11-production+evidence-gate-v6-adaptive-pre-stop-single-90";
export const U1_DIFFICULTIES = Object.freeze(["D1", "D2", "D3", "D4", "D5"]);

export const U1_CONFIG = Object.freeze({
  priorMean: 0,
  priorSd: 1.15,
  discrimination: 1.1,
  difficultyAnchors: Object.freeze({
    D1: -2.2,
    D2: -1.05,
    D3: 0,
    D4: 1.05,
    D5: 2.15,
  }),
  // Practice is learning evidence, but a correct response must still produce
  // a visible update. 0.85 made an easy D1 success look like a negligible
  // +2.6% change in the student UI; 1.5 keeps POST/revalidation stronger while
  // making repeated practice evidence actionable.
  sourceFactors: Object.freeze({
    PRE: 0.9,
    PRACTICE: 1.5,
    POST: 1.8,
    REVALIDATION: 1.9,
    REVIEW: 1.8,
  }),
  roleFactors: Object.freeze({
    PRIMARY: 1,
    SECONDARY_OBSERVED: 0.3,
    SECONDARY: 0.3,
    CONTEXT_ONLY: 0,
  }),
  hintFactors: Object.freeze({
    NONE: 1,
    LIGHT: 0.72,
    HEAVY: 0.35,
    ANSWER_SHOWN: 0.12,
  }),
  noveltyFactors: Object.freeze({ NEW: 1, PARALLEL: 0.82, REPEATED: 0.22 }),
  masteryThreshold: 90,
  learningWarningThreshold: 30,
  lowerBoundThreshold: 64,
  targetDifficulty: "D3",
  // D3 is the reference item. These response-weight bands tune update speed;
  // they use the same single 90% completion boundary as the mastery policy.
  masteryResponse: Object.freeze({
    lowThreshold: 30,
    stableThreshold: 90,
    low: 1.8,
    developing: 1.5,
    high: 0.7,
  }),
  // A first correct answer has no bonus; the second and third+ consecutive
  // correct answers receive 1.25x and 1.5x respectively. Any non-strong
  // response resets the streak in applyU1Evidence below.
  correctStreakFactors: Object.freeze([1, 1.25, 1.5]),
});

const GRID = Object.freeze(
  Array.from(
    { length: Math.round((GRID_MAX - GRID_MIN) / GRID_STEP) + 1 },
    (_, index) => Number((GRID_MIN + index * GRID_STEP).toFixed(4)),
  ),
);

const clamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, Number(value)));
const sigmoid = (value) => 1 / (1 + Math.exp(-value));
const normalDensity = (value, mean, sd) =>
  Math.exp(-0.5 * ((value - mean) / sd) ** 2);

/**
 *
 * @param value
 * @param fallback
 */
export function normalizeU1Difficulty(value, fallback = "D3") {
  if (typeof value === "string" && /^d[1-5]$/i.test(value.trim()))
    return value.trim().toUpperCase();
  const numeric = Number(value);
  if (Number.isFinite(numeric))
    return U1_DIFFICULTIES[Math.max(0, Math.min(4, Math.round(numeric) - 1))];
  return fallback;
}

/**
 *
 * @param weights
 */
function normalizeWeights(weights) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0)
    return GRID.map(() => 1 / GRID.length);
  return weights.map((value) => value / total);
}

/**
 *
 * @param mean
 * @param sd
 */
function priorWeights(mean = U1_CONFIG.priorMean, sd = U1_CONFIG.priorSd) {
  return normalizeWeights(
    GRID.map((theta) => normalDensity(theta, mean, Math.max(0.1, sd))),
  );
}

/**
 *
 * @param weights
 * @param difficulty
 */
function targetMasteryFromWeights(
  weights,
  difficulty = U1_CONFIG.targetDifficulty,
) {
  return GRID.reduce(
    (sum, theta, index) =>
      sum + probabilityAtDifficulty(theta, difficulty) * weights[index],
    0,
  );
}

// The logistic-normal approximation otherwise turns a stored 29% prior into
// roughly 32% before the first answer.  Calibrating the mean keeps the D3
// reference value stable and makes the low/mastery response bands honest.
/**
 *
 * @param probability
 * @param sd
 */
function calibratedPriorMean(probability, sd) {
  let low = GRID_MIN;
  let high = GRID_MAX;
  for (let iteration = 0; iteration < 48; iteration += 1) {
    const middle = (low + high) / 2;
    const mastery = targetMasteryFromWeights(priorWeights(middle, sd));
    if (mastery < probability) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/**
 *
 * @param weights
 * @param quantile
 */
function weightedQuantile(weights, quantile) {
  let cumulative = 0;
  for (const [index, weight] of weights.entries()) {
    cumulative += weight;
    if (cumulative >= quantile) return GRID[index];
  }
  return GRID.at(-1);
}

/**
 *
 * @param theta
 * @param difficulty
 */
function probabilityAtDifficulty(theta, difficulty) {
  return sigmoid(
    U1_CONFIG.discrimination *
      (theta - U1_CONFIG.difficultyAnchors[normalizeU1Difficulty(difficulty)]),
  );
}

/**
 *
 * @param evidence
 */
function scoreRatio(evidence = {}) {
  if (Number.isFinite(Number(evidence.scoreRatio)))
    return clamp(evidence.scoreRatio);
  if (Number.isFinite(Number(evidence.score))) {
    const maxScore = Number(evidence.maxScore);
    return Number.isFinite(maxScore) && maxScore > 0
      ? clamp(Number(evidence.score) / maxScore)
      : clamp(evidence.score);
  }
  return evidence.correct ? 1 : 0;
}

/**
 *
 * @param evidence
 */
function effectiveWeight(evidence = {}) {
  const source = String(
    evidence.source || evidence.purpose || "PRE",
  ).toUpperCase();
  const role = String(evidence.role || "PRIMARY").toUpperCase();
  const hint =
    evidence.hintUsed === true
      ? "LIGHT"
      : String(evidence.hint || evidence.hintLevel || "NONE").toUpperCase();
  const novelty = String(evidence.novelty || "NEW").toUpperCase();
  return (
    (U1_CONFIG.sourceFactors[source] ?? 1) *
    (U1_CONFIG.roleFactors[role] ?? 0) *
    (U1_CONFIG.hintFactors[hint] ?? 1) *
    (U1_CONFIG.noveltyFactors[novelty] ?? 1) *
    clamp(evidence.independence ?? 1) *
    clamp(evidence.itemQuality ?? 1) *
    clamp(evidence.gradingConfidence ?? evidence.itemConfidence ?? 1) *
    clamp(evidence.knowledgePointWeight ?? evidence.weight ?? 1)
  );
}

/**
 *
 * @param state
 */
function trailingCorrectStreak(state) {
  let streak = state.trace.length > 0 ? 0 : Number(state.correctStreak || 0);
  for (let index = state.trace.length - 1; index >= 0; index -= 1) {
    if (Number(state.trace[index].scoreRatio) >= 0.8) streak += 1;
    else break;
  }
  return Math.max(0, Math.min(3, streak));
}

/**
 *
 * @param mastery
 */
function masteryResponseFactor(mastery) {
  const config = U1_CONFIG.masteryResponse;
  const value = Math.max(0, Math.min(100, Number(mastery) || 0));
  if (value < config.lowThreshold) return config.low;
  if (value < config.stableThreshold) return config.developing;
  return config.high;
}

/**
 *
 * @param streak
 * @param score
 */
function streakFactorFor(streak, score) {
  if (score < 0.8) return 1;
  // `streak` is the number of strong answers immediately before this item;
  // indexing it directly gives factors for the 1st, 2nd and 3rd+ answer.
  return U1_CONFIG.correctStreakFactors[Math.min(2, Math.max(0, streak))] || 1;
}

/**
 *
 * @param state
 * @param evidence
 * @param score
 * @param beforeMastery
 */
function effectiveWeightForState(state, evidence, score, beforeMastery) {
  const base = effectiveWeight(evidence);
  const streak = score >= 0.8 ? trailingCorrectStreak(state) : 0;
  const streakFactor = streakFactorFor(streak, score);
  return {
    weight: base * masteryResponseFactor(beforeMastery) * streakFactor,
    streak,
    streakFactor,
    responseFactor: masteryResponseFactor(beforeMastery),
  };
}

/**
 *
 * @param root0
 * @param root0.knowledgePointId
 * @param root0.priorMastery
 * @param root0.priorConfidence
 * @param root0.priorCorrectStreak
 * @param root0.priorEvidenceCount
 * @param root0.priorPrimaryEvidenceCount
 */
export function createU1State({
  knowledgePointId,
  priorMastery = null,
  priorConfidence = null,
  priorCorrectStreak = 0,
  priorEvidenceCount = 0,
  priorPrimaryEvidenceCount = 0,
} = {}) {
  const normalizedPrior = Number(priorMastery);
  const hasPrior =
    priorMastery !== null &&
    priorMastery !== undefined &&
    priorMastery !== "" &&
    Number.isFinite(normalizedPrior);
  const probability = hasPrior
    ? clamp(normalizedPrior > 1 ? normalizedPrior / 100 : normalizedPrior)
    : 0.5;
  const confidence = Number(priorConfidence);
  const normalizedPriorConfidence = Number.isFinite(confidence)
    ? 100 * clamp(confidence > 1 ? confidence / 100 : confidence)
    : 0;
  const priorSd =
    hasPrior && Number.isFinite(confidence)
      ? Math.max(
          0.55,
          U1_CONFIG.priorSd *
            (1 - 0.45 * clamp(confidence > 1 ? confidence / 100 : confidence)),
        )
      : U1_CONFIG.priorSd;
  const priorMean = hasPrior
    ? calibratedPriorMean(probability, priorSd)
    : U1_CONFIG.priorMean;
  return {
    knowledgePointId,
    weights: priorWeights(priorMean, priorSd),
    evidence: [],
    trace: [],
    correctStreak: Math.max(0, Number(priorCorrectStreak) || 0),
    priorConfidence: normalizedPriorConfidence,
    priorEvidenceCount: Math.max(0, Number(priorEvidenceCount) || 0),
    priorPrimaryEvidenceCount: Math.max(
      0,
      Number(priorPrimaryEvidenceCount) || 0,
    ),
    hasHistoricalPrior: hasPrior,
  };
}

/**
 *
 * @param state
 */
function summarizePosterior(state) {
  const target = U1_CONFIG.targetDifficulty;
  const mastery =
    100 *
    GRID.reduce(
      (sum, theta, index) =>
        sum + probabilityAtDifficulty(theta, target) * state.weights[index],
      0,
    );
  const lowerBound =
    100 * probabilityAtDifficulty(weightedQuantile(state.weights, 0.1), target);
  const upperBound =
    100 * probabilityAtDifficulty(weightedQuantile(state.weights, 0.9), target);
  const effective = state.evidence.filter((item) => item.effectiveWeight > 0);
  const primary = effective.filter((item) => item.role === "PRIMARY");
  const posteriorConcentration = clamp(1 - (upperBound - lowerBound) / 100);
  const difficultyCoverage =
    primary.length > 0
      ? clamp(
          (new Set(primary.map((item) => item.difficulty)).size / 3) * 0.55 +
            (primary.some(
              (item) => U1_DIFFICULTIES.indexOf(item.difficulty) >= 2,
            )
              ? 0.45
              : 0),
        )
      : 0;
  const mean = (values) =>
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
  const independence = mean(effective.map((item) => item.independence));
  const quality = mean(
    effective.map((item) => item.itemQuality * item.gradingConfidence),
  );
  const recencyCoverage = effective.some(
    (item) => item.source === "REVALIDATION",
  )
    ? 1
    : effective.some((item) => ["POST", "REVIEW"].includes(item.source))
      ? 0.75
      : effective.length > 0
        ? 0.4
        : 0;
  const currentEvidenceConfidence =
    effective.length > 0
      ? 100 *
        (0.5 * posteriorConcentration +
          0.2 * difficultyCoverage +
          0.15 * independence +
          0.1 * quality +
          0.05 * recencyCoverage)
      : 0;
  // A prior U1 settlement summarizes evidence already collected in earlier
  // phases. New practice/review evidence may change mastery in either
  // direction, but it must not erase the certainty earned by that evidence.
  const confidence = Math.max(
    Number(state.priorConfidence || 0),
    currentEvidenceConfidence,
  );
  const lastTwo = state.trace.slice(-2);
  const recentDelta =
    lastTwo.length >= 2
      ? lastTwo.at(-1).masteryAfter - lastTwo[0].masteryAfter
      : state.trace.at(-1)?.masteryDelta || 0;
  const normalizedMastery = Number(mastery.toFixed(2));
  const status =
    effective.length === 0 && !state.hasHistoricalPrior
      ? "NOT_ASSESSED"
      : normalizedMastery < U1_CONFIG.learningWarningThreshold
        ? "NEEDS_LEARNING"
        : normalizedMastery >= U1_CONFIG.masteryThreshold
          ? "MASTERED"
          : "VERIFYING";
  return {
    mastery: normalizedMastery,
    confidence: Number(confidence.toFixed(2)),
    lowerBound: Number(lowerBound.toFixed(2)),
    upperBound: Number(upperBound.toFixed(2)),
    recentTrend: recentDelta > 1 ? "UP" : recentDelta < -1 ? "DOWN" : "FLAT",
    evidenceCount: Number(state.priorEvidenceCount || 0) + effective.length,
    primaryEvidenceCount:
      Number(state.priorPrimaryEvidenceCount || 0) + primary.length,
    status,
    nextAction:
      status === "NOT_ASSESSED"
        ? "待测评"
        : status === "NEEDS_LEARNING"
          ? "进入强制学习"
          : status === "MASTERED"
            ? "进入综合迁移题"
            : "继续按目标难度测量",
    algorithmVersion: U1_ALGORITHM_VERSION,
    correctStreak: Math.max(0, Math.min(3, Number(state.correctStreak || 0))),
  };
}

/**
 *
 * @param state
 */
export function summarizeU1State(state) {
  return summarizePosterior(state);
}

/**
 *
 * @param state
 * @param rawEvidence
 */
export function applyU1Evidence(state, rawEvidence = {}) {
  const before = summarizePosterior(state);
  const difficulty = normalizeU1Difficulty(rawEvidence.difficulty);
  const score = scoreRatio(rawEvidence);
  const adaptive = effectiveWeightForState(
    state,
    rawEvidence,
    score,
    before.mastery,
  );
  const weight = adaptive.weight;
  const anchor = U1_CONFIG.difficultyAnchors[difficulty];
  if (weight > 0) {
    const logWeights = GRID.map((theta, index) => {
      const probability = clamp(
        sigmoid(U1_CONFIG.discrimination * (theta - anchor)),
        1e-9,
        1 - 1e-9,
      );
      const likelihood =
        score * Math.log(probability) + (1 - score) * Math.log(1 - probability);
      return (
        Math.log(Math.max(state.weights[index], 1e-300)) + weight * likelihood
      );
    });
    const maxLog = Math.max(...logWeights);
    state.weights = normalizeWeights(
      logWeights.map((value) => Math.exp(value - maxLog)),
    );
  }
  const evidence = {
    questionId: rawEvidence.questionId || rawEvidence.id || "",
    source: String(
      rawEvidence.source || rawEvidence.purpose || "PRE",
    ).toUpperCase(),
    difficulty,
    scoreRatio: score,
    role: String(rawEvidence.role || "PRIMARY").toUpperCase(),
    independence: clamp(rawEvidence.independence ?? 1),
    itemQuality: clamp(rawEvidence.itemQuality ?? 1),
    gradingConfidence: clamp(
      rawEvidence.gradingConfidence ?? rawEvidence.itemConfidence ?? 1,
    ),
    hint:
      rawEvidence.hintUsed === true
        ? "LIGHT"
        : String(rawEvidence.hint || "NONE").toUpperCase(),
    novelty: String(rawEvidence.novelty || "NEW").toUpperCase(),
    effectiveWeight: Number(weight.toFixed(4)),
  };
  state.evidence.push(evidence);
  state.correctStreak = score >= 0.8 ? Math.min(3, adaptive.streak + 1) : 0;
  const after = summarizePosterior(state);
  const trace = {
    ...evidence,
    masteryBefore: before.mastery,
    masteryAfter: after.mastery,
    masteryDelta: Number((after.mastery - before.mastery).toFixed(2)),
    confidenceBefore: before.confidence,
    confidenceAfter: after.confidence,
    lowerBound: after.lowerBound,
    upperBound: after.upperBound,
    correctStreak: state.correctStreak,
    streakFactor: Number(adaptive.streakFactor.toFixed(2)),
    masteryResponseFactor: Number(adaptive.responseFactor.toFixed(2)),
    targetDifficulty: U1_CONFIG.targetDifficulty,
    algorithmVersion: U1_ALGORITHM_VERSION,
  };
  state.trace.push(trace);
  return trace;
}

/**
 *
 * @param root0
 * @param root0.knowledgePointId
 * @param root0.evidence
 * @param root0.prior
 */
export function calculateU1KnowledgeMastery({
  knowledgePointId,
  evidence = [],
  prior = {},
}) {
  const state = createU1State({
    knowledgePointId,
    priorMastery: prior.mastery,
    priorConfidence: prior.confidence,
    priorCorrectStreak: prior.correctStreak,
    priorEvidenceCount: prior.evidenceCount,
    priorPrimaryEvidenceCount: prior.primaryEvidenceCount,
  });
  for (const item of evidence) applyU1Evidence(state, item);
  return { ...summarizePosterior(state), trace: state.trace };
}
