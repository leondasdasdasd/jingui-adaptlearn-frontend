import { trans } from "../../../utils/i18n";
import {
  CLASSROOM_LEARNING_MODE,
  resolveClassroomLearningMode,
} from "../../shared/domain/classroomLearningMode";

const MODE_PRESENTATIONS = Object.freeze([
  Object.freeze({
    id: CLASSROOM_LEARNING_MODE.NEW_LESSON,
    icon: "book-open",
    label: ["adaptiveLearning.learningMode.newLesson", "上新课"],
    summary: [
      "adaptiveLearning.learningMode.newLessonSummary",
      "不做前测，直接进入新知学习与随堂练习。",
    ],
    action: ["adaptiveLearning.directory.startNewLesson", "上新课"],
    actionKind: "new_lesson",
    steps: [
      ["adaptiveLearning.learningMode.step.learnNew", "学习新知"],
      ["adaptiveLearning.learningMode.step.practice", "随堂练习"],
      ["adaptiveLearning.learningMode.step.masteryCheck", "掌握检查"],
    ],
  }),
  Object.freeze({
    id: CLASSROOM_LEARNING_MODE.FOUNDATION,
    icon: "layers",
    label: ["adaptiveLearning.learningMode.foundation", "打基础"],
    summary: [
      "adaptiveLearning.learningMode.foundationSummary",
      "先做前测，再按认知层级逐层学习并解锁。",
    ],
    action: ["adaptiveLearning.learningMode.startFoundation", "开始课前测"],
    actionKind: "assessment_first",
    steps: [
      ["adaptiveLearning.learningMode.step.preAssessment", "课前测"],
      ["adaptiveLearning.learningMode.step.layeredLearning", "逐层学习"],
      ["adaptiveLearning.learningMode.step.unlock", "解锁进阶"],
    ],
  }),
  Object.freeze({
    id: CLASSROOM_LEARNING_MODE.REMEDIATION,
    icon: "scan-search",
    label: ["adaptiveLearning.learningMode.remediation", "查缺补漏"],
    summary: [
      "adaptiveLearning.learningMode.remediationSummary",
      "先做单元测试，再逐个学习和练习薄弱知识点。",
    ],
    action: [
      "adaptiveLearning.learningMode.startUnitAssessment",
      "开始单元测试",
    ],
    actionKind: "unit_assessment",
    steps: [
      ["adaptiveLearning.learningMode.step.unitAssessment", "单元测试"],
      ["adaptiveLearning.learningMode.step.locateWeaknesses", "定位薄弱点"],
      ["adaptiveLearning.learningMode.step.targetedLearning", "逐点学习练习"],
    ],
  }),
]);

/**
 *
 * @param mode
 */
/**
 * @param {object} mode 未本地化的展示配置。
 * @returns {object} 当前语言的学生模式展示模型。
 */
function localizeMode(mode) {
  return {
    id: mode.id,
    icon: mode.icon,
    label: trans(...mode.label),
    summary: trans(...mode.summary),
    actionLabel: trans(...mode.action),
    actionKind: mode.actionKind,
    steps: mode.steps.map((copy) => trans(...copy)),
  };
}

/** @returns {object[]} 三种学生学习模式的展示模型。 */
export function studentLearningModeOptions() {
  return MODE_PRESENTATIONS.map((mode) => localizeMode(mode));
}

/**
 * @param {string} modeId 当前模式。
 * @returns {object} 规范化并本地化后的展示模型。
 */
export function resolveStudentLearningModePresentation(modeId) {
  const resolvedId = resolveClassroomLearningMode(modeId);
  return localizeMode(
    MODE_PRESENTATIONS.find((mode) => mode.id === resolvedId) ||
      MODE_PRESENTATIONS[0],
  );
}
