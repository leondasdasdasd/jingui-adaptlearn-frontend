import { adaptiveApiUrl } from "../shared/infrastructure/runtimeEndpoints.js";

/**
 *
 * @param payload
 * @param root0
 * @param root0.signal
 */
export async function planTeacherContentInstruction(payload, { signal } = {}) {
  const response = await fetch(
    adaptiveApiUrl("/api/teacher-content-agent/plan"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.message || "教师智能体暂时无法理解这条指令");
  return body;
}
