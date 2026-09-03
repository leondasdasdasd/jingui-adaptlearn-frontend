import React, { useRef } from "react";
import PropTypes from "prop-types";

import useStableId from "../shared/react/useStableId";
import {
  composerPresentation,
  lessonAgentStatus,
  processingPresentation,
  scopeCopy,
} from "./teacher-question-agent/presentation";
import { replaceScopedValue } from "./teacher-question-agent/sessionState";
import TeacherQuestionAgentView from "./teacher-question-agent/TeacherQuestionAgentView";
import useBackgroundPlanSync from "./teacher-question-agent/useBackgroundPlanSync";
import useTeacherAgentActions from "./teacher-question-agent/useTeacherAgentActions";
import useTeacherAgentPanel from "./teacher-question-agent/useTeacherAgentPanel";
import useTeacherAgentSession from "./teacher-question-agent/useTeacherAgentSession";

const runningLessonPhases = new Set(["generating", "validating", "repairing"]);

/**
 *
 * @param busy
 * @param agentStatus
 */
function visibleStatus(busy, agentStatus) {
  return busy
    ? { label: "处理中", tone: "running", running: true }
    : agentStatus;
}

/**
 *
 * @param blocked
 * @param lessonActionsDisabled
 * @param onCancelLesson
 */
function canStopLesson(blocked, lessonActionsDisabled, onCancelLesson) {
  return Boolean(blocked && !lessonActionsDisabled && onCancelLesson);
}

/**
 *
 * @param agentProcessing
 * @param wholeLesson
 * @param planning
 * @param executing
 */
function showProcessingMessage(
  agentProcessing,
  wholeLesson,
  planning,
  executing,
) {
  return agentProcessing && (!wholeLesson || planning || executing);
}

/**
 *
 * @param root0
 * @param root0.scope
 * @param root0.busy
 * @param root0.planningScope
 * @param root0.executingScope
 * @param root0.lessonTask
 * @param root0.lessonModules
 * @param root0.lessonActionsDisabled
 * @param root0.generationStatus
 * @param root0.draft
 * @param root0.copy
 * @param root0.onCancelLesson
 */
function deriveViewState({
  scope,
  busy,
  planningScope,
  executingScope,
  lessonTask,
  lessonModules,
  lessonActionsDisabled,
  generationStatus,
  draft,
  copy,
  onCancelLesson,
}) {
  const wholeLesson = scope === "whole";
  const lessonRunning = runningLessonPhases.has(lessonTask.phase);
  const agentStatus = lessonAgentStatus(
    lessonTask,
    lessonModules,
    lessonActionsDisabled,
  );
  const agentProcessing = busy || agentStatus.running;
  const wholeLessonComposerBlocked = wholeLesson && lessonRunning;
  const stopLessonFromComposer = canStopLesson(
    wholeLessonComposerBlocked,
    lessonActionsDisabled,
    onCancelLesson,
  );
  const planning = planningScope === scope;
  const executing = executingScope === scope;
  return {
    busy,
    agentProcessing,
    wholeLessonComposerBlocked,
    stopLessonFromComposer,
    visibleAgentStatus: visibleStatus(busy, agentStatus),
    showHeaderStatus: !wholeLesson,
    showGeneration: wholeLesson || lessonTask.phase !== "idle",
    logBusy: busy || lessonRunning,
    executing,
    showProcessing: showProcessingMessage(
      agentProcessing,
      wholeLesson,
      planning,
      executing,
    ),
    processing: processingPresentation({
      planning,
      executing,
      lessonActionsDisabled,
      wholeLesson,
      copy,
      lessonTask,
      generationStatus,
    }),
    composer: composerPresentation({
      stopLesson: stopLessonFromComposer,
      busy,
      blocked: wholeLessonComposerBlocked,
      draft,
      placeholder: copy.placeholder,
    }),
  };
}

/**
 *
 * @param root0
 * @param root0.onOpen
 * @param root0.onClose
 * @param root0.onContentScroll
 * @param root0.onCancelLesson
 * @param root0.scope
 * @param root0.pendingPlan
 * @param root0.executePlan
 * @param root0.cancelPlan
 * @param root0.submit
 * @param root0.setDrafts
 */
function createViewActions({
  onOpen,
  onClose,
  onContentScroll,
  onCancelLesson,
  scope,
  pendingPlan,
  executePlan,
  cancelPlan,
  submit,
  setDrafts,
}) {
  return {
    onOpen,
    onClose,
    onContentScroll,
    onCancelLesson,
    onConfirmPlan: () => {
      void executePlan(scope, pendingPlan);
    },
    onCancelPlan: cancelPlan,
    onDraftChange: (value) => {
      setDrafts((current) => replaceScopedValue(current, scope, value));
    },
    onSubmit: () => {
      void submit();
    },
  };
}

