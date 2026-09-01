/* eslint-disable complexity -- 保留既有题型答案展示与练习门禁规则。 */

import { MASTERY_THRESHOLD } from "../../shared/domain/masteryPolicy.js";

export const EMPTY_MASTERY = {};
export const QUIZ_DRAFT_CONTRACT_VERSION = 10;
export const QUESTION_IDLE_SUPPORT_SECONDS = 120;

/**
 * 公式模式只作用于用户明确选中的空格，其余空格始终回落为普通文本输入。
 * @param {string[] | undefined} inputModes 当前题目的输入模式
 * @param {number} selectedIndex 用户当前选中的空格索引
 * @returns {string[]} 下一份输入模式
 */
export function createFormulaInputModes(inputModes = [], selectedIndex) {
  return Array.from(
    { length: Math.max(inputModes.length, selectedIndex + 1) },
    (_, index) =>
      index === selectedIndex ? "formula" : inputModes[index] || "text",
  );
}

/**
 *
 * @param question
 */
export function emptyAnswerForQuestion(question) {
  if (["multiple_choice", "ordering", "text_marker"].includes(question?.type))
    return [];
  if (
    ["classification", "matching", "line_connect", "word_builder"].includes(
      question?.type,
    )
  )
    return {};
  return "";
}

/**
 *
 * @param value
 */
export function structuredAnswerCount(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.values(value).reduce(
    (count, item) =>
      count +
      (Array.isArray(item) ? item.length : String(item || "").trim() ? 1 : 0),
    0,
  );
}

/**
 *
 * @param mastery
 */
export function masteryBaselineSignature(mastery = {}) {
  return JSON.stringify(
    Object.entries(mastery)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, item]) => [
        id,
        Number.isFinite(Number(item?.mastery)) ? Number(item.mastery) : null,
        Number.isFinite(Number(item?.confidence))
          ? Number(item.confidence)
          : null,
        Number.isFinite(Number(item?.correctStreak))
          ? Number(item.correctStreak)
          : null,
        Number.isFinite(Number(item?.evidenceCount))
          ? Number(item.evidenceCount)
          : null,
      ]),
  );
}

/**
 *
 * @param questionCount
 */
export function compositeReviewOutcome(questionCount) {
  return {
    status: "completed",
    title: "综合复习已完成",
    message: `已完成本轮 ${questionCount} 道综合题，接下来查看各知识点的最终掌握度与置信度。`,
  };
}

/**
 *
 * @param question
 * @param grading
 */
export function displayCorrectAnswer(question, grading) {
  const answer = grading?.correctAnswer;
  const contentById = Object.fromEntries(
    [
      ...(question.categories || []),
      ...(question.items || []),
      ...(question.columns || []).flatMap((column) => column.items || []),
      ...(question.segments || []).filter((segment) => segment.markerId),
    ].map((item) => [
      String(item.id || item.markerId),
      String(item.text || ""),
    ]),
  );
  if (answer && typeof answer === "object" && !Array.isArray(answer)) {
    return (
      Object.entries(answer)
        .map(([from, to]) => {
          const targets = Array.isArray(to) ? to : [to];
          return `${contentById[from] || from} → ${targets.map((id) => contentById[id] || id).join("、")}`;
        })
        .join("；") || "暂无参考答案"
    );
  }
  if (
    Array.isArray(answer) &&
    answer.some((item) => item && typeof item === "object")
  ) {
    return (
      answer
        .map((edge) => {
          const from = edge.leftItemId || edge.fromItemId || "";
          const to = edge.rightItemId || edge.toItemId || "";
          return `${contentById[from] || from} → ${contentById[to] || to}`;
        })
        .filter((item) => item !== " → ")
        .join("；") || "暂无参考答案"
    );
  }
  const values = Array.isArray(answer) ? answer : [answer];
  const optionById = Object.fromEntries(
    (question.options || []).map((option) => [
      typeof option === "string" ? option : option.id,
      typeof option === "string" ? option : option.text,
    ]),
  );
  return (
    values
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map((value) => optionById[value] || contentById[value] || value)
      .join("、") || "暂无参考答案"
  );
}

/**
 *
 * @param decision
 */
export function practiceGateOutcome(decision) {
  const answered = Number(decision?.answered || 0);
  const minimum = 3;
  const target = Number(decision?.targetMastery || MASTERY_THRESHOLD);
  const streak = Number(decision?.correctStreak || 0);
  if (!decision || decision.status === "continue") {
    if (!decision?.minimumQuestionsMet) {
      return {
        ...decision,
        status: "continue",
        title: "继续练习",
        message: `本轮已完成 ${answered}/${minimum} 题，至少完成 ${minimum} 题后才会检查退出条件。`,
      };
    }
    if (!decision.targetMasteryReached) {
      return {
        ...decision,
        status: "continue",
        title: "继续练习",
        message: `当前掌握度还未达到 ${target}%，先继续积累有效证据。最近连续达标 ${streak}/2 题。`,
      };
    }
    return {
      ...decision,
      status: "continue",
      title: "掌握度已达到，继续确认稳定性",
      message: `当前掌握度已达到 ${target}%，还需要连续达标 ${Math.max(0, 2 - streak)} 题。`,
    };
  }
  if (
    decision.status === "mastered" &&
    decision.completionReason === "QUESTION_LIMIT_REACHED_AT_TARGET_UNSTABLE"
  ) {
    return {
      ...decision,
      title: "达到掌握线，但证据还不稳定",
      message: `本轮已完成 ${answered} 题，掌握度达到 ${target}%，但连续达标不足2题；已到达本轮上限，建议后续继续巩固。`,
    };
  }
  if (decision.status === "mastered") {
    return {
      ...decision,
      title: "学得不错，可以继续",
      message: `已完成至少 ${minimum} 题，掌握度达到 ${target}%，并连续达标 ${Math.max(2, streak)} 题。`,
    };
  }
  if (
    decision.status === "needs_support" &&
    decision.completionReason === "QUESTION_LIMIT_REACHED"
  ) {
    return {
      ...decision,
      title: "本轮先练到这里",
      message: `本轮已完成 ${answered} 题，但掌握度仍未达到 ${target}%；建议二次学习后用新题继续验证。`,
    };
  }
  return decision;
}
