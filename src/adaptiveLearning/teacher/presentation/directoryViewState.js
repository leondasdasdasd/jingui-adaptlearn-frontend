/**
 * 将目录请求状态收口为互斥的页面状态，避免页面重复组合布尔条件。
 * @param {object} state - 目录请求状态。
 * @param {boolean} state.loading - 是否正在加载。
 * @param {string} state.error - 加载错误。
 * @param {number} itemCount - 当前可展示条目数。
 * @returns {"loading" | "error" | "empty" | "ready"} 目录页面状态。
 */
export default function directoryViewState(state, itemCount) {
  if (state.loading) return "loading";
  if (state.error) return "error";
  if (itemCount === 0) return "empty";
  return "ready";
}
