import { trans } from "../../../utils/i18n";
import { localizedQuestionState } from "../../shared/presentation/questionResultPresentation";

const scoreStateCopies = Object.freeze({
  published: {
    label: ["adaptiveLearning.result.scorePublished", "已发布"],
  },
  pendingReview: {
    label: ["adaptiveLearning.result.scorePendingReview", "待老师确认"],
    title: [
      "adaptiveLearning.result.scorePendingReviewDetail",
      "老师正在核对本次课堂证据，确认后展示掌握率、正确率和一句话总评。",
    ],
  },
  partialEvidence: {
    label: ["adaptiveLearning.result.scorePartialEvidence", "证据未完整"],
    title: [
      "adaptiveLearning.result.scorePartialEvidenceDetail",
      "部分必要证据尚未完成，本次暂不展示掌握率与得分率。",
    ],
  },
  objectiveUnavailable: {
    label: ["adaptiveLearning.result.scoreObjectiveUnavailable", "暂无法判断"],
    title: [
      "adaptiveLearning.result.scoreObjectiveUnavailableDetail",
      "本次课堂缺少可用于评估的学习目标，暂不生成学习结论。",
    ],
  },
  insufficientEvidence: {
    label: ["adaptiveLearning.result.scoreInsufficientEvidence", "证据不足"],
    title: [
      "adaptiveLearning.result.scoreInsufficientEvidenceDetail",
      "有效作答证据还不足，完成更多学习活动后再查看结论。",
    ],
  },
  syncing: {
    label: ["adaptiveLearning.result.scoreSyncing", "课堂待结算"],
    title: [
      "adaptiveLearning.result.scoreSyncingDetail",
      "课堂记录正在同步或等待老师结束课堂，暂不生成学习结论。",
    ],
  },
  practiceComplete: {
    label: ["adaptiveLearning.result.scorePracticeComplete", "练习已完成"],
    title: [
      "adaptiveLearning.result.scorePracticeCompleteDetail",
      "本次练习已完成；进入正式课堂后，课堂结束时会生成综合评定。",
    ],
  },
});

function translateCopy(copy, params) {
  return copy ? trans(copy[0], copy[1], params) : "";
}

export function resultScorePresentation(state) {
  const copy = scoreStateCopies[state.kind];
  return {
    ...state,
    label: translateCopy(copy.label),
    title: state.summary || translateCopy(copy.title),
  };
}

export function resultPhaseLabel(question) {
  if (
    question?.purpose?.toUpperCase() === "PRE" ||
    question?.phase === "diagnostic"
  )
    return trans("adaptiveLearning.result.preAssessment", "课前小测");
  if (question?.phase === "review")
    return trans("adaptiveLearning.result.compositePractice", "综合练习");
  return trans("adaptiveLearning.result.knowledgePractice", "单点练习");
}

export function resultQuestionStateLabel(state) {
  return localizedQuestionState(state, "unanswered");
}

export function resultAnswerCopy() {
  return {
    imageAnswer: trans("adaptiveLearning.result.imageAnswer", "图片作答"),
    unanswered: trans("adaptiveLearning.result.unanswered", "未作答"),
    separator: trans("adaptiveLearning.result.answerSeparator", "、"),
    answerLoading: trans(
      "adaptiveLearning.result.answerLoading",
      "正在加载参考答案…",
    ),
    answerLoadFailed: trans(
      "adaptiveLearning.result.answerLoadFailed",
      "参考答案加载失败，请刷新重试",
    ),
    answerUnavailable: trans(
      "adaptiveLearning.result.answerUnavailable",
      "暂未获取到参考答案",
    ),
  };
}

function authoritativeResultPresentation(scoreState) {
  const scorePresentation = resultScorePresentation(scoreState);
  if (!scoreState.ready)
    return {
      label: scorePresentation.label,
      description: scorePresentation.title,
    };
  return {
    label: scoreState.published
      ? trans(
          "adaptiveLearning.result.settledPublished",
          "已正式结算 · 已发布",
        )
      : trans("adaptiveLearning.result.settled", "已正式结算"),
    description:
      scorePresentation.title ||
      trans(
        "adaptiveLearning.result.authoritativeDescription",
        "正式批改、掌握证据和结算结果均来自服务端，学生端与教师端结果一致。",
      ),
  };
}

function previewResultPresentation(pendingSyncCount) {
  const syncing = pendingSyncCount > 0;
  return {
    label: trans("adaptiveLearning.result.unsyncedPreview", "未同步预览"),
    description: trans(
      syncing
        ? "adaptiveLearning.result.previewSyncing"
        : "adaptiveLearning.result.previewWaiting",
      syncing
        ? "当前结果只是本机未同步预览，不会写入长期掌握记录。还有 {$count} 道记录正在同步。"
        : "当前结果只是本机未同步预览，不会写入长期掌握记录。正在等待服务端结算。",
      { count: pendingSyncCount },
    ),
  };
}

export function resultAuthorityPresentation({
  isAuthoritative,
  scoreState,
  pendingSyncCount,
}) {
  return isAuthoritative
    ? authoritativeResultPresentation(scoreState)
    : previewResultPresentation(pendingSyncCount);
}

export function shouldShowResultValues({ isAuthoritative, scoreState }) {
  return !isAuthoritative || scoreState.ready;
}
