import {
  createEmptyQuestionPlayerResponse,
  createQuestionContentDraftFromSerialized,
  serializeQuestionContentDraft,
} from "@yungu-fed/question-editor";

import {
  canUseQuestionPlatform,
  createSerializedRichContent,
  getQuestionPlatformTemplate,
  repairEmbeddedChoiceDescriptions,
  toQuestionPlatformSerialized,
} from "./questionContract.js";
import {
  fillAnswersFromQuestion,
  readQuestionPlayerAnswer,
  toConnectionResponseAnswers,
  toQuestionEditorSerialized,
  toQuestionPersistedSerialized,
} from "./questionEditorAdapter.js";

/**
 *
 * @param question
 */
export function canUseQuestionPlatformPlayer(question) {
  return (
    [
      "single_choice",
      "multiple_choice",
      "fill_blank",
      "short_answer",
      "judgement",
      "ordering",
      "classification",
      "matching",
      "line_connect",
      "text_marker",
      "word_builder",
    ].includes(question?.type) && canUseQuestionPlatform(question)
  );
}

/**
 *
 * @param question
 */
export function canUseQuestionPlatformEditor(question) {
  return canUseQuestionPlatform(question);
}

/**
 *
 * @param stem
 * @param optionTexts
 */
function stripEmbeddedChoiceOptions(stem, optionTexts) {
  const source = String(stem || "").trim();
  const options = optionTexts
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (!source || options.length === 0) return source;

  const firstOptionAt = source.indexOf(options[0]);
  const containsEveryOption =
    firstOptionAt > 0 &&
    options.every((option) => source.slice(firstOptionAt).includes(option));
  return containsEveryOption ? source.slice(0, firstOptionAt).trim() : source;
}

/**
 *
 * @param serialized
 * @param question
 */
function normalizeChoiceStem(serialized, question) {
  if (!["single_choice", "multiple_choice"].includes(question.type))
    return serialized;
  const stemIndex =
    serialized.elements?.findIndex((item) => item.type === "richText") ?? -1;
  const choice = serialized.elements?.find((item) => item.type === "choice");
  if (stemIndex < 0 || !choice) return serialized;

  const optionTexts = (
    choice.options?.length ? choice.options : question.options || []
  ).map((option) => option.cells?.[0]?.text ?? option.text);
  const currentStem =
    serialized.elements[stemIndex].content?.text ?? question.stem;
  const cleanedStem = stripEmbeddedChoiceOptions(currentStem, optionTexts);
  if (cleanedStem === currentStem) return serialized;

  const elements = [...serialized.elements];
  elements[stemIndex] = {
    ...elements[stemIndex],
    content: createSerializedRichContent(cleanedStem),
  };
  return { ...serialized, elements };
}

/**
 *
 * @param element
 */
function isInlineFillElement(element) {
  return element?.type === "inlineFill";
}

/**
 *
 * @param question
 * @param serialized
 */
function shouldRegenerateFillSerialized(question, serialized) {
  if (question.type !== "fill_blank") return false;
  return !serialized?.elements?.some(isInlineFillElement);
}

/**
 *
 * @param content
 */
function hasRichDocument(content) {
  return Array.isArray(content?.json) && content.json.length > 0;
}

/**
 *
 * @param canonical
 * @param persisted
 */
function mergeRichContentItem(canonical, persisted) {
  if (
    !persisted ||
    canonical?.content?.text !== persisted?.content?.text ||
    !hasRichDocument(persisted.content)
  ) {
    return canonical;
  }
  return { ...canonical, ...persisted, content: persisted.content };
}

/**
 *
 * @param question
 * @param persisted
 */
function mergeShortAnswerSerialized(question, persisted) {
  const canonical = toQuestionPlatformSerialized(question);
  if (!persisted?.elements) return canonical;
  return {
    ...persisted,
    ...canonical,
    elements: canonical.elements.map((item) =>
      mergeRichContentItem(
        item,
        persisted.elements.find((candidate) => candidate.type === item.type),
      ),
    ),
    extras: canonical.extras.map((item) =>
      mergeRichContentItem(
        item,
        (persisted.extras || []).find(
          (candidate) => candidate.type === item.type,
        ),
      ),
    ),
  };
}

/**
 *
 * @param element
 * @param id
 * @param index
 */
function inlineFillAnswerPool(element, id, index) {
  const group =
    (element.answers || []).find((item) =>
      item.blankIds?.map(String).includes(id),
    ) || element.answers?.[index];
  return group?.answerPools || group?.answers?.[id] || [];
}

