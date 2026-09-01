import { storageKeys } from "../../shared/contracts/storageKeys";
import {
  readJson,
  removeStoredValue,
  writeJson,
} from "../../shared/infrastructure/browserStorage";

/**
 *
 * @param {...any} values
 */
/**
 * @param {...unknown} values 可能来自不同身份入口的同义字段。
 * @returns {string} 第一个非空身份字段。
 */
function firstIdentityValue(...values) {
  const value = values.find(
    (candidate) => candidate !== undefined && candidate !== null,
  );
  return String(value || "").trim();
}

/**
 * 将账号会话或固定课堂入口统一为学生学习身份，课堂上下文允许为空。
 * @param {unknown} payload 服务端身份载荷。
 * @param {string} accessToken 学生学习凭证。
 * @returns {object} 页面可持久化的学生学习身份。
 */
export function normalizeStudentLearningIdentity(payload, accessToken) {
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
 *
 */
/**
 * @returns {object | null} 当前浏览器已验证的学生学习身份。
 */
export function readStudentLearningIdentity() {
  const identity = readJson(storageKeys.classStudentIdentity, null);
  return identity?.studentId && identity?.accessToken ? identity : null;
}

/**
 *
 * @param identity
 */
/**
 * @param {object} identity 已验证的学生学习身份。
 * @returns {boolean} 是否成功写入浏览器存储。
 */
export function rememberStudentLearningIdentity(identity) {
  if (!identity?.studentId || !identity?.accessToken) return false;
  return writeJson(storageKeys.classStudentIdentity, identity);
}

/**
 *
 */
/**
 * 清除当前浏览器的学生学习身份。
 * @returns {void}
 */
export function forgetStudentLearningIdentity() {
  removeStoredValue(storageKeys.classStudentIdentity);
}
