function mapAuthoritativeTrace(trace = {}) {
  return {
    questionId: trace.questionId,
    source: trace.source,
    role: trace.role,
    scoreRatio: trace.scoreRatio,
    masteryBefore: trace.masteryBefore,
    masteryAfter: trace.masteryAfter,
    masteryDelta: trace.masteryDelta,
    confidenceBefore: trace.confidenceBefore,
    confidenceAfter: trace.confidenceAfter,
  };
}

function normalizedMastery(item) {
  return item.mastery == null ? null : Number(item.mastery);
}

function normalizedPreMastery(item) {
  return item.sourceScores?.PRE == null
    ? null
    : Math.round(Number(item.sourceScores.PRE) * 100);
}

function masteryImprovement(item) {
  const mastery = normalizedMastery(item);
  const preMastery = normalizedPreMastery(item);
  return mastery == null || preMastery == null
    ? null
    : Math.round(mastery - preMastery);
}

function numberOrZero(value) {
  return Number(value || 0);
}

function objectOrEmpty(value) {
  return value || {};
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function algorithmVersion(itemVersion, fallbackVersion) {
  return itemVersion || fallbackVersion || "";
}

function mapAuthoritativeMasteryResult(item, fallbackAlgorithmVersion) {
  return {
    mastery: normalizedMastery(item),
    preMastery: normalizedPreMastery(item),
    improvement: masteryImprovement(item),
    evidenceCount: numberOrZero(item.evidenceCount),
    confidence: Math.round(numberOrZero(item.confidence) * 100),
    independence: Math.round(numberOrZero(item.independenceAverage) * 100),
    itemConfidence: Math.round(
      numberOrZero(item.itemConfidenceAverage) * 100,
    ),
    sourceScores: objectOrEmpty(item.sourceScores),
    status: item.status,
    algorithmVersion: algorithmVersion(
      item.algorithmVersion,
      fallbackAlgorithmVersion,
    ),
    trace: arrayOrEmpty(item.trace).map((trace) =>
      mapAuthoritativeTrace(trace),
    ),
  };
}

/**
 *
 * @param report
 */
export function mapAuthoritativeMasteryResults(report) {
  return Object.fromEntries(
    (report?.masteryResults || []).map((item) => [
      item.knowledgeObjectiveId,
      mapAuthoritativeMasteryResult(item, report?.algorithmVersion),
    ]),
  );
}

/**
 *
 * @param root0
 * @param root0.report
 * @param root0.localAnswerCount
 * @param root0.pendingSyncCount
 */
export function isAuthoritativeReportCurrent({
  report,
  localAnswerCount,
  pendingSyncCount,
}) {
  return (
    Boolean(report) &&
    Boolean(report.settledAt) &&
    Number(pendingSyncCount || 0) === 0 &&
    Number(report.answeredQuestionCount || 0) >= Number(localAnswerCount || 0)
  );
}

/**
 *
 * @param root0
 * @param root0.isClassroom
 * @param root0.reportCurrent
 */
export function masteryResultMode({ isClassroom, reportCurrent }) {
  if (reportCurrent) return "authoritative";
  return isClassroom ? "syncing_preview" : "offline_preview";
}

/**
 *
 * @param localAttempts
 * @param serverAttempts
 */
export function mergeAttemptsWithAuthoritative(
  localAttempts = {},
  serverAttempts = {},
) {
  return { ...localAttempts, ...serverAttempts };
}
