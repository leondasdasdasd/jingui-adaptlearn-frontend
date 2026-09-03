import React from "react";
import PropTypes from "prop-types";
import { ChevronRight, Sparkles } from "lucide-react";

import { trans } from "../../utils/i18n";
import {
  resolveStudentLearningModePresentation,
  studentLearningModeOptions,
} from "../student/presentation/studentLearningModePresentation";
import { routes } from "../routes/routePaths";
import LearningModeIcon from "./LearningModeIcon";

/**
 * 学生在学习目录顶层选择本次学习方式。
 * @param {object} props 当前选择与切换动作。
 * @param {string} props.value 当前学习模式。
 * @param {Function} props.onChange 切换学习模式。
 * @param {Function} [props.onOpenModePage] 打开独立全屏模式选择页。
 * @returns {React.ReactElement} 学习模式选择器。
 */
export default function StudentLearningModeSelector({
  value,
  onChange,
  onOpenModePage,
}) {
  const modes = studentLearningModeOptions();
  const activeMode = resolveStudentLearningModePresentation(value);

  const handleOpenPage = () => {
    if (onOpenModePage) {
      onOpenModePage(value);
      return;
    }
    if (typeof window !== "undefined") {
      window.location.hash = `#${routes.modeSelection}?mode=${value}`;
    }
  };

  return (
    <section
      className="student-learning-mode"
      aria-labelledby="student-learning-mode-title"
    >
      <div className="student-learning-mode-heading">
        <div>
          <div className="student-learning-mode-title-row">
            <strong id="student-learning-mode-title">
              {trans(
                "adaptiveLearning.learningMode.studentTitle",
                "这次想怎么学？",
              )}
            </strong>
            <button
              type="button"
              className="student-learning-mode-open-page-btn"
              onClick={handleOpenPage}
              title="单独进入自选模式详情页"
            >
              <Sparkles size={13} />
              <span>三种模式对比与自选专页</span>
              <ChevronRight size={13} />
            </button>
          </div>
          <span>{activeMode.summary}</span>
        </div>
        <div
          className="student-learning-mode-options"
          role="group"
          aria-label={trans(
            "adaptiveLearning.learningMode.studentAria",
            "选择学习方式",
          )}
        >
          {modes.map((mode) => {
            const selected = mode.id === activeMode.id;
            return (
              <button
                key={mode.id}
                type="button"
                className="student-learning-mode-option"
                aria-pressed={selected}
                onClick={() => onChange(mode.id)}
              >
                <LearningModeIcon name={mode.icon} size={16} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <ol className="student-learning-mode-steps" aria-live="polite">
        {activeMode.steps.map((step, index) => (
          <li key={step}>
            <span className="student-learning-mode-step-index">
              {index + 1}
            </span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

StudentLearningModeSelector.propTypes = {
  onChange: PropTypes.func.isRequired,
  onOpenModePage: PropTypes.func,
  value: PropTypes.string.isRequired,
};
