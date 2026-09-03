import { getClassStudentIdentity } from "../../shared/infrastructure/classroomApi";
import { throwIfRequestAborted } from "../../shared/infrastructure/requestCancellation";
import { classStudentIdentityIssues } from "../domain/classStudentIdentity";
import {
  forgetStudentLearningIdentity,
  normalizeStudentLearningIdentity,
  readStudentLearningIdentity,
  rememberStudentLearningIdentity,
} from "./studentLearningIdentityRepository";

export { classStudentIdentityIssues } from "../domain/classStudentIdentity";

/**
 *
 * @param code
 */
function identityIssue(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

/**
 * 从课堂服务解析稳定学生身份，不向页面暴露接口响应或传输错误。
 * @param {string} accessToken 课堂访问凭证
 * @param {string} expectedStudentId 链接路径中的预期学生标识
 * @param {RequestInit} options 请求选项
 * @returns {Promise<object>} 稳定学生身份
 */
export async function fetchClassStudentIdentity(
  accessToken,
  expectedStudentId = "",
  options = {},
) {
  try {
    const identity = normalizeStudentLearningIdentity(
      await getClassStudentIdentity(accessToken, options),
      accessToken,
    );
    if (!identity.studentId || !identity.accessToken)
      throw identityIssue(classStudentIdentityIssues.unavailable);
    if (expectedStudentId && identity.studentId !== expectedStudentId)
      throw identityIssue(classStudentIdentityIssues.mismatch);
    return identity;
  } catch (error) {
    throwIfRequestAborted(options.signal);
    if (error?.name === "AbortError") throw error;
    if (Object.values(classStudentIdentityIssues).includes(error?.code))
      throw error;
    throw identityIssue(classStudentIdentityIssues.unavailable);
  }
}

/**
 *
 */
export function readClassStudentIdentity() {
  return readStudentLearningIdentity();
}

/**
 *
 * @param identity
 */
export function rememberClassStudentIdentity(identity) {
  return rememberStudentLearningIdentity(identity);
}

/**
 * 保存已验证身份；存储不可用时只暴露稳定问题码。
 * @param {object} identity 已验证学生身份
 * @returns {void}
 */
export function storeClassStudentIdentity(identity) {
  if (!rememberClassStudentIdentity(identity))
    throw identityIssue(classStudentIdentityIssues.storageUnavailable);
}

/**
 *
 */
export function forgetClassStudentIdentity() {
  forgetStudentLearningIdentity();
}
