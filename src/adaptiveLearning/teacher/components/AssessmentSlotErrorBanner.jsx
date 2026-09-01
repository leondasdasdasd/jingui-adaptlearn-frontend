import React from "react";
import { X } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

/** 未生成矩阵时的插槽操作提示。 */
export default function AssessmentSlotErrorBanner({ visible, onClose }) {
  if (!visible) return null;
  return (
    <div className="assessment-slot-error-banner" role="alert">
      <span>
        {trans(
          "adaptiveLearning.assessment.generateMatrixFirst",
          "尚未生成评估矩阵，请先在「评估矩阵」板块中生成矩阵",
        )}
      </span>
      <button
        type="button"
        onClick={onClose}
        title={trans("adaptiveLearning.assessment.closeNotice", "关闭提示")}
      >
        <X size={14} />
      </button>
    </div>
  );
}

AssessmentSlotErrorBanner.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
