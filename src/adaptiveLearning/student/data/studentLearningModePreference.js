import {
  CLASSROOM_LEARNING_MODE,
  DEFAULT_CLASSROOM_LEARNING_MODE,
  resolveClassroomLearningMode,
} from "../../shared/domain/classroomLearningMode";
import { storageKeys } from "../../shared/contracts/storageKeys";

const STORAGE_KEY = storageKeys.studentLearningMode || "adaptive-student-learning-mode-v1";

/**
 * 读取学生选择的默认/最近学习模式
 * @returns {string} 学习模式 ID
 */
export function readPreferredLearningMode() {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    return resolveClassroomLearningMode(raw);
  } catch {
    return DEFAULT_CLASSROOM_LEARNING_MODE;
  }
}

/**
 * 保存学生选择的学习模式
 * @param {string} mode 学习模式 ID
 */
export function savePreferredLearningMode(mode) {
  const resolved = resolveClassroomLearningMode(mode);
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, resolved);
    }
  } catch {
    // 忽略私密浏览存储受限
  }
  return resolved;
}
