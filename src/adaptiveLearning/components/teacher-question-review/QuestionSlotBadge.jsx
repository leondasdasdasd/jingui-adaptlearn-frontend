import React from "react";

import { questionSlotPresentation } from "./model";
import { questionPropType } from "./propTypes";

/**
 *
 * @param root0
 * @param root0.question
 */
export default function QuestionSlotBadge({ question }) {
  const slot = questionSlotPresentation(question);
  if (!slot) return null;
  return (
    <span
      className="teacher-question-slot"
      aria-label={`评估插槽 ${slot.matrixCode}，难度 ${slot.difficulty}。${slot.description}`}
      title={slot.description}
    >
      <span>插槽</span>
      <strong>{slot.matrixCode}</strong>
      <b>· {slot.difficulty}</b>
    </span>
  );
}

QuestionSlotBadge.propTypes = {
  question: questionPropType.isRequired,
};
