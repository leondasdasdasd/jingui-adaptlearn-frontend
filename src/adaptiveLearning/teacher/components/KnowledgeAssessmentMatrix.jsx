import React from "react";
import PropTypes from "prop-types";

import KnowledgeAssessmentMatrixEmpty from "./KnowledgeAssessmentMatrixEmpty";
import KnowledgeAssessmentMatrixReady from "./KnowledgeAssessmentMatrixReady";

import "./KnowledgeAssessmentMatrix.css";

/** 教师端单个知识点或整课综合的评估矩阵。 */
export default function KnowledgeAssessmentMatrix({
  assessment,
  onGenerateMatrix,
  generationDisabled = false,
}) {
  const View = assessment.matrix
    ? KnowledgeAssessmentMatrixReady
    : KnowledgeAssessmentMatrixEmpty;
  return (
    <View
      assessment={assessment}
      onGenerateMatrix={onGenerateMatrix}
      generationDisabled={generationDisabled}
    />
  );
}

KnowledgeAssessmentMatrix.propTypes = {
  assessment: PropTypes.shape({
    scopeId: PropTypes.string.isRequired,
    matrix: PropTypes.object,
    isGeneratingMatrix: PropTypes.bool.isRequired,
  }).isRequired,
  onGenerateMatrix: PropTypes.func,
  generationDisabled: PropTypes.bool,
};
