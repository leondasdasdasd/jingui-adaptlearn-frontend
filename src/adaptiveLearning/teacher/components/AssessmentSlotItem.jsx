import React, { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Sparkles,
  Unlink,
} from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

/**
 * 插槽只承载题型与难度；评估要求统一从矩阵格读取。
 * @param root0
 * @param root0.slot
 * @param root0.expansionMode
 * @param root0.disabled
 * @param root0.onSelectQuestion
 * @param root0.onRemoveQuestion
 * @param root0.onOpenMatrixCell
 * @param root0.onCreateQuestion
 * @param root0.onGenerateQuestion
 */
export default function AssessmentSlotItem({
  slot,
  expansionMode,
  disabled,
  onSelectQuestion,
  onCreateQuestion,
  onGenerateQuestion,
  onRemoveQuestion,
  onOpenMatrixCell,
}) {
  const autoExpanded = ["running", "failed"].includes(slot.status);
  const [expanded, setExpanded] = useState(autoExpanded);

  useEffect(() => {
    if (expansionMode === "all") setExpanded(true);
    if (expansionMode === "none" && !autoExpanded) setExpanded(false);
  }, [autoExpanded, expansionMode]);

  useEffect(() => {
    if (autoExpanded) setExpanded(true);
  }, [autoExpanded]);

  return (
    <article className={`assessment-slot-item ${slot.status}`}>
      <header className="assessment-slot-item-header">
        <div className="assessment-slot-header-main">
          <button
            type="button"
            className="assessment-slot-expand"
            aria-expanded={expanded}
            aria-controls={`assessment-slot-panel-${slot.id}`}
            onClick={() => setExpanded((current) => !current)}
            aria-label={
              slot.questionTypeLabel ||
              trans("adaptiveLearning.assessment.toggleSlot", "展开/收起插槽")
            }
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {slot.knowledgePointBadges && slot.knowledgePointBadges.length > 0 ? (
            <div className="assessment-slot-knowledge-points">
              {slot.knowledgePointBadges.map((item) => (
                <span
                  className={`assessment-kp-badge ${item.role}`}
                  key={`${item.role}-${item.id}`}
                >
                  <span className={`assessment-kp-role-mark ${item.role}`}>
                    {item.role === "primary"
                      ? trans(
                          "adaptiveLearning.assessment.primaryRoleShort",
                          "主",
                        )
                      : trans(
                          "adaptiveLearning.assessment.secondaryRoleShort",
                          "次",
                        )}
                  </span>
                  <span className="assessment-kp-label">{item.label}</span>
                </span>
              ))}
            </div>
          ) : (
            <strong className="assessment-slot-fallback-label">
              {slot.questionTypeLabel}
            </strong>
          )}
        </div>
        <div className="assessment-slot-header-meta">
          <span className="assessment-slot-type-label">
            {slot.questionTypeLabel}
          </span>
          <span className="assessment-slot-difficulty">
            {slot.difficultyLabel}
          </span>
          <span className="assessment-slot-question-count">
            {trans(
              "adaptiveLearning.assessment.boundQuestionCount",
              "{$count} 题",
              { count: slot.questionCount },
            )}
          </span>
          {["running", "failed"].includes(slot.status) && (
            <span className={`assessment-slot-status ${slot.status}`}>
              {slot.statusLabel}
            </span>
          )}
        </div>
      </header>

      {expanded && (
        <div
          className="assessment-slot-panel"
          id={`assessment-slot-panel-${slot.id}`}
        >
          <section
            className="assessment-slot-questions"
            aria-label={trans(
              "adaptiveLearning.assessment.boundQuestions",
              "已归槽题目",
            )}
          >
            <header>
              <strong>
                {trans(
                  "adaptiveLearning.assessment.boundQuestions",
                  "已归槽题目",
                )}
              </strong>
              <div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectQuestion?.(slot.id, slot.questionType)}
                >
                  <BookOpen size={15} />
                  {trans(
                    "adaptiveLearning.assessment.selectFromQuestionBank",
                    "题库选题",
                  )}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onCreateQuestion?.(slot.id)}
                >
                  <Plus size={15} />
                  {trans(
                    "adaptiveLearning.assessment.createQuestion",
                    "新增题目",
                  )}
                </button>
                <button
                  type="button"
                  disabled={disabled || slot.status === "running"}
                  aria-busy={slot.status === "running"}
                  onClick={() => onGenerateQuestion?.(slot.id)}
                >
                  <Sparkles size={15} />
                  {trans(
                    "adaptiveLearning.assessment.generateOneQuestion",
                    "单题生成",
                  )}
                </button>
              </div>
            </header>
            {slot.questions.length > 0 ? (
              <ol>
                {slot.questions.map((question) => (
                  <li key={question.id}>
                    <button
                      type="button"
                      className="assessment-slot-question-code"
                      onClick={() => onOpenMatrixCell?.(slot.matrixCellId)}
                    >
                      {slot.matrixCode}
                    </button>
                    <span>
                      {question.stem ||
                        trans(
                          "adaptiveLearning.assessment.untitledQuestion",
                          "未命名题目",
                        )}
                    </span>
                    {!question.typeMatchesSlot && (
                      <small className="assessment-slot-type-hint">
                        {trans(
                          "adaptiveLearning.assessment.questionTypeMismatchHint",
                          "题型与当前槽不一致，仍可保留",
                        )}
                      </small>
                    )}
                    <button
                      type="button"
                      className="assessment-slot-icon-button"
                      disabled={disabled}
                      aria-label={trans(
                        "adaptiveLearning.assessment.removeFromSlot",
                        "移出插槽",
                      )}
                      onClick={() => onRemoveQuestion?.(question.id)}
                    >
                      <Unlink size={15} />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="assessment-slot-empty-copy">
                {trans(
                  "adaptiveLearning.assessment.noBoundQuestions",
                  "暂无归槽题目",
                )}
              </p>
            )}
          </section>
        </div>
      )}
    </article>
  );
}

AssessmentSlotItem.propTypes = {
  slot: PropTypes.object.isRequired,
  expansionMode: PropTypes.oneOf(["default", "all", "none"]).isRequired,
  disabled: PropTypes.bool.isRequired,
  onSelectQuestion: PropTypes.func,
  onCreateQuestion: PropTypes.func,
  onGenerateQuestion: PropTypes.func,
  onRemoveQuestion: PropTypes.func,
  onOpenMatrixCell: PropTypes.func,
};
