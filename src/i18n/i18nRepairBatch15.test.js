import en from "./en";
import zhCN from "./zh-CN";

const REPAIRED_BATCH_15_KEYS = [
  "global.operateFailed",
  "global.selectDifficulty",
  "modalMachineTest.originalPaper",
  "modalMachineTest.downloadGeneratedAnswerSheet",
  "modalMachineTest.adjustAnswerSheetInWord",
  "topicAnalysis.noDataSelectStudentFromGroupTip",
  "gradingPapers.allQuestionsGraded",
  "gradingPapers.alreadyFirstStudentFirstBlock",
  "presentationSlides.moduleNotSupported",
  "presentationSlides.canvas",
  "presentationSlides.canvasUnsupported",
  "presentationSlides.saveAnnotationInfo",
  "dotMatrixPen.viewAnswerSheetWithPage",
  "dotMatrixPen.clickToView",
  "noPermission.title",
  "dataAnalysis.dotMatrixPenOverview",
  "detailView.paperIdMissingSaveFirst",
  "detailView.selectGradeAndSubjectFirst",
  "detailView.questionDetailFetchFailed",
  "detailView.questionAddedToBasket",
  "detailView.questionSaveFailed",
  "detailView.questionSaveMissingId",
  "detailView.link",
  "detailView.switchPaperModeConfirm",
  "detailView.emptyPaperTip",
  "detailView.emptyBasketTip",
  "detailView.sectionPrefix",
  "scoreSummary.phaseCount",
  "scoreSummary.revokeSuccessCount",
  "scoreSummary.operationSuccess",
  "scoreSummary.sendPeopleSummary",
  "qualityBenchmark.rateThresholdSaved",
  "qualityBenchmark.estimatedTag",
];

const CJK_TEXT = /[\u3400-\u9fff]/;

describe("i18n repair batch 15 locale entries", () => {
  it("keeps repaired keys available in both locales with English copy", () => {
    for (const key of REPAIRED_BATCH_15_KEYS) {
      expect(zhCN[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
      expect(en[key]).not.toMatch(CJK_TEXT);
    }
  });
});
