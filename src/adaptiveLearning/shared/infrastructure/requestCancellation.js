/**
 * 在异步边界和本地写入前统一终止已经失效的请求。
 * @param {AbortSignal | undefined} signal 请求取消信号
 * @returns {void}
 */
export function throwIfRequestAborted(signal) {
  if (!signal?.aborted) return;
  const error = new Error("REQUEST_ABORTED");
  error.name = "AbortError";
  throw error;
}
