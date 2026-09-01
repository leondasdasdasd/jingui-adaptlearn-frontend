const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

/**
 *
 * @param value
 */
function canonicalMathAnswerSyntax(value) {
  let source = String(value ?? "")
    .trim()
    .replaceAll("−", "-")
    .replaceAll("＋", "+")
    .replaceAll("－", "-")
    .replaceAll(/\\(?:left|right)\s*/g, "")
    .replaceAll(/\\(?:dfrac|tfrac)/g, "\\frac")
    .replaceAll(/\\pm\b/g, "±");
  const wrappers = [
    [/^\$\$([\s\S]*)\$\$$/, 1],
    [/^\$([\s\S]*)\$$/, 1],
    [/^\\\(([\s\S]*)\\\)$/, 1],
    [/^\\\[([\s\S]*)\\\]$/, 1],
  ];
  for (const [pattern, group] of wrappers) {
    const match = source.match(pattern);
    if (match) {
      source = match[group].trim();
      break;
    }
  }
  return source;
}

/**
 *
 * @param value
 */
export function normalizeAnswerText(value) {
  return canonicalMathAnswerSyntax(value)
    .replaceAll(/\s+/g, "")
    .replaceAll(/[。，；]/g, "")
    .toLowerCase();
}

// The question editor may return the persisted option id (A/B/C), while an
// older player/runtime can return an ordinal id such as option-2 or the
// rendered option text.  Normalize all of those representations at the
// evidence boundary so a correct multi-select answer is not scored as 0 just
// because it crossed a serialization adapter.
/**
 *
 * @param question
 * @param value
 */
function normalizeChoiceId(question, value) {
  const raw = normalizeAnswerText(value);
  const options = Array.isArray(question?.options) ? question.options : [];
  const direct = options.find(
    (option) => normalizeAnswerText(option?.id) === raw,
  );
  if (direct) return normalizeAnswerText(direct.id);
  const byText = options.find((option) => {
    const text = normalizeAnswerText(option?.text);
    const withoutMarker = text.replace(/^[a-e][).:、]?/, "");
    return text === raw || withoutMarker === raw;
  });
  if (byText) return normalizeAnswerText(byText.id);
  const ordinal = raw.match(/(?:option|choice|item|answer)[_-]?(\d+)$/);
  if (ordinal) {
    const option = options[Number(ordinal[1]) - 1];
    if (option?.id) return normalizeAnswerText(option.id);
  }
  return raw;
}

/**
 *
 * @param value
 */
function choiceValues(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return String(value)
    .split(/[\s,;、，；]+/)
    .filter(Boolean);
}

/**
 *
 * @param value
 */
function numericValue(value) {
  const source = canonicalMathAnswerSyntax(value)
    .replaceAll("，", ",")
    .replaceAll(/\s+/g, "");
  if (!source) return null;
  const percentage = source.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))%$/);
  if (percentage) return Number(percentage[1]) / 100;
  const fraction = source.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (fraction && Number(fraction[2]) !== 0)
    return Number(fraction[1]) / Number(fraction[2]);
  const normalized = source.replaceAll(",", "");
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 *
 * @param question
 * @param expected
 * @param submitted
 */
function numericAnswerMatches(question, expected, submitted) {
  const left = numericValue(expected);
  const right = numericValue(submitted);
  if (left === null || right === null) return false;
  const policy = question.numericPolicy || {};
  if (policy.toleranceType === "absolute") {
    return Math.abs(left - right) <= Math.max(0, Number(policy.tolerance) || 0);
  }
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= Number.EPSILON * scale * 8;
}

/**
 *
 * @param value
 */
function signedNumericToken(value) {
  const source = canonicalMathAnswerSyntax(value).replaceAll(/\s+/g, "");
  const match = source.match(/^([+±\-]?)(?:(\d+(?:\.\d+)?)|(\.\d+))$/);
  if (!match) return null;
  const magnitude = Math.abs(Number(`${match[2] || ""}${match[3] || ""}`));
  if (!Number.isFinite(magnitude)) return null;
  return {
    magnitude,
    sign:
      match[1] === "-" ? "negative" : match[1] === "±" ? "both" : "positive",
  };
}

/**
 *
 * @param answerPool
 */
