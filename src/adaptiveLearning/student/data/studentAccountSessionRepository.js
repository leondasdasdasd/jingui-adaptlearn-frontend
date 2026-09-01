import { studentAccountSessionIssues } from "../domain/studentAccountSession";
import { normalizeClassStudentIdentity } from "./classStudentIdentityRepository";
import { requestStudentAccountSession } from "./studentAccountSessionApi";

export { studentAccountSessionIssues } from "../domain/studentAccountSession";

const NO_CLASSROOM_MESSAGE = "当前学生没有可进入的课堂";

const noClassroomStatuses = new Set([
  "NO_CLASSROOM",
  "NO_ACTIVE_CLASSROOM",
  "NO_ACTIVE_LEARNING_PERIOD",
]);

/**
 * @param {string} code 页面可识别的稳定业务错误码。
 * @param {string} message 诊断信息。
 * @param {string} loginUrl 可选的测验登录地址。
 * @returns {Error} 学生会话领域错误。
 */
function studentSessionIssue(code, message, loginUrl = "") {
  const error = new Error(message);
  error.code = code;
  error.loginUrl = loginUrl;
  return error;
}

/**
 * @param {object} envelope BFF 会话包络。
 * @returns {boolean} 是否明确表示学生当前没有课堂。
 */
function isNoClassroomSession(envelope) {
  const status = String(envelope.status || envelope.code || "").toUpperCase();
  return [
    noClassroomStatuses.has(status),
    envelope.hasClassroom === false,
    envelope.activeClassroom === null,
  ].some(Boolean);
}

/**
 * @param {unknown} payload BFF 学生会话响应。
 * @returns {object} 学生页面唯一消费的身份形状。
 */
export function studentIdentityFromAccountSession(payload) {
  const envelope = [payload?.data, payload, {}].find(Boolean);
  if (isNoClassroomSession(envelope)) {
    throw studentSessionIssue(
      studentAccountSessionIssues.noClassroom,
      NO_CLASSROOM_MESSAGE,
    );
  }

  const session = [envelope.session, envelope].find(Boolean);
  const identityPayload = [session.identity, envelope.identity, session].find(
    Boolean,
  );
  const accessToken = String(
    [session.accessToken, envelope.accessToken, ""].find(Boolean),
  ).trim();
  const identity = normalizeClassStudentIdentity(identityPayload, accessToken);

  if (!identity.studentId || !identity.accessToken) {
    throw studentSessionIssue(
      studentAccountSessionIssues.unavailable,
      "学生身份响应不完整",
    );
  }
  if (!identity.classId) {
    throw studentSessionIssue(
      studentAccountSessionIssues.noClassroom,
      NO_CLASSROOM_MESSAGE,
    );
  }
  return identity;
}

/**
 * @param {unknown} value BFF 返回的登录地址。
 * @param {Location} currentLocation 当前浏览器地址。
 * @returns {string} 仅允许 HTTP(S) 的登录地址。
 */
export function studentAccountLoginUrl(
  value,
  currentLocation = globalThis.location,
) {
  const configured = String(value || "").trim();
  if (!configured) return "";
  try {
    const parsed = new URL(configured, currentLocation?.origin);
    return ["http:", "https:"].includes(parsed.protocol)
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
}

/**
 * 从测验登录态取得学生身份，并把传输层失败映射为稳定业务状态。
 * @param {{signal?: AbortSignal}} options 请求控制参数。
 * @returns {Promise<object>} 学生课堂身份。
 */
export async function fetchStudentAccountSession(options = {}) {
  try {
    const payload = await requestStudentAccountSession(options);
    return studentIdentityFromAccountSession(payload);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    if (Object.values(studentAccountSessionIssues).includes(error?.code))
      throw error;
    if (error?.status === 401) {
      throw studentSessionIssue(
        studentAccountSessionIssues.loginRequired,
        "需要登录测验学生账号",
        studentAccountLoginUrl(error.loginUrl),
      );
    }
    if (error?.status === 403) {
      throw studentSessionIssue(
        studentAccountSessionIssues.accessDenied,
        "当前账号没有学生学习权限",
      );
    }
    if (error?.status === 404) {
      throw studentSessionIssue(
        studentAccountSessionIssues.noClassroom,
        NO_CLASSROOM_MESSAGE,
      );
    }
    throw studentSessionIssue(
      studentAccountSessionIssues.unavailable,
      "学生身份服务暂时不可用",
    );
  }
}
