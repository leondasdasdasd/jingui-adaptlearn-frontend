/**
 * QuestionPlayer 只接受完整 BCP 47 locale，平台通用 i18n 则会返回短码 en。
 * @param {string} applicationLocale 应用当前语言。
 * @returns {"en-US" | "zh-CN"} 题目播放器支持的语言。
 */
export function questionPlayerLocale(applicationLocale) {
  return String(applicationLocale || "")
    .toLowerCase()
    .startsWith("en")
    ? "en-US"
    : "zh-CN";
}
