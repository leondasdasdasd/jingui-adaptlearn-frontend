/**
 * @param {unknown} value 待标准化的运行时配置值。
 * @param {string} fallback 未配置时使用的同源前缀。
 * @returns {string} 不含尾部斜杠的基础地址。
 */
function normalizedBaseUrl(value, fallback) {
  return String(value || fallback).replace(/\/$/, "");
}

/**
 * @param {string} baseUrl 已标准化的基础地址。
 * @param {unknown} path 服务端契约路径。
 * @returns {string} 可由浏览器直接请求的完整地址。
 */
function appendPath(baseUrl, path) {
  if (!path) return baseUrl;
  const normalizedPath = String(path || "").startsWith("/")
    ? String(path)
    : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * 自适应 BFF 仍以 `/api` 表达服务端契约；浏览器侧统一改写为独立前缀，
 * 避免请求误入测验项目原有的 `/api` 代理。
 * @param {Record<string, string | undefined>} environment Vite 注入的运行时环境。
 * @returns {{adaptiveApiUrl: (path: string) => string, classroomApiUrl: (path: string) => string}} 分服务归属的地址适配器。
 */
export function createRuntimeEndpoints(environment = {}) {
  const adaptiveBaseUrl = normalizedBaseUrl(
    environment.VITE_ADAPTIVE_API_URL,
    "/adaptive-api",
  );
  const classroomBaseUrl = normalizedBaseUrl(
    environment.VITE_CLASSROOM_API_URL,
    "/classroom-api",
  );

  return {
    adaptiveApiUrl(path) {
      const value = String(path || "");
      if (!value.startsWith("/api")) {
        throw new Error(`Adaptive API path must start with /api: ${value}`);
      }
      return appendPath(adaptiveBaseUrl, value.slice("/api".length));
    },
    classroomApiUrl(path) {
      return appendPath(classroomBaseUrl, path);
    },
  };
}
