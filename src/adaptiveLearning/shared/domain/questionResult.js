/**
 * 将题目得分率归一为稳定结果状态，供不同展示面复用。
 * @param {number | string | null | undefined} scoreRatio 0 到 1 的得分率
 * @returns {"pending" | "correct" | "partial" | "incorrect"} 题目结果状态
 */
export function questionResultState(scoreRatio) {
  if (scoreRatio == null || scoreRatio === "") return "pending";
  const ratio = Number(scoreRatio);
  if (!Number.isFinite(ratio)) return "pending";
  if (ratio >= 0.999) return "correct";
  if (ratio <= 0) return "incorrect";
  return "partial";
}
