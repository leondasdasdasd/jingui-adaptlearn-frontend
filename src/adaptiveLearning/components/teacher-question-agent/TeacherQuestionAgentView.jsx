import React from "react";
import PropTypes from "prop-types";

import CollapsedAgentButton from "./CollapsedAgentButton";
import TeacherAgentComposer from "./TeacherAgentComposer";
import TeacherAgentHeader from "./TeacherAgentHeader";
import TeacherAgentMessages from "./TeacherAgentMessages";

/**
 *
 * @param root0
 * @param root0.model
 * @param root0.actions
 */
export default function TeacherQuestionAgentView({ model, actions }) {
  return (
    <>
      <CollapsedAgentButton
        open={model.open}
        lessonTask={model.lessonTask}
        onOpen={actions.onOpen}
      />
      <button
        className={`teacher-question-agent-scrim${model.open ? " open" : ""}`}
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={actions.onClose}
      />
      <aside
        className={`teacher-question-agent${model.open ? " open" : ""}`}
        id="teacher-question-agent"
        role="dialog"
        aria-modal="false"
        aria-hidden={!model.open}
        aria-labelledby={model.titleId}
        aria-busy={model.agentProcessing}
        inert={model.open ? undefined : ""}
      >
        <TeacherAgentHeader
          titleId={model.titleId}
          showStatus={model.showHeaderStatus}
          status={model.visibleAgentStatus}
          onClose={actions.onClose}
        />
        <div className="ai-assistant-panel">
          <div
            className="ai-assistant-content"
            ref={model.contentRef}
            role="log"
            aria-busy={model.logBusy}
            aria-live="polite"
            onScroll={actions.onContentScroll}
          >
            <TeacherAgentMessages
              copy={model.copy}
              showGeneration={model.showGeneration}
              lessonModules={model.lessonModules}
              lessonTask={model.lessonTask}
              lessonActionsDisabled={model.lessonActionsDisabled}
              messages={model.messages}
              questions={model.questions}
              pendingPlan={model.pendingPlan}
              stepStatuses={model.stepStatuses}
              runLink={model.runLink}
              executing={model.executing}
              onConfirmPlan={actions.onConfirmPlan}
              onCancelPlan={actions.onCancelPlan}
              showProcessing={model.showProcessing}
              processing={model.processing}
              elapsedSeconds={model.elapsedSeconds}
              lastError={model.lastError}
            />
          </div>
          <TeacherAgentComposer
            inputId={model.inputId}
            textareaRef={model.textareaRef}
            draft={model.draft}
            busy={model.busy}
            blocked={model.wholeLessonComposerBlocked}
            stopLesson={model.stopLessonFromComposer}
            presentation={model.composer}
            onDraftChange={actions.onDraftChange}
            onSubmit={actions.onSubmit}
            onCancelLesson={actions.onCancelLesson}
          />
        </div>
      </aside>
    </>
  );
}

TeacherQuestionAgentView.propTypes = {
  model: PropTypes.shape({
    open: PropTypes.bool.isRequired,
    lessonTask: PropTypes.shape({ phase: PropTypes.string.isRequired })
      .isRequired,
    titleId: PropTypes.string.isRequired,
    agentProcessing: PropTypes.bool.isRequired,
    showHeaderStatus: PropTypes.bool.isRequired,
    visibleAgentStatus: PropTypes.shape({
      label: PropTypes.string.isRequired,
      tone: PropTypes.string.isRequired,
      running: PropTypes.bool.isRequired,
    }).isRequired,
    logBusy: PropTypes.bool.isRequired,
    contentRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
    copy: PropTypes.shape({ welcome: PropTypes.string.isRequired }).isRequired,
    showGeneration: PropTypes.bool.isRequired,
    lessonModules: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    lessonActionsDisabled: PropTypes.bool.isRequired,
    messages: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    questions: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    pendingPlan: PropTypes.shape({}),
    stepStatuses: PropTypes.objectOf(PropTypes.string).isRequired,
    runLink: PropTypes.shape({}),
    executing: PropTypes.bool.isRequired,
    showProcessing: PropTypes.bool.isRequired,
    processing: PropTypes.shape({
      title: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired,
    }).isRequired,
    elapsedSeconds: PropTypes.number,
    lastError: PropTypes.string.isRequired,
    inputId: PropTypes.string.isRequired,
    textareaRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
    draft: PropTypes.string.isRequired,
    busy: PropTypes.bool.isRequired,
    wholeLessonComposerBlocked: PropTypes.bool.isRequired,
    stopLessonFromComposer: PropTypes.bool.isRequired,
    composer: PropTypes.shape({
      label: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      disabled: PropTypes.bool.isRequired,
      placeholder: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  actions: PropTypes.shape({
    onOpen: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onContentScroll: PropTypes.func.isRequired,
    onConfirmPlan: PropTypes.func.isRequired,
    onCancelPlan: PropTypes.func.isRequired,
    onDraftChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onCancelLesson: PropTypes.func,
  }).isRequired,
};
