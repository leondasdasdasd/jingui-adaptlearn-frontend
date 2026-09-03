import { useState } from "react";

import { executeTeacherAgentPlan } from "../../lib/teacherAgentPlanRunner";
import {
  backgroundRunLink,
  executionErrorMessage,
  executionReceipt,
  initialPlanStatuses,
  planAcknowledgement,
  planningContext,
} from "./actionModel";
import { COMPOSER_MIN_HEIGHT, planWithIdentity } from "./presentation";
import {
  appendScopedMessage,
  createUserMessage,
  replaceScopedStepStatus,
  replaceScopedValue,
} from "./sessionState";

/**
 *
 * @param textarea
 */
function resetComposer(textarea) {
  if (!textarea) return;
  textarea.style.height = `${COMPOSER_MIN_HEIGHT}px`;
  textarea.style.overflowY = "hidden";
}

/**
 * 计划生成与执行只通过传入的领域回调完成，不直接访问页面或仓储。
 * @param input
 * @param input.scope
 * @param input.draft
 * @param input.messages
 * @param input.pendingPlan
 * @param input.stepStatuses
 * @param input.runLink
 * @param input.lessonTask
 * @param input.textareaRef
 * @param input.generating
 * @param input.onPlanInstruction
 * @param input.onExecuteStep
 * @param input.onValidatePlan
 * @param input.appendAssistantMessage
 * @param input.setDrafts
 * @param input.setMessagesByScope
 * @param input.setErrorsByScope
 * @param input.setPendingPlansByScope
 * @param input.setStepStatusesByScope
 * @param input.setRunLinksByScope
 */
export default function useTeacherAgentActions({
  scope,
  draft,
  messages,
  pendingPlan,
  stepStatuses,
  runLink,
  lessonTask,
  textareaRef,
  generating,
  onPlanInstruction,
  onExecuteStep,
  onValidatePlan,
  appendAssistantMessage,
  setDrafts,
  setMessagesByScope,
  setErrorsByScope,
  setPendingPlansByScope,
  setStepStatusesByScope,
  setRunLinksByScope,
}) {
  const [planningScope, setPlanningScope] = useState("");
  const [executingScope, setExecutingScope] = useState("");
  const busy =
    generating || planningScope === scope || executingScope === scope;

  const executePlan = async (targetScope, plan) => {
    setExecutingScope(targetScope);
    setErrorsByScope((current) => replaceScopedValue(current, targetScope, ""));
    try {
      setStepStatusesByScope((current) =>
        replaceScopedValue(current, targetScope, initialPlanStatuses(plan)),
      );
      const execution = await executeTeacherAgentPlan({
        plan,
        validatePlan: onValidatePlan,
        executeStep: onExecuteStep,
        onStatus: (stepId, status) => {
          setStepStatusesByScope((current) =>
            replaceScopedStepStatus(current, targetScope, stepId, status),
          );
        },
      });
      const nextRunLink = backgroundRunLink(plan, execution.stepResults);
      if (nextRunLink) {
        setRunLinksByScope((current) =>
          replaceScopedValue(current, targetScope, nextRunLink),
        );
      }
      appendAssistantMessage(targetScope, executionReceipt(plan, execution));
    } catch (error) {
      setErrorsByScope((current) =>
        replaceScopedValue(current, targetScope, executionErrorMessage(error)),
      );
    } finally {
      setExecutingScope("");
    }
  };

  const acceptPlannedResponse = async (targetScope, planned) => {
    if (planned.intent !== "plan") {
      appendAssistantMessage(targetScope, planned.reply);
      return;
    }
    const plan = planWithIdentity(planned);
    appendAssistantMessage(targetScope, planAcknowledgement(plan));
    setPendingPlansByScope((current) =>
      replaceScopedValue(current, targetScope, plan),
    );
    setRunLinksByScope((current) =>
      replaceScopedValue(current, targetScope, null),
    );
    setStepStatusesByScope((current) =>
      replaceScopedValue(current, targetScope, initialPlanStatuses(plan)),
    );
    if (!plan.confirmationRequired) {
      setPlanningScope("");
      await executePlan(targetScope, plan);
    }
  };

  const submit = async () => {
    const instruction = draft.trim();
    if (!instruction || busy) return;
    const submittedScope = scope;
    setPlanningScope(submittedScope);
    setMessagesByScope((current) =>
      appendScopedMessage(
        current,
        submittedScope,
        createUserMessage(submittedScope, instruction),
      ),
    );
    setErrorsByScope((current) =>
      replaceScopedValue(current, submittedScope, ""),
    );
    setDrafts((current) => replaceScopedValue(current, submittedScope, ""));
    resetComposer(textareaRef.current);
    try {
      const history = messages.map(({ role, text }) => ({ role, text }));
      const previousStep = pendingPlan?.steps?.at(-1);
      const planned = await onPlanInstruction(
        instruction,
        history,
        planningContext({ runLink, previousStep, stepStatuses, lessonTask }),
      );
      await acceptPlannedResponse(submittedScope, planned);
    } catch (error) {
      setErrorsByScope((current) =>
        replaceScopedValue(
          current,
          submittedScope,
          error?.message || "生成没有完成，请稍后重试。",
        ),
      );
    } finally {
      setPlanningScope("");
    }
  };

  const cancelPlan = () => {
    setPendingPlansByScope((current) =>
      replaceScopedValue(current, scope, null),
    );
    const partiallyExecuted = Object.values(stepStatuses).some(
      (status) => status !== "pending",
    );
    appendAssistantMessage(
      scope,
      partiallyExecuted
        ? "已关闭这份失败计划；先前已完成的步骤仍保留，不会重复执行。"
        : "已取消这份执行计划，没有写入新的修改。",
    );
  };

  return {
    planningScope,
    executingScope,
    busy,
    executePlan,
    submit,
    cancelPlan,
  };
}
