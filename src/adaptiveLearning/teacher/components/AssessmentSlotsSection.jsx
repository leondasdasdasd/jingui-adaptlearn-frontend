import React, { useState } from "react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import { projectAssessmentSlots } from "../presentation/assessmentPresentation";
import AssessmentSlotErrorBanner from "./AssessmentSlotErrorBanner";
import AssessmentSlotList from "./AssessmentSlotList";
import AssessmentSlotToolbar from "./AssessmentSlotToolbar";

import "./KnowledgeAssessmentMatrix.css";

function matrixGuardedAction(hasMatrix, onMissingMatrix, action) {
  return () => {
    onMissingMatrix(!hasMatrix);
    if (hasMatrix && typeof action === "function") action();
  };
}

/** 题目插槽独立规划与按插槽新增题目的工作区。 */
export default function AssessmentSlotsSection({
  hasMatrix = false,
  questionSlots = [],
  slotGeneration = {},
  onGenerateSlots,
  onGenerateQuestions,
  onStopQuestions,
  generationDisabled = false,
}) {
  const [matrixMissingErrorVisible, setMatrixMissingErrorVisible] =
    useState(false);
  const slotView = projectAssessmentSlots({
    hasMatrix,
    questionSlots,
    slotGeneration,
    translate: trans,
  });
  const handleGenerateSlots = matrixGuardedAction(
    hasMatrix,
    setMatrixMissingErrorVisible,
    onGenerateSlots,
  );
  const handleGenerateQuestions = matrixGuardedAction(
    hasMatrix,
    setMatrixMissingErrorVisible,
    onGenerateQuestions,
  );

  return (
    <section
      className="assessment-slot-progress"
      aria-live="polite"
      aria-label={trans(
        "adaptiveLearning.assessment.questionSlots",
        "题目插槽",
      )}
    >
      <AssessmentSlotToolbar
        slotView={slotView}
        generationDisabled={generationDisabled}
        onGenerateSlots={handleGenerateSlots}
        onGenerateQuestions={handleGenerateQuestions}
        onStopQuestions={onStopQuestions}
      />
      <AssessmentSlotErrorBanner
        visible={matrixMissingErrorVisible}
        onClose={() => setMatrixMissingErrorVisible(false)}
      />
      <AssessmentSlotList slots={slotView.slots} />
    </section>
  );
}

AssessmentSlotsSection.propTypes = {
  hasMatrix: PropTypes.bool,
  questionSlots: PropTypes.arrayOf(PropTypes.object),
  slotGeneration: PropTypes.shape({
    states: PropTypes.arrayOf(PropTypes.object),
    isRunning: PropTypes.bool,
    canRetry: PropTypes.bool,
  }),
  onGenerateSlots: PropTypes.func,
  onGenerateQuestions: PropTypes.func,
  onStopQuestions: PropTypes.func,
  generationDisabled: PropTypes.bool,
};
