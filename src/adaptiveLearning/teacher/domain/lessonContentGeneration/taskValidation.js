import { LESSON_GENERATION_MODULE_KIND } from "./modules.js";
import {
  validateClassroomTaskResult,
  validateQuestionTaskResult,
} from "./taskValidationRules.js";

export { hasIndependentEvidenceMap, taskIssue } from "./taskValidationRules.js";

const CLASSROOM_MODULE_KINDS = new Set([
  LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM,
  LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_CLASSROOM,
]);

/**
 * 在草稿合并前执行确定性校验；课堂与题目规则在同层规则集内分别维护。
 * @param root0
 * @param root0.task
 * @param root0.result
 * @param root0.lesson
 * @param root0.content
 */
export function validateLessonGenerationTaskResult({
  task,
  result,
  lesson,
  content,
}) {
  return CLASSROOM_MODULE_KINDS.has(task.moduleKind)
    ? validateClassroomTaskResult(task, result)
    : validateQuestionTaskResult({ task, result, lesson, content });
}
