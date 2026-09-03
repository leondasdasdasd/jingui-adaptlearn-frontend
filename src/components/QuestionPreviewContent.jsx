import React, { useMemo } from "react";
import {
  createQuestionPreviewDraft,
  QuestionPreview,
} from "@yungu-fed/question-editor";
import PropTypes from "prop-types";

import { locale, trans } from "../utils/i18n";
import { questionPlayerLocale } from "../adaptiveLearning/shared/question-platform/questionPlayerLocale";

export default function QuestionPreviewContent({
  showAnswerDetails,
  viewModel,
}) {
  const previewDraft = useMemo(() => {
    if (
      !viewModel.questionContent ||
      viewModel.questionTypeTemplates.length === 0
    ) {
      return;
    }
    return createQuestionPreviewDraft(
      viewModel.questionContent,
      viewModel.questionTypeTemplates,
    );
  }, [viewModel]);

  if (!previewDraft) {
    return (
      <div className="teacher-question-fallback-preview">
        {trans("newMyQuestion.previewUnavailable", "题目内容暂不可预览")}
      </div>
    );
  }

  return (
    <div className="teacher-question-platform-preview">
      <QuestionPreview
        locale={questionPlayerLocale(locale())}
        questionTypeTemplates={viewModel.questionTypeTemplates}
        showAnswer={showAnswerDetails}
        showExtraAttributes={showAnswerDetails}
        value={previewDraft}
      />
    </div>
  );
}

QuestionPreviewContent.propTypes = {
  showAnswerDetails: PropTypes.bool.isRequired,
  viewModel: PropTypes.shape({
    questionContent: PropTypes.object,
    questionTypeTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};
