import { trans } from "../../../utils/i18n";
import {
  appendImportedQuestionSnapshot,
  assignQuestionToAssessmentSlot,
  removeQuestionFromAssessmentSlot,
} from "../domain/assessmentSlotManagement";

/**
 *
 * @param saved
 */
function requireSaved(saved) {
  if (!saved)
    throw new Error(trans("adaptiveLearning.content.readOnly", "当前内容只读"));
}

/**
 * 将题目归属与真实题目导入收口为草稿 application action。
 * @param root0
 * @param root0.saveDraft
 */
export function createAssessmentSlotActions({ saveDraft }) {
  const assignAssessmentQuestion = (scopeId, questionId, slotId) => {
    requireSaved(
      saveDraft((currentLesson) => ({
        postQuestions: assignQuestionToAssessmentSlot({
          questions: currentLesson.postQuestions || [],
          slots: currentLesson.assessmentQuestionSlots?.[scopeId] || [],
          questionId,
          slotId,
        }),
        version: Number(currentLesson.version || 0) + 1,
      })),
    );
  };
  const removeAssessmentQuestion = (questionId) => {
    requireSaved(
      saveDraft((currentLesson) => ({
        postQuestions: removeQuestionFromAssessmentSlot(
          currentLesson.postQuestions || [],
          questionId,
        ),
        version: Number(currentLesson.version || 0) + 1,
      })),
    );
  };
  const importAssessmentQuestions = (scopeId, slotId, selections) => {
    requireSaved(
      saveDraft((currentLesson) => {
        const slot = (
          currentLesson.assessmentQuestionSlots?.[scopeId] || []
        ).find((item) => String(item.id) === String(slotId));
        if (!slot) throw new Error("目标题目插槽不存在");
        let postQuestions = currentLesson.postQuestions || [];
        for (const selection of selections) {
          postQuestions = appendImportedQuestionSnapshot({
            questions: postQuestions,
            snapshot: selection.snapshot,
            source: selection.source,
            slot,
          });
        }
        return {
          postQuestions,
          version: Number(currentLesson.version || 0) + 1,
        };
      }),
    );
  };
  return {
    assignAssessmentQuestion,
    removeAssessmentQuestion,
    importAssessmentQuestions,
  };
}
