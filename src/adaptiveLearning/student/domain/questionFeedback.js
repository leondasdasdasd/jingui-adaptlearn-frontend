const retryQualities = new Set(["off_task", "no_attempt", "pending_review"]);

/**
 *
 * @param grading
 */
export function isAiGraded(grading) {
  if (
    grading?.feedbackSource === "ai" ||
    grading?.aiGraded === true ||
    String(grading?.gradingMethod || "").toLowerCase() === "ai"
  )
    return true;
  return String(grading?.gradedBy || "")
    .toLowerCase()
    .split(/[+/:_-]+/)
    .includes("doubao");
}

/**
 *
 * @param questionType
 * @param grading
 */
export function aiGeneratedCommentary(questionType, grading) {
  const normalizedType = String(questionType || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
  if (normalizedType !== "short_answer" || grading?.feedbackSource !== "ai")
    return "";
  return String(grading?.aiCommentary || "").trim();
}

/**
 *
 * @param questionType
 * @param grading
 */
export function aiGeneratedErrorReason(questionType, grading) {
  const normalizedType = String(questionType || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
  if (normalizedType !== "short_answer" || grading?.feedbackSource !== "ai")
    return "";
  if (grading?.correct === true || retryQualities.has(grading?.answerQuality))
    return "";
  const score = Number(grading?.score);
  const maxScore = Number(grading?.maxScore);
  if (
    Number.isFinite(score) &&
    Number.isFinite(maxScore) &&
    maxScore > 0 &&
    score >= maxScore
  )
    return "";
  return String(grading?.errorReason || "").trim();
}

/**
 *
 * @param questionType
 * @param grading
 */
export function aiGeneratedImprovements(questionType, grading) {
  const normalizedType = String(questionType || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
  if (normalizedType !== "short_answer" || grading?.feedbackSource !== "ai")
    return [];
  if (grading?.correct === true || retryQualities.has(grading?.answerQuality))
    return [];
  const score = Number(grading?.score);
  const maxScore = Number(grading?.maxScore);
  if (
    Number.isFinite(score) &&
    Number.isFinite(maxScore) &&
    maxScore > 0 &&
    score >= maxScore
  )
    return [];
  const errorReason = String(grading?.errorReason || "")
    .replaceAll(/\s+/g, " ")
    .trim();
  const reasonCore = errorReason.replace(/[!?。！？]+$/, "");
  const withoutRepeatedReason = (value) => {
    let text = String(value || "")
      .replaceAll(/\s+/g, " ")
      .trim();
    if (errorReason) text = text.replace(errorReason, "");
    if (reasonCore) text = text.replace(reasonCore, "");
    return text.replace(/^[\s,:;。，：；]+/, "").trim();
  };
  const suggestions = (
    Array.isArray(grading?.improvements) ? grading.improvements : []
  )
    .map(withoutRepeatedReason)
    .filter(Boolean);
  if (suggestions.length > 0) return [...new Set(suggestions)].slice(0, 2);
  const commentary = withoutRepeatedReason(grading?.aiCommentary);
  return commentary ? [commentary] : [];
}

/**
 *
 * @param grading
 */
function achievedPoints(grading) {
  const rubricPoints = (grading?.rubricResults || [])
    .filter((item) => Number(item.earned || 0) > 0)
    .map((item) => String(item.point || "").trim())
    .filter(Boolean);
  const redundantPoints = new Set(["结论正确", "回答正确"]);
  return [
    ...new Set(
      [...(grading?.strengths || []), ...rubricPoints]
        .map(String)
        .map((point) => point.trim())
        .filter((point) => point && !redundantPoints.has(point)),
    ),
  ].slice(0, 2);
}

/**
 *
 * @param grading
 */
function recognizedAnswer(grading) {
  if (!isAiGraded(grading)) return "";
  const answer = String(grading?.recognizedAnswer || "").trim();
  if (!answer || ["未识别到答案", "[图片作答]"].includes(answer)) return "";
  return answer;
}

/**
 *
 * @param grading
 */
export function requiresQuestionRetry(grading) {
  return retryQualities.has(grading?.answerQuality);
}

/**
 *
 * @param root0
 * @param root0.grading
 * @param root0.questionType
 * @param root0.diagnostic
 * @param root0.needsIntervention
 * @param root0.adaptiveOutcome
 */
export function buildQuestionFeedback({
  grading,
  questionType = "",
  diagnostic = false,
  needsIntervention = false,
  adaptiveOutcome = null,
}) {
  if (!grading) return null;
  if (
    diagnostic &&
    (grading.skipped || grading.disposition === "SKIPPED_DONT_KNOW")
  ) {
    return {
      state: "recorded",
      titleId: "diagnosticSkipped",
      showScore: false,
      achieved: [],
      errorReason: "",
      improvements: [],
      aiComment: "",
      adaptiveCue: null,
    };
  }
  if (diagnostic && !requiresQuestionRetry(grading)) {
    return {
      state: "recorded",
      titleId: "diagnosticRecorded",
      showScore: false,
      achieved: [],
      errorReason: "",
      improvements: [],
      aiComment: "",
      adaptiveCue: null,
    };
  }
  if (grading.answerQuality === "off_task") {
    const recognized = recognizedAnswer(grading);
    return {
      state: "retry",
      titleId: recognized ? "offTaskRecognized" : "offTask",
      showScore: false,
      achieved: [],
      recognizedAnswer: recognized,
      errorReason: "",
      improvements: [],
      aiComment: diagnostic ? "" : aiGeneratedCommentary(questionType, grading),
      adaptiveCue: null,
    };
  }
  if (grading.answerQuality === "no_attempt") {
    return {
      state: "retry",
      titleId: "noAttempt",
      showScore: false,
      achieved: [],
      errorReason: "",
      improvements: [],
      aiComment: diagnostic ? "" : aiGeneratedCommentary(questionType, grading),
      adaptiveCue: null,
    };
  }
  if (
    grading.answerQuality === "pending_review" ||
    grading.evidenceEligible === false
  ) {
    return {
      state: "retry",
      titleId: "pendingReview",
      showScore: false,
      achieved: [],
      errorReason: "",
      improvements: [],
      aiComment: "",
      adaptiveCue: null,
    };
  }
  if (grading.correctionRequired) {
    if (!isAiGraded(grading)) {
      return {
        state: "incorrect",
        titleId: "incorrect",
        showScore: false,
        achieved: [],
        errorReason: "",
        improvements: [],
        aiComment: "",
        adaptiveCue: null,
      };
    }
    return {
      state: "correction",
      titleId: "correctionRequired",
      showScore: false,
      achieved: [],
      errorReason: diagnostic
        ? ""
        : aiGeneratedErrorReason(questionType, grading),
      improvements: diagnostic
        ? []
        : aiGeneratedImprovements(questionType, grading),
      aiComment: diagnostic ? "" : aiGeneratedCommentary(questionType, grading),
      adaptiveCue: null,
    };
  }

  const ratio = Number(grading.scoreRatio || 0);
  const state = grading.correct
    ? "correct"
    : ratio > 0
      ? "partial"
      : "incorrect";
  const aiGraded = isAiGraded(grading);
  const titleId =
    state === "partial" && grading.answerQuality === "incomplete"
      ? "partialIncomplete"
      : state === "incorrect" && grading.answerQuality === "careless"
        ? "incorrectCareless"
        : state;
  const adaptiveTitle = String(adaptiveOutcome?.title || "").trim();
  const adaptiveDetail = String(adaptiveOutcome?.message || "").trim();
  let adaptiveCue =
    adaptiveTitle || adaptiveDetail
      ? {
          tone: "progress",
          titleText: adaptiveTitle,
          titleId: adaptiveTitle ? "" : "continuePractice",
          detailText: adaptiveDetail,
        }
      : null;
  if (needsIntervention) {
    adaptiveCue = {
      tone: "support",
      titleId: "interventionTitle",
      detailId: "interventionDetail",
      titleText: "",
      detailText: "",
    };
  }

  return {
    state,
    titleId: aiGraded ? titleId : `score.${state}`,
    showScore: aiGraded,
    scoreRatio: ratio,
    achieved: aiGraded ? achievedPoints(grading) : [],
    errorReason:
      diagnostic || state === "correct"
        ? ""
        : aiGeneratedErrorReason(questionType, grading),
    improvements:
      diagnostic || state === "correct"
        ? []
        : aiGeneratedImprovements(questionType, grading),
    aiComment: diagnostic ? "" : aiGeneratedCommentary(questionType, grading),
    adaptiveCue,
  };
}
