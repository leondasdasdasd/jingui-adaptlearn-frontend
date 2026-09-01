/* eslint-disable complexity -- 保留既有评估插槽与题型字段重置规则。 */

import {
  ASSESSMENT_MATRIX_DOMAIN_LABELS,
  ASSESSMENT_MATRIX_LEVEL_LABELS,
} from "../../shared/domain/knowledgeAssessmentMatrix";

export const typeLabels = {
  single_choice: "单选题",
  multiple_choice: "多选题",
  fill_blank: "题干内填空",
  short_answer: "问答题",
  judgement: "判断题",
  ordering: "排序题",
  classification: "分类题",
  matching: "匹配题",
  line_connect: "连线题",
  text_marker: "文本标记题",
  word_builder: "组式题",
};
export const difficultyLabels = {
  1: "D1 基础识别",
  2: "D2 直接理解",
  3: "D3 标准应用",
  4: "D4 变式综合",
  5: "D5 迁移应用",
  D1: "D1 基础识别",
  D2: "D2 直接理解",
  D3: "D3 标准应用",
  D4: "D4 变式综合",
  D5: "D5 迁移应用",
};
const matrixRoleLabels = {
  CORE: "核心格",
  SUPPORT: "支撑格",
  EXTENSION: "拓展格",
};

/**
 *
 * @param value
 */
function difficultyCode(value) {
  const level = Number(String(value || "").replace(/^d/i, ""));
  return level >= 1 && level <= 5 ? `D${level}` : "D3";
}

/**
 *
 * @param question
 */
export function questionSlotPresentation(question) {
  const blueprint = question?.blueprint || {};
  const matrixCellId = String(
    question?.matrixCellId ||
      question?.assessmentMatrixCellId ||
      blueprint.matrixCellId ||
      "",
  ).trim();
  const cellIdParts = matrixCellId.split(":");
  const domain = String(
    question?.domain || blueprint.domain || cellIdParts.at(-2) || "",
  )
    .trim()
    .toUpperCase();
  const targetLevel = String(
    question?.targetLevel || blueprint.targetLevel || cellIdParts.at(-1) || "",
  )
    .trim()
    .toUpperCase();
  if (
    !ASSESSMENT_MATRIX_DOMAIN_LABELS[domain] ||
    !ASSESSMENT_MATRIX_LEVEL_LABELS[targetLevel]
  ) {
    return null;
  }
  const difficulty = difficultyCode(question?.difficulty);
  const role = String(question?.matrixRole || blueprint.matrixRole || "")
    .trim()
    .toUpperCase();
  const blueprintSlotId = String(
    question?.blueprintSlotId ||
      blueprint.blueprintSlotId ||
      blueprint.id ||
      "",
  ).trim();
  const description = [
    `${ASSESSMENT_MATRIX_DOMAIN_LABELS[domain]} / ${ASSESSMENT_MATRIX_LEVEL_LABELS[targetLevel]}`,
    difficultyLabels[difficulty],
    matrixRoleLabels[role],
    blueprintSlotId ? `蓝图插槽 ${blueprintSlotId}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    matrixCode: `${domain}-${targetLevel}`,
    difficulty,
    description,
  };
}

const structuredArrayAnswerTypes = new Set([
  "multiple_choice",
  "ordering",
  "matching",
  "line_connect",
  "text_marker",
]);
const structuredObjectAnswerTypes = new Set(["classification", "word_builder"]);

/**
 *
 * @param question
 */
export function hasReferenceAnswer(question) {
  const answer = question?.answer;
  if (structuredArrayAnswerTypes.has(question?.type)) {
    return Array.isArray(answer) && answer.length > 0;
  }
  if (structuredObjectAnswerTypes.has(question?.type)) {
    return (
      Boolean(answer) &&
      !Array.isArray(answer) &&
      typeof answer === "object" &&
      Object.keys(answer).length > 0
    );
  }
  if (Array.isArray(answer))
    return answer.some((item) => String(item ?? "").trim());
  return typeof answer === "boolean" || Boolean(String(answer ?? "").trim());
}

/**
 *
 * @param type
 */
function emptyAnswerForType(type) {
  if (structuredArrayAnswerTypes.has(type)) return [];
  if (structuredObjectAnswerTypes.has(type)) return {};
  return "";
}

/**
 *
 * @param question
 * @param type
 */
export function resetTypeSpecificFields(question, type) {
  return {
    ...question,
    type,
    answer: emptyAnswerForType(type),
    options: ["single_choice", "multiple_choice", "ordering"].includes(type)
      ? question.options || []
      : [],
    categories: type === "classification" ? [] : undefined,
    items: type === "classification" ? [] : undefined,
    columns: ["matching", "line_connect"].includes(type) ? [] : undefined,
    segments: type === "text_marker" ? [] : undefined,
    template: type === "word_builder" ? "" : undefined,
    candidateOptions: type === "word_builder" ? [] : undefined,
    platformQuestion: null,
  };
}

/**
 *
 * @param mode
 * @param knowledgePointId
 */
export function emptyQuestion(mode, knowledgePointId) {
  return {
    id: `teacher-question-${Date.now()}`,
    purpose: mode === "pre" ? "pre" : "post",
    phase: mode === "pre" ? "diagnostic" : "knowledge",
    type: "single_choice",
    difficulty: 2,
    stem: "",
    options: [
      { id: "A", text: "" },
      { id: "B", text: "" },
      { id: "C", text: "" },
      { id: "D", text: "" },
    ],
    answer: "A",
    acceptableAnswers: [],
    analysis: "",
    maxScore: 2,
    rubric: [],
    knowledgePointIds: knowledgePointId ? [knowledgePointId] : [],
    primaryKnowledgePointId: knowledgePointId || "",
    knowledgePointWeights: knowledgePointId ? { [knowledgePointId]: 1 } : {},
  };
}

/**
 *
 * @param question
 */
export function optionsText(question) {
  return (question.options || [])
    .map((option) => `${option.id}. ${option.text}`)
    .join("\n");
}
