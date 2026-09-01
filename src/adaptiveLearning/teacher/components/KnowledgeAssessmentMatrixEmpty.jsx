import React from "react";
import { Grid3X3, LoaderCircle, Sparkles } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

/** 尚未生成矩阵时的独立空态与生成入口。 */
export default function KnowledgeAssessmentMatrixEmpty({
  assessment,
  onGenerateMatrix,
  generationDisabled,
}) {
  const { scopeId, isGeneratingMatrix } = assessment;
  return (
    <section
      className="knowledge-assessment-matrix"
      aria-labelledby="assessment-matrix-title"
    >
      <div className="assessment-matrix-empty" role="status">
        <Grid3X3 size={24} aria-hidden="true" />
        <strong id="assessment-matrix-title">
          {trans(
            "adaptiveLearning.assessment.matrixNotGenerated",
            "尚未生成评估矩阵",
          )}
        </strong>
        <span>
          {trans(
            "adaptiveLearning.assessment.matrixFirstHint",
            "先生成并确认该知识点的评估矩阵。",
          )}
        </span>
        {typeof onGenerateMatrix === "function" && (
          <button
            className="assessment-matrix-generate"
            type="button"
            disabled={generationDisabled || isGeneratingMatrix}
            aria-busy={isGeneratingMatrix ? "true" : undefined}
            onClick={() => onGenerateMatrix(scopeId)}
          >
            {isGeneratingMatrix ? (
              <LoaderCircle
                className="assessment-matrix-spinner"
                size={15}
                aria-hidden="true"
              />
            ) : (
              <Sparkles size={15} aria-hidden="true" />
            )}
            {isGeneratingMatrix
              ? trans("adaptiveLearning.assessment.aiGenerating", "AI 生成中")
              : trans(
                  "adaptiveLearning.assessment.generateMatrix",
                  "生成评估矩阵",
                )}
          </button>
        )}
      </div>
    </section>
  );
}

KnowledgeAssessmentMatrixEmpty.propTypes = {
  assessment: PropTypes.shape({
    scopeId: PropTypes.string.isRequired,
    isGeneratingMatrix: PropTypes.bool.isRequired,
  }).isRequired,
  onGenerateMatrix: PropTypes.func,
  generationDisabled: PropTypes.bool.isRequired,
};
