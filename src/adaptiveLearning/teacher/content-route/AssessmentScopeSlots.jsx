import React from "react";
import PropTypes from "prop-types";

import AssessmentSlotsSection from "../components/AssessmentSlotsSection";

/**
 * 将评估范围和应用动作绑定到唯一的插槽工作台。
 * @param root0
 * @param root0.assessment
 * @param root0.scopeId
 * @param root0.knowledgePoints
 * @param root0.generationDisabled
 * @param root0.generateQuestionPool
 * @param root0.generateQuestionSlots
 * @param root0.stopQuestionPool
 * @param root0.assignQuestion
 * @param root0.removeQuestion
 * @param root0.openQuestionPicker
 * @param root0.openQuestionCreator
 * @param root0.openMatrixCell
 */
export default function AssessmentScopeSlots({
  assessment,
  scopeId,
  knowledgePoints,
  generationDisabled,
  generateQuestionPool,
  generateQuestionSlots,
  stopQuestionPool,
  assignQuestion,
  removeQuestion,
  openQuestionPicker,
  openQuestionCreator,
  openMatrixCell,
}) {
  return (
    <AssessmentSlotsSection
      hasMatrix={assessment.hasMatrix}
      questionSlots={assessment.slots}
      knowledgePoints={knowledgePoints}
      unassignedQuestions={assessment.unassignedQuestions}
      slotGeneration={assessment.slotGeneration}
      onGenerateSlots={() => generateQuestionSlots(scopeId)}
      onGenerateQuestions={() => generateQuestionPool(scopeId)}
      onStopQuestions={stopQuestionPool}
      onAssignQuestion={(questionId, slotId) =>
        assignQuestion(scopeId, questionId, slotId)
      }
      onRemoveQuestion={removeQuestion}
      onSelectQuestion={(slotId, questionType) =>
        openQuestionPicker("question_bank", scopeId, slotId, questionType)
      }
      onCreateQuestion={(slotId) => openQuestionCreator(scopeId, slotId)}
      onGenerateQuestion={(slotId) => generateQuestionPool(scopeId, slotId)}
      onOpenMatrixCell={(cellId) => openMatrixCell(scopeId, cellId)}
      generationDisabled={generationDisabled || assessment.isBusy}
    />
  );
}

AssessmentScopeSlots.propTypes = {
  assessment: PropTypes.shape({
    hasMatrix: PropTypes.bool.isRequired,
    isBusy: PropTypes.bool.isRequired,
    slots: PropTypes.arrayOf(PropTypes.object).isRequired,
    slotGeneration: PropTypes.object.isRequired,
    unassignedQuestions: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  scopeId: PropTypes.string.isRequired,
  knowledgePoints: PropTypes.arrayOf(PropTypes.object).isRequired,
  generationDisabled: PropTypes.bool.isRequired,
  generateQuestionPool: PropTypes.func.isRequired,
  generateQuestionSlots: PropTypes.func.isRequired,
  stopQuestionPool: PropTypes.func.isRequired,
  assignQuestion: PropTypes.func.isRequired,
  removeQuestion: PropTypes.func.isRequired,
  openQuestionPicker: PropTypes.func.isRequired,
  openQuestionCreator: PropTypes.func.isRequired,
  openMatrixCell: PropTypes.func.isRequired,
};
