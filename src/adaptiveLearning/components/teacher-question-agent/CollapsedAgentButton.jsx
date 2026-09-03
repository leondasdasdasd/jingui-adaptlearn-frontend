import React from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import PropTypes from "prop-types";

/**
 *
 * @param root0
 * @param root0.open
 * @param root0.lessonTask
 * @param root0.onOpen
 */
export default function CollapsedAgentButton({ open, lessonTask, onOpen }) {
  if (open) return null;
  const running = ["generating", "validating", "repairing"].includes(
    lessonTask.phase,
  );
  const label = running ? "打开教师智能体，整课内容正在处理" : "打开教师智能体";
  return (
    <button
      className={`teacher-agent-collapsed ${running ? "running" : lessonTask.phase}`}
      type="button"
      aria-label={label}
      aria-controls="teacher-question-agent"
      aria-expanded="false"
      title={running ? "教师智能体 · 处理中" : "教师智能体"}
      onClick={onOpen}
    >
      {running ? (
        <LoaderCircle className="spin" aria-hidden="true" />
      ) : (
        <Sparkles aria-hidden="true" />
      )}
      <span className="teacher-agent-collapsed-status" aria-hidden="true" />
    </button>
  );
}

CollapsedAgentButton.propTypes = {
  open: PropTypes.bool.isRequired,
  lessonTask: PropTypes.shape({ phase: PropTypes.string.isRequired })
    .isRequired,
  onOpen: PropTypes.func.isRequired,
};