function explicitSignGroupMagnitudes(answerPool) {
  const magnitudes = new Set();
  const separateTokens = [];
  const groupByMagnitude = (tokens) =>
    tokens.reduce((groups, token) => {
      const items = groups.get(token.magnitude) || [];
      items.push(token);
      groups.set(token.magnitude, items);
      return groups;
    }, new Map());
  for (const entry of answerPool.flat(Number.POSITIVE_INFINITY)) {
    const raw = String(entry ?? "").trim();
    if (!raw) continue;
    const tokens = raw
      .split(/[,;、，；]+/)
      .map(signedNumericToken)
      .filter(Boolean);
    for (const token of tokens) {
      separateTokens.push(token);
      if (token.sign === "both") magnitudes.add(token.magnitude);
    }
    if (tokens.length > 1) {
      const byMagnitude = groupByMagnitude(tokens);
      for (const [magnitude, items] of byMagnitude.entries()) {
        const signs = new Set(items.map((item) => item.sign));
        if (
          signs.has("both") ||
          (signs.has("positive") && signs.has("negative"))
        )
          magnitudes.add(magnitude);
      }
    }
  }
  const byMagnitude = groupByMagnitude(separateTokens);
  for (const [magnitude, items] of byMagnitude.entries()) {
    const signs = new Set(items.map((item) => item.sign));
    if (signs.has("both") || (signs.has("positive") && signs.has("negative")))
      magnitudes.add(magnitude);
  }
  return magnitudes;
}

/**
 *
 * @param answerPool
 * @param submitted
 */
function explicitSignGroupMatches(answerPool, submitted) {
  const token = signedNumericToken(submitted);
  return Boolean(
    token && explicitSignGroupMagnitudes(answerPool).has(token.magnitude),
  );
}

/**
 *
 * @param question
 * @param index
 * @param multiple
 */
function acceptableAnswersForBlank(question, index, multiple) {
  const acceptable = Array.isArray(question.acceptableAnswers)
    ? question.acceptableAnswers
    : [];
  if (!multiple) return acceptable;
  return Array.isArray(acceptable[index]) ? acceptable[index] : [];
}

/**
 *
 * @param value
 */
function normalizedObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      normalizeAnswerText(key),
      normalizeAnswerText(item),
    ]),
  );
}

/**
 *
 * @param value
 * @param fromKey
 * @param toKey
 */
function connectionEdges(value, fromKey, toKey) {
  if (Array.isArray(value)) {
    return value
      .map(
        (edge) =>
          `${normalizeAnswerText(edge?.[fromKey])}->${normalizeAnswerText(edge?.[toKey])}`,
      )
      .filter((edge) => !edge.startsWith("->") && !edge.endsWith("->"));
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([from, targets]) =>
    (Array.isArray(targets) ? targets : []).map(
      (to) => `${normalizeAnswerText(from)}->${normalizeAnswerText(to)}`,
    ),
  );
}

/**
 *
 * @param expectedValues
 * @param actualValues
 */
function setScore(expectedValues, actualValues) {
  const expected = new Set(
    expectedValues.map(normalizeAnswerText).filter(Boolean),
  );
  const actual = new Set(actualValues.map(normalizeAnswerText).filter(Boolean));
  if (expected.size === 0) return 0;
  const correct = [...actual].filter((value) => expected.has(value)).length;
  const incorrect = [...actual].filter((value) => !expected.has(value)).length;
  return clamp01((correct - incorrect) / expected.size);
}

/**
 *
 * @param question
 * @param submitted
 */
