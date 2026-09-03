const emptyResultSnapshot = Object.freeze({
  scopeKey: "",
  status: "idle",
  report: null,
  answerRecords: [],
});

/**
 * 只允许当前学生会话消费对应的课堂结算快照。
 * @param {object} snapshot 已加载快照
 * @param {string} scopeKey 当前学生会话作用域
 * @returns {object} 当前快照或空快照
 */
export function resultSnapshotForScope(snapshot, scopeKey) {
  return snapshot?.scopeKey === scopeKey ? snapshot : emptyResultSnapshot;
}
