import React from "react";
import { Grid3X3, LoaderCircle, RefreshCw } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

function matrixSummary(matrix) {
  const source =
    matrix.generationSource === "SERVER_FALLBACK"
      ? trans("adaptiveLearning.assessment.sourceFallback", "系统保底")
      : trans("adaptiveLearning.assessment.sourceAi", "AI 生成");
  const review =
    matrix.reviewStatus === "APPROVED"
      ? trans("adaptiveLearning.assessment.reviewApproved", "已确认")
      : trans("adaptiveLearning.assessment.reviewPending", "待发布确认");
  return trans(
    "adaptiveLearning.assessment.matrixSummary",
    "{$applicable} 个适用格 · {$core} 个核心格 · {$source} · {$review}",
    {
      applicable: matrix.applicableCellCount,
      core: matrix.coreCellCount,
      source,
      review,
    },
  );
}

/** 已生成矩阵的概要、证据覆盖与重新生成操作。 */
export default function AssessmentMatrixHeader({
  assessment,
  onGenerateMatrix,
  generationDisabled,
}) {
  const { matrix, scopeId, isGeneratingMatrix } = assessment;
  const ActionIcon = isGeneratingMatrix ? LoaderCircle : RefreshCw;
  const actionLabel = isGeneratingMatrix
    ? trans("adaptiveLearning.assessment.generatingMatrix", "矩阵生成中")
    : trans("adaptiveLearning.assessment.regenerateMatrix", "重新生成矩阵");
  return (
    <header className="assessment-matrix-header">
      <div>
        <span className="assessment-matrix-icon">
          <Grid3X3 size={17} aria-hidden="true" />
        </span>
        <div>
          <h2 id="assessment-matrix-title">
            {trans("adaptiveLearning.assessment.matrixTitle", "评估矩阵")}
          </h2>
          <p>{matrixSummary(matrix)}</p>
        </div>
      </div>
      <div className="assessment-matrix-header-actions">
        <div
          className="assessment-matrix-coverage-summary"
          aria-label={trans(
            "adaptiveLearning.assessment.coverageAria",
            "{$satisfied} 个适用格达到最低题目证据要求，共 {$total} 个",
            {
              satisfied: matrix.evidenceSatisfiedCellCount,
              total: matrix.applicableCellCount,
            },
          )}
        >
          <span>
            {trans("adaptiveLearning.assessment.coverageMet", "证据达标")}
          </span>
          <strong>
            {matrix.evidenceSatisfiedCellCount}
            <small>{` / ${matrix.applicableCellCount}`}</small>
          </strong>
        </div>
        {typeof onGenerateMatrix === "function" && (
          <button
            className="assessment-matrix-action secondary"
            type="button"
            disabled={generationDisabled || isGeneratingMatrix}
            aria-busy={isGeneratingMatrix ? "true" : undefined}
            onClick={() => onGenerateMatrix(scopeId)}
          >
            <ActionIcon
              className={
                isGeneratingMatrix ? "assessment-matrix-spinner" : undefined
              }
              size={15}
              aria-hidden="true"
            />
            {actionLabel}
          </button>
        )}
      </div>
    </header>
  );
}

AssessmentMatrixHeader.propTypes = {
  assessment: PropTypes.shape({
    scopeId: PropTypes.string.isRequired,
    matrix: PropTypes.object.isRequired,
    isGeneratingMatrix: PropTypes.bool.isRequired,
  }).isRequired,
  onGenerateMatrix: PropTypes.func,
  generationDisabled: PropTypes.bool.isRequired,
};