/**
 * 教师智能体入口只组装会话、动作和展示模型；各层不透传仓储或后端 DTO。
 * @param props
 */
export default function TeacherQuestionAgent(props) {
  const {
    lessonId,
    scope,
    open,
    onOpen,
    onClose,
    onPlanInstruction,
    onExecuteStep,
    onValidatePlan,
    generating,
    generationStatus,
    lessonModules,
    lessonTask,
    onCancelLesson,
    lessonActionsDisabled = false,
    questions = [],
  } = props;
  const titleId = useStableId("teacher-question-agent-title");
  const inputId = useStableId("teacher-question-agent-input");
  const textareaRef = useRef(null);
  const copy = scopeCopy(scope);
  const session = useTeacherAgentSession(lessonId);
  const draft = session.drafts[scope] || "";
  const messages = session.messagesByScope[scope] || [];
  const lastError = session.errorsByScope[scope] || "";
  const pendingPlan = session.pendingPlansByScope[scope] || null;
  const stepStatuses = session.stepStatusesByScope[scope] || {};
  const runLink = session.runLinksByScope[scope] || null;
  const actions = useTeacherAgentActions({
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
    appendAssistantMessage: session.appendAssistantMessage,
    setDrafts: session.setDrafts,
    setMessagesByScope: session.setMessagesByScope,
    setErrorsByScope: session.setErrorsByScope,
    setPendingPlansByScope: session.setPendingPlansByScope,
    setStepStatusesByScope: session.setStepStatusesByScope,
    setRunLinksByScope: session.setRunLinksByScope,
  });
  const viewState = deriveViewState({
    scope,
    busy: actions.busy,
    planningScope: actions.planningScope,
    executingScope: actions.executingScope,
    lessonTask,
    lessonModules,
    lessonActionsDisabled,
    generationStatus,
    draft,
    copy,
    onCancelLesson,
  });
  const panel = useTeacherAgentPanel({
    open,
    onClose,
    scope,
    agentProcessing: viewState.agentProcessing,
    generationStatus,
    lessonTask,
    messages,
    textareaRef,
  });
  useBackgroundPlanSync({
    scope,
    pendingPlan,
    runLink,
    stepStatuses,
    lessonTask,
    lessonModules,
    restoredRunLinks: session.restoredSession.runLinksByScope,
    setStepStatusesByScope: session.setStepStatusesByScope,
    setRunLinksByScope: session.setRunLinksByScope,
    appendAssistantMessage: session.appendAssistantMessage,
  });

  const model = {
    ...viewState,
    open,
    titleId,
    inputId,
    copy,
    lessonTask,
    lessonModules,
    lessonActionsDisabled,
    messages,
    questions,
    pendingPlan,
    stepStatuses,
    runLink,
    elapsedSeconds: generationStatus?.elapsedSeconds,
    lastError,
    draft,
    textareaRef,
    contentRef: panel.contentRef,
  };
  const viewActions = createViewActions({
    onOpen,
    onClose,
    onContentScroll: panel.onContentScroll,
    onCancelLesson,
    scope,
    pendingPlan,
    executePlan: actions.executePlan,
    cancelPlan: actions.cancelPlan,
    submit: actions.submit,
    setDrafts: session.setDrafts,
  });
  return <TeacherQuestionAgentView model={model} actions={viewActions} />;
}

TeacherQuestionAgent.propTypes = {
  lessonId: PropTypes.string.isRequired,
  scope: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
  onOpen: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onPlanInstruction: PropTypes.func.isRequired,
  onExecuteStep: PropTypes.func.isRequired,
  onValidatePlan: PropTypes.func.isRequired,
  generating: PropTypes.bool.isRequired,
  generationStatus: PropTypes.shape({
    elapsedSeconds: PropTypes.number,
    message: PropTypes.string,
  }),
  lessonModules: PropTypes.arrayOf(
    PropTypes.shape({
      complete: PropTypes.bool,
      label: PropTypes.string,
    }),
  ).isRequired,
  lessonTask: PropTypes.shape({
    backendStatus: PropTypes.string,
    issues: PropTypes.arrayOf(PropTypes.shape({ message: PropTypes.string })),
    message: PropTypes.string,
    phase: PropTypes.string.isRequired,
    runId: PropTypes.string,
    updatedAt: PropTypes.string,
  }).isRequired,
  onCancelLesson: PropTypes.func,
  lessonActionsDisabled: PropTypes.bool,
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      number: PropTypes.number,
      section: PropTypes.string,
    }),
  ),
};
