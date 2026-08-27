export async function planTeacherContentInstruction(payload, { signal } = {}) {
  const response = await fetch('/api/teacher-content-agent/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || '教师智能体暂时无法理解这条指令');
  return body;
}