/**
 *
 * @param question
 * @param persisted
 */
function mergeInlineFillSerialized(question, persisted) {
  const canonical = toQuestionPlatformSerialized(question);
  const canonicalElement = canonical.elements?.find(isInlineFillElement);
  const persistedElement = persisted?.elements?.find(isInlineFillElement);
  if (!canonicalElement || !persistedElement) return canonical;

  const canonicalIds = (canonicalElement.blanks || []).map((blank) =>
    String(blank?.id || blank),
  );
  const persistedIds = (persistedElement.blanks || []).map((blank) =>
    String(blank?.id || blank),
  );
  const canPreserveStructure =
    canonicalElement.content?.text === persistedElement.content?.text &&
    canonicalIds.length === persistedIds.length;
  if (!canPreserveStructure) return canonical;

  const answers = persistedIds.map((id, index) => ({
    answerPools: inlineFillAnswerPool(
      canonicalElement,
      canonicalIds[index],
      index,
    ),
    blankIds: [id],
  }));
  return {
    ...persisted,
    ...canonical,
    elements: [
      {
        ...canonicalElement,
        ...persistedElement,
        answers,
        blanks: persistedElement.blanks,
        content: hasRichDocument(persistedElement.content)
          ? persistedElement.content
          : canonicalElement.content,
      },
    ],
  };
}

/**
 *
 * @param value
 * @param fallbackRubric
 */
function rubricFromText(value, fallbackRubric = []) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const normalized = line.replace(/^\d+[.、]\s*/, "").trim();
      const match = normalized.match(/^(.*?)(?:[(（]\s*([\d.]+)\s*分[)）])?$/);
      const point = String(match?.[1] || "").trim();
      const fallbackScore = Number(
        fallbackRubric[index]?.points ?? fallbackRubric[index]?.score,
      );
      const parsedScore = Number(match?.[2]);
      return {
        point,
        points:
          Number.isFinite(parsedScore) && parsedScore > 0
            ? parsedScore
            : Number.isFinite(fallbackScore) && fallbackScore > 0
              ? fallbackScore
              : 0,
      };
    })
    .filter((item) => item.point);
}

/**
 *
 * @param question
 */
function recoverShortAnswerFields(question) {
  if (question.type !== "short_answer") return question;
  const extraText = (key) =>
    (question.platformQuestion?.extras || []).find((item) => item.type === key)
      ?.content?.text || "";
  const answer = String(question.answer || "").trim()
    ? question.answer
    : extraText("sampleAnswer");
  const analysis = String(question.analysis || "").trim()
    ? question.analysis
    : extraText("solvingProcess");
  const rubric =
    Array.isArray(question.rubric) && question.rubric.length > 0
      ? question.rubric
      : rubricFromText(extraText("scoringRule"));
  const rubricScore = rubric.reduce(
    (sum, item) => sum + Number(item.points || 0),
    0,
  );
  return {
    ...question,
    answer,
    analysis,
    rubric,
    maxScore:
      Number(question.maxScore) > 0
        ? question.maxScore
        : rubricScore || question.maxScore,
  };
}

/**
 *
 * @param question
 */
export function createQuestionPlatformDraft(question) {
  const repairedQuestion = repairEmbeddedChoiceDescriptions(question);
  const recoveredFillAnswers =
    repairedQuestion.type === "fill_blank"
      ? fillAnswersFromQuestion(repairedQuestion)
      : [];
  const fillRecoveredQuestion =
    repairedQuestion.type === "fill_blank"
      ? {
          ...repairedQuestion,
          answer:
            recoveredFillAnswers.length > 1
              ? recoveredFillAnswers
              : recoveredFillAnswers[0] || "",
        }
      : repairedQuestion;
  const sourceQuestion = recoverShortAnswerFields(fillRecoveredQuestion);
  const template = getQuestionPlatformTemplate(sourceQuestion.type);
  const persisted =
    sourceQuestion.platformQuestion ||
    toQuestionPlatformSerialized(sourceQuestion);
  const source =
    sourceQuestion.type === "fill_blank"
      ? mergeInlineFillSerialized(sourceQuestion, persisted)
      : sourceQuestion.type === "short_answer"
        ? mergeShortAnswerSerialized(sourceQuestion, persisted)
        : persisted;
  const serialized = normalizeChoiceStem(
    shouldRegenerateFillSerialized(sourceQuestion, source)
      ? toQuestionPlatformSerialized(sourceQuestion)
      : source,
    sourceQuestion,
  );
  return createQuestionContentDraftFromSerialized(
    template.structure,
    toQuestionEditorSerialized(serialized),
  );
}

