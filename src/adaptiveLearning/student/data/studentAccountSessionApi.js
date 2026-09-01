import { adaptiveApiUrl } from "../../shared/infrastructure/runtimeEndpoints.js";

const studentSessionUrl = adaptiveApiUrl("/api/student/session");

/**
 * 使用测验项目的同源登录 Cookie 换取学生端短期课堂凭证。
 * 页面不接触测验用户 DTO，也不会把课堂凭证写入地址栏。
 * @param {{signal?: AbortSignal}} options 请求控制参数。
 * @returns {Promise<unknown>} BFF 学生会话载荷。
 */
export async function requestStudentAccountSession({ signal } = {}) {
  const response = await fetch(studentSessionUrl, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    redirect: "manual",
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      payload?.message || `学生身份确认失败（${response.status}）`,
    );
    error.status = response.status;
    error.code = payload?.code;
    error.loginUrl = payload?.loginUrl;
    throw error;
  }
  return payload;
}
