import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import { assessmentRoles } from "../presentation/assessmentPresentation";
import AssessmentMatrixCellDetail from "./AssessmentMatrixCellDetail";
import AssessmentMatrixContext from "./AssessmentMatrixContext";
import AssessmentMatrixHeader from "./AssessmentMatrixHeader";
import AssessmentMatrixTable from "./AssessmentMatrixTable";

/** 已生成矩阵的表格、证据详情与重新生成操作。 */
export default function KnowledgeAssessmentMatrixReady({
  assessment,
  onGenerateMatrix,
  generationDisabled,
}) {
  const { matrix } = assessment;
  const applicableCells = useMemo(
    () => matrix.cells.filter((cell) => cell.role !== "NOT_APPLICABLE"),
    [matrix],
  );
  const firstCellId = applicableCells[0]?.cellId || "";
  const [selectedCellId, setSelectedCellId] = useState(firstCellId);

  useEffect(() => {
    if (!applicableCells.some((cell) => cell.cellId === selectedCellId)) {
      setSelectedCellId(firstCellId);
    }
  }, [applicableCells, firstCellId, selectedCellId]);

  const selectedCell =
    applicableCells.find((cell) => cell.cellId === selectedCellId) ||
    applicableCells[0] ||
    null;
  return (
    <section
      className="knowledge-assessment-matrix"
      aria-labelledby="assessment-matrix-title"
    >
      <AssessmentMatrixHeader
        assessment={assessment}
        onGenerateMatrix={onGenerateMatrix}
        generationDisabled={generationDisabled}
      />
      <AssessmentMatrixContext matrix={matrix} />
      <div
        className="assessment-matrix-legend"
        aria-label={trans(
          "adaptiveLearning.assessment.roleLegend",
          "矩阵角色图例",
        )}
      >
        {assessmentRoles(trans).map((role) => (
          <span key={role.id}>
            <i className={role.className} aria-hidden="true" />
            {role.label}
          </span>
        ))}
      </div>
      <AssessmentMatrixTable
        cells={matrix.cells}
        selectedCellId={selectedCell?.cellId || ""}
        onSelectCell={setSelectedCellId}
      />
      {selectedCell && <AssessmentMatrixCellDetail cell={selectedCell} />}
    </section>
  );
}

KnowledgeAssessmentMatrixReady.propTypes = {
  assessment: PropTypes.shape({
    scopeId: PropTypes.string.isRequired,
    matrix: PropTypes.object.isRequired,
    isGeneratingMatrix: PropTypes.bool.isRequired,
  }).isRequired,
  onGenerateMatrix: PropTypes.func,
  generationDisabled: PropTypes.bool.isRequired,
};
