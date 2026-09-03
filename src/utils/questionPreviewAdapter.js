import { createQuestionContentSerializedDraftFromV2Question } from "./questionContentV2EditorAdapter.js";
import { createQuestionEditorQuestionTypeTemplates } from "./questionTypeEditorAdapter.js";

const isPresent = (value) => value !== undefined;

export const createBusinessQuestionTypesById = (questionTypes = []) =>
  Object.fromEntries(
    questionTypes.flatMap((questionType) => {
      if (!isPresent(questionType?.businessQuestionTypeId)) {
        return [];
      }

      return [[Number(questionType.businessQuestionTypeId), questionType]];
    }),
  );

export const normalizeV2QuestionAggregateToPreviewDraft = (aggregate) =>
  createQuestionContentSerializedDraftFromV2Question(aggregate.question);

export const createQuestionPreviewViewModel = (
  aggregate,
  businessQuestionTypesById = {},
  options = {},
) => ({
  questionContent: normalizeV2QuestionAggregateToPreviewDraft(aggregate),
  questionTypeTemplates: createQuestionEditorQuestionTypeTemplates(
    Object.values(businessQuestionTypesById).filter(Boolean),
    { locale: options.locale },
  ),
});
