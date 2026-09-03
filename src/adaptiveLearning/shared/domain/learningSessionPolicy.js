const TRANSIENT_SESSION_TYPES = new Set(["teacher_preview"]);

/**
 * 临时体验会话只在当前试做流程中生效，不得写入正式学生档案。
 * @param {object | null | undefined} selection 学习会话选择信息
 * @returns {boolean} 是否为临时会话
 */
export function isTransientLearningSelection(selection) {
  return TRANSIENT_SESSION_TYPES.has(selection?.sessionType);
}

/**
 * @param {object | null | undefined} session 学习会话
 * @returns {boolean} 是否为临时会话
 */
export function isTransientLearningSession(session) {
  return isTransientLearningSelection(session?.selection);
}

/**
 * 为临时会话的答题草稿增加隔离命名空间，避免覆盖同课时正式学生草稿。
 * @param {object | null | undefined} selection 学习会话选择信息
 * @param {string} draftId 原始草稿 ID
 * @returns {string} 可持久化草稿 ID
 */
export function scopedQuizDraftId(selection, draftId) {
  if (!isTransientLearningSelection(selection)) return draftId;
  return `${transientQuizDraftPrefix(selection)}${draftId}`;
}

/**
 * @param {object | null | undefined} selection 学习会话选择信息
 * @returns {string} 临时会话草稿前缀；正式会话返回空字符串
 */
export function transientQuizDraftPrefix(selection) {
  if (!isTransientLearningSelection(selection)) return "";
  const scope = selection.studentSessionId || selection.studentId || "preview";
  return `transient:${scope}:`;
}

/**
 * 草稿纸使用学生会话 ID 作为 scope 前缀，退出试做时只清理该模拟会话。
 * @param {object | null | undefined} selection 学习会话选择信息
 * @returns {string} 临时草稿纸 scope 前缀
 */
export function transientScratchPaperScopePrefix(selection) {
  if (!isTransientLearningSelection(selection)) return "";
  return selection.studentSessionId ? `${selection.studentSessionId}:` : "";
}
