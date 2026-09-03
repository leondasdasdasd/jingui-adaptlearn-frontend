import { selectIndependentVerificationQuestion } from "../domain/learningPlan.js";

/**
 * 合并真实发布包中的同知识点题目，避免旧版发布包缺少专属练习池时误判为无内容。
 * @param {object[][]} groups 按权威优先级排列的题目集合。
 * @returns {object[]} 去重后的真实发布题目。
 */
function uniqueQuestions(groups) {
  const seen = new Set();
  return groups.flat().filter((question) => {
    if (!question?.id || seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}

/**
 * @param {object} context 当前学习会话上下文。
 * @param {string} knowledgePointId 知识点标识。
 * @returns {object[]} 专属练习池。
 */
function knowledgePracticePool(context, knowledgePointId) {
  return (
    context.publishedContent?.knowledgePracticePools?.[knowledgePointId] || []
  );
}

/**
 * @param {object} context 当前学习会话上下文。
 * @param {string} knowledgePointId 知识点标识。
 * @returns {object[]} 当前知识点的真实练习题。
 */
function knowledgePracticeQuestions(context, knowledgePointId) {
  const legacyKnowledgeQuestions = (context.postQuestions || []).filter(
    (question) =>
      question.phase !== "review" &&
      question.knowledgePointIds?.includes(knowledgePointId),
  );
  const dedicatedQuestions = uniqueQuestions([
    knowledgePracticePool(context, knowledgePointId),
    legacyKnowledgeQuestions,
  ]);
  if (dedicatedQuestions.length > 0) return dedicatedQuestions;

  // 部分真实旧发布包只有综合巩固题；按题目已有知识点标注接入练习，不伪造第二套内容。
  return uniqueQuestions([
    (context.publishedContent?.compositeReviewPool || []).filter((question) =>
      question.knowledgePointIds?.includes(knowledgePointId),
    ),
  ]);
}

/**
 * @param {object} context 当前学习会话上下文。
 * @param {string} knowledgePointId 知识点标识。
 * @returns {object[]} 独立验证题，最多一题。
 */
function knowledgeVerificationQuestions(context, knowledgePointId) {
  const question = selectIndependentVerificationQuestion(
    knowledgePracticePool(context, knowledgePointId),
    context.postAttempts,
    knowledgePointId,
  );
  return question ? [question] : [];
}

/**
 * 将学习单元映射到发布包中的真实题目，不生成或回退到 Mock 题目。
 * @param {object} context 当前学习会话上下文。
 * @param {object} unit 当前学习计划单元。
 * @returns {object[]} 当前单元可使用的已发布题目。
 */
export function questionsForLearningUnit(context, unit) {
  if (unit?.kind === "enhancement_training") return context.postQuestions || [];
  if (unit?.kind === "knowledge_practice")
    return knowledgePracticeQuestions(context, unit.knowledgePointId);
  if (unit?.kind === "knowledge_verification")
    return knowledgeVerificationQuestions(context, unit.knowledgePointId);
  if (unit?.kind === "composite_review")
    return context.publishedContent?.compositeReviewPool || [];
  return context.postQuestions || [];
}
