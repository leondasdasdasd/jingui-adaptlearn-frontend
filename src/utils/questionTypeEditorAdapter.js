import { locale as applicationLocale, normalizeLocale } from "./i18n.js";

const shouldUseEnglish = (configuredLocale) => {
  const currentLocale =
    configuredLocale === undefined
      ? applicationLocale()
      : normalizeLocale(configuredLocale) || "en";
  return currentLocale === "en";
};

const mapQuestionTypeItems = (items, mapper) =>
  Array.isArray(items)
    ? items.map((item, index) => mapper(item, index))
    : items;

export const getQuestionTypeLocalizedName = (questionType, locale) =>
  shouldUseEnglish(locale) && questionType?.enName
    ? questionType.enName
    : questionType?.name || questionType?.enName || "";

const createQuestionEditorElement = (element, options) => ({
  config: element.config,
  name: getQuestionTypeLocalizedName(element, options.locale),
  type: element.type,
});

const createQuestionEditorExtra = (extra, options) => ({
  name: getQuestionTypeLocalizedName(extra, options.locale),
  type: extra.type,
});

/**
 * 将 v2 题型响应转换为 question-editor 使用的内容结构。
 * adapter 只映射题型定义，配置合法性由 question-editor 判断。
 * @param {object} questionType v2 QuestionTypeResponse。
 * @param {object} options 转换选项。
 * @param {string} [options.locale] 当前语言。
 * @returns {object|undefined} question-editor structure。
 */
export const createQuestionEditorContentStructure = (
  questionType,
  options = {},
) => {
  if (!questionType) {
    return;
  }
  return {
    elements: mapQuestionTypeItems(questionType.elements, (element) =>
      createQuestionEditorElement(element, options),
    ),
    extras: mapQuestionTypeItems(questionType.extras, (extra) =>
      createQuestionEditorExtra(extra, options),
    ),
    hasAnswer: questionType.globalConfig?.hasAnswer,
    isComposite: questionType.isComposite,
  };
};

/**
 * 将 v2 题型集合转换为 question-editor 的统一题型模板。
 * @param {object[]|object} questionTypes 题型数组或题型 id 映射。
 * @param {object} options 转换选项。
 * @returns {object[]} question-editor questionTypeTemplates。
 */
export const createQuestionEditorQuestionTypeTemplates = (
  questionTypes = [],
  options = {},
) =>
  (Array.isArray(questionTypes)
    ? questionTypes
    : Object.values(questionTypes)
  ).map((questionType) => ({
    label: getQuestionTypeLocalizedName(questionType, options.locale),
    questionTypeKey: questionType.businessQuestionTypeId,
    structure: createQuestionEditorContentStructure(questionType, options),
  }));
