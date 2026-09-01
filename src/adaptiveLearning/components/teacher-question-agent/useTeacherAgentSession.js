import { useCallback, useEffect, useRef, useState } from "react";

import {
  readTeacherAgentSession,
  writeTeacherAgentSession,
} from "../../teacher/data/teacherAgentSessionRepository.js";
import { appendScopedMessage, createAssistantMessage } from "./sessionState";

/**
 * 会话 hook 是页面状态与持久化仓储之间的唯一边界。
 * @param lessonId
 */
export default function useTeacherAgentSession(lessonId) {
  const restoredSession = useRef(readTeacherAgentSession(lessonId));
  const [drafts, setDrafts] = useState(restoredSession.current.drafts);
  const [messagesByScope, setMessagesByScope] = useState(
    restoredSession.current.messagesByScope,
  );
  const [errorsByScope, setErrorsByScope] = useState(
    restoredSession.current.errorsByScope,
  );
  const [pendingPlansByScope, setPendingPlansByScope] = useState(
    restoredSession.current.plansByScope,
  );
  const [stepStatusesByScope, setStepStatusesByScope] = useState(
    restoredSession.current.stepStatusesByScope,
  );
  const [runLinksByScope, setRunLinksByScope] = useState(
    restoredSession.current.runLinksByScope,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeTeacherAgentSession(lessonId, {
        drafts,
        messagesByScope,
        errorsByScope,
        plansByScope: pendingPlansByScope,
        stepStatusesByScope,
        runLinksByScope,
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [
    drafts,
    errorsByScope,
    lessonId,
    messagesByScope,
    pendingPlansByScope,
    runLinksByScope,
    stepStatusesByScope,
  ]);

  const appendAssistantMessage = useCallback((scope, text) => {
    if (!text) return;
    setMessagesByScope((current) =>
      appendScopedMessage(current, scope, createAssistantMessage(scope, text)),
    );
  }, []);

  return {
    restoredSession: restoredSession.current,
    drafts,
    setDrafts,
    messagesByScope,
    setMessagesByScope,
    errorsByScope,
    setErrorsByScope,
    pendingPlansByScope,
    setPendingPlansByScope,
    stepStatusesByScope,
    setStepStatusesByScope,
    runLinksByScope,
    setRunLinksByScope,
    appendAssistantMessage,
  };
}
