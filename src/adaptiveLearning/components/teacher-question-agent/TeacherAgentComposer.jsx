import React from "react";
import PropTypes from "prop-types";

import AgentSendIcon from "./AgentSendIcon";
import { resizeComposer } from "./presentation";

/**
 *
 * @param root0
 * @param root0.inputId
 * @param root0.textareaRef
 * @param root0.draft
 * @param root0.busy
 * @param root0.blocked
 * @param root0.stopLesson
 * @param root0.presentation
 * @param root0.onDraftChange
 * @param root0.onSubmit
 * @param root0.onCancelLesson
 */
export default function TeacherAgentComposer({
  inputId,
  textareaRef,
  draft,
  busy,
  blocked,
  stopLesson,
  presentation,
  onDraftChange,
  onSubmit,
  onCancelLesson,
}) {
  const onKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      onSubmit();
    }
  };
  return (
    <div className="ai-assistant-composer-area">
      <div className="ai-assistant-composer">
        <label className="ai-assistant-composer-label" htmlFor={inputId}>
          与教师智能体对话
        </label>
        <textarea
          id={inputId}
          ref={textareaRef}
          rows={1}
          value={draft}
          disabled={busy || blocked}
          placeholder={presentation.placeholder}
          onChange={(event) => onDraftChange(event.target.value)}
          onInput={(event) => resizeComposer(event.currentTarget)}
          onKeyDown={onKeyDown}
        />
        <footer className="ai-assistant-composer-footer">
          <button
            className={`ai-assistant-send${stopLesson ? " is-stop" : ""}`}
            type="button"
            aria-label={presentation.label}
            title={presentation.title}
            aria-busy={busy || blocked}
            disabled={presentation.disabled}
            onClick={stopLesson ? onCancelLesson : onSubmit}
          >
            <AgentSendIcon stopLesson={stopLesson} busy={busy} />
          </button>
        </footer>
      </div>
    </div>
  );
}

TeacherAgentComposer.propTypes = {
  inputId: PropTypes.string.isRequired,
  textareaRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  draft: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  blocked: PropTypes.bool.isRequired,
  stopLesson: PropTypes.bool.isRequired,
  presentation: PropTypes.shape({
    label: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    disabled: PropTypes.bool.isRequired,
    placeholder: PropTypes.string.isRequired,
  }).isRequired,
  onDraftChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancelLesson: PropTypes.func,
};
