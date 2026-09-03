import React, { useMemo, useState } from "react";
import { ListChecks, ListFilter } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import { projectAssessmentKnowledgeCoverage } from "../presentation/assessmentKnowledgeCoverage";
import { projectAssessmentSlots } from "../presentation/assessmentPresentation";
import AssessmentKnowledgeCoverageQuery from "./AssessmentKnowledgeCoverageQuery";
import AssessmentSlotErrorBanner from "./AssessmentSlotErrorBanner";
import AssessmentSlotList from "./AssessmentSlotList";
import AssessmentSlotToolbar from "./AssessmentSlotToolbar";
import AssessmentUnassignedQuestions from "./AssessmentUnassignedQuestions";

import "./KnowledgeAssessmentMatrix.css";

/**
 *
 * @param hasMatrix
 * @param onMissingMatrix
 * @param action
 */
function matrixGuardedAction(hasMatrix, onMissingMatrix, action) {
  return () => {
    onMissingMatrix(!hasMatrix);
    if (hasMatrix && typeof action === "function") action();
  };
}

/**
 * 题目插槽独立规划与按插槽新增题目的工作区。
 * @param root0
 * @param root0.hasMatrix
 * @param root0.questionSlots
 * @param root0.knowledgePoints
 * @param root0.slotGeneration
 * @param root0.onGenerateSlots
 * @param root0.onGenerateQuestions
 * @param root0.onStopQuestions
 * @param root0.generationDisabled
 * @param root0.unassignedQuestions
 * @param root0.onAssignQuestion
 * @param root0.onRemoveQuestion
 * @param root0.onSelectQuestion
 * @param root0.onCreateQuestion
 * @param root0.onGenerateQuestion
 * @param root0.onOpenMatrixCell
 * @param root0.countEmptySlotsAsPlanned
 */
export default function AssessmentSlotsSection({
  hasMatrix = false,
  questionSlots = [],
  knowledgePoints = [],
  slotGeneration = {},
  onGenerateSlots,
  onGenerateQuestions,
  onStopQuestions,
  generationDisabled = false,
  unassignedQuestions = [],
  onAssignQuestion,
  onRemoveQuestion,
  onSelectQuestion,
  onCreateQuestion,
  onGenerateQuestion,
  onOpenMatrixCell,
  countEmptySlotsAsPlanned = false,
}) {
  const [matrixMissingErrorVisible, setMatrixMissingErrorVisible] =
    useState(false);
  const [expansionMode, setExpansionMode] = useState("default");
  const [workspaceView, setWorkspaceView] = useState("slots");
  const slotView = projectAssessmentSlots({
    hasMatrix,
    questionSlots,
    knowledgePoints,
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
  const coverageRows = useMemo(
    () =>
      projectAssessmentKnowledgeCoverage({
        knowledgePoints,
        slots: slotView.slots,
        countEmptySlotsAsPlanned,
      }),
    [countEmptySlotsAsPlanned, knowledgePoints, slotView.slots],
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
      {knowledgePoints.length > 1 && (
        <div
          className="assessment-slot-view-switch"
          role="tablist"
          aria-label={trans(
            "adaptiveLearning.assessment.slotViewMode",
            "插槽查看方式",
          )}
        >
          <button
            className="assessment-slot-view-option"
            type="button"
            role="tab"
            aria-selected={workspaceView === "slots"}
            onClick={() => setWorkspaceView("slots")}
          >
            <ListChecks size={15} />
            {trans("adaptiveLearning.assessment.slotView", "插槽视图")}
          </button>
          <button
            className="assessment-slot-view-option"
            type="button"
            role="tab"
            aria-selected={workspaceView === "coverage"}
            onClick={() => setWorkspaceView("coverage")}
          >
            <ListFilter size={15} />
            {trans(
              "adaptiveLearning.assessment.queryKnowledgeCoverage",
              "知识点覆盖查询",
            )}
          </button>
        </div>
      )}
      {workspaceView === "coverage" && (
        <AssessmentKnowledgeCoverageQuery rows={coverageRows} />
      )}
      {workspaceView === "slots" && (
        <>
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
          {slotView.slots.length > 0 && (
            <div className="assessment-slot-expansion-actions">
              <button type="button" onClick={() => setExpansionMode("all")}>
                {trans(
                  "adaptiveLearning.assessment.expandAllSlots",
                  "全部展开",
                )}
              </button>
              <button type="button" onClick={() => setExpansionMode("none")}>
                {trans(
                  "adaptiveLearning.assessment.collapseAllSlots",
                  "全部收起",
                )}
              </button>
            </div>
          )}
          <AssessmentSlotList
            slots={slotView.slots}
            expansionMode={expansionMode}
            disabled={generationDisabled}
            onSelectQuestion={onSelectQuestion}
            onCreateQuestion={onCreateQuestion}
            onGenerateQuestion={onGenerateQuestion}
            onRemoveQuestion={onRemoveQuestion}
            onOpenMatrixCell={onOpenMatrixCell}
          />
          <AssessmentUnassignedQuestions
            questions={unassignedQuestions}
            slots={slotView.slots}
            disabled={generationDisabled}
            onAssign={onAssignQuestion}
          />
        </>
      )}
    </section>
  );
}

AssessmentSlotsSection.propTypes = {
  hasMatrix: PropTypes.bool,
  questionSlots: PropTypes.arrayOf(PropTypes.object),
  knowledgePoints: PropTypes.arrayOf(PropTypes.object),
  slotGeneration: PropTypes.shape({
    states: PropTypes.arrayOf(PropTypes.object),
    isRunning: PropTypes.bool,
    canRetry: PropTypes.bool,
  }),
  onGenerateSlots: PropTypes.func,
  onGenerateQuestions: PropTypes.func,
  onStopQuestions: PropTypes.func,
  generationDisabled: PropTypes.bool,
  unassignedQuestions: PropTypes.arrayOf(PropTypes.object),
  onAssignQuestion: PropTypes.func,
  onRemoveQuestion: PropTypes.func,
  onSelectQuestion: PropTypes.func,
  onCreateQuestion: PropTypes.func,
  onGenerateQuestion: PropTypes.func,
  onOpenMatrixCell: PropTypes.func,
  countEmptySlotsAsPlanned: PropTypes.bool,
};
