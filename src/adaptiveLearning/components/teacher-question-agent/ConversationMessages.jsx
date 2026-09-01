import React from "react";
import { Bot } from "lucide-react";
import PropTypes from "prop-types";

import { teacherFacingMessage } from "./presentation";

/**
 *
 * @param root0
 * @param root0.messages
 * @param root0.questions
 */
export default function ConversationMessages({ messages, questions }) {
  return messages.map((message) => (
    <div className={`ai-assistant-message ${message.role}`} key={message.id}>
      {message.role === "assistant" && (
        <span className="ai-assistant-avatar" aria-hidden="true">
          <Bot />
        </span>
      )}
      <div className="ai-assistant-bubble">
        <p>{teacherFacingMessage(message.text, questions)}</p>
      </div>
    </div>
  ));
}

ConversationMessages.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      role: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    }),
  ).isRequired,
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      number: PropTypes.number,
      section: PropTypes.string,
    }),
  ).isRequired,
};
