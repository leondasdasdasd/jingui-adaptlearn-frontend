import React from "react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

/** 矩阵的评估目标与 AI 取舍说明。 */
export default function AssessmentMatrixContext({ matrix }) {
  if (!matrix.targetStatement && !matrix.rationale) return null;
  return (
    <div className="assessment-matrix-context">
      <div>
        <strong>
          {trans("adaptiveLearning.assessment.assessmentTarget", "评估目标")}
        </strong>
        <p>{matrix.targetStatement || "—"}</p>
      </div>
      <div>
        <strong>
          {trans("adaptiveLearning.assessment.matrixRationale", "矩阵取舍")}
        </strong>
        <p>{matrix.rationale || "—"}</p>
      </div>
    </div>
  );
}

AssessmentMatrixContext.propTypes = {
  matrix: PropTypes.shape({
    targetStatement: PropTypes.string,
    rationale: PropTypes.string,
  }).isRequired,
};
