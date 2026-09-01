// Learning completion has one mastery line. Evidence gates may still require
// additional stable answers before a 90% estimate is settled.
export const MASTERY_THRESHOLD = 90;
export const MASTERY_THRESHOLD_RATIO = MASTERY_THRESHOLD / 100;

/**
 *
 * @param value
 */
export function isMasteredValue(value) {
  return Number.isFinite(Number(value)) && Number(value) >= MASTERY_THRESHOLD;
}

/**
 *
 * @param value
 */
export function masteryStatus(value) {
  if (!Number.isFinite(Number(value))) return "待检测";
  if (isMasteredValue(value)) return "已掌握";
  return "需要巩固";
}
