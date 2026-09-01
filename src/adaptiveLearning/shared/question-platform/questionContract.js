const TYPE_KEYS = {
  single_choice: 1001,
  multiple_choice: 1002,
  fill_blank: 1003,
  short_answer: 1004,
  judgement: 1005,
  ordering: 1006,
  classification: 1007,
  matching: 1008,
  line_connect: 1009,
  text_marker: 1010,
  word_builder: 1011,
};

const TYPE_LABELS = {
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

/**
 *
 * @param selectionType
 */
function choiceStructure(selectionType) {
  return {
    elements: [
      { config: {}, name: "题干", type: "richText" },
      {
        config: {
          optionLabelStyle: "upperAlpha",
          renderer: "standard",
          selectionType,
        },
        name: "选项",
        type: "choice",
      },
    ],
    extras: [],
    hasAnswer: true,
    isComposite: false,
  };
}

export const QUESTION_PLATFORM_STRUCTURES = {
  single_choice: choiceStructure("single"),
  multiple_choice: choiceStructure("multiple"),
  fill_blank: {
    elements: [
      {
        config: { allowCandidateReuse: false, candidateMode: "none" },
        name: "题干内填空",
        type: "inlineFill",
      },
    ],
    extras: [],
    hasAnswer: true,
    isComposite: false,
  },
  short_answer: {
    elements: [
      { config: {}, name: "题干", type: "richText" },
      { config: {}, name: "作答", type: "textResponse" },
    ],
    extras: [
      { name: "示例作答", type: "sampleAnswer" },
      { name: "评分规则", type: "scoringRule" },
      { name: "解题过程", type: "solvingProcess" },
    ],
    hasAnswer: false,
    isComposite: false,
  },
  judgement: {
    elements: [
      { config: {}, name: "题干", type: "richText" },
      {
        config: { judgeAnswerMode: "correctWrong" },
        name: "判断",
        type: "judgement",
      },
    ],
    extras: [],
    hasAnswer: true,
    isComposite: false,
  },
  ordering: {
    elements: [
      { config: {}, name: "题干", type: "richText" },
      { config: {}, name: "排序", type: "ordering" },
    ],
    extras: [],
    hasAnswer: true,
    isComposite: false,
  },
  classification: {
    elements: [
      { config: {}, name: "题干", type: "richText" },
      { config: {}, name: "分类", type: "classification" },
    ],
    extras: [],
    hasAnswer: true,
    isComposite: false,
  },
  matching: {
    elements: [
      { config: {}, name: "题干", type: "richText" },
      {
        config: {
          columns: [{ labelStyle: "number" }, { labelStyle: "upperAlpha" }],
        },
        name: "匹配",
        type: "matching",
      },
    ],
    extras: [],
    hasAnswer: true,
    isComposite: false,
  },
  line_connect: {
    elements: [
      { config: {}, name: "题干", type: "richText" },
      {
        config: {
          columns: [{ labelStyle: "number" }, { labelStyle: "upperAlpha" }],
        },
        name: "连线",
        type: "lineConnect",
      },
    ],
    extras: [],
    hasAnswer: true,
    isComposite: false,
  },
  text_marker: {
    elements: [
      { config: {}, name: "题干", type: "richText" },
      { config: {}, name: "文本标记", type: "textMarker" },
    ],
    extras: [],
    hasAnswer: true,
    isComposite: false,
  },
  word_builder: {
    elements: [
      {
        config: { builderMode: "sentence" },
        name: "组式",
        type: "wordBuilder",
      },
    ],
    extras: [],
    hasAnswer: true,
    isComposite: false,
  },
};

/**
 *
 * @param value
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 *
 * @param value
 */
export function createSerializedRichContent(value) {
  const text = String(value ?? "");
  return {
    text,
    html: `<p>${escapeHtml(text)}</p>`,
    json: [{ type: "paragraph", children: [{ text }] }],
  };
}

/**
 *
 * @param option
 * @param index
 */
function stripRenderedChoiceLabel(option, index) {
  const fallbackId = ["A", "B", "C", "D"][index] || String(index + 1);
  const id = String(option?.id || fallbackId)
    .trim()
    .toUpperCase();
  const text = String(option?.text ?? option ?? "").trim();
  if (new RegExp(`^${id}、[A-D](?:\\s|两|点)`, "i").test(text)) {
    return {
      ...(typeof option === "object" && option !== null ? option : {}),
      id,
      text,
    };
  }
  const labelPattern = new RegExp(
    `^(?:[（(]${id}[）)]|${id}[.．、:：])\\s*`,
    "i",
  );
  const stripped = text.replace(labelPattern, "").trim();
  return {
    ...(typeof option === "object" && option !== null ? option : {}),
    id,
    text: stripped || text,
  };
}

/**
 *
 * @param question
 */
export function repairEmbeddedChoiceDescriptions(question) {
  const type = String(question?.type || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
  if (!["single_choice", "multiple_choice"].includes(type)) return question;
  const originalOptions = question.options || [];
  const options = originalOptions.map(stripRenderedChoiceLabel);
  const strippedLabels = options.some(
    (option, index) =>
      option.text !==
      String(
        originalOptions[index]?.text ?? originalOptions[index] ?? "",
      ).trim(),
  );
  const labelsOnly =
    options.length === 4 &&
    options.every(
      (option, index) =>
        String(option.text || "")
          .trim()
          .toUpperCase() ===
        (option.id || ["A", "B", "C", "D"][index]).toUpperCase(),
    );
  if (!labelsOnly) {
    return strippedLabels
      ? { ...question, options, platformQuestion: null }
      : question;
  }

  const source = String(question.stem || "").trim();
  const markers = [
    ...source.matchAll(/(?:^|[\n\r;。；]\s*)([A-D])[.:、．：]\s*/g),
  ];
  if (
    markers.length !== 4 ||
    markers.map((match) => match[1]).join("") !== "ABCD"
  ) {
    return strippedLabels
      ? { ...question, options, platformQuestion: null }
      : question;
  }
  const repairedOptions = markers.map((match, index) => {
    const start = match.index + match[0].length;
    const end =
      index + 1 < markers.length ? markers[index + 1].index : source.length;
    return {
      ...options[index],
      id: match[1],
      text: source
        .slice(start, end)
        .trim()
        .replace(/[;。；]+$/, ""),
    };
  });
  if (repairedOptions.some((option) => !option.text)) return question;
  return {
    ...question,
    stem: source.slice(0, markers[0].index).trim(),
    options: repairedOptions,
    platformQuestion: null,
  };
}

/**
 *
 * @param question
 */
function inlineBlankIdsFor(question) {
  const answers = Array.isArray(question.answer)
    ? question.answer
    : [question.answer];
  return answers.map((_, index) => `inline-blank-${index + 1}`);
}

/**
 *
 * @param stem
 * @param blankIds
 */
function createInlineFillContent(stem, blankIds) {
  const source = String(stem ?? "");
  const parts = source.split(/_{2,}/);
  const children = [];
  let renderedBlanks = 0;
  for (const [index, part] of parts.entries()) {
    if (part) children.push({ text: part });
    if (index < parts.length - 1 && renderedBlanks < blankIds.length) {
      children.push({
        blankId: blankIds[renderedBlanks],
        children: [{ text: "" }],
        label: `空 ${renderedBlanks + 1}`,
        type: "blank",
      });
      renderedBlanks += 1;
    }
  }
  // Keep legacy/malformed content renderable while the server-side generator
  // rejects new questions whose answer count and inline blank count disagree.
  for (let index = renderedBlanks; index < blankIds.length; index += 1) {
    children.push(
      { text: " " },
      {
        blankId: blankIds[index],
        children: [{ text: "" }],
        label: `空 ${index + 1}`,
        type: "blank",
      },
    );
  }
  const json = [{ children, type: "paragraph" }];
  return {
    text: json[0].children
      .map((item) => (item.type === "blank" ? "____" : item.text))
      .join(""),
    html: `<p>${json[0].children
      .map((item) =>
        item.type === "blank"
          ? `<span data-rte-node="blank" data-blank-id="${item.blankId}" data-label="${item.label}"></span>`
          : escapeHtml(item.text),
      )
      .join("")}</p>`,
    json,
  };
}

/**
 *
 * @param answer
 * @param fromKey
 * @param toKey
 */
function normalizeConnectionAnswers(answer, fromKey, toKey) {
  return (Array.isArray(answer) ? answer : []).reduce((result, edge) => {
    const from = String(edge?.[fromKey] || "").trim();
    const to = String(edge?.[toKey] || "").trim();
    if (!from || !to) return result;
    return { ...result, [from]: [...new Set([...(result[from] || []), to])] };
  }, {});
}

/**
 *
 * @param columns
 */
function serializeConnectionColumns(columns = []) {
  return columns.map((column, columnIndex) => ({
    columnId: String(column?.id || `column-${columnIndex + 1}`),
    items: (column?.items || []).map((item, itemIndex) => ({
      content: createSerializedRichContent(item?.text),
      itemId: String(item?.id || `item-${columnIndex + 1}-${itemIndex + 1}`),
    })),
    labelStyle: columnIndex === 0 ? "number" : "upperAlpha",
  }));
}

/**
 *
 * @param segments
 */
function createTextMarkerContent(segments = []) {
  const children = segments.map((segment) => ({
    ...(segment?.markerId ? { markerId: String(segment.markerId) } : {}),
    text: String(segment?.text || ""),
  }));
  const text = children.map((item) => item.text).join("");
  const html = `<p>${children
    .map((item) =>
      item.markerId
        ? `<span data-marker-id="${escapeHtml(item.markerId)}">${escapeHtml(item.text)}</span>`
        : escapeHtml(item.text),
    )
    .join("")}</p>`;
  return { text, html, json: [{ type: "paragraph", children }] };
}

/**
 *
 * @param template
 * @param blankIds
 */
function createWordBuilderContent(template, blankIds) {
  const source = String(template || "");
  const tokenPattern = /\{{(B[1-9]\d*)\}}/g;
  const children = [];
  let cursor = 0;
  for (const match of source.matchAll(tokenPattern)) {
    if (match.index > cursor)
      children.push({ text: source.slice(cursor, match.index) });
    children.push({
      blankId: match[1],
      children: [{ text: "" }],
      label: match[1],
      type: "blank",
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) children.push({ text: source.slice(cursor) });
  const knownIds = new Set(
    children
      .filter((item) => item.type === "blank")
      .map((item) => item.blankId),
  );
  for (const id of blankIds.filter((id) => !knownIds.has(id))) {
    children.push(
      { text: " " },
      { blankId: id, children: [{ text: "" }], label: id, type: "blank" },
    );
  }
  return {
    text: children
      .map((item) => (item.type === "blank" ? "____" : item.text))
      .join(""),
    html: `<p>${children
      .map((item) =>
        item.type === "blank"
          ? `<span data-rte-node="blank" data-blank-id="${item.blankId}" data-label="${item.label}"></span>`
          : escapeHtml(item.text),
      )
      .join("")}</p>`,
    json: [{ type: "paragraph", children }],
  };
}

/**
 *
 * @param question
 */
export function canUseQuestionPlatform(question) {
  return Boolean(QUESTION_PLATFORM_STRUCTURES[question?.type]);
}

/**
 *
 * @param question
 */
function fillAnswerPools(question) {
  const answers = Array.isArray(question.answer)
    ? question.answer
    : [question.answer];
  const acceptableAnswers = Array.isArray(question.acceptableAnswers)
    ? question.acceptableAnswers
    : [];
  return answers.map((answer, index) => {
    // 多空题的可接受答案按空位同序保存；单空继续兼容原有的一维数组。
    const alternatives =
      answers.length > 1 ? acceptableAnswers[index] : acceptableAnswers;
    const pools = Array.isArray(alternatives)
      ? alternatives
      : alternatives
        ? [alternatives]
        : [];
    return [
      ...new Set(
        [answer, ...pools].filter(
          (value) =>
            value !== undefined &&
            value !== null &&
            String(value).trim() !== "",
        ),
      ),
    ].map((value) => createSerializedRichContent(String(value)));
  });
}

/**
 *
 * @param rubric
 */
function shortAnswerRubricText(rubric) {
  return (Array.isArray(rubric) ? rubric : [])
    .map((item, index) => {
      const point = String(
        item?.point || item?.criterion || item?.description || "",
      ).trim();
      const score = Number(item?.points ?? item?.score);
      if (!point) return "";
      return `${index + 1}. ${point}${Number.isFinite(score) ? `（${score}分）` : ""}`;
    })
    .filter(Boolean)
    .join("\n");
}

/**
 *
 * @param questionTypeKey
 * @param elements
 * @param extras
 */
function serializedDraft(questionTypeKey, elements, extras = []) {
  return {
    questionTypeKey,
    id: null,
    version: "1",
    elements,
    extras,
    children: [],
  };
}

/**
 * 服务端在 AI 内容通过校验后固化题型骨架，发布和作答共用这一份序列化结构。
 * @param question
 */
export function toQuestionPlatformSerialized(question) {
  if (question?.type === "short_answer") {
    const questionTypeKey = TYPE_KEYS.short_answer;
    return serializedDraft(
      questionTypeKey,
      [
        {
          content: createSerializedRichContent(question.stem),
          type: "richText",
        },
        { type: "textResponse" },
      ],
      [
        {
          content: createSerializedRichContent(question.answer),
          type: "sampleAnswer",
        },
        {
          content: createSerializedRichContent(
            shortAnswerRubricText(question.rubric),
          ),
          type: "scoringRule",
        },
        {
          content: createSerializedRichContent(question.analysis),
          type: "solvingProcess",
        },
      ],
    );
  }
  if (question?.type === "judgement") {
    const questionTypeKey = TYPE_KEYS.judgement;
    const normalizedAnswer =
      typeof question.answer === "boolean"
        ? question.answer
        : ["true", "false"].includes(
              String(question.answer).trim().toLowerCase(),
            )
          ? String(question.answer).trim().toLowerCase() === "true"
          : null;
    return serializedDraft(questionTypeKey, [
      { content: createSerializedRichContent(question.stem), type: "richText" },
      {
        answers: normalizedAnswer === null ? [] : [normalizedAnswer],
        type: "judgement",
      },
    ]);
  }
  if (question?.type === "ordering") {
    const questionTypeKey = TYPE_KEYS.ordering;
    const answer = Array.isArray(question.answer) ? question.answer : [];
    const sourceOptions = question.options || [];
    const sourceOrder = sourceOptions.map((option) => option.id);
    const answerIsInitialOrder =
      sourceOrder.length === answer.length &&
      sourceOrder.every((id, index) => id === answer[index]);
    const presentationOptions =
      answerIsInitialOrder && sourceOptions.length > 1
        ? [...sourceOptions.slice(1), sourceOptions[0]]
        : sourceOptions;
    return serializedDraft(questionTypeKey, [
      { content: createSerializedRichContent(question.stem), type: "richText" },
      {
        answers: answer,
        sortOptions: presentationOptions.map((option) => ({
          content: createSerializedRichContent(option.text),
          id: option.id,
        })),
        type: "ordering",
      },
    ]);
  }
  if (question?.type === "classification") {
    const questionTypeKey = TYPE_KEYS.classification;
    return serializedDraft(questionTypeKey, [
      { content: createSerializedRichContent(question.stem), type: "richText" },
      {
        answers: question.answer || {},
        categories: (question.categories || []).map((category) => ({
          content: createSerializedRichContent(category.text),
          id: category.id,
        })),
        items: (question.items || []).map((item) => ({
          content: createSerializedRichContent(item.text),
          id: item.id,
        })),
        type: "classification",
      },
    ]);
  }
  if (["matching", "line_connect"].includes(question?.type)) {
    const questionTypeKey = TYPE_KEYS[question.type];
    const elementType =
      question.type === "matching" ? "matching" : "lineConnect";
    const answers =
      question.type === "matching"
        ? normalizeConnectionAnswers(
            question.answer,
            "leftItemId",
            "rightItemId",
          )
        : normalizeConnectionAnswers(question.answer, "fromItemId", "toItemId");
    return serializedDraft(questionTypeKey, [
      { content: createSerializedRichContent(question.stem), type: "richText" },
      {
        answers,
        columns: serializeConnectionColumns(question.columns),
        type: elementType,
      },
    ]);
  }
  if (question?.type === "text_marker") {
    const questionTypeKey = TYPE_KEYS.text_marker;
    const markers = (question.segments || [])
      .map((segment) => String(segment?.markerId || "").trim())
      .filter(Boolean);
    return serializedDraft(questionTypeKey, [
      { content: createSerializedRichContent(question.stem), type: "richText" },
      {
        answers: Array.isArray(question.answer) ? question.answer : [],
        content: createTextMarkerContent(question.segments),
        markers,
        type: "textMarker",
      },
    ]);
  }
  if (question?.type === "word_builder") {
    const questionTypeKey = TYPE_KEYS.word_builder;
    const answers =
      question.answer && typeof question.answer === "object"
        ? question.answer
        : {};
    const blanks = Object.keys(answers);
    return serializedDraft(questionTypeKey, [
      {
        answers,
        blanks,
        candidateOptions: question.candidateOptions || [],
        content: createWordBuilderContent(question.template, blanks),
        type: "wordBuilder",
      },
    ]);
  }
  if (!canUseQuestionPlatform(question)) return null;
  const questionTypeKey = TYPE_KEYS[question.type];
  const answerElement =
    question.type === "fill_blank"
      ? (() => {
          const answerPools = fillAnswerPools(question);
          const blanks = inlineBlankIdsFor(question);
          return {
            answers: blanks.map((blankId, index) => ({
              answerPools: answerPools[index],
              blankIds: [blankId],
            })),
            blanks,
            content: createInlineFillContent(question.stem, blanks),
            type: "inlineFill",
          };
        })()
      : {
          answers: {
            optionIds: Array.isArray(question.answer)
              ? question.answer
              : [question.answer],
          },
          columns: [
            { content: createSerializedRichContent("选项"), id: "column-1" },
          ],
          options: (question.options || []).map((option) => ({
            cells: [createSerializedRichContent(option.text)],
            id: option.id,
          })),
          type: "choice",
        };
  return serializedDraft(
    questionTypeKey,
    question.type === "fill_blank"
      ? [answerElement]
      : [
          {
            content: createSerializedRichContent(question.stem),
            type: "richText",
          },
          answerElement,
        ],
  );
}

/**
 *
 * @param questionType
 */
export function getQuestionPlatformTemplate(questionType) {
  const structure = QUESTION_PLATFORM_STRUCTURES[questionType];
  const questionTypeKey = TYPE_KEYS[questionType];
  return structure && questionTypeKey
    ? { label: TYPE_LABELS[questionType], questionTypeKey, structure }
    : null;
}
