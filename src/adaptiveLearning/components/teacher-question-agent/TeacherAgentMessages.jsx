import React from "react";
import { Bot } from "lucide-react";
import PropTypes from "prop-types";

import LessonContentGenerationPanel from "../LessonContentGenerationPanel";
import TeacherAgentPlan from "../TeacherAgentPlan";
import ConversationMessages from "./ConversationMessages";
import ProcessingMessage from "./ProcessingMessage";

/**
 *
 * @param root0
 * @param root0.copy
 * @param root0.showGeneration
 * @param root0.lessonModules
 * @param root0.lessonTask
 * @param root0.lessonActionsDisabled
 * @param root0.messages
 * @param root0.questions
 * @param root0.pendingPlan
 * @param root0.stepStatuses
 * @param root0.runLink
 * @param root0.executing
 * @param root0.onConfirmPlan
 * @param root0.onCancelPlan
 * @param root0.showProcessing
 * @param root0.processing
 * @param root0.elapsedSeconds
 * @param root0.lastError
 */
export default function TeacherAgentMessages({
  copy,
  showGeneration,
  lessonModules,
  lessonTask,
  lessonActionsDisabled,
  messages,
  questions,
  pendingPlan,
  stepStatuses,
  runLink,
  executing,
  onConfirmPlan,
  onCancelPlan,
  showProcessing,
  processing,
  elapsedSeconds,
  lastError,
}) {
  return (
    <div className="ai-assistant-messages">
      <div className="ai-assistant-message assistant">
        <span className="ai-assistant-avatar" aria-hidden="true">
          <Bot />
        </span>
        <div className="ai-assistant-bubble">
          <p>{copy.welcome}</p>
        </div>
      </div>
      {showGeneration && (
        <LessonContentGenerationPanel
          modules={lessonModules}
          task={lessonTask}
          publishing={lessonActionsDisabled}
        />
      )}
      <ConversationMessages messages={messages} questions={questions} />
      {pendingPlan && (
        <TeacherAgentPlan
          plan={pendingPlan}
          stepStatuses={stepStatuses}
          runLink={runLink}
          executing={executing}
          onConfirm={onConfirmPlan}
          onCancel={onCancelPlan}
        />
      )}
      {showProcessing && (
        <ProcessingMessage
          presentation={processing}
          elapsedSeconds={elapsedSeconds}
        />
      )}
      {lastError && (
        <div className="ai-assistant-message assistant">
          <span className="ai-assistant-avatar" aria-hidden="true">
            <Bot />
          </span>
          <div className="ai-assistant-bubble ai-assistant-error" role="alert">
            <strong>这次操作没有完成</strong>
            <p>{lastError}</p>
          </div>
        </div>
      )}
    </div>
  );
}

TeacherAgentMessages.propTypes = {
  copy: PropTypes.shape({ welcome: PropTypes.string.isRequired }).isRequired,
  showGeneration: PropTypes.bool.isRequired,
  lessonModules: PropTypes.arrayOf(PropTypes.object).isRequired,
  lessonTask: PropTypes.object.isRequired,
  lessonActionsDisabled: PropTypes.bool.isRequired,
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  questions: PropTypes.arrayOf(PropTypes.object).isRequired,
  pendingPlan: PropTypes.object,
  stepStatuses: PropTypes.objectOf(PropTypes.string).isRequired,
  runLink: PropTypes.object,
  executing: PropTypes.bool.isRequired,
  onConfirmPlan: PropTypes.func.isRequired,
  onCancelPlan: PropTypes.func.isRequired,
  showProcessing: PropTypes.bool.isRequired,
  processing: PropTypes.shape({
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
  elapsedSeconds: PropTypes.number,
  lastError: PropTypes.string.isRequired,
};
