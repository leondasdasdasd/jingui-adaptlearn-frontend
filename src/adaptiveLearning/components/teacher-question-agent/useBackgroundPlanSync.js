import { useEffect, useRef } from "react";

import { deriveBackgroundPlanUpdate } from "./backgroundPlanSync";
import { backgroundToolReceipt } from "./presentation";
import { replaceScopedStepStatus, replaceScopedValue } from "./sessionState";

/**
 *
 * @param runLinksByScope
 */
function restoredNotificationKeys(runLinksByScope) {
  return new Set(
    Object.values(runLinksByScope || {})
      .filter((link) => link?.runId && link?.notifiedPhase)
      .map((link) => `${link.runId}:${link.notifiedPhase}`),
  );
}

/**
 *
 * @param current
 * @param next
 * @param notifiedPhase
 */
function sameRunLink(current, next, notifiedPhase) {
  return (
    current?.runId === next.runId &&
    current?.executionId === next.executionId &&
    current?.backendStatus === next.backendStatus &&
    current?.updatedAt === next.updatedAt &&
    current?.notifiedPhase === notifiedPhase
  );
}

/**
 * 后台状态回流只更新计划状态、任务关联和一次性教师回执。
 * @param input
 * @param input.scope
 * @param input.pendingPlan
 * @param input.runLink
 * @param input.stepStatuses
 * @param input.lessonTask
 * @param input.lessonModules
 * @param input.restoredRunLinks
 * @param input.setStepStatusesByScope
 * @param input.setRunLinksByScope
 * @param input.appendAssistantMessage
 */
export default function useBackgroundPlanSync({
  scope,
  pendingPlan,
  runLink,
  stepStatuses,
  lessonTask,
  lessonModules,
  restoredRunLinks,
  setStepStatusesByScope,
  setRunLinksByScope,
  appendAssistantMessage,
}) {
  const notifiedPhasesRef = useRef(restoredNotificationKeys(restoredRunLinks));

  useEffect(() => {
    const update = deriveBackgroundPlanUpdate({
      scope,
      pendingPlan,
      runLink,
      stepStatuses,
      lessonTask,
      notifiedPhases: notifiedPhasesRef.current,
    });
    if (!update) return;
    if (update.currentStepStatus !== update.nextStepStatus) {
      setStepStatusesByScope((current) =>
        replaceScopedStepStatus(
          current,
          scope,
          update.backgroundStep.id,
          update.nextStepStatus,
        ),
      );
    }
    if (update.shouldNotify) {
      notifiedPhasesRef.current.add(update.notificationKey);
    }
    setRunLinksByScope((current) => {
      const nextRunLink = {
        ...update.runLink,
        ...(update.shouldNotify ? { notifiedPhase: update.backendStatus } : {}),
      };
      const currentRunLink = current[scope];
      const notifiedPhase = nextRunLink.notifiedPhase;
      return sameRunLink(currentRunLink, nextRunLink, notifiedPhase)
        ? current
        : replaceScopedValue(current, scope, nextRunLink);
    });
    if (update.shouldNotify) {
      appendAssistantMessage(
        scope,
        backgroundToolReceipt({
          kind: update.backgroundStep.kind,
          task: { ...lessonTask, backendStatus: update.backendStatus },
          modules: lessonModules,
        }),
      );
    }
  }, [
    appendAssistantMessage,
    lessonModules,
    lessonTask,
    pendingPlan,
    runLink,
    scope,
    setRunLinksByScope,
    setStepStatusesByScope,
    stepStatuses,
  ]);
}
