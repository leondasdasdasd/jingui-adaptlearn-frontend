export const MASTERY_THRESHOLD = 0.8;

export function isMasteredValue(val) {
  return typeof val === "number" ? val >= MASTERY_THRESHOLD : false;
}
