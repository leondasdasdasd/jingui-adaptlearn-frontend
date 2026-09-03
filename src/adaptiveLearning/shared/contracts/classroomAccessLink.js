/**
 * 生成适配当前 Hash Router 的个人学习链接，凭证只保留在前端路由片段中。
 * @param {string} studentId 学生固定标识
 * @param {string} accessToken 课堂访问凭证
 * @param {Location | object} location 当前页面地址
 * @returns {string} 个人学习链接
 */
export function classroomStudentAccessUrl(
  studentId,
  accessToken,
  location = window.location,
) {
  if (!studentId || !accessToken) return "";
  const basePath = `${location.origin}${location.pathname}`;
  return `${basePath}#/adaptive-learning/student/${encodeURIComponent(studentId)}?accessToken=${encodeURIComponent(accessToken)}`;
}

/**
 * 同时兼容 Hash Router 查询参数和旧独立页面的查询参数。
 * @param {Location | object} location 当前页面地址
 * @returns {string} 课堂访问凭证
 */
export function classroomAccessTokenFromLocation(location = window.location) {
  const routeQuery = String(location.hash || "").split("?")[1] || "";
  return (
    new URLSearchParams(routeQuery).get("accessToken") ||
    new URLSearchParams(location.search || "").get("accessToken") ||
    ""
  );
}

/**
 * 消费一次性课堂凭证后清理地址，同时保留 Hash Router 路径与其他查询参数。
 * 浏览器地址格式只在访问链接契约边界内处理，页面不感知 hash 细节。
 * @param {Location | object} location 当前页面地址
 * @param {History | object} history 当前浏览器历史
 */
export function removeClassroomAccessTokenFromAddress(
  location = window.location,
  history = window.history,
) {
  const [routePath, routeQuery = ""] = String(location.hash || "")
    .replace(/^#/, "")
    .split("?");
  const routeParameters = new URLSearchParams(routeQuery);
  const pageParameters = new URLSearchParams(location.search || "");
  routeParameters.delete("accessToken");
  pageParameters.delete("accessToken");
  const pageQuery = pageParameters.toString();
  const nextRouteQuery = routeParameters.toString();
  const routeSuffix = nextRouteQuery ? `?${nextRouteQuery}` : "";
  const pageSuffix = pageQuery ? `?${pageQuery}` : "";
  const nextHash = routePath ? `#${routePath}${routeSuffix}` : "";
  history.replaceState(
    null,
    "",
    `${location.pathname}${pageSuffix}${nextHash}`,
  );
}
