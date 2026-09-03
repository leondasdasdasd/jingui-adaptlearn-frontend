export const mathDelimiters = [
  { left: "$$", right: "$$", display: true },
  { left: "\\[", right: "\\]", display: true },
  { left: "\\(", right: "\\)", display: false },
  { left: "$", right: "$", display: false },
];

const bareMathCommands = {
  frac: { bracedArguments: 2 },
  dfrac: { bracedArguments: 2 },
  tfrac: { bracedArguments: 2 },
  sqrt: { bracedArguments: 1, optionalBracketArgument: true },
};

const structuralMathEnvironments = [
  "matrix",
  "pmatrix",
  "bmatrix",
  "Bmatrix",
  "vmatrix",
  "Vmatrix",
  "array",
  "cases",
  "aligned",
  "gathered",
];
const structuralMathEnvironmentPattern = structuralMathEnvironments.join("|");
const structuralMathPattern = new RegExp(
  `\\\\(?:frac|binom)\\b|\\\\begin\\s*\\{(?:${structuralMathEnvironmentPattern})\\}`,
);
const explicitMathStylePattern =
  /\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle|dfrac|tfrac|cfrac)\b/;

/**
 *
 * @param text
 * @param index
 */
function closingDelimiterAt(text, index) {
  if (text.startsWith("$$", index)) return "$$";
  if (text.startsWith("\\[", index)) return "\\]";
  if (text.startsWith("\\(", index)) return "\\)";
  if (text[index] === "$") return "$";
  return null;
}

/**
 *
 * @param text
 * @param index
 * @param opening
 * @param closing
 */
function consumeBalanced(text, index, opening, closing) {
  if (text[index] !== opening) return -1;
  let depth = 0;
  for (let cursor = index; cursor < text.length; cursor += 1) {
    if (text[cursor] === opening) depth += 1;
    if (text[cursor] === closing) depth -= 1;
    if (depth === 0) return cursor + 1;
  }
  return -1;
}

/**
 *
 * @param text
 * @param index
 */
function skipWhitespace(text, index) {
  let cursor = index;
  while (/\s/.test(text[cursor] || "")) cursor += 1;
  return cursor;
}

/**
 *
 * @param text
 * @param index
 */
function bareMathEnd(text, index) {
  const environmentMatch = text
    .slice(index)
    .match(
      new RegExp(`^\\\\begin\\s*\\{(${structuralMathEnvironmentPattern})\\}`),
    );
  if (environmentMatch) {
    const environmentEnd = new RegExp(
      `\\\\end\\s*\\{${environmentMatch[1]}\\}`,
    );
    const closingMatch = text
      .slice(index + environmentMatch[0].length)
      .match(environmentEnd);
    if (!closingMatch || closingMatch.index == null) return -1;
    return (
      index +
      environmentMatch[0].length +
      closingMatch.index +
      closingMatch[0].length
    );
  }

  const commandMatch = text.slice(index).match(/^\\(dfrac|tfrac|frac|sqrt)\b/);
  if (!commandMatch) return -1;

  const command = bareMathCommands[commandMatch[1]];
  let cursor = index + commandMatch[0].length;
  cursor = skipWhitespace(text, cursor);

  if (command.optionalBracketArgument && text[cursor] === "[") {
    cursor = consumeBalanced(text, cursor, "[", "]");
    if (cursor < 0) return -1;
    cursor = skipWhitespace(text, cursor);
  }

  for (let argument = 0; argument < command.bracedArguments; argument += 1) {
    cursor = consumeBalanced(text, cursor, "{", "}");
    if (cursor < 0) return -1;
    if (argument < command.bracedArguments - 1)
      cursor = skipWhitespace(text, cursor);
  }
  return cursor;
}

/**
 * 兼容历史生成内容中未带定界符的常见 LaTeX 命令。
 * 已经使用 $...$、\\(...\\) 或 \\[...\\] 包裹的内容保持不变。
 * @param value
 */
export function normalizeBareMath(value) {
  const text = String(value ?? "");
  if (
    !/\\(?:dfrac|tfrac|frac|sqrt)\b/.test(text) &&
    !new RegExp(
      `\\\\begin\\s*\\{(?:${structuralMathEnvironmentPattern})\\}`,
    ).test(text)
  )
    return text;

  let normalized = "";
  let cursor = 0;
  while (cursor < text.length) {
    const closingDelimiter = closingDelimiterAt(text, cursor);
    if (closingDelimiter) {
      const openingLength = text.startsWith("$$", cursor)
        ? 2
        : text.startsWith("\\[", cursor) || text.startsWith("\\(", cursor)
          ? 2
          : 1;
      const closeAt = text.indexOf(closingDelimiter, cursor + openingLength);
      if (closeAt >= 0) {
        const closeEnd = closeAt + closingDelimiter.length;
        normalized += text.slice(cursor, closeEnd);
        cursor = closeEnd;
        continue;
      }
    }

    const mathEnd = bareMathEnd(text, cursor);
    if (mathEnd >= 0) {
      normalized += `\\(${text.slice(cursor, mathEnd).trimEnd()}\\)`;
      cursor = mathEnd;
      continue;
    }

    normalized += text[cursor];
    cursor += 1;
  }
  return normalized;
}

/**
 *
 * @param text
 * @param index
 */
function mathDelimiterAt(text, index) {
  if (text.startsWith("$$", index))
    return { left: "$$", right: "$$", display: true };
  if (text.startsWith("\\[", index))
    return { left: "\\[", right: "\\]", display: true };
  if (text.startsWith("\\(", index))
    return { left: "\\(", right: "\\)", display: false };
  if (text[index] === "$" && text[index - 1] !== "\\")
    return { left: "$", right: "$", display: false };
  return null;
}

/**
 *
 * @param expression
 */
function needsDisplayStyle(expression) {
  return (
    structuralMathPattern.test(expression) &&
    !explicitMathStylePattern.test(expression)
  );
}

/**
 * 上下结构在行内公式中使用 displaystyle，避免分子、分母和多行结构过小。
 * 保留行内定界符，不把公式拆成独立块；显式样式命令优先。
 * @param value
 */
export function normalizeMathForRendering(value) {
  const text = normalizeBareMath(value);
  if (!structuralMathPattern.test(text)) return text;

  let normalized = "";
  let cursor = 0;
  while (cursor < text.length) {
    const delimiter = mathDelimiterAt(text, cursor);
    if (!delimiter) {
      normalized += text[cursor];
      cursor += 1;
      continue;
    }

    const expressionStart = cursor + delimiter.left.length;
    const closeAt = text.indexOf(delimiter.right, expressionStart);
    if (closeAt < 0) {
      normalized += text[cursor];
      cursor += 1;
      continue;
    }

    const expression = text.slice(expressionStart, closeAt);
    const renderedExpression =
      !delimiter.display && needsDisplayStyle(expression)
        ? `\\displaystyle ${expression}`
        : expression;
    normalized += `${delimiter.left}${renderedExpression}${delimiter.right}`;
    cursor = closeAt + delimiter.right.length;
  }
  return normalized;
}

/**
 *
 * @param value
 */
export function hasSupportedMath(value) {
  const text = normalizeMathForRendering(value);
  return (
    /(^|[^\\])\$\$[\s\S]+?\$\$/.test(text) ||
    /(^|[^\\])\\\[[\s\S]+?\\\]/.test(text) ||
    /(^|[^\\])\\\([\s\S]+?\\\)/.test(text) ||
    /(^|[^\\])\$(?!\$)[^\n$]+\$(?!\$)/.test(text)
  );
}
