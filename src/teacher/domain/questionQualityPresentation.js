const TERMINAL_RESULT_STATUSES = new Set(['passed', 'issues', 'failed']);

function questionIdentity(question, module, index) {
  const explicitId = String(question?.id || '').trim();
  if (explicitId) return explicitId;
  return `question__qc-${module}-${index + 1}`;
}

export function collectLessonQualityQuestions(content = {}) {
  const seen = new Set();
  const sections = [
    ['pre', '课前测验', content.preQuestions || []],
    ['post', '课后练习', content.postQuestions || []],
  ];
  return sections.flatMap(([module, moduleLabel, questions]) => questions.map((question, index) => {
    const originalQuestionId = String(question?.id || '').trim();
    const preferredId = questionIdentity(question, module, index);
    let qualityQuestionId = preferredId;
    let collisionIndex = 1;
    while (seen.has(qualityQuestionId)) {
      const suffix = `__qc-${module}-${index + 1}-${collisionIndex}`;
      qualityQuestionId = `${preferredId.slice(0, 255 - suffix.length)}${suffix}`;
      collisionIndex += 1;
    }
    seen.add(qualityQuestionId);
    return {
      ...question,
      id: qualityQuestionId,
      ...(originalQuestionId ? { originalQuestionId } : {}),
      module,
      moduleLabel: module === 'post' && question?.phase === 'review' ? '综合练习' : moduleLabel,
      sourceIndex: index + 1,
    };
  }));
}

export function normalizedResultStatus(result) {
  if (Array.isArray(result?.issues) && result.issues.length > 0) return 'issues';
  if (['passed', 'pass', 'completed'].includes(result?.status)) return 'passed';
  if (['failed', 'error'].includes(result?.status)) return 'failed';
  if (['running', 'checking', 'inspecting'].includes(result?.status)) return 'running';
  return 'queued';
}

export function deriveQuestionQualityProgress(job, fallbackTotal = 0) {
  const results = Array.isArray(job?.results) ? job.results : [];
  const derived = results.reduce((counts, result) => {
    const status = normalizedResultStatus(result);
    if (status === 'running') counts.running += 1;
    if (TERMINAL_RESULT_STATUSES.has(status)) counts.completed += 1;
    if (status === 'issues') counts.issues += 1;
    if (status === 'passed') counts.passed += 1;
    if (status === 'failed') counts.failed += 1;
    return counts;
  }, { running: 0, completed: 0, issues: 0, passed: 0, failed: 0 });
  const serverCounts = job?.counts || {};
  const total = Number(serverCounts.total ?? job?.total ?? fallbackTotal ?? results.length) || 0;
  const completed = Number(serverCounts.completed ?? job?.completed ?? derived.completed) || 0;
  const rawProgress = Number(job?.progress);
  const percent = Number.isFinite(rawProgress)
    ? Math.max(0, Math.min(100, rawProgress <= 1 ? rawProgress * 100 : rawProgress))
    : total > 0 ? Math.min(100, (completed / total) * 100) : 0;
  return {
    total,
    running: Number(serverCounts.running ?? job?.running ?? derived.running) || 0,
    completed,
    issues: Number(serverCounts.issues ?? job?.issueCount ?? derived.issues) || 0,
    passed: Number(serverCounts.passed ?? job?.passed ?? derived.passed) || 0,
    failed: Number(serverCounts.failed ?? job?.failed ?? derived.failed) || 0,
    percent: Math.round(percent),
  };
}

export function filterQuestionQualityRows(rows, filter) {
  if (filter === 'all') return rows;
  return rows.filter((row) => normalizedResultStatus(row.result) === filter);
}
