import {
  ASSESSMENT_POLICY_IDS,
  assessmentPolicy,
  assessmentPolicyIdForSubject,
} from "./assessmentMatrixPolicy";

describe("assessmentMatrixPolicy", () => {
  it("keeps science and independent physics on different versioned policies", () => {
    expect(assessmentPolicyIdForSubject("science")).toBe(
      ASSESSMENT_POLICY_IDS.science,
    );
    expect(assessmentPolicyIdForSubject("physics")).toBe(
      ASSESSMENT_POLICY_IDS.physics,
    );
    expect(
      assessmentPolicy(ASSESSMENT_POLICY_IDS.science).domains.map(
        (item) => item.fallback,
      ),
    ).toEqual(["科学观念", "科学思维", "探究实践", "态度与责任"]);
    expect(
      assessmentPolicy(ASSESSMENT_POLICY_IDS.physics).domains.map(
        (item) => item.fallback,
      ),
    ).toEqual(["物理观念", "科学思维", "科学探究", "科学态度与责任"]);
  });

  it("uses the shared A-E learning levels", () => {
    expect(
      assessmentPolicy(ASSESSMENT_POLICY_IDS.physics).levels.map(
        (item) => item.fallback,
      ),
    ).toEqual(["识别再现", "理解解释", "应用分析", "探究论证", "综合迁移"]);
  });

  it("rejects missing and unknown policies instead of falling back to math", () => {
    expect(() => assessmentPolicy("science-general-v2")).toThrow(
      "未知评估矩阵策略",
    );
    expect(() => assessmentPolicyIdForSubject("biology")).toThrow(
      "不支持的评估矩阵学科",
    );
  });
});