/**
 *
 * @param draft
 * @param questionType
 * @param fallbackQuestion
 */
export function readQuestionPlatformDraft(
  draft,
  questionType,
  fallbackQuestion = {},
) {
  const serialized = serializeQuestionContentDraft(draft);
  const stemElement = serialized.elements.find(
    (item) => item.type === "richText",
  );
  const answerElement = serialized.elements.find((item) =>
    [
      "choice",
      "fill",
      "inlineFill",
      "judgement",
      "ordering",
      "classification",
      "matching",
      "lineConnect",
      "textMarker",
      "wordBuilder",
      "textResponse",
    ].includes(item.type),
  );
  const base = {
    stem: stemElement?.content?.text || answerElement?.content?.text || "",
    platformQuestion: {
      ...toQuestionPersistedSerialized(serialized),
    },
  };
  if (questionType === "short_answer") {
    const extraText = (key) =>
      (serialized.extras || []).find((item) => item.type === key)?.content
        ?.text || "";
    const rubric = rubricFromText(
      extraText("scoringRule"),
      fallbackQuestion.rubric,
    );
    const maxScore = rubric.reduce((sum, item) => sum + item.points, 0);
    return {
      ...base,
      options: [],
      answer: extraText("sampleAnswer"),
      analysis: extraText("solvingProcess"),
      rubric,
      maxScore: maxScore > 0 ? maxScore : fallbackQuestion.maxScore,
    };
  }
  if (answerElement?.type === "choice") {
    const selected = answerElement.answers?.optionIds || [];
    return {
      ...base,
      options: (answerElement.options || []).map((option, index) => ({
        id: option.id || ["A", "B", "C", "D"][index],
        text: option.cells?.[0]?.text || "",
      })),
      answer: questionType === "multiple_choice" ? selected : selected[0] || "",
    };
  }
  if (answerElement?.type === "judgement") {
    const value = answerElement.answers?.[0];
    return {
      ...base,
      options: [],
      answer: typeof value === "boolean" ? String(value) : "",
    };
  }
  if (answerElement?.type === "ordering") {
    return {
      ...base,
      options: (answerElement.sortOptions || []).map((option, index) => ({
        id: option.id || `S${index + 1}`,
        text: option.content?.text || "",
      })),
      answer: answerElement.answers || [],
    };
  }
  if (answerElement?.type === "classification") {
    return {
      ...base,
      categories: (answerElement.categories || []).map((category) => ({
        id: category.id,
        text: category.content?.text || "",
      })),
      items: (answerElement.items || []).map((item) => ({
        id: item.id,
        text: item.content?.text || "",
      })),
      options: [],
      answer: answerElement.answers || {},
    };
  }
  if (["matching", "lineConnect"].includes(answerElement?.type)) {
    const columns = (answerElement.columns || []).map(
      (column, columnIndex) => ({
        id: column.columnId || `column-${columnIndex + 1}`,
        items: (column.items || []).map((item, itemIndex) => ({
          id:
            item.itemId ||
            item.id ||
            `item-${columnIndex + 1}-${itemIndex + 1}`,
          text: item.content?.text || "",
        })),
      }),
    );
    const answer = Object.entries(answerElement.answers || {}).flatMap(
      ([from, values]) =>
        (values || []).map((to) =>
          answerElement.type === "matching"
            ? { leftItemId: from, rightItemId: to }
            : { fromItemId: from, toItemId: to },
        ),
    );
    return { ...base, columns, options: [], answer };
  }
  if (answerElement?.type === "textMarker") {
    const segments = (answerElement.content?.json || [])
      .flatMap((node) => node.children || [])
      .filter((node) => String(node?.text || ""))
      .map((node) => ({
        text: node.text,
        ...(node.markerId ? { markerId: node.markerId } : {}),
      }));
    return {
      ...base,
      segments,
      options: [],
      answer: answerElement.answers || [],
    };
  }
  if (answerElement?.type === "wordBuilder") {
    const template = (answerElement.content?.json || [])
      .flatMap((node) => node.children || [])
      .map((node) =>
        node.type === "blank" ? `{{${node.blankId}}}` : String(node.text || ""),
      )
      .join("");
    return {
      ...base,
      stem: fallbackQuestion.stem || base.stem,
      template,
      candidateOptions: answerElement.candidateOptions || [],
      options: [],
      answer: answerElement.answers || {},
    };
  }
  const fillAnswerPools = (answerElement?.blanks || []).map((blank) => {
    const blankId = typeof blank === "string" ? blank : blank.id;
    const group = answerElement?.answers?.find((item) =>
      item.blankIds?.includes(blankId),
    );
    return (group?.answerPools || group?.answers?.[blankId] || []).map((item) =>
      String(item?.text || ""),
    );
  });
  const fillAnswers = fillAnswerPools.map((pool) => pool[0] || "");
  const answer = fillAnswers.length > 1 ? fillAnswers : fillAnswers[0] || "";
  return { ...base, options: [], answer, acceptableAnswers: fillAnswerPools };
}

