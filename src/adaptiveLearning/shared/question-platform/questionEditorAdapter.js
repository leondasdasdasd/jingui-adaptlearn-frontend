import { createSerializedRichContent } from "./questionContract.js";

/**
 *
 * @param blank
 * @param index
 */
function blankId(blank, index) {
  return String(
    typeof blank === "string"
      ? blank
      : blank?.id || `inline-blank-${index + 1}`,
  );
}

/**
 *
 * @param values
 */
function answerPool(values) {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value) => value !== undefined && value !== null)
    .map((value) =>
      typeof value === "string" ? createSerializedRichContent(value) : value,
    );
}

/**
 *
 * @param value
 */
function answerText(value) {
  if (value && typeof value === "object") return String(value.text ?? "");
  return String(value ?? "");
}

/**
 *
 * @param question
 */
export function fillAnswersFromQuestion(question) {
  const canonical = (
    Array.isArray(question?.answer) ? question.answer : [question?.answer]
  ).map(answerText);
  if (canonical.some((value) => value.trim())) return canonical;

  const element = question?.platformQuestion?.elements?.find(
    (item) => item.type === "inlineFill",
  );
  if (!element) return canonical;
  const blankIds = (element.blanks || []).map(blankId);
  const recovered = blankIds.map((id) => {
    const group = (element.answers || []).find((item) =>
      item.blankIds?.map(String).includes(id),
    );
    const values = Array.isArray(group?.answerPools)
      ? group.answerPools
      : group?.answers?.[id];
    return answerText(values?.[0]);
  });
  return recovered.some((value) => value.trim()) ? recovered : canonical;
}

/**
 *
 * @param element
 * @param blankIds
 */
function canonicalInlineFillAnswers(element, blankIds) {
  const validBlankIds = new Set(blankIds);
  const groups = (element.answers || []).flatMap((sourceGroup) => {
    const group =
      sourceGroup && typeof sourceGroup === "object" ? sourceGroup : {};
    const groupBlankIds = (group.blankIds || [])
      .map(String)
      .filter((id) => validBlankIds.has(id));
    if (Array.isArray(group.answerPools)) {
      return groupBlankIds.length > 0
        ? [
            {
              blankIds: groupBlankIds,
              answerPools: answerPool(group.answerPools),
            },
          ]
        : [];
    }
    if ("answerOptionId" in group) {
      const id = String(group.blankId || "");
      return validBlankIds.has(id)
        ? [{ answerOptionId: String(group.answerOptionId || ""), blankId: id }]
        : [];
    }
    if (Array.isArray(group.answerOptionIds)) {
      return groupBlankIds.length > 0
        ? [
            {
              answerOptionIds: group.answerOptionIds.map(String),
              blankIds: groupBlankIds,
            },
          ]
        : [];
    }
    return groupBlankIds.map((id) => ({
      blankIds: [id],
      answerPools: answerPool(group.answers?.[id]),
    }));
  });
  const covered = new Set(
    groups.flatMap(
      (group) => group.blankIds || (group.blankId ? [group.blankId] : []),
    ),
  );
  return [
    ...groups,
    ...blankIds
      .filter((id) => !covered.has(id))
      .map((id) => ({ blankIds: [id], answerPools: [] })),
  ];
}

/**
 *
 * @param element
 */
function canonicalElement(element) {
  const {
    elementKey: ignoredElementKey,
    elementId: ignoredElementId,
    ...content
  } = element || {};
  if (content.type === "choice") {
    return {
      ...content,
      answers: {
        ...(content.answers &&
        typeof content.answers === "object" &&
        !Array.isArray(content.answers)
          ? content.answers
          : {}),
        optionIds: Array.isArray(content.answers?.optionIds)
          ? content.answers.optionIds
          : [],
      },
    };
  }
  if (["fill", "judgement", "ordering", "textMarker"].includes(content.type)) {
    return {
      ...content,
      answers: Array.isArray(content.answers) ? content.answers : [],
    };
  }
  if (
    ["classification", "matching", "lineConnect", "wordBuilder"].includes(
      content.type,
    )
  ) {
    return {
      ...content,
      answers:
        content.answers &&
        typeof content.answers === "object" &&
        !Array.isArray(content.answers)
          ? content.answers
          : {},
    };
  }
  if (content.type !== "inlineFill") return content;
  const blankIds = (content.blanks || []).map(blankId);
  return {
    ...content,
    blanks: blankIds,
    answers: canonicalInlineFillAnswers(content, blankIds),
  };
}

/**
 *
 * @param extra
 */
function canonicalExtra(extra) {
  const { extraKey: ignoredExtraKey, ...content } = extra || {};
  return content;
}

/**
 *
 * @param serialized
 */
function canonicalSerializedDraft(serialized) {
  if (!serialized) return serialized;
  const rawQuestionTypeKey = serialized.questionTypeKey;
  return {
    questionTypeKey:
      rawQuestionTypeKey !== null &&
      rawQuestionTypeKey !== undefined &&
      Number.isInteger(Number(rawQuestionTypeKey))
        ? Number(rawQuestionTypeKey)
        : null,
    id: Number.isInteger(serialized.id) ? serialized.id : null,
    version: String(serialized.version || "1"),
    elements: (serialized.elements || []).map(canonicalElement),
    extras: (serialized.extras || []).map(canonicalExtra),
    children: (serialized.children || []).map(canonicalSerializedDraft),
  };
}

/**
 * Upgrade historical platform snapshots to the position-based 0.3 draft.
 * @param serialized
 */
