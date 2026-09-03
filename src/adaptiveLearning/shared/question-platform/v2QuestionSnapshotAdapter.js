import { createQuestionPreviewViewModel } from "../../../utils/questionPreviewAdapter.js";

/**
 * 题库 V2 内容只在该 adapter 中转换为自适应题目快照，避免组件理解题库 DTO。
 * @param value
 */
function cloneSnapshotValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

/**
 * @param content
 */
function richText(content) {
  const text = String(content?.text || "").trim();
  if (text) return text;
  return String(content?.html || "")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

/**
 * @param question
 */
function questionStem(question) {
  const stemElement = (question?.elements || []).find(
    (element) => element?.type === "richText" || element?.type === "inlineFill",
  );
  return richText(stemElement?.content);
}

/**
 * @param question
 */
function questionAnalysis(question) {
  const analysis = (question?.extras || []).find((extra) =>
    ["solvingProcess", "analysis"].includes(extra?.type),
  );
  return richText(analysis?.content);
}

/**
 * @param value
 */
function answerPoolText(value) {
  return richText(value) || String(value ?? "").trim();
}

/**
 * @param choice
 * @param adaptiveType
 */
function choiceQuestionFields(choice, adaptiveType) {
  const options = (choice.options || []).map((option, index) => ({
    id: String.fromCodePoint(65 + index),
    text: (option.cells || [])
      .map((cell) => richText(cell))
      .filter(Boolean)
      .join(" | "),
  }));
  const selectedIds = new Set(choice.answers?.optionIds || []);
  const selected = (choice.options || []).flatMap((option, index) =>
    selectedIds.has(option.id) ? [options[index]?.id] : [],
  );
  return {
    options,
    answer: adaptiveType === "multiple_choice" ? selected : selected[0] || "",
  };
}

/**
 * @param fill
 */
function fillQuestionFields(fill) {
  const answers = (fill.answers || []).flatMap((group) =>
    (group.answerPools || [])
      .map((answer) => answerPoolText(answer))
      .filter(Boolean),
  );
  return { answer: answers.length > 1 ? answers : answers[0] || "" };
}

/**
 * @param question
 * @param adaptiveType
 */
function canonicalQuestionFields(question, adaptiveType) {
  const elements = question?.elements || [];
  const choice = elements.find((element) => element?.type === "choice");
  if (choice) return choiceQuestionFields(choice, adaptiveType);
  const judgement = elements.find((element) => element?.type === "judgement");
  if (judgement) return { answer: judgement.answers?.[0] ?? "" };
  const fill = elements.find((element) =>
    ["fill", "inlineFill"].includes(element?.type),
  );
  if (fill) return fillQuestionFields(fill);
  const sampleAnswer = (question?.extras || []).find(
    (extra) => extra?.type === "sampleAnswer",
  );
  return { answer: richText(sampleAnswer?.content) };
}

/**
 * 将真实题库 aggregate 固化为可发布、可复核的自适应题目快照。
 * @param root0
 * @param root0.aggregate
 * @param root0.questionTypesById
 * @param root0.type
 */
export function createAdaptiveQuestionSnapshotFromV2({
  aggregate,
  questionTypesById,
  type,
}) {
  const question = aggregate.question;
  const questionTypes = Object.values(questionTypesById || {}).filter(Boolean);
  return {
    stem: String(aggregate?.resource?.stem || questionStem(question)).trim(),
    type,
    difficulty: Math.max(
      1,
      Math.min(5, Number(aggregate?.resource?.level) || 3),
    ),
    analysis: questionAnalysis(question),
    ...canonicalQuestionFields(question, type),
    sourceContentSnapshot: cloneSnapshotValue({
      kind: "question_bank_v2",
      question,
      questionTypes,
    }),
  };
}

/**
 * @param question
 */
export function importedV2QuestionPreviewViewModel(question) {
  const snapshot = question?.sourceContentSnapshot;
  if (snapshot?.kind !== "question_bank_v2" || !snapshot.question) return null;
  const questionTypesById = Object.fromEntries(
    (snapshot.questionTypes || []).map((type) => [
      Number(type.businessQuestionTypeId),
      type,
    ]),
  );
  return createQuestionPreviewViewModel(
    { question: snapshot.question },
    questionTypesById,
  );
}
