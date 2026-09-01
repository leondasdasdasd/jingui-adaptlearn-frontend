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
  if (!studentSessionId || !accessToken)
    throw new Error("复盘需要当前学习会话凭据");
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
 * @param value
 */
function normalizedText(value) {
  return String(value || "")
    .replaceAll(/\s+/g, "")
    .replaceAll(/[。，；]/g, "")
    .toLowerCase();
}

/**
 *
 * @param question
 * @param answerText
 */
export function assessAnswerQuality(question, answerText) {
  const answer = String(answerText || "").trim();
  const compact = normalizedText(answer);
  if (!answer) return { quality: "no_attempt", message: "" };
  if (
    /(随便|乱写|瞎写|蒙的|测试流程|开发工程师|无关答案|asdf|test)/i.test(answer)
  ) {
    return {
      quality: "off_task",
      message:
        "这次答案还不能用于判断。请回到题目，写下一个相关条件、公式或步骤。",
    };
  }
  if (/^(不知道|不会|不懂|忘了|没学会)[!?。了！？]*$/.test(compact)) {
    return {
      quality: "no_attempt",
      message: "可以暂时不会，但请先写出你能确定的条件或第一步。",
    };
  }
  if (
    question.type === "fill_blank" &&
    /^(是的|不是|好的|对|错|随便|哈{2,})$/.test(compact)
  ) {
    return {
      quality: "off_task",
      message: "这次答案还不能用于判断。请填写题目需要的数值或符号。",
    };
  }
  return { quality: "valid", message: "" };
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
        // Published content is a formal grading path. A local result here would
        // later be indistinguishable from server evidence, so keep it pending.
        throw error;
      }
    }
    if (question?.answer !== undefined) {
      return gradeObjectiveAnswer(question, answerText, {
        revealSolution: attemptStage === "correction",
      });
    }
    throw new Error("当前题目缺少可用的批改版本，请重新加载课时");
  }
  return gradeWrittenAnswer({
    question,
    contentVersionId,
    answerText,
    imageDataUrl,
    attemptStage,
    priorFormalGradeReceipt,
  });
}
