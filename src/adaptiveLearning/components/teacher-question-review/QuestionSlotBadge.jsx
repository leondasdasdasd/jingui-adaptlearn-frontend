import React from "react";
import { Grid3X3 } from "lucide-react";

import { trans } from "../../../utils/i18n";
import { questionSlotPresentation } from "./model";
import { assignmentContextPropType, questionPropType } from "./propTypes";

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.assignmentContext
 */
export default function QuestionSlotBadge({ question, assignmentContext }) {
  const slot = questionSlotPresentation(question, assignmentContext);
  if (slot.outsideMatrix) {
    return (
      <span
        className="teacher-question-slot outside-matrix"
        aria-label={trans(
          "adaptiveLearning.assessment.outsideMatrixQuestion",
          "矩阵外题目，使用空矩阵格标识",
        )}
      >
        <Grid3X3 size={13} aria-hidden="true" />
        <strong>
          {trans(
            "adaptiveLearning.assessment.outsideMatrixQuestionShort",
            "矩阵外",
          )}
        </strong>
      </span>
    );
  }
  return (
    <span
      className="teacher-question-slot"
      aria-label={`评估插槽 ${slot.matrixCode}，难度 ${slot.difficultyLabel}。${slot.description}`}
      title={slot.description}
    >
      <span>插槽</span>
      <strong>{slot.matrixCode}</strong>
      <b>· {slot.difficultyLabel}</b>
    </span>
  );
}

QuestionSlotBadge.propTypes = {
  question: questionPropType.isRequired,
  assignmentContext: assignmentContextPropType,
};
