export const ASSESSMENT_POLICY_IDS = Object.freeze({
  math: "math-assessment-matrix-v1",
  science: "science-general-v1",
  physics: "physics-v1",
});

const COMMON_LEVELS = Object.freeze([
  { id: "A", labelKey: "recognize", fallback: "识别再现" },
  { id: "B", labelKey: "understand", fallback: "理解解释" },
  { id: "C", labelKey: "apply", fallback: "应用分析" },
  { id: "D", labelKey: "inquiry", fallback: "探究论证" },
  { id: "E", labelKey: "transfer", fallback: "综合迁移" },
]);

const POLICIES = Object.freeze({
  [ASSESSMENT_POLICY_IDS.math]: {
    id: ASSESSMENT_POLICY_IDS.math,
    domains: [
      { id: "CR", labelKey: "concepts", fallback: "概念与符号" },
      { id: "PJ", labelKey: "reasoning", fallback: "程序、推理与论证" },
      { id: "M", labelKey: "models", fallback: "模型与不变结构" },
      { id: "SF", labelKey: "reflection", fallback: "总结、交流与反思" },
    ],
    levels: COMMON_LEVELS,
  },
  [ASSESSMENT_POLICY_IDS.science]: {
    id: ASSESSMENT_POLICY_IDS.science,
    domains: [
      { id: "SC", labelKey: "scienceConcepts", fallback: "科学观念" },
      { id: "ST", labelKey: "scienceThinking", fallback: "科学思维" },
      { id: "IP", labelKey: "inquiryPractice", fallback: "探究实践" },
      { id: "AR", labelKey: "attitudeResponsibility", fallback: "态度与责任" },
    ],
    levels: COMMON_LEVELS,
  },
  [ASSESSMENT_POLICY_IDS.physics]: {
    id: ASSESSMENT_POLICY_IDS.physics,
    domains: [
      { id: "PC", labelKey: "physicsConcepts", fallback: "物理观念" },
      { id: "ST", labelKey: "scienceThinking", fallback: "科学思维" },
      { id: "SI", labelKey: "scienceInquiry", fallback: "科学探究" },
      {
        id: "SR",
        labelKey: "scienceAttitudeResponsibility",
        fallback: "科学态度与责任",
      },
    ],
    levels: COMMON_LEVELS,
  },
});

/**
 * 学科是策略选择的唯一入口，科学中的物化生知识点仍使用科学通用策略。
 * @param subject
 */
export function assessmentPolicyIdForSubject(subject) {
  const normalized = String(subject || "")
    .trim()
    .toLowerCase();
  if (normalized === "science" || normalized === "科学") {
    return ASSESSMENT_POLICY_IDS.science;
  }
  if (normalized === "physics" || normalized === "物理") {
    return ASSESSMENT_POLICY_IDS.physics;
  }
  if (normalized === "math" || normalized === "数学") {
    return ASSESSMENT_POLICY_IDS.math;
  }
  throw new Error(`不支持的评估矩阵学科：${subject || "未提供"}`);
}

/**
 *
 * @param policyId
 */
export function assessmentPolicy(policyId) {
  const policy = POLICIES[policyId];
  if (!policy) throw new Error(`未知评估矩阵策略：${policyId || "未提供"}`);
  return policy;
}

/**
 *
 */
export function assessmentPolicyIds() {
  return Object.keys(POLICIES);
}
