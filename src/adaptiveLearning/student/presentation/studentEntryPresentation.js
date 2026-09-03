import { trans } from "../../../utils/i18n";
import { classStudentIdentityIssues } from "../domain/classStudentIdentity";

/**
 * @param {string} key 学生入口文案键
 * @param {string} fallback 中文缺省文案
 * @returns {string} 当前语言文案
 */
export const studentEntryText = (key, fallback) =>
  trans(`adaptiveLearning.studentEntry.${key}`, fallback);

/**
 * @param {string} issue 稳定学生身份问题
 * @returns {string} 对用户安全的错误说明
 */
export function studentEntryIssueMessage(issue) {
  if (issue === classStudentIdentityIssues.mismatch)
    return studentEntryText(
      "error.mismatch",
      "链接中的学生身份不匹配，请使用老师发给你的个人固定链接。",
    );
  if (issue === classStudentIdentityIssues.storageUnavailable)
    return studentEntryText(
      "error.storage",
      "当前浏览器无法保存学习身份，请检查存储权限后重试。",
    );
  if (issue === "MISSING_ACCESS_TOKEN")
    return studentEntryText(
      "error.missingToken",
      "这个学习链接缺少访问凭证，请向老师重新获取固定链接。",
    );
  return studentEntryText(
    "error.unavailable",
    "学习身份验证失败，请向老师重新获取固定链接。",
  );
}
