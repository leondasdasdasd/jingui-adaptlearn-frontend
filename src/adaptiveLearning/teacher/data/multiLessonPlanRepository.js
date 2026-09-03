import {
  readJson,
  removeStoredValue,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";
import {
  DEFAULT_MULTI_LESSON_GENERATION_POLICY,
  normalizeMultiLessonGenerationPolicy,
} from "../domain/multiLessonPlan.js";

const draftKey = "adaptive-teacher-multi-lesson-plan-draft-v1";

/**
 *
 */
export function readMultiLessonPlanDraft() {
  const draft = readJson(draftKey, null);
  if (!draft) return null;
  return {
    ...draft,
    generationPolicy: normalizeMultiLessonGenerationPolicy(
      draft.generationPolicy,
    ),
  };
}

/**
 *
 * @param draft
 */
export function writeMultiLessonPlanDraft(draft) {
  writeJson(draftKey, {
    ...draft,
    generationPolicy: normalizeMultiLessonGenerationPolicy(
      draft?.generationPolicy || DEFAULT_MULTI_LESSON_GENERATION_POLICY,
    ),
  });
}

/**
 *
 */
export function clearMultiLessonPlanDraft() {
  removeStoredValue(draftKey);
}
