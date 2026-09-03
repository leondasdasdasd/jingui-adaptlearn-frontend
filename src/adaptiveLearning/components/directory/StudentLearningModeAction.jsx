import React from "react";
import { BookOpen, ChevronRight, LockKeyhole } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import { resolveStudentLearningModePresentation } from "../../student/presentation/studentLearningModePresentation";
import LearningModeIcon from "../LearningModeIcon";

/**
 * 将学生选择的学习模式收敛为一个主操作。
 * @param {object} props 模式、可用状态与三个模式动作。
 * @param {string} props.learningMode 当前学习模式。
 * @param {boolean} props.busy 是否正在进入学习。
 * @param {boolean} props.newLessonEligible 上新课是否已解锁。
 * @param {string} props.newLessonBlockReason 上新课锁定原因。
 * @param {Function} props.onStartNewLesson 开始新课。
 * @param {Function} props.onStartFoundation 开始课前测。
 * @param {Function} props.onStartRemediation 开始单元诊断。
 * @returns {React.ReactElement} 当前模式唯一主操作。
 */
export default function StudentLearningModeAction({
  learningMode,
  busy,
  newLessonEligible,
  newLessonBlockReason,
  onStartNewLesson,
  onStartFoundation,
  onStartRemediation,
}) {
  const mode = resolveStudentLearningModePresentation(learningMode);
  if (mode.actionKind === "new_lesson") {
    return (
      <div className="action-dock-actions single-action">
        <div className="action-dock-btn-wrapper">
          <button
            type="button"
            className={`modern-new-lesson-btn ${newLessonEligible ? "" : "disabled"}`}
            disabled={busy}
            onClick={onStartNewLesson}
            title={
              newLessonEligible
                ? trans(
                    "adaptiveLearning.directory.startFromFirstPoint",
                    "从第 1 个知识点开始学习",
                  )
                : newLessonBlockReason
            }
          >
            {newLessonEligible ? (
              <BookOpen size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <LockKeyhole size={16} className="text-slate-400 shrink-0" />
            )}
            <span>{mode.actionLabel}</span>
          </button>
          {!newLessonEligible && (
            <div className="new-lesson-tooltip">{newLessonBlockReason}</div>
          )}
        </div>
      </div>
    );
  }

  const handleAssessment =
    mode.actionKind === "unit_assessment"
      ? onStartRemediation
      : onStartFoundation;
  return (
    <div className="action-dock-actions single-action">
      <button
        type="button"
        className="modern-cta-btn"
        disabled={busy}
        onClick={handleAssessment}
      >
        <LearningModeIcon name={mode.icon} size={18} />
        <span>{mode.actionLabel}</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

StudentLearningModeAction.propTypes = {
  busy: PropTypes.bool.isRequired,
  learningMode: PropTypes.string.isRequired,
  newLessonBlockReason: PropTypes.string.isRequired,
  newLessonEligible: PropTypes.bool.isRequired,
  onStartFoundation: PropTypes.func.isRequired,
  onStartNewLesson: PropTypes.func.isRequired,
  onStartRemediation: PropTypes.func.isRequired,
};
