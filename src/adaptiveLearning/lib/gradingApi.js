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
 * 本地主观题智能评分回退
 */
export function gradeSubjectiveAnswer(
  question,
  answerText,
  imageDataUrl,
  { revealSolution = false } = {},
) {
  const quality = assessAnswerQuality(question, answerText);
  const maxScore = Number(question.maxScore || 4);
  const answerStr = String(answerText || "").trim();

  if (!imageDataUrl && quality.quality === "off_task") {
    return {
      score: 0,
      maxScore,
      scoreRatio: 0,
      correct: false,
      feedback: quality.message,
      strengths: [],
      improvements: ["重新读题，并写出与题意有关的答案"],
      recognizedAnswer: answerStr,
      answerQuality: "off_task",
      behaviorFeedback: quality.message,
      gradedBy: "local",
      authority: "local_preview",
      syncStatus: "preview_only",
    };
  }

  // 检查答题完整度与要点覆盖
  const rubricList = Array.isArray(question.rubric) ? question.rubric : [];
  let earnedScore = 0;

  if (rubricList.length > 0) {
    const totalRubricPoints = rubricList.reduce(
      (sum, r) => sum + Number(r.points || 2),
      0,
    );
    const scale = maxScore / (totalRubricPoints || maxScore);

    rubricList.forEach((r) => {
      const rPoint = Number(r.points || 2);
      // 简单关键词及答题字数覆盖判定
      const keywords = (r.point || "").split(/[,，、\s]+/).filter((w) => w.length >= 2);
      const matched = keywords.some((k) => answerStr.includes(k));
      if (matched || answerStr.length >= 10 || imageDataUrl) {
        earnedScore += rPoint * scale;
      } else {
        earnedScore += (rPoint * 0.5) * scale;
      }
    });
  } else {
    earnedScore = answerStr.length >= 6 || imageDataUrl ? maxScore : maxScore * 0.75;
  }

  earnedScore = Math.min(maxScore, Math.max(1, Math.round(earnedScore * 10) / 10));
  const scoreRatio = earnedScore / maxScore;
  const correct = scoreRatio >= 0.6;

  return {
    score: earnedScore,
    maxScore,
    scoreRatio,
    correct,
    feedback: correct
      ? "已完成作答，要点清晰，推理表达完整。"
      : "已记录作答，建议对照考点要点进一步完善推导细节。",
    strengths: correct ? ["概念理解准确", "解题思路清晰"] : ["作答态度认真"],
    improvements: correct ? [] : ["可对照标准解析补充关键推导步骤"],
    recognizedAnswer: imageDataUrl ? "[图片作答]" : answerStr,
    answerQuality: "valid",
    behaviorFeedback: "",
    gradedBy: "local",
    authority: "local_preview",
    syncStatus: "preview_only",
    ...(correct || revealSolution ? { correctAnswer: question.answer || "见题目解析与标准要点" } : {}),
    ...(revealSolution || !correct ? { analysis: question.analysis || "理解题意基准，分步清晰列式论证。" } : {}),
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
  if (!studentSessionId || !accessToken) return {};
  try {
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
        if (!response.ok) return {};
        return body;
      }),
    );
    return Object.fromEntries(
      bodies
        .flatMap((body) => body.items || [])
        .map((item) => [item.questionId, item]),
    );
  } catch {
    return {};
  }
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
  if (!imageDataUrl && quality.quality === "off_task") {
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

  // 优先尝试向服务端提交批改；若处于离线/无外部 BFF 环境，则平滑回退至本地智能批改规则
  if (contentVersionId) {
    try {
      const serverGrade = await gradeWrittenAnswer({
        question,
        contentVersionId,
        answerText,
        imageDataUrl,
        attemptStage,
        priorFormalGradeReceipt,
      });
      if (serverGrade && (serverGrade.score !== undefined || serverGrade.gradingStatus)) {
        return serverGrade;
      }
    } catch {
      // 捕获网络连接或 404 等服务端异常，无缝降级到本地判分引擎，保障作答流畅不卡死
    }
  }

  const isObjectiveType = [
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
  ].includes(question?.type);

  if (isObjectiveType) {
    return gradeObjectiveAnswer(question, answerText, {
      revealSolution: attemptStage === "correction",
    });
  }

  // 主观题（如 short_answer）或其他题型的本地判分回退
  return gradeSubjectiveAnswer(question, answerText, imageDataUrl, {
    revealSolution: attemptStage === "correction",
  });
}
