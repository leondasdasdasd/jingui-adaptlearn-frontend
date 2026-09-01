import { getStudentLearningHome } from "../../shared/infrastructure/classroomApi";
import { studentAccountSessionIssues } from "../domain/studentAccountSession";

/**
 * @param {string} accessToken 已由学生会话仓储验证的课堂凭证。
 * @param {{signal?: AbortSignal}} options 请求控制参数。
 * @returns {Promise<object>} 学生学习主页领域投影。
 */
export async function fetchStudentLearningHome(accessToken, options = {}) {
  try {
    return await getStudentLearningHome("", accessToken, {
      cache: "no-store",
      ...options,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    const issue = new Error(
      error?.status === 404
        ? "当前没有进行中或已发布的课堂"
        : "学习主页暂时无法加载",
    );
    issue.code =
      error?.status === 404
        ? studentAccountSessionIssues.noClassroom
        : studentAccountSessionIssues.unavailable;
    throw issue;
  }
}
