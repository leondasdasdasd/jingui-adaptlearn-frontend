export const ASSESSMENT_MATRIX_DOMAINS = ["COMPREHENSION", "APPLICATION", "SYNTHESIS"];
export const ASSESSMENT_MATRIX_DOMAIN_LABELS = {
  COMPREHENSION: "理解",
  APPLICATION: "应用",
  SYNTHESIS: "综合",
};
export const ASSESSMENT_MATRIX_LEVELS = ["L1", "L2", "L3"];
export const ASSESSMENT_MATRIX_LEVEL_LABELS = {
  L1: "基础",
  L2: "进阶",
  L3: "挑战",
};

export function buildAssessmentMatrix() {
  return {
    rows: [],
    cols: [],
    matrix: {},
  };
}
