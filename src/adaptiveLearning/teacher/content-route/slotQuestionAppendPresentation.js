import { trans } from "../../../utils/i18n";
import { SLOT_QUESTION_APPEND_ISSUES } from "../domain/slotQuestionAppend";

/**
 * 将插槽追加领域错误映射为教师可操作的提示。
 * @param error
 */
export function slotQuestionAppendIssueMessage(error) {
  const messages = new Map([
    [
      SLOT_QUESTION_APPEND_ISSUES.MISSING_NEW_ID,
      trans(
        "adaptiveLearning.assessment.generatedQuestionMissingId",
        "生成题目缺少新题标识",
      ),
    ],
    [
      SLOT_QUESTION_APPEND_ISSUES.SLOT_MISMATCH,
      trans(
        "adaptiveLearning.assessment.generatedQuestionSlotMismatch",
        "返回题目没有匹配当前插槽",
      ),
    ],
    [
      SLOT_QUESTION_APPEND_ISSUES.DUPLICATE_ID,
      trans(
        "adaptiveLearning.assessment.generatedQuestionNotNew",
        "生成服务未返回新题",
      ),
    ],
  ]);
  return messages.get(error?.code) || error?.message || "";
}
