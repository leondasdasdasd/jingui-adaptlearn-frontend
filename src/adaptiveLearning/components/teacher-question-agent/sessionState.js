/**
 * 教师智能体的消息只在所属 scope 内追加，避免页面组件理解持久化结构。
 * @param messagesByScope
 * @param scope
 * @param message
 */
export function appendScopedMessage(messagesByScope, scope, message) {
  return {
    ...messagesByScope,
    [scope]: [...(messagesByScope[scope] || []), message],
  };
}

/**
 * @param scope
 * @param text
 */
export function createAssistantMessage(scope, text) {
  return {
    id: `assistant-${scope}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    role: "assistant",
    text,
  };
}

/**
 * @param scope
 * @param text
 */
export function createUserMessage(scope, text) {
  return {
    id: `user-${scope}-${Date.now()}`,
    role: "user",
    text,
  };
}

/**
 * @param scopedValues
 * @param scope
 * @param value
 */
export function replaceScopedValue(scopedValues, scope, value) {
  return { ...scopedValues, [scope]: value };
}

/**
 * @param statusesByScope
 * @param scope
 * @param stepId
 * @param status
 */
export function replaceScopedStepStatus(
  statusesByScope,
  scope,
  stepId,
  status,
) {
  return {
    ...statusesByScope,
    [scope]: { ...statusesByScope[scope], [stepId]: status },
  };
}
