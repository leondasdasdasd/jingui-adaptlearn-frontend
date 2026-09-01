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
