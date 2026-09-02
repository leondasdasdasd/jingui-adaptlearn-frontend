import zhCN from "../i18n/zh-CN.js";

export function t(key, defaultVal = "") {
  return zhCN[key] || defaultVal || key;
}

export function trans(key, defaultVal = "") {
  return zhCN[key] || defaultVal || key;
}

export default { t, trans };
