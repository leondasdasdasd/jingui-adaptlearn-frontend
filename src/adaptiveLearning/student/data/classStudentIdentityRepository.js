import { storageKeys } from "../../shared/contracts/storageKeys";
import {
  readJson,
  removeStoredValue,
  writeJson,
} from "../../shared/infrastructure/browserStorage";
import { getClassStudentIdentity } from "../../shared/infrastructure/classroomApi";
import { throwIfRequestAborted } from "../../shared/infrastructure/requestCancellation";
import { classStudentIdentityIssues } from "../domain/classStudentIdentity";

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
 * @param {...unknown} values 各服务版本可能提供的同义身份字段。
 * @returns {string} 第一个有效字段的字符串形式。
 */
function firstIdentityValue(...values) {
  const value = values.find(
    (candidate) => candidate !== undefined && candidate !== null,
  );
  return String(value || "").trim();
}

/**
 *
 * @param payload
 * @param accessToken
 */
export function normalizeClassStudentIdentity(payload, accessToken) {
  const student = payload?.student || payload || {};
  return {
    accessToken: firstIdentityValue(accessToken),
    classId: firstIdentityValue(
      payload?.classId,
      payload?.class?.id,
      student.classId,
    ),
    className: firstIdentityValue(
      payload?.className,
      payload?.class?.name,
      student.className,
    ),
    studentId: firstIdentityValue(
      student.id,
      student.studentId,
      payload?.studentId,
    ),
    studentName: firstIdentityValue(
      student.name,
      student.studentName,
      payload?.studentName,
    ),
  };
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
    const identity = normalizeClassStudentIdentity(
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
  const identity = readJson(storageKeys.classStudentIdentity, null);
  return identity?.studentId && identity?.accessToken ? identity : null;
}

/**
 *
 * @param identity
 */
export function rememberClassStudentIdentity(identity) {
  if (!identity?.studentId || !identity?.accessToken) return false;
  return writeJson(storageKeys.classStudentIdentity, identity);
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
  removeStoredValue(storageKeys.classStudentIdentity);
}
