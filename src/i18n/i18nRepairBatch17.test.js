import en from "./en";
import zhCN from "./zh-CN";

const REPAIRED_BATCH_17_KEYS = [
  "global.waitPublish",
  "questionTask.reviewQuestionIssueSummaryLine",
  "questionTask.reviewSubQuestionIssueSummaryLine",
  "questionTask.reviewListSeparator",
  "questionTask.reviewMissingSectionTitleText",
  "questionTask.reviewMissingStemText",
  "questionTask.reviewMissingOptionsText",
  "questionTask.reviewMissingAnswerText",
  "questionTask.reviewMissingAnalysisText",
  "questionTask.reviewMissingSubQuestionText",
  "questionTask.reviewMissingScoreText",
  "questionTask.reviewInvalidScoreText",
  "questionTask.reviewFieldLabelSectionTitle",
  "questionTask.reviewFieldLabelStem",
  "questionTask.reviewFieldLabelOptions",
  "questionTask.reviewFieldLabelAnswer",
  "questionTask.reviewFieldLabelAnalysis",
  "questionTask.reviewFieldLabelSubQuestions",
  "questionTask.reviewFieldLabelScore",
  "revisedHome.aboutToArriveTitle",
  "revisedHome.aboutToArrivePrefix",
  "revisedHome.aboutToArriveSuffix",
  "revisedHome.aboutToArriveLink",
  "revisedHome.reopenProcess",
  "revisedHome.delegateReject",
  "revisedHome.delegateAgree",
  "studentPageMobile.firstTermShort",
  "studentPageMobile.secondTermShort",
  "studentPageMobile.subjectComparison",
  "studentPageMobile.yearComparison",
  "studentPageMobile.scoreTrend",
  "stuTest.answerNotStarted",
  "stuTest.answerStartTimeLabel",
  "stuTest.answerEnded",
  "stuTest.answerEndTimeLabel",
  "stuTest.autoSubmitAfterDeadline",
  "stuTest.completionCongrats",
  "stuTest.answerPaperOpenTimeLabel",
  "stuTest.halfCorrect",
  "testMouse.studentLabel",
  "testMouse.chooseMarkType",
  "testMouse.setupQuestionStructure",
  "testMouse.questionStructure",
  "testMouse.drawBox",
  "testMouse.upload",
  "testStudents.noRelatedTasks",
  "twoWay.savedAtPrefix",
  "twoWay.selectPaperMissingFields",
];

const CJK_TEXT = /[\u3400-\u9fff]/;

describe("i18n repair batch 17 locale entries", () => {
  it("keeps repaired keys available in both locales with English copy", () => {
    for (const key of REPAIRED_BATCH_17_KEYS) {
      expect(zhCN[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
      expect(en[key]).not.toMatch(CJK_TEXT);
    }
  });
});
