import React from "react";
import { LoaderCircle, Send, Square } from "lucide-react";
import PropTypes from "prop-types";

/**
 *
 * @param root0
 * @param root0.stopLesson
 * @param root0.busy
 */
export default function AgentSendIcon({ stopLesson, busy }) {
  if (stopLesson) return <Square aria-hidden="true" />;
  if (busy) return <LoaderCircle className="spin" aria-hidden="true" />;
  return <Send aria-hidden="true" />;
}

AgentSendIcon.propTypes = {
  stopLesson: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
};
