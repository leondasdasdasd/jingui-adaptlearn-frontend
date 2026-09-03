import { adaptiveApiUrl } from "../infrastructure/runtimeEndpoints.js";

const KNOWLEDGE_POINT_PATH = "/api/v1/knowledge-points";

/**
 *
 * @param baseUrl
 * @param scope
 */
function apiUrl(baseUrl, scope) {
  if (!scope?.courseId) throw new Error("courseId is required");
  const params = new URLSearchParams({ courseId: String(scope.courseId) });
  if (scope.educationStageId) {
    params.set("educationStageId", String(scope.educationStageId));
  }
  const endpoint = baseUrl
    ? `${String(baseUrl).replace(/\/$/, "")}${KNOWLEDGE_POINT_PATH}`
    : adaptiveApiUrl(KNOWLEDGE_POINT_PATH);
  return `${endpoint}?${params}`;
}

/**
 * 保留题库平台知识点树的最小读取契约，不引入整个 question-platform 工程。
 * @param scope
 * @param options
 */
export async function listKnowledgePointTree(scope, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("fetch is unavailable");

  const response = await fetchImpl(apiUrl(options.baseUrl, scope), {
    headers: { Accept: "application/json", ...options.headers },
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`Knowledge point request failed: ${response.status}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : payload?.items;
  if (!Array.isArray(items))
    throw new Error("Invalid knowledge point response");
  return items;
}

export { KNOWLEDGE_POINT_PATH };