/**
 *
 * @param question
 * @param answerValue
 */
export function adaptLegacyQuestion(question, answerValue) {
  const template = getQuestionPlatformTemplate(question.type);
  const draft = createQuestionPlatformDraft(question);
  const serializedDraft = serializeQuestionContentDraft(draft);
  const templates = [template];
  const response = createEmptyQuestionPlayerResponse(draft, templates);
  const interactive = response.elementAnswers[0];
  if (interactive?.type === "choice") {
    interactive.answers.optionIds = Array.isArray(answerValue)
      ? answerValue
      : answerValue
        ? [answerValue]
        : [];
  }
  if (interactive?.type === "textResponse") {
    interactive.answers =
      answerValue &&
      typeof answerValue === "object" &&
      !Array.isArray(answerValue)
        ? answerValue
        : createSerializedRichContent(String(answerValue || ""));
  }
  if (interactive?.type === "fill") {
    const blankIds = question.platformQuestion?.elements?.find(
      (item) => item.type === "fill",
    )?.blanks || ["blank-1"];
    const values = Array.isArray(answerValue) ? answerValue : [answerValue];
    interactive.answers = blankIds.map((blankId, index) => ({
      answerPools: [createSerializedRichContent(String(values[index] || ""))],
      blankIds: [blankId],
    }));
  }
  if (interactive?.type === "inlineFill") {
    const inlineElement = serializedDraft.elements?.find(
      (item) => item.type === "inlineFill",
    );
    const blankIds = inlineElement?.blanks ||
      inlineElement?.content?.json
        ?.flatMap((node) => node.children || [])
        ?.filter((node) => node.type === "blank")
        ?.map((node) => node.blankId) || ["inline-blank-1"];
    const values = Array.isArray(answerValue) ? answerValue : [answerValue];
    interactive.answers = blankIds.map((blank, index) => ({
      answerPools: [createSerializedRichContent(String(values[index] || ""))],
      blankIds: [typeof blank === "string" ? blank : blank.id],
    }));
  }
  if (interactive?.type === "judgement") {
    interactive.answers =
      answerValue === "true" || answerValue === true
        ? [true]
        : answerValue === "false" || answerValue === false
          ? [false]
          : [];
  }
  if (interactive?.type === "ordering") {
    const initialOrder =
      serializedDraft.elements
        ?.find((item) => item.type === "ordering")
        ?.sortOptions?.map((option) => option.id) || [];
    interactive.answers =
      Array.isArray(answerValue) && answerValue.length > 0
        ? answerValue
        : initialOrder;
  }
  if (interactive?.type === "classification") {
    interactive.answers =
      answerValue &&
      typeof answerValue === "object" &&
      !Array.isArray(answerValue)
        ? answerValue
        : {};
  }
  if (["matching", "lineConnect"].includes(interactive?.type)) {
    interactive.answers = toConnectionResponseAnswers(
      question.type,
      answerValue,
      question.columns,
    );
  }
  if (interactive?.type === "textMarker") {
    interactive.answers = Array.isArray(answerValue) ? answerValue : [];
  }
  if (interactive?.type === "wordBuilder") {
    interactive.answers =
      answerValue &&
      typeof answerValue === "object" &&
      !Array.isArray(answerValue)
        ? answerValue
        : {};
  }
  return { draft, response, templates };
}

/**
 *
 * @param response
 * @param questionType
 */
export function readLegacyAnswer(response, questionType) {
  return readQuestionPlayerAnswer(response, questionType);
}
