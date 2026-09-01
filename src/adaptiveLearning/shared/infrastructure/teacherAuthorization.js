import { adaptiveApiUrl } from "./runtimeEndpoints.js";

const sessionUrl = adaptiveApiUrl("/api/teacher/session");

/**
 * @param {Response} response 身份接口响应
 * @param {object} payload 身份接口载荷
 * @returns {object} 页面可消费的教师会话
 */
function teacherSessionFromResponse(response, payload) {
  if (!response.ok) {
    const error = new Error(
      payload?.message || `教师身份确认失败（${response.status}）`,
    );
    error.status = response.status;
    error.code = payload?.code;
    error.loginUrl = payload?.loginUrl;
    throw error;
  }
  if (
    payload?.status !== "authenticated" ||
    !payload?.principal?.subjectFingerprint
  ) {
    const error = new Error("教师身份响应不完整");
    error.status = 503;
    error.code = "TEACHER_IDENTITY_UNAVAILABLE";
    throw error;
  }
  return { ...payload.principal, logoutUrl: payload.logoutUrl };
}

/**
 * @param {Error} error 请求层错误
 * @returns {Error} 授权边界可识别的错误
 */
function teacherSessionError(error) {
  if (
    !(error instanceof TypeError) &&
    !error?.message?.includes("NetworkError")
  )
    return error;
  const unavailable = new Error("教师身份服务暂时不可用");
  unavailable.status = 503;
  unavailable.code = "TEACHER_IDENTITY_UNAVAILABLE";
  return unavailable;
}

/**
 *
 * @param root0
 * @param root0.signal
 */
export async function getTeacherSession({ signal } = {}) {
  try {
    const response = await fetch(sessionUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      redirect: "manual",
      signal,
    });
    const payload = await response.json().catch(() => ({}));

    return teacherSessionFromResponse(response, payload);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw teacherSessionError(error);
  }
}

/**
 *
 * @param loginUrl
 * @param currentLocation
 */
export function questionTestLoginUrl(
  loginUrl,
  currentLocation = globalThis.location,
) {
  const configured = String(loginUrl || "").trim();
  if (!configured) return "";
  const origin = String(currentLocation?.origin || "").trim();
  if (!/^https?:\/\//.test(origin)) return configured;
  try {
    const parsed = new URL(configured, origin);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

/**
 *
 * @param logoutUrl
 * @param currentLocation
 */
export function questionTestLogoutUrl(
  logoutUrl,
  currentLocation = globalThis.location,
) {
  return questionTestLoginUrl(logoutUrl, currentLocation);
}

/**
 *
 * @param error
 */
export function teacherAuthorizationMessage(error) {
  if (error?.status === 403) {
    return {
      title: "当前账号没有教师权限",
      description: "请使用具备任课权限的云谷账号，从统一入口重新进入。",
      canRetry: false,
      action: "none",
    };
  }
  if (error?.status === 503) {
    return {
      title: "身份服务暂时不可用",
      description: "当前页面地址已保留。稍后重试，不会切换到学生端或演示班。",
      canRetry: true,
      action: "retry",
    };
  }
  if (error?.status === 401 && error?.loginUrl) {
    return {
      title: "需要登录测验",
      description: "自适应学习复用测验账号。在新页完成登录后，本页将自动继续。",
      canRetry: true,
      action: "login",
    };
  }
  return {
    title: "教师身份已失效",
    description: "暂时无法确认测验登录状态，请重新确认。",
    canRetry: true,
    action: "retry",
  };
}
