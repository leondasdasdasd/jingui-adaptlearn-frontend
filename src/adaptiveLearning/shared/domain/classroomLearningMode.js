export const CLASSROOM_LEARNING_MODE = Object.freeze({
  NEW_LESSON: "NEW_LESSON",
  FOUNDATION: "FOUNDATION",
  REMEDIATION: "REMEDIATION",
});

export const DEFAULT_CLASSROOM_LEARNING_MODE =
  CLASSROOM_LEARNING_MODE.NEW_LESSON;

/**
 * 模式是课堂会话属性；未知值回退到上新课，避免开课请求出现未定义路径。
 * @param {string} modeId 课堂学习模式。
 * @returns {string} 合法的课堂学习模式标识。
 */
export function resolveClassroomLearningMode(modeId) {
  return Object.values(CLASSROOM_LEARNING_MODE).includes(modeId)
    ? modeId
    : DEFAULT_CLASSROOM_LEARNING_MODE;
}
