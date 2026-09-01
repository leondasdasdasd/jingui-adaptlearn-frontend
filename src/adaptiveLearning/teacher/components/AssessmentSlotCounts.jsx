import React from "react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

/** 插槽题目生成的成功、失败与待处理计数。 */
export default function AssessmentSlotCounts({ slotView }) {
  if (!slotView.hasGenerationProgress) return null;
  return (
    <div className="assessment-slot-counts">
      <span className="success">
        {trans("adaptiveLearning.assessment.success", "成功")}{" "}
        <b>{slotView.counts.successful}</b>
      </span>
      <span className="failed">
        {trans("adaptiveLearning.assessment.failed", "失败")}{" "}
        <b>{slotView.counts.failed}</b>
      </span>
      <span>
        {trans("adaptiveLearning.assessment.pending", "待处理")}{" "}
        <b>{slotView.counts.waiting}</b>
      </span>
    </div>
  );
}

AssessmentSlotCounts.propTypes = {
  slotView: PropTypes.object.isRequired,
};
