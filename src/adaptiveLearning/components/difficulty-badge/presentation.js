import { trans } from "../../../utils/i18n";
import { normalizeDifficulty } from "../../lib/adaptiveDifficulty";

const difficultyClassNames = Object.freeze({
  D1: "basic",
  D2: "basic",
  D3: "standard",
  D4: "advanced",
  D5: "advanced",
});

/**
 * 返回标准难度等级的本地化名称。
 * @param {string | number} difficulty 原始难度
 * @returns {string} 难度等级名称
 */
export function localizedDifficultyLabel(difficulty) {
  const level = normalizeDifficulty(difficulty);
  return trans(`adaptiveLearning.difficulty.level.${level}`);
}

/**
 * 返回难度标签的视觉等级，不向业务层暴露 CSS 约定。
 * @param {string | number} difficulty 原始难度
 * @returns {string} 标签样式等级
 */
export function difficultyBadgeClassName(difficulty) {
  return difficultyClassNames[normalizeDifficulty(difficulty)];
}

/**
 * 返回标签形态的完整难度文案。
 * @param {string | number} difficulty 原始难度
 * @returns {string} 难度标签
 */
export function difficultyBadgeTagText(difficulty) {
  return trans("adaptiveLearning.difficulty.tag", undefined, {
    label: localizedDifficultyLabel(difficulty),
  });
}

/**
 * 返回星级难度的可访问性文案。
 * @param {number} count 星级数量
 * @returns {{ariaLabel: string, title: string}} 星级文案
 */
export function difficultyStarsCopy(count) {
  return {
    ariaLabel: trans("adaptiveLearning.difficulty.starsAria", undefined, {
      count,
    }),
    title: trans("adaptiveLearning.difficulty.starsTitle", undefined, {
      count,
    }),
  };
}
