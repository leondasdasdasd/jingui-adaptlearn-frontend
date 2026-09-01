import { generateQuestions } from "../../lib/questionApi";
import {
  COMPOSITE_REVIEW_POOL_SIZE,
  PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
} from "../../shared/domain/questionPoolPolicy";

/**
 * @param question
 */
export function normalizedQuestionStem(question) {
  return String(question?.stem || "")
    .replaceAll(/\s+/g, "")
    .replaceAll(/[!,.?。！，？]/g, "");
}
/**
 * @param questions
 */
export function ensureUniqueQuestionStems(questions) {
  const seen = new Set();
  for (const question of questions) {
    const stem = normalizedQuestionStem(question);
    if (stem && seen.has(stem)) throw new Error("生成题目中存在重复题干");
    if (stem) seen.add(stem);
  }
}

export const openMaicStepCopy = {
  queued: "等待开始",
  initializing: "初始化课堂",
  researching: "整理教学主题",
  generating_outlines: "规划课堂结构",
  generating_scenes: "生成课堂场景",
  generating_media: "准备课堂素材",
  generating_tts: "生成讲解语音",
  persisting: "保存课堂内容",
  completed: "生成完成",
};

/**
 *
 * @param notice
 */
export function noticeTone(notice) {
  if (!notice) return "info";
  if (typeof notice === "object") return notice.tone || "warning";
  const text = String(notice);
  if (/失败|无法|错误|未通过|入队失败/.test(text)) return "error";
  if (/请先|需要|仍有|缺少/.test(text)) return "warning";
  if (/已发布|已生成|已加载|已找回|已通过|已保存/.test(text)) return "success";
  return "info";
}

/**
 *
 * @param tone
 * @param message
 */
export function noticeMessage(tone, message) {
  return { tone, message };
}

/**
 *
 */
export function generationCancelledError() {
  return new DOMException("生成已取消", "AbortError");
}

/**
 *
 * @param error
 */
export function isGenerationCancelled(error) {
  return error?.name === "AbortError" || error?.message === "生成已取消";
}

/**
 *
 * @param payload
 * @param onProgress
 * @param validateResult
 * @param signal
 */
export async function generateQuestionsWithRetry(
  payload,
  onProgress,
  validateResult,
  signal,
) {
  let latestError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await generateQuestions(payload, { onProgress, signal });
      validateResult?.(result);
      return result;
    } catch (error) {
      latestError = error;
      if (isGenerationCancelled(error)) throw error;
      if (attempt === 0)
        onProgress({ message: "题目没有通过完整性检查，正在重新准备" });
    }
  }
  throw latestError;
}
/**
 * @param root0
 * @param root0.lesson
 * @param root0.knowledgePoints
 * @param root0.teacherInstruction
 * @param root0.existingQuestions
 * @param root0.assessmentMatrices
 * @param root0.generationScope
 * @param onProgress
 * @param signal
 */
export async function generatePracticeQuestionsByKnowledgePoint(
  {
    lesson,
    knowledgePoints,
    teacherInstruction,
    existingQuestions,
    assessmentMatrices,
    generationScope = "all",
  },
  onProgress,
  signal,
) {
  let latestError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const includeKnowledgeQuestions = generationScope !== "review";
      const includeReviewQuestions = generationScope !== "knowledge";
      const [knowledgeResults, reviewResult] = await Promise.all([
        includeKnowledgeQuestions
          ? Promise.all(
              knowledgePoints.map((knowledgePoint) =>
                generateQuestions(
                  {
                    purpose: "post",
                    lesson,
                    knowledgePoints: [knowledgePoint],
                    countPerKnowledgePoint:
                      PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
                    reviewCount: 0,
                    teacherInstruction,
                    skipAssessmentMatrixPlanning: true,
                    ...(assessmentMatrices?.[knowledgePoint.id]
                      ? {
                          assessmentMatrices: {
                            [knowledgePoint.id]:
                              assessmentMatrices[knowledgePoint.id],
                          },
                        }
                      : {}),
                  },
                  {
                    onProgress: (status) =>
                      onProgress({
                        ...status,
                        message: `正在准备“${knowledgePoint.name}”练习`,
                      }),
                    signal,
                  },
                ),
              ),
            )
          : Promise.resolve([]),
        includeReviewQuestions
          ? generateQuestions(
              {
                purpose: "post",
                lesson,
                knowledgePoints,
                countPerKnowledgePoint: 0,
                reviewCount: COMPOSITE_REVIEW_POOL_SIZE,
                teacherInstruction,
                skipAssessmentMatrixPlanning: true,
              },
              {
                onProgress: (status) =>
                  onProgress({ ...status, message: "正在准备综合练习" }),
                signal,
              },
            )
          : Promise.resolve({ questions: [] }),
      ]);
      const result = {
        questions: [
          ...knowledgeResults.flatMap((result) => result.questions),
          ...reviewResult.questions,
        ],
      };
      ensureUniqueQuestionStems([
        ...result.questions,
        ...(existingQuestions || []),
      ]);
      return result;
    } catch (error) {
      latestError = error;
      if (isGenerationCancelled(error)) throw error;
      if (attempt === 0)
        onProgress({ message: "题目没有通过完整性检查，正在重新准备" });
    }
  }
  throw latestError;
}
