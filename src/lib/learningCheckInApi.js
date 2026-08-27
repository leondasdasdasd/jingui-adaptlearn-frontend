export async function analyzeLearningCheckIn(payload) {
  const response = await fetch('/api/learning/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || '学习反馈分析失败，请重试');
  return body;
}
