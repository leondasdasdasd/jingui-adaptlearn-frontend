import { useEffect, useRef } from "react";

/**
 * 管理抽屉自身的焦点、关闭快捷键和消息跟随，不介入业务状态。
 * @param root0
 * @param root0.open
 * @param root0.onClose
 * @param root0.scope
 * @param root0.agentProcessing
 * @param root0.generationStatus
 * @param root0.lessonTask
 * @param root0.messages
 * @param root0.textareaRef
 */
export default function useTeacherAgentPanel({
  open,
  onClose,
  scope,
  agentProcessing,
  generationStatus,
  lessonTask,
  messages,
  textareaRef,
}) {
  const contentRef = useRef(null);
  const followLatestRef = useRef(true);

  useEffect(() => {
    if (!open) return () => {};
    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 180);
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open, scope, textareaRef]);

  useEffect(() => {
    if (!contentRef.current || !followLatestRef.current) return;
    contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }, [agentProcessing, generationStatus, lessonTask, messages, scope]);

  const onContentScroll = (event) => {
    const content = event.currentTarget;
    followLatestRef.current =
      content.scrollHeight - content.scrollTop - content.clientHeight <= 64;
  };

  return { textareaRef, contentRef, onContentScroll };
}
