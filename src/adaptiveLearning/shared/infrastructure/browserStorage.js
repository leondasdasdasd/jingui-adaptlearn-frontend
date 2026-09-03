/**
 *
 * @param key
 * @param fallback
 */
export function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 *
 * @param key
 * @param value
 */
export function writeJson(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (error?.name === "QuotaExceededError") return false;
    throw error;
  }
}

/**
 *
 * @param key
 */
export function removeStoredValue(key) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

/**
 *
 * @param prefix
 */
export function removeStoredValuesByPrefix(prefix) {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(window.localStorage).filter((key) =>
    key.startsWith(prefix),
  ))
    window.localStorage.removeItem(key);
}

/**
 *
 * @param key
 * @param fallback
 */
export function readSessionValue(key, fallback = "") {
  if (typeof window === "undefined") return fallback;
  try {
    return window.sessionStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 *
 * @param key
 * @param value
 */
export function writeSessionValue(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    if (error?.name === "QuotaExceededError") return false;
    throw error;
  }
}

/**
 *
 * @param key
 */
export function removeSessionValue(key) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}

/**
 *
 * @param name
 * @param detail
 */
export function emitClientEvent(name, detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
