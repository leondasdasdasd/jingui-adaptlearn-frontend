import React from "react";
import { Bot, LoaderCircle } from "lucide-react";
import PropTypes from "prop-types";

/**
 *
 * @param root0
 * @param root0.presentation
 * @param root0.elapsedSeconds
 */
export default function ProcessingMessage({ presentation, elapsedSeconds }) {
  return (
    <div className="ai-assistant-message assistant">
      <span className="ai-assistant-avatar" aria-hidden="true">
        <Bot />
      </span>
      <div className="ai-assistant-bubble ai-assistant-running" role="status">
        <LoaderCircle className="spin" aria-hidden="true" />
        <div>
          <strong>{presentation.title}</strong>
          <p>{presentation.message}</p>
          {elapsedSeconds ? <small>已用时 {elapsedSeconds} 秒</small> : null}
        </div>
      </div>
    </div>
  );
}

ProcessingMessage.propTypes = {
  presentation: PropTypes.shape({
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
  elapsedSeconds: PropTypes.number,
};
