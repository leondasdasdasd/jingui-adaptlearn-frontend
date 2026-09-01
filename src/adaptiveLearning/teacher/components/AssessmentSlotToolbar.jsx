import React from "react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import AssessmentSlotActions from "./AssessmentSlotActions";
import AssessmentSlotCounts from "./AssessmentSlotCounts";

/** 题目插槽的计数与顺序生成操作。 */
export default function AssessmentSlotToolbar({
  slotView,
  generationDisabled,
  onGenerateSlots,
  onGenerateQuestions,
  onStopQuestions,
}) {
  return (
    <header className="assessment-slot-toolbar">
      <div>
        <strong>
          {trans("adaptiveLearning.assessment.questionSlots", "题目插槽")}
        </strong>
        <span>{slotView.summary}</span>
      </div>
      <div className="assessment-slot-toolbar-actions">
        <AssessmentSlotCounts slotView={slotView} />
        <AssessmentSlotActions
          slotView={slotView}
          generationDisabled={generationDisabled}
          onGenerateSlots={onGenerateSlots}
          onGenerateQuestions={onGenerateQuestions}
          onStopQuestions={onStopQuestions}
        />
      </div>
    </header>
  );
}

AssessmentSlotToolbar.propTypes = {
  slotView: PropTypes.object.isRequired,
  generationDisabled: PropTypes.bool.isRequired,
  onGenerateSlots: PropTypes.func,
  onGenerateQuestions: PropTypes.func,
  onStopQuestions: PropTypes.func,
};
