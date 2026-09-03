import en from "./en";
import zhCN from "./zh-CN";

const STATIC_QUESTION_TEST_KEYS = [
  "teacherPreview.sameQuestionTypeMoveOnly",
  "detailView.alreadyAtTopCannotMoveUp",
  "detailView.alreadyAtBottomCannotMoveDown",
  "detailView.modificationSucceeded",
  "detailView.operationSucceeded",
  "detailView.privateStatusUpdateSucceeded",
  "detailView.operationFailed",
  "revised.correctionAction",
  "revised.addRevisionTitle",
  "revised.correctionDataApprovalStarted",
  "revised.correctionDataApprovalAcademicDean",
  "revised.correctionDataApprovalCourseInstitute",
  "revised.questionApprovalStarted",
  "revised.questionApprovalAcademicDean",
];

const TWO_WAY_TEST_KEYS = [
  "twoWay.minimumModuleQuestionCount",
  "twoWay.editLock.acquireFailed",
  "twoWay.editLock.otherUserEditingOverwriteConfirm",
  "twoWay.editLock.sameAccountEditingConfirm",
  "twoWay.editLock.reacquireFromUserConfirm",
  "twoWay.cancel",
  "twoWay.association.resizeAssociatedRangeBlocked",
  "twoWay.association.sourceQuestionFallback",
  "twoWay.questionAddedToPositions",
  "twoWay.combinationAssociation.onlyCombinationQuestions",
  "twoWay.combinationAssociation.selectCombinationQuestion",
  "twoWay.association.endQuestionMustIncludeCurrent",
  "twoWay.combinationAssociation.rangeMustMatchChildCount",
  "twoWay.association.followingQuestionCountInsufficient",
  "twoWay.combinationAssociation.rangeContainsChildStructure",
  "twoWay.association.questionNumberRangeMustBeContinuous",
  "twoWay.combinationAssociation.validationSummary",
  "twoWay.combinationAssociation.success",
  "twoWay.combinationAssociation.onlyCombinationAsSingle",
  "twoWay.association.selectCurrentQuestion",
  "twoWay.association.currentQuestionNotFound",
  "twoWay.combinationAssociation.targetHasChildren",
  "twoWay.combinationAssociation.singleAssociationSuccess",
  "twoWay.combinationAssociation.singleConfirmTitle",
  "twoWay.combinationAssociation.singleConfirmContent",
  "twoWay.blankAssociation.currentQuestionCannotGenerateSubquestions",
  "twoWay.blankAssociation.childCountMismatch",
  "twoWay.blankAssociation.subquestionValidationSummary",
  "twoWay.blankAssociation.rangeMustMatchBlankCount",
  "twoWay.blankAssociation.rangeContainsChildStructure",
  "twoWay.blankAssociation.continuousValidationSummary",
  "twoWay.blankAssociation.success",
  "twoWay.association.blankStrategyTitle",
  "twoWay.association.childStrategyTitle",
  "twoWay.association.groupStrategyTitle",
  "twoWay.association.cancel",
  "twoWay.clearChildQuestions",
  "twoWay.childQuestions.followingQuestionCountInsufficient",
  "twoWay.childQuestions.collectFollowingSuccess",
  "twoWay.childQuestions.collectConfirmTitle",
  "twoWay.childQuestions.collectConfirmContent",
  "twoWay.childQuestions.generate",
  "twoWay.association.sourceFillBlankQuestion",
  "twoWay.association.sourceCombinationQuestion",
  "twoWay.association.singleQuestion",
  "twoWay.association.targetChildQuestions",
  "twoWay.association.targetBlankSlots",
  "twoWay.association.strategySummary",
  "twoWay.association.singleTargetParentChildNote",
  "twoWay.association.downstreamNote",
  "twoWay.associationMode.singleTip",
  "twoWay.associationMode.parentChildTip",
  "twoWay.associationMode.blankCompatibleTip",
  "twoWay.associationMode.parentOnlyTip",
  "twoWay.association.questionLabel",
  "twoWay.association.handlingMethod",
  "twoWay.association.currentTarget",
  "twoWay.association.sourceQuestion",
  "twoWay.childQuestions.collectSuggestion",
  "twoWay.childQuestions.generateRange",
  "twoWay.selectQuestionSource",
  "twoWay.questionAttributeSearchPlaceholder",
  "twoWay.childQuestions.fillDown",
  "twoWay.combinationAssociation.title",
  "twoWay.blankAssociation.title",
];

const CJK_TEXT = /[\u3400-\u9fff]/;

describe("static question test i18n repair locale entries", () => {
  it("keeps repaired keys available in both locales with English copy", () => {
    for (const key of STATIC_QUESTION_TEST_KEYS) {
      expect(zhCN[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
      expect(en[key]).not.toMatch(CJK_TEXT);
    }
  });

  it("keeps TwoWayTest repaired keys available in both locales with English copy", () => {
    for (const key of TWO_WAY_TEST_KEYS) {
      expect(zhCN[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
      expect(en[key]).not.toMatch(CJK_TEXT);
    }
  });
});
