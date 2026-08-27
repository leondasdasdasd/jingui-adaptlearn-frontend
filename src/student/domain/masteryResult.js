export function mapAuthoritativeMasteryResults(report) {
  return Object.fromEntries((report?.masteryResults || []).map((item) => [item.knowledgeObjectiveId, {
    mastery: item.mastery == null ? null : Number(item.mastery),
    preMastery: item.sourceScores?.PRE == null ? null : Math.round(Number(item.sourceScores.PRE) * 100),
    improvement: item.mastery == null || item.sourceScores?.PRE == null
      ? null
      : Math.round(Number(item.mastery) - Number(item.sourceScores.PRE) * 100),
    evidenceCount: Number(item.evidenceCount || 0),
    confidence: Math.round(Number(item.confidence || 0) * 100),
    independence: Math.round(Number(item.independenceAverage || 0) * 100),
    itemConfidence: Math.round(Number(item.itemConfidenceAverage || 0) * 100),
    sourceScores: item.sourceScores || {},
    status: item.status,
    algorithmVersion: item.algorithmVersion || report?.algorithmVersion || '',
  }]));
}

export function isAuthoritativeReportCurrent({ report, localAnswerCount, pendingSyncCount }) {
  return Boolean(report)
    && Boolean(report.settledAt)
    && Number(pendingSyncCount || 0) === 0
    && Number(report.answeredQuestionCount || 0) >= Number(localAnswerCount || 0);
}

export function masteryResultMode({ isClassroom, reportCurrent }) {
  if (reportCurrent) return 'authoritative';
  return isClassroom ? 'syncing_preview' : 'offline_preview';
}

export function mergeAttemptsWithAuthoritative(localAttempts = {}, serverAttempts = {}) {
  return { ...localAttempts, ...serverAttempts };
}
