import {
  assessAnswerQuality,
  normalizedAnswerText,
} from "../shared/domain/answerQuality.js";
import { objectiveScoreRatio } from "../shared/domain/questionEvidence.js";
import { assessmentPurposeForQuestion } from "../shared/domain/questionPurpose.js";
import { adaptiveApiUrl } from "../shared/infrastructure/runtimeEndpoints.js";

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.contentVersionId
 * @param root0.answerText
 * @param root0.imageDataUrl
 * @param root0.attemptStage
 * @param root0.priorFormalGradeReceipt
 */
export async function gradeWrittenAnswer({
  question,
  contentVersionId,
  answerText,
  imageDataUrl,
  attemptStage = "initial",
  priorFormalGradeReceipt = "",
}) {
  const purpose = assessmentPurposeForQuestion(question);
  const response = await fetch(adaptiveApiUrl("/api/answers/grade"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentVersionId,
      questionId: question.id,
      purpose,
      answerText,
      imageDataUrl,
      attemptStage,
      priorFormalGradeReceipt,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "答案批改失败，请重试");
  return body;
}

/**
 * AI 网关暂不可用时，主观题仍使用题目快照中的参考答案完成可解释的本地批改。
 * 这只作为临时结果，正式会话仍会在同步阶段以服务端结果为准。
 * @param question
 * @param answerText
 */
// eslint-disable-next-line complexity
export function gradeShortAnswerLocally(question, answerText) {
  const answer = String(answerText || "").trim();
  const reference = String(question?.answer || "").trim();
  const normalizedAnswer = normalizedAnswerText(answer);
  const normalizedReference = normalizedAnswerText(reference);
  if (!normalizedReference) {
    return {
      gradingStatus: "unresolved",
      evidenceEligible: false,
      score: null,
      maxScore: Number(question?.maxScore || 10),
      scoreRatio: null,
      correct: null,
      feedback: "暂时缺少参考答案，已保存作答，等待正式批改。",
      recognizedAnswer: answer,
      answerQuality: answer ? "valid" : "no_attempt",
      gradedBy: "local-fallback",
      authority: "pending",
      syncStatus: "pending",
    };
  }
  const correct = Boolean(
    normalizedReference && normalizedAnswer.includes(normalizedReference),
  );
  const maxScore = Number(question?.maxScore || 10);
  const score = correct
    ? maxScore
    : answer
      ? Math.round(maxScore * 0.4 * 100) / 100
      : 0;
  return {
    gradingStatus: "final",
    evidenceEligible: true,
    score,
    maxScore,
    scoreRatio: score / maxScore,
    correct,
    feedback: correct
      ? "作答包含参考答案的关键结论。"
      : "已记录作答，请对照题目补充关键步骤和最终结论。",
    recognizedAnswer: answer,
    answerQuality: answer ? "valid" : "no_attempt",
    strengths: correct ? ["结论正确"] : [],
    improvements: correct ? [] : ["补充关键步骤和最终结论"],
    gradedBy: "local-fallback",
    authority: "local_preview",
    syncStatus: "preview_only",
  };
}

/**
 *
 * @param contentVersionId
 * @param questionIds
 * @param root0
 * @param root0.studentSessionId
 * @param root0.accessToken
 */
export async function loadAnswerReviews(
  contentVersionId,
  questionIds,
  { studentSessionId = "", accessToken = "" } = {},
) {
  const ids = [
    ...new Set(
      (Array.isArray(questionIds) ? questionIds : [])
        .map(String)
        .filter(Boolean),
    ),
  ];
  if (!contentVersionId || ids.length === 0) return {};
  const batches = [];
  for (let index = 0; index < ids.length; index += 100)
    batches.push(ids.slice(index, index + 100));
  const bodies = await Promise.all(
    batches.map(async (batch) => {
      const response = await fetch(adaptiveApiUrl("/api/answers/review"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contentVersionId,
          questionIds: batch,
          studentSessionId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "参考答案加载失败");
      return body;
    }),
  );
  return Object.fromEntries(
    bodies
      .flatMap((body) => body.items || [])
      .map((item) => [item.questionId, item]),
  );
}

/**
 *
 * @param question
 * @param answer
 * @param root0
 * @param root0.revealSolution
 */
export function gradeObjectiveAnswer(
  question,
  answer,
  { revealSolution = false } = {},
) {
  const scoreRatio = objectiveScoreRatio(question, answer);
  const correct = scoreRatio >= 0.999;
  const maxScore = Number(question.maxScore || 1);
  const score = Math.round(maxScore * scoreRatio * 100) / 100;
  const quality = assessAnswerQuality(question, answer);
  return {
    score,
    maxScore,
    scoreRatio,
    correct,
    feedback: correct
      ? "回答正确"
      : scoreRatio > 0
        ? "部分正确，已按正确部分计分"
        : quality.message || "再检查一下关键条件和计算过程",
    strengths: correct ? ["结论正确"] : scoreRatio > 0 ? ["部分判断正确"] : [],
    improvements: correct ? [] : ["核对遗漏项和多选项"],
    recognizedAnswer: Array.isArray(answer)
      ? answer.join("、")
      : String(answer || ""),
    answerQuality: correct ? "valid" : quality.quality,
    behaviorFeedback: quality.quality === "off_task" ? quality.message : "",
    gradedBy: "local",
    authority: "local_preview",
    syncStatus: "preview_only",
    ...(correct || revealSolution ? { correctAnswer: question.answer } : {}),
    ...(revealSolution && !correct
      ? { analysis: question.analysis || "" }
      : {}),
  };
}

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.contentVersionId
 * @param root0.answerText
 * @param root0.imageDataUrl
 * @param root0.attemptStage
 * @param root0.priorFormalGradeReceipt
 */
export async function gradeAnswerWithFallback({
  question,
  contentVersionId,
  answerText,
  imageDataUrl,
  attemptStage = "initial",
  priorFormalGradeReceipt = "",
}) {
  const quality = assessAnswerQuality(question, answerText);
  if (!contentVersionId && !imageDataUrl && quality.quality === "off_task") {
    const maxScore = Number(question.maxScore || 1);
    return {
      score: 0,
      maxScore,
      scoreRatio: 0,
      correct: false,
      feedback: quality.message,
      strengths: [],
      improvements: ["重新读题，并写出与题意有关的答案"],
      recognizedAnswer: String(answerText || ""),
      answerQuality: "off_task",
      behaviorFeedback: quality.message,
      gradedBy: "local",
      authority: "local_preview",
      syncStatus: "preview_only",
    };
  }
  // Published student content intentionally omits answer keys.  When a
  // content version is available, objective grading therefore goes through
  // the server-authoritative rule endpoint; the server resolves the answer
  // from the immutable publication snapshot.  A local path remains only for
  // legacy preview questions that still carry their answer key in memory.
  if (
    [
      "multiple_choice",
      "single_choice",
      "fill_blank",
      "judgement",
      "ordering",
      "classification",
      "matching",
      "line_connect",
      "text_marker",
      "word_builder",
    ].includes(question?.type)
  ) {
    if (contentVersionId) {
      return gradeWrittenAnswer({
        question,
        contentVersionId,
        answerText,
        imageDataUrl,
        attemptStage,
        priorFormalGradeReceipt,
      });
    }
    if (question?.answer !== undefined) {
      return gradeObjectiveAnswer(question, answerText, {
        revealSolution: attemptStage === "correction",
      });
    }
    throw new Error("当前题目缺少已发布内容版本，无法进行正式批改");
  }
  try {
    return await gradeWrittenAnswer({
      question,
      contentVersionId,
      answerText,
      imageDataUrl,
      attemptStage,
      priorFormalGradeReceipt,
    });
  } catch (error) {
    if (!contentVersionId && question?.type === "short_answer" && !imageDataUrl)
      return gradeShortAnswerLocally(question, answerText);
    throw error;
  }
}
