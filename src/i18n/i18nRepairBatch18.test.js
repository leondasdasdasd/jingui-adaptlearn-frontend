import en from "./en";
import zhCN from "./zh-CN";

const REPAIRED_BATCH_18_KEYS = [
  "global.difficultyLabelWithColon",
  "twoWay.associationEndQuestionNo",
  "twoWay.blankAssociation.continuousRangeHint",
  "twoWay.blankAssociation.integerIncrementMode",
  "twoWay.blankAssociation.questionNo",
  "twoWay.blankAssociation.questionNumberMode",
  "twoWay.blankAssociation.subquestionIncrementMode",
  "twoWay.blankAssociation.subquestionNumberHint",
  "twoWay.childQuestionCount",
  "twoWay.childQuestionSettings",
  "twoWay.childQuestionTotalPrefix",
  "twoWay.combinationAssociation.childQuestions",
  "twoWay.combinationAssociation.continuousQuestionNo",
  "twoWay.combinationAssociation.continuousRangeHint",
  "twoWay.combinationAssociation.wrongPrintNote",
  "twoWay.confirmAssociation",
  "twoWay.blankAssociation.blankSlots",
  "twoWay.blankAssociation.paperQuestionNo",
  "twoWay.blankAssociation.targetQuestion",
  "twoWay.blankAssociation.wrongPrintNote",
  "twoWay.associateBlank",
  "twoWay.associateCombination",
  "detailView.fillDown",
];

const CJK_TEXT = /[\u3400-\u9fff]/;

describe("i18n repair batch 18 locale entries", () => {
  it("keeps repaired keys available in both locales with English copy", () => {
    for (const key of REPAIRED_BATCH_18_KEYS) {
      expect(zhCN[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
      expect(en[key]).not.toMatch(CJK_TEXT);
    }
  });
});
