export const DEFAULT_LEARNING_GENERATION_POLICY = Object.freeze({
  compositeExplanation: "GENERATE",
  assessment: "BOTH",
  masteredKnowledgePointPolicy: "VERIFY_ONCE",
});

const COMPOSITE_EXPLANATION_OPTIONS = new Set(["GENERATE", "OMIT"]);
const ASSESSMENT_OPTIONS = new Set(["NONE", "PRE", "POST", "BOTH"]);
const MASTERED_KNOWLEDGE_OPTIONS = new Set([
  "SKIP",
  "VERIFY_ONCE",
  "FORCE_LEARN",
]);

/**
 *
 * @param policy
 */
export function normalizeLearningGenerationPolicy(policy = {}) {
  return {
    compositeExplanation: COMPOSITE_EXPLANATION_OPTIONS.has(
      policy?.compositeExplanation,
    )
      ? policy.compositeExplanation
      : DEFAULT_LEARNING_GENERATION_POLICY.compositeExplanation,
    assessment: ASSESSMENT_OPTIONS.has(policy?.assessment)
      ? policy.assessment
      : DEFAULT_LEARNING_GENERATION_POLICY.assessment,
    masteredKnowledgePointPolicy: MASTERED_KNOWLEDGE_OPTIONS.has(
      policy?.masteredKnowledgePointPolicy,
    )
      ? policy.masteredKnowledgePointPolicy
      : DEFAULT_LEARNING_GENERATION_POLICY.masteredKnowledgePointPolicy,
  };
}

/**
 *
 * @param policy
 */
export function enabledLearningModules(policy = {}) {
  const normalized = normalizeLearningGenerationPolicy(policy);
  return {
    compositeExplanation: normalized.compositeExplanation === "GENERATE",
    preAssessment: ["PRE", "BOTH"].includes(normalized.assessment),
    postAssessment: ["POST", "BOTH"].includes(normalized.assessment),
    masteredKnowledgePointPolicy: normalized.masteredKnowledgePointPolicy,
  };
}
