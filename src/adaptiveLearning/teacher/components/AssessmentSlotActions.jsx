import React from "react";
import { Grid3X3, Sparkles, Square } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

const ACTION_ICONS = new Map([
  ["slots", Grid3X3],
  ["stop", Square],
  ["questions", Sparkles],
]);

function slotActionLabel(slotView, hasSlots) {
  if (slotView.isPlanningSlots) {
    return trans(
      "adaptiveLearning.assessment.planningSlots",
      "正在规划题目插槽",
    );
  }
  return hasSlots
    ? trans("adaptiveLearning.assessment.regenerateSlots", "重新生成插槽")
    : trans("adaptiveLearning.assessment.generateSlots", "生成题目插槽");
}

function canShowQuestionAction(slotView, onGenerateQuestions, hasSlots) {
  return (
    !slotView.isGeneratingQuestions &&
    !slotView.isPlanningSlots &&
    typeof onGenerateQuestions === "function" &&
    hasSlots
  );
}

function buildActions({
  slotView,
  generationDisabled,
  onGenerateSlots,
  onGenerateQuestions,
  onStopQuestions,
}) {
  const hasSlots = slotView.slots.length > 0;
  const actions = [
    {
      id: "slots",
      visible:
        typeof onGenerateSlots === "function" &&
        !slotView.isGeneratingQuestions,
      className: `assessment-matrix-action ${hasSlots ? "secondary" : "primary"}`,
      disabled: Boolean(generationDisabled || slotView.isPlanningSlots),
      onClick: onGenerateSlots,
      label: slotActionLabel(slotView, hasSlots),
    },
    {
      id: "stop",
      visible:
        slotView.isGeneratingQuestions && typeof onStopQuestions === "function",
      className: "assessment-matrix-action stop",
      disabled: false,
      onClick: onStopQuestions,
      label: trans("adaptiveLearning.assessment.stopGeneration", "停止生成"),
    },
    {
      id: "questions",
      visible: canShowQuestionAction(slotView, onGenerateQuestions, hasSlots),
      className: "assessment-matrix-action primary",
      disabled: generationDisabled,
      onClick: onGenerateQuestions,
      label: slotView.canRetryFailedSlots
        ? trans("adaptiveLearning.retryFailedSlots", "重试失败插槽")
        : trans("adaptiveLearning.addQuestionsBySlots", "按插槽新增题目"),
    },
  ];
  return actions.filter((action) => action.visible);
}

/** 根据插槽与任务状态渲染唯一可用的顺序操作。 */
export default function AssessmentSlotActions(props) {
  return buildActions(props).map((action) => {
    const Icon = ACTION_ICONS.get(action.id);
    return (
      <button
        key={action.id}
        className={action.className}
        type="button"
        disabled={action.disabled}
        onClick={action.onClick}
      >
        <Icon
          size={action.id === "stop" ? 14 : 15}
          fill={action.id === "stop" ? "currentColor" : "none"}
          aria-hidden="true"
        />
        {action.label}
      </button>
    );
  });
}

AssessmentSlotActions.propTypes = {
  slotView: PropTypes.object.isRequired,
  generationDisabled: PropTypes.bool.isRequired,
  onGenerateSlots: PropTypes.func,
  onGenerateQuestions: PropTypes.func,
  onStopQuestions: PropTypes.func,
};
