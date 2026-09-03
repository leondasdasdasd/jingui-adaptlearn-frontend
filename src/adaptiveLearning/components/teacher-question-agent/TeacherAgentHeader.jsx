import React from "react";
import { ChevronRight, LoaderCircle, Sparkles } from "lucide-react";
import PropTypes from "prop-types";

/**
 *
 * @param root0
 * @param root0.titleId
 * @param root0.showStatus
 * @param root0.status
 * @param root0.onClose
 */
export default function TeacherAgentHeader({
  titleId,
  showStatus,
  status,
  onClose,
}) {
  return (
    <header className="teacher-agent-head">
      <div className="teacher-agent-identity">
        <span className="teacher-agent-avatar" aria-hidden="true">
          <Sparkles />
        </span>
        <span className="teacher-agent-title">
          <strong id={titleId}>教师智能体</strong>
        </span>
        {showStatus && (
          <span
            className={`teacher-agent-head-status ${status.tone}`}
            role="status"
          >
            {status.running && (
              <LoaderCircle className="spin" aria-hidden="true" />
            )}
            {status.label}
          </span>
        )}
      </div>
      <button
        className="teacher-agent-close"
        type="button"
        aria-label="收起教师智能体"
        title="收起"
        onClick={onClose}
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </header>
  );
}

TeacherAgentHeader.propTypes = {
  titleId: PropTypes.string.isRequired,
  showStatus: PropTypes.bool.isRequired,
  status: PropTypes.shape({
    label: PropTypes.string.isRequired,
    tone: PropTypes.string.isRequired,
    running: PropTypes.bool.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};
