/**
 * 将本机 OpenMAIC 服务地址映射为测验项目的同源代理地址。
 * @param {string} raw 原始课堂 URL
 * @returns {string} 同源课堂 URL
 */
function internalOpenMaicClassroomUrl(raw) {
  try {
    const parsed = new URL(raw, "http://127.0.0.1");
    const isInternalOpenMaic =
      ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) &&
      ["", "3100", "3101"].includes(parsed.port);
    const match = parsed.pathname.match(/\/classroom\/([\w-]+)\/?$/);
    if (!isInternalOpenMaic || !match) return "";
    return `/openmaic/classroom/${encodeURIComponent(match[1])}${parsed.search}${parsed.hash}`;
  } catch {
    return "";
  }
}

/**
 * @param {string} value 原始课堂 URL
 * @param {string} classroomId 课堂 ID 回退值
 * @returns {string} 浏览器可访问的课堂 URL
 */
export function normalizeOpenMaicClassroomUrl(value, classroomId = "") {
  const raw = String(value || "").trim();
  const fallbackId = String(classroomId || "").trim();
  if (!raw && /^[\w-]+$/.test(fallbackId)) {
    return `/openmaic/classroom/${encodeURIComponent(fallbackId)}`;
  }
  return internalOpenMaicClassroomUrl(raw) || value || "";
}

const withViewMode = (value, viewMode) => {
  const raw = normalizeOpenMaicClassroomUrl(value);
  if (!raw) return "";
  try {
    const relative = raw.startsWith("/");
    const parsed = new URL(raw, "http://adaptive-learning.local");
    if (viewMode) parsed.searchParams.set("view", viewMode);
    else parsed.searchParams.delete("view");
    return relative
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : parsed.toString();
  } catch {
    return raw;
  }
};

/**
 * 内容工作台默认只展示学生播放态。
 * @param {string} value 课堂 URL
 * @returns {string} 学生播放 URL
 */
export function openMaicPlaybackUrl(value) {
  return withViewMode(value, "student");
}

/**
 * 教师显式进入专业模式时移除播放态参数，打开完整 OpenMAIC 后台。
 * @param {string} value 课堂 URL
 * @returns {string} 专业编辑 URL
 */
export function openMaicProfessionalUrl(value) {
  return withViewMode(value, "");
}

/**
 * @param {object} runtime 发布或草稿中的 OpenMAIC runtime
 * @returns {object} 浏览器边界 runtime
 */
export function adaptOpenMaicRuntime(runtime = {}) {
  return {
    ...runtime,
    classroomUrl: normalizeOpenMaicClassroomUrl(
      runtime.classroomUrl,
      runtime.classroomId,
    ),
  };
}

/**
 * @param {object} learningContent 课时学习内容
 * @returns {object} 已映射浏览器 URL 的学习内容
 */
export function adaptOpenMaicLearningContent(learningContent = {}) {
  return {
    ...learningContent,
    composite: adaptOpenMaicRuntime(learningContent.composite),
    knowledgePoints: (learningContent.knowledgePoints || []).map((item) => ({
      ...item,
      openMaic: adaptOpenMaicRuntime(item.openMaic),
    })),
  };
}
