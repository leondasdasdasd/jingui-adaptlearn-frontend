import React from "react";
import { Grid3X3, Link2 } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

/**
 *
 * @param root0
 * @param root0.questions
 * @param root0.slots
 * @param root0.disabled
 * @param root0.onAssign
 */
export default function AssessmentUnassignedQuestions({
  questions,
  slots,
  disabled,
  onAssign,
}) {
  if (questions.length === 0) return null;
  return (
    <section className="assessment-unassigned-questions">
      <header>
        <div>
          <strong>
            {trans(
              "adaptiveLearning.assessment.unassignedQuestions",
              "未归槽题目",
            )}
          </strong>
          <span>
            {trans(
              "adaptiveLearning.assessment.unassignedExcluded",
              "不计入矩阵覆盖",
            )}
          </span>
        </div>
        <span className="assessment-slot-status warning">
          {questions.length}
        </span>
      </header>
      <ul>
        {questions.map((question) => (
          <li key={question.id}>
            <span className="assessment-empty-matrix-cell" aria-hidden="true">
              <Grid3X3 size={15} />
            </span>
            <span>
              {question.stem ||
                trans(
                  "adaptiveLearning.assessment.untitledQuestion",
                  "未命名题目",
                )}
            </span>
            <label>
              <Link2 size={15} />
              <span className="sr-only">
                {trans("adaptiveLearning.assessment.assignToSlot", "归入插槽")}
              </span>
              <select
                value=""
                disabled={disabled}
                aria-label={trans(
                  "adaptiveLearning.assessment.assignQuestionToSlot",
                  "将题目归入插槽",
                )}
                onChange={(event) =>
                  onAssign?.(question.id, event.target.value)
                }
              >
                <option value="">
                  {trans("adaptiveLearning.assessment.selectSlot", "选择插槽")}
                </option>
                {slots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.assignmentLabel}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

AssessmentUnassignedQuestions.propTypes = {
  questions: PropTypes.arrayOf(PropTypes.object).isRequired,
  slots: PropTypes.arrayOf(PropTypes.object).isRequired,
  disabled: PropTypes.bool.isRequired,
  onAssign: PropTypes.func,
};
