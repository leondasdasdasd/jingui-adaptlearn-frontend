const ADAPTIVE_PORTAL_HOST_ID = "adaptive-learning-portal-host";

/**
 * 返回自适应学习样式作用域内的 portal 宿主。
 * 缺少根节点时返回 null，禁止弹层回退到 body 后污染测验主应用。
 */
export function getAdaptivePortalHost() {
  if (typeof document === "undefined") return null;
  return document.getElementById(ADAPTIVE_PORTAL_HOST_ID);
}
