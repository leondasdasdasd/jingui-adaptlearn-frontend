const DEFAULT_OPTION_IDS = ["A", "B", "C", "D"];
const OPTION_SEPARATORS = new Set([".", ":", "、", "．"]);

/**
 * @param {string} value 去除首尾空白后的单行选项。
 * @returns {number} 需要从行首移除的标记长度。
 */
function optionMarkerLength(value) {
  const candidateId = value.charAt(0);
  const separator = value.charAt(1);
  if (!/^[a-d]$/i.test(candidateId)) return 0;
  if (!separator) return 1;
  return separator.trim() === "" || OPTION_SEPARATORS.has(separator) ? 2 : 0;
}

/**
 * 将教师输入的逐行选项草稿转换为题目选项；只移除明确标记，避免误删英文首字母。
 * @param {string} text 教师输入的逐行选项草稿。
 * @returns {{ id: string, text: string }[]} 标准题目选项。
 */
export function parseQuestionOptionDraft(text) {
  return text
    .split("\n")
    .map((line, index) => {
      const trimmed = line.trim();
      const markerLength = optionMarkerLength(trimmed);
      const fallbackId = DEFAULT_OPTION_IDS.at(index) || String(index + 1);
      return {
        id: (markerLength > 0 ? trimmed.charAt(0) : fallbackId).toUpperCase(),
        text: markerLength > 0 ? trimmed.slice(markerLength).trim() : trimmed,
      };
    })
    .filter((item) => item.text)
    .slice(0, DEFAULT_OPTION_IDS.length);
}
