export function overallScoreLevel(value) {
  const score = Number(value || 0);
  if (score >= 90) return { label: '稳定达成', tone: 'excellent' };
  if (score >= 80) return { label: '良好达成', tone: 'good' };
  if (score >= 60) return { label: '部分达成', tone: 'developing' };
  return { label: '需要重点支持', tone: 'support' };
}

export function efficiencyScoreLevel(value) {
  const score = Number(value || 0);
  if (score >= 90) return { label: '推进顺畅', tone: 'excellent' };
  if (score >= 75) return { label: '节奏稳定', tone: 'good' };
  if (score >= 60) return { label: '存在卡点', tone: 'developing' };
  return { label: '需要支持', tone: 'support' };
}

export function scoreStatePresentation(score, resultMode = 'authoritative') {
  if (score?.status === 'READY' && score?.reviewStatus === 'PUBLISHED') return {
    ready: true, published: true, label: '已发布', title: score.summary,
  };
  if (score?.status === 'READY') return {
    ready: false,
    pendingReview: true,
    label: '待老师确认',
    title: '老师正在核对本次课堂证据，确认后展示掌握率、正确率和一句话总评。',
  };
  if (score?.status === 'PARTIAL_EVIDENCE') return {
    ready: false, label: '证据未完整', title: score.summary,
  };
  if (score?.status === 'OBJECTIVE_SCOPE_UNAVAILABLE') return {
    ready: false, label: '暂无法判断', title: score.summary,
  };
  if (score?.status === 'INSUFFICIENT_EVIDENCE') return {
    ready: false, label: '证据不足', title: score.summary,
  };
  if (resultMode === 'syncing_preview') return {
    ready: false, label: '课堂待结算', title: '课堂记录正在同步或等待老师结束课堂，暂不生成学习结论。',
  };
  return {
    ready: false, label: '练习已完成', title: '本次练习已完成；进入正式课堂后，课堂结束时会生成综合评定。',
  };
}