export function objectiveScoreRatio(question, submitted) {
  if (question.type === "classification") {
    const expected = normalizedObject(question.answer);
    const actual = normalizedObject(submitted);
    const ids = Object.keys(expected);
    if (ids.length === 0) return 0;
    return ids.filter((id) => actual[id] === expected[id]).length / ids.length;
  }
  if (question.type === "matching") {
    return setScore(
      connectionEdges(question.answer, "leftItemId", "rightItemId"),
      connectionEdges(submitted, "leftItemId", "rightItemId"),
    );
  }
  if (question.type === "line_connect") {
    return setScore(
      connectionEdges(question.answer, "fromItemId", "toItemId"),
      connectionEdges(submitted, "fromItemId", "toItemId"),
    );
  }
  if (question.type === "text_marker") {
    return setScore(
      Array.isArray(question.answer) ? question.answer : [],
      Array.isArray(submitted) ? submitted : [],
    );
  }
  if (question.type === "word_builder") {
    const expected = normalizedObject(question.answer);
    const actual = normalizedObject(submitted);
    const ids = Object.keys(expected);
    if (ids.length === 0) return 0;
    return ids.filter((id) => actual[id] === expected[id]).length / ids.length;
  }
  if (question.type === "ordering") {
    const expected = Array.isArray(question.answer)
      ? question.answer.map(normalizeAnswerText)
      : [];
    const actual = Array.isArray(submitted)
      ? submitted.map(normalizeAnswerText)
      : [];
    if (expected.length === 0 || actual.length !== expected.length) return 0;
    return expected.every((value, index) => actual[index] === value) ? 1 : 0;
  }
  if (question.type === "judgement") {
    return normalizeAnswerText(submitted) ===
      normalizeAnswerText(question.answer)
      ? 1
      : 0;
  }
  if (question.type === "multiple_choice") {
    const expected = new Set(
      choiceValues(question.answer).map((value) =>
        normalizeChoiceId(question, value),
      ),
    );
    const actual = new Set(
      choiceValues(submitted).map((value) =>
        normalizeChoiceId(question, value),
      ),
    );
    if (expected.size === 0) return 0;
    if (actual.size !== expected.size) return 0;
    return [...expected].every((value) => actual.has(value)) ? 1 : 0;
  }
  if (question.type === "single_choice") {
    return normalizeChoiceId(question, submitted) ===
      normalizeChoiceId(question, question.answer)
      ? 1
      : 0;
  }
  if (question.type === "fill_blank" && question.answerKind === "numeric") {
    const expected = Array.isArray(question.answer)
      ? question.answer
      : [question.answer];
    const actual = Array.isArray(submitted) ? submitted : [submitted];
    if (expected.length === 0 || actual.length !== expected.length) return 0;
    const multiple = Array.isArray(question.answer);
    const correctCount = expected.filter((answer, index) => {
      const answerPool = [
        answer,
        ...acceptableAnswersForBlank(question, index, multiple),
      ];
      return (
        explicitSignGroupMatches(answerPool, actual[index]) ||
        answerPool.some((candidate) =>
          numericAnswerMatches(question, candidate, actual[index]),
        )
      );
    }).length;
    return correctCount / expected.length;
  }
  if (question.type === "fill_blank" && Array.isArray(question.answer)) {
    const expected = question.answer;
    const actual = Array.isArray(submitted) ? submitted : [];
    if (actual.length !== expected.length) return 0;
    const acceptedByBlank = Array.isArray(question.acceptableAnswers)
      ? question.acceptableAnswers
      : [];
    const correctCount = expected.filter((answer, index) => {
      const answerPool = [
        answer,
        ...(Array.isArray(acceptedByBlank[index])
          ? acceptedByBlank[index]
          : []),
      ];
      if (explicitSignGroupMatches(answerPool, actual[index])) return true;
      const acceptable = answerPool.map(normalizeAnswerText);
      return acceptable.includes(normalizeAnswerText(actual[index]));
    }).length;
    return correctCount / expected.length;
  }
  const answerPool = [question.answer, ...(question.acceptableAnswers || [])];
  if (
    question.type === "fill_blank" &&
    explicitSignGroupMatches(answerPool, submitted)
  )
    return 1;
  const acceptable = answerPool.map(normalizeAnswerText);
  return acceptable.includes(normalizeAnswerText(submitted)) ? 1 : 0;
}

/**
 *
 * @param question
 */
export function knowledgeEvidenceProfile(question = {}) {
  const ids = question.knowledgePointIds?.length
    ? question.knowledgePointIds
    : question.knowledgeObjectiveIds || [];
  if (ids.length === 0)
    return { primaryKnowledgePointId: "", knowledgePointWeights: {} };
  const supplied = question.knowledgePointWeights || {};
  const primaryKnowledgePointId = ids.includes(question.primaryKnowledgePointId)
    ? question.primaryKnowledgePointId
    : [...ids].sort(
        (a, b) => Number(supplied[b] || 0) - Number(supplied[a] || 0),
      )[0];
  return {
    primaryKnowledgePointId,
    knowledgePointWeights: Object.fromEntries(
      ids.map((id) => [
        id,
        id === primaryKnowledgePointId
          ? 1
          : Math.min(0.3, Math.max(0.05, Number(supplied[id] || 0.3))),
      ]),
    ),
  };
}