export function toQuestionEditorSerialized(serialized) {
  return canonicalSerializedDraft(serialized);
}

/**
 *
 * @param serialized
 */
export function toQuestionPersistedSerialized(serialized) {
  return canonicalSerializedDraft(serialized);
}

/**
 *
 * @param questionType
 * @param value
 */
function connectionEdges(questionType, value) {
  const fromKey = questionType === "matching" ? "leftItemId" : "fromItemId";
  const toKey = questionType === "matching" ? "rightItemId" : "toItemId";
  if (Array.isArray(value))
    return value
      .map((edge) => ({
        from: String(edge?.[fromKey] || "").trim(),
        to: String(edge?.[toKey] || "").trim(),
      }))
      .filter((edge) => edge.from && edge.to);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([from, targets]) =>
    (Array.isArray(targets) ? targets : [])
      .map((to) => ({
        from: String(from).trim(),
        to: String(to).trim(),
      }))
      .filter((edge) => edge.from && edge.to),
  );
}

/**
 *
 * @param columns
 */
function connectionColumns(columns = []) {
  return (Array.isArray(columns) ? columns : []).map((column) =>
    (Array.isArray(column?.items) ? column.items : [])
      .map((item) => String(item?.id || item?.itemId || "").trim())
      .filter(Boolean),
  );
}

/**
 *
 * @param columns
 */
function connectionColumnIndexes(columns = []) {
  return new Map(
    connectionColumns(columns).flatMap((itemIds, columnIndex) =>
      itemIds.map((itemId) => [itemId, columnIndex]),
    ),
  );
}

/**
 *
 * @param questionType
 * @param value
 * @param columns
 */
export function toConnectionResponseAnswers(questionType, value, columns = []) {
  const itemColumnIndexes = connectionColumnIndexes(columns);
  const hasColumnContract = itemColumnIndexes.size > 0;
  const normalizedEdges = connectionEdges(questionType, value).flatMap(
    (edge) => {
      if (!hasColumnContract) return [edge];
      const fromColumnIndex = itemColumnIndexes.get(edge.from);
      const toColumnIndex = itemColumnIndexes.get(edge.to);
      if (
        !Number.isInteger(fromColumnIndex) ||
        !Number.isInteger(toColumnIndex) ||
        Math.abs(fromColumnIndex - toColumnIndex) !== 1
      )
        return [];
      return fromColumnIndex < toColumnIndex
        ? [edge]
        : [{ from: edge.to, to: edge.from }];
    },
  );
  return normalizedEdges.reduce(
    (answers, edge) => ({
      ...answers,
      [edge.from]: [...new Set([...(answers[edge.from] || []), edge.to])],
    }),
    {},
  );
}

/**
 *
 * @param value
 * @param columns
 * @param root0
 * @param root0.oneToOne
 */
export function isConnectionAnswerComplete(
  value,
  columns,
  { oneToOne = false } = {},
) {
  const columnItemIds = connectionColumns(columns);
  if (columnItemIds.length < 2 || (oneToOne && columnItemIds.length !== 2))
    return false;
  const allItemIds = columnItemIds.flat();
  if (allItemIds.length === 0 || new Set(allItemIds).size !== allItemIds.length)
    return false;
  const itemColumnIndexes = connectionColumnIndexes(columns);
  const edges = connectionEdges(oneToOne ? "matching" : "line_connect", value);
  if (edges.length === 0) return false;
  const edgeIds = edges.map((edge) => `${edge.from}->${edge.to}`);
  if (new Set(edgeIds).size !== edges.length) return false;

  const coveredItems = new Set();
  const coveredBoundaries = new Set();
  for (const edge of edges) {
    const fromColumnIndex = itemColumnIndexes.get(edge.from);
    const toColumnIndex = itemColumnIndexes.get(edge.to);
    if (
      !Number.isInteger(fromColumnIndex) ||
      toColumnIndex !== fromColumnIndex + 1
    )
      return false;
    coveredItems.add(edge.from);
    coveredItems.add(edge.to);
    coveredBoundaries.add(fromColumnIndex);
  }
  if (
    !allItemIds.every((itemId) => coveredItems.has(itemId)) ||
    coveredBoundaries.size !== columnItemIds.length - 1
  )
    return false;
  if (!oneToOne) return true;

  const sources = edges.map((edge) => edge.from);
  const targets = edges.map((edge) => edge.to);
  return (
    edges.length === columnItemIds[0].length &&
    edges.length === columnItemIds[1].length &&
    new Set(sources).size === sources.length &&
    new Set(targets).size === targets.length
  );
}

/**
 *
 * @param response
 * @param questionType
 */
export function readQuestionPlayerAnswer(response, questionType) {
  const item = response?.elementAnswers?.[0];
  if (item?.type === "choice") {
    return questionType === "multiple_choice"
      ? item.answers.optionIds
      : item.answers.optionIds[0] || "";
  }
  if (item?.type === "fill" || item?.type === "inlineFill") {
    const values = (item.answers || []).flatMap(
      (group) => group.answerPools?.[0]?.text || [],
    );
    return values.length > 1 ? values : values[0] || "";
  }
  if (item?.type === "judgement") {
    return typeof item.answers?.[0] === "boolean"
      ? String(item.answers[0])
      : "";
  }
  if (item?.type === "ordering" || item?.type === "textMarker")
    return item.answers || [];
  if (
    ["classification", "matching", "lineConnect", "wordBuilder"].includes(
      item?.type,
    )
  ) {
    return item.answers || {};
  }
  if (item?.type === "textResponse") return String(item.answers?.text || "");
  return "";
}
