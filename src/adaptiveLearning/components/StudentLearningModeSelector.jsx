import React from "react";
import PropTypes from "prop-types";

import { trans } from "../../utils/i18n";
import {
  resolveStudentLearningModePresentation,
  studentLearningModeOptions,
} from "../student/presentation/studentLearningModePresentation";
import LearningModeIcon from "./LearningModeIcon";

/**
 * 学生在学习目录顶层选择本次学习方式。
 * @param {object} props 当前选择与切换动作。
 * @param {string} props.value 当前学习模式。
 * @param {Function} props.onChange 切换学习模式。
 * @returns {React.ReactElement} 学习模式选择器。
 */
export default function StudentLearningModeSelector({ value, onChange }) {
  const modes = studentLearningModeOptions();
  const activeMode = resolveStudentLearningModePresentation(value);

  return (
    <section
      className="student-learning-mode"
      aria-labelledby="student-learning-mode-title"
    >
      <div className="student-learning-mode-heading">
        <div>
          <strong id="student-learning-mode-title">
            {trans(
              "adaptiveLearning.learningMode.studentTitle",
              "这次想怎么学？",
            )}
          </strong>
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
  value: PropTypes.string.isRequired,
};
