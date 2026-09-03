import React from "react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

/**
 *
 * @param root0
 * @param root0.item
 * @param root0.existing
 * @param root0.preferredQuestionType
 * @param root0.showCourseMeta
 */
function projectSelectionItemState({
  item,
  existing,
  preferredQuestionType,
  showCourseMeta,
}) {
  return {
    disabled: !item.supported || existing,
    disabledMessage: existing
      ? trans("adaptiveLearning.assessment.alreadyImported", "已加入当前课时")
      : item.unsupportedReason,
    courseMeta:
      showCourseMeta && (item.gradeName || item.subjectName)
        ? [item.gradeName, item.subjectName].filter(Boolean).join(" · ")
        : "",
    typeMismatch: Boolean(
      preferredQuestionType &&
      item.snapshot?.type &&
      item.snapshot.type !== preferredQuestionType,
    ),
  };
}

/**
 * 统一渲染题库与试卷已经归一化的题目选择项。
 * @param root0
 * @param root0.item
 * @param root0.checked
 * @param root0.existing
 * @param root0.preferredQuestionType
 * @param root0.showCourseMeta
 * @param root0.onToggle
 */
export default function AssessmentQuestionSelectionItem({
  item,
  checked,
  existing,
  preferredQuestionType,
  showCourseMeta = false,
  onToggle,
}) {
  const { disabled, disabledMessage, courseMeta, typeMismatch } =
    projectSelectionItemState({
      item,
      existing,
      preferredQuestionType,
      showCourseMeta,
    });
  return (
    <label
      className={`assessment-picker-question${disabled ? " disabled" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onToggle(item, event.target.checked)}
      />
      <div className="assessment-picker-question-content">
        <div className="assessment-picker-question-meta">
          <span>{item.typeLabel}</span>
          <span>{item.difficulty} / 5</span>
          {courseMeta && <span>{courseMeta}</span>}
        </div>
        <strong>{item.label}</strong>
        {disabled && <small>{disabledMessage}</small>}
        {typeMismatch && (
          <small className="assessment-picker-type-hint">
            {trans(
              "adaptiveLearning.assessment.questionTypeMismatchHint",
              "题型与当前槽不一致，仍可保留",
            )}
          </small>
        )}
      </div>
    </label>
  );
}

AssessmentQuestionSelectionItem.propTypes = {
  item: PropTypes.shape({
    difficulty: PropTypes.number,
    gradeName: PropTypes.string,
    label: PropTypes.string.isRequired,
    snapshot: PropTypes.shape({ type: PropTypes.string }),
    subjectName: PropTypes.string,
    supported: PropTypes.bool.isRequired,
    typeLabel: PropTypes.string,
    unsupportedReason: PropTypes.string,
  }).isRequired,
  checked: PropTypes.bool.isRequired,
  existing: PropTypes.bool.isRequired,
  preferredQuestionType: PropTypes.string,
  showCourseMeta: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};
