import { normalizeRichTextContent } from "@yungu-fed/question-editor";

const RICH_CONTENT_FIELDS = new Set(["html", "json", "text"]);

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasOwn = (value, field) =>
  Object.prototype.hasOwnProperty.call(value, field);

const isRichContent = (value) =>
  isRecord(value) &&
  Object.keys(value).length > 0 &&
  Object.keys(value).every((field) => RICH_CONTENT_FIELDS.has(field));

const normalizeQuestionRichContent = (content) =>
  normalizeRichTextContent({
    ...(hasOwn(content, "html") ? { html: content.html } : {}),
    ...(Array.isArray(content.json) && content.json.length > 0
      ? { json: content.json }
      : {}),
    ...(hasOwn(content, "text") ? { text: content.text } : {}),
  });

const normalizeQuestionContentValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeQuestionContentValue(item));
  }
  if (isRichContent(value)) {
    return normalizeQuestionRichContent(value);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      normalizeQuestionContentValue(item),
    ]),
  );
};

const isQuestionContentIdPresent = (value) =>
  value !== undefined && value !== null;

const collectionOrEmpty = (value) => (value === undefined ? [] : value);

const createSerializedDraftFromV2Node = (question) => ({
  children: collectionOrEmpty(question.children).map((child) =>
    createSerializedDraftFromV2Node(child),
  ),
  elements: normalizeQuestionContentValue(collectionOrEmpty(question.elements)),
  extras: normalizeQuestionContentValue(collectionOrEmpty(question.extras)),
  id: question.id,
  questionTypeKey: question.businessQuestionTypeId,
  version: question.version,
});

/**
 * 将 v2 题目树转换为 question-editor SerializedDraft。
 * 这里只转换题型标识并统一标准化富文本，其余内容原样交给组件。
 * @param {object} question v2 QuestionContentPayload。
 * @returns {object} question-editor QuestionContentSerializedDraft。
 */
export const createQuestionContentSerializedDraftFromV2Question = (question) =>
  createSerializedDraftFromV2Node(question);

const createV2NodeFromSerializedDraft = (node, options) => ({
  children: node.children.map((child) =>
    createV2NodeFromSerializedDraft(child, options),
  ),
  elements: node.elements,
  extras: node.extras,
  ...(options.includeQuestionId && isQuestionContentIdPresent(node.id)
    ? { id: node.id }
    : {}),
  businessQuestionTypeId: node.questionTypeKey,
  version: node.version,
});

/**
 * 将 question-editor 序列化内容转换为后端 v2 题目内容节点。
 * element 与 extra 已由组件 serializer 收口，此处不再重复适配。
 * @param {object} node question-editor QuestionContentSerializedDraft。
 * @param {object} options 转换选项。
 * @param {boolean} [options.includeQuestionId] 是否在保存请求中保留题目 id。
 * @returns {object} v2 QuestionContentPayload。
 */
export const createQuestionContentV2QuestionFromSerializedDraft = (
  node,
  { includeQuestionId = false } = {},
) => createV2NodeFromSerializedDraft(node, { includeQuestionId });
