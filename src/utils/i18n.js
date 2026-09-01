import langMap from "../i18n";

const DATE_FORMAT = { year: "numeric", month: "short", day: "numeric" };
const TIME_FORMAT = { hour: "2-digit", minute: "2-digit", second: "2-digit" };

/**
 *
 * @param id
 * @param defaultTrans
 */
export function trans(id, defaultTrans) {
  let lang = locale(),
    translations = lang == "en" ? langMap.en : langMap.zhCN,
    replaceObject = arguments[2] || {},
    transLabel;

  if (isDebugMode()) {
    return id;
  }

  transLabel = (translations && translations[id]) || defaultTrans || id;

  transLabel = transLabel.replaceAll(/(\{\$(.*?)\})/g, function () {
    return replaceObject[arguments[2]] ?? "";
  });

  return transLabel;
}

/**
 *
 */
function locale() {
  const configuredLocale =
    typeof window === "undefined" ? undefined : window.globalLange;
  return (
    normalizeLocale(configuredLocale) ||
    normalizeLocale(getBrowserLang()) ||
    "en"
  );
}
/**
 *
 */
function getWindowLange() {
  const reg = new RegExp(
    "(^| )" + "evaluation-cookie-language" + "=([^;]*)(;|$)",
  );
  return reg.test(document.cookie) ? document.cookie.match(reg)[2] : "cn";
}
/**
 *
 * @param locale
 */
function normalizeLocale(locale) {
  const normalized = locale && locale.replaceAll("_", "-").toLowerCase();
  if (normalized?.startsWith("en")) return "en";
  if (normalized?.startsWith("zh")) return "zh-CN";
  return normalized;
}

/**
 *
 */
function getBrowserLang() {
  return typeof navigator === "undefined" ? undefined : navigator.language;
}

/**
 * 日期格式化
 * @param {number | Date} timestamp
 * @returns {string}
 */
export function formatDate(timestamp) {
  let dateFormatter = new Intl.DateTimeFormat(locale(), DATE_FORMAT);
  return dateFormatter.format(timestamp);
}

/**
 * 日期时间格式化
 * @param {number | Date} timestamp
 * @returns {string}
 */
export function formatDateTime(timestamp) {
  let { second, ...partTimeFormat } = TIME_FORMAT;
  let dateFormatter = new Intl.DateTimeFormat(locale(), {
    ...DATE_FORMAT,
    ...partTimeFormat,
  });
  return dateFormatter.format(timestamp);
}

/**
 * 完整日期时间格式化
 * @param {number | Date} timestamp
 * @returns {string}
 */
export function formatDateTimeFull(timestamp) {
  let dateFormatter = new Intl.DateTimeFormat(locale(), {
    ...DATE_FORMAT,
    ...TIME_FORMAT,
  });
  return dateFormatter.format(timestamp);
}

/**
 * 时间格式化
 * @param {number | Date} timestamp
 * @returns {string}
 */
export function formatTime(timestamp) {
  let dateFormatter = new Intl.DateTimeFormat(locale(), TIME_FORMAT);
  return dateFormatter.format(timestamp);
}

/**
 *
 */
function isDebugMode() {
  return (
    typeof window !== "undefined" &&
    window.location.search.includes("debug=true")
  );
}

export { locale };
