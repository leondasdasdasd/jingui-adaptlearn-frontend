import { storageKeys } from "../../shared/contracts/storageKeys.js";
import {
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";

/**
 *
 */
export function readAutoSpeechPreference() {
  return readJson(storageKeys.autoSpeech, false) === true;
}

/**
 *
 * @param enabled
 */
export function writeAutoSpeechPreference(enabled) {
  writeJson(storageKeys.autoSpeech, Boolean(enabled));
}

/**
 * 课程选择属于学生端展示偏好，统一由偏好仓储隔离浏览器存储细节。
 */
export function readSelectedCoursePreference() {
  return readJson(storageKeys.selectedCourse, "");
}

/**
 *
 * @param courseId
 */
export function writeSelectedCoursePreference(courseId) {
  writeJson(storageKeys.selectedCourse, String(courseId || ""));
}
