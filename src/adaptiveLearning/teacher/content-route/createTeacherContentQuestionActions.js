/* eslint-disable complexity, sonarjs/cognitive-complexity -- 题目工厂集中维护诊断、练习、复合题与槽位生成的唯一写入链路。 */
import { trans } from "../../../utils/i18n";
import {
  generateAssessmentMatrices,
  generateAssessmentQuestionSlots,
  generateQuestionSlotsConcurrently,
} from "../../lib/questionApi";
import { buildPreAssessmentBlueprint } from "../../shared/domain/preAssessmentBlueprint";
import {
  COMPOSITE_REVIEW_POOL_SIZE,
  PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
} from "../../shared/domain/questionPoolPolicy";
import { readTeacherContent } from "../data/teacherContentRepository";
import {
  appendQuestionBoundToSlot,
  SLOT_QUESTION_APPEND_ISSUES,
} from "../domain/slotQuestionAppend";
import {
  ensureUniqueQuestionStems,
  generatePracticeQuestionsByKnowledgePoint,
  generateQuestionsWithRetry,
  generationCancelledError,
  isGenerationCancelled,
  normalizedQuestionStem,
  noticeMessage,
} from "./teacherContentRouteSupport";

/**
 *
 * @param error
 */
function slotQuestionAppendIssueMessage(error) {
  const messages = new Map([
    [
      SLOT_QUESTION_APPEND_ISSUES.MISSING_NEW_ID,
      trans(
        "adaptiveLearning.assessment.generatedQuestionMissingId",
        "生成题目缺少新题标识",
      ),
    ],
    [
      SLOT_QUESTION_APPEND_ISSUES.SLOT_MISMATCH,
      trans(
        "adaptiveLearning.assessment.generatedQuestionSlotMismatch",
        "返回题目没有匹配当前插槽",
      ),
    ],
    [
      SLOT_QUESTION_APPEND_ISSUES.DUPLICATE_ID,
      trans(
        "adaptiveLearning.assessment.generatedQuestionNotNew",
        "生成服务未返回新题",
      ),
    ],
  ]);
  return messages.get(error?.code) || error?.message || "";
}

/**
 *
 * @param root0
 * @param root0.assertContentVersion
 * @param root0.base
 * @param root0.contentMutationLocked
 * @param root0.contentVersionSnapshot
 * @param root0.lesson
 * @param root0.lessonPayload
 * @param root0.questionGeneration
 * @param root0.questionPoolAbortRef
 * @param root0.saveDraft
 * @param root0.setNotice
 * @param root0.setQuestionGeneration
 */
export function createTeacherContentQuestionActions({
  assertContentVersion,
  base,
  contentMutationLocked,
  contentVersionSnapshot,
  lesson,
  lessonPayload,
  questionGeneration,
  questionPoolAbortRef,
  saveDraft,
  setNotice,
  setQuestionGeneration,
}) {
  const resolveKnowledgeAssessmentContext = (knowledgePointId) => {
    const isComposite = knowledgePointId === "composite";
    const knowledgePoint = isComposite
      ? {
          id: "composite",
          name: trans(
            "adaptiveLearning.assessment.compositeScopeName",
            "整课综合",
          ),
        }
      : lesson.knowledgePoints.find((item) => item.id === knowledgePointId);
    const sourceContent = readTeacherContent()[lesson.id] || base;
    return {
      isComposite,
      knowledgePoint,
      sourceContent,
      assessmentMatrix: sourceContent.assessmentMatrices?.[knowledgePointId],
    };
  };

  const generateQuestionSet = async (
    mode,
    teacherInstruction,
    requestedScope = mode,
  ) => {
    const sourceContent = readTeacherContent()[lesson.id] || base;
    const sourceSnapshot = contentVersionSnapshot();
    const generationScope =
      mode === "pre"
        ? "pre"
        : requestedScope === "review"
          ? "review"
          : "practice";
    setQuestionGeneration({
      mode,
      scope: generationScope,
      status: {
        message: trans(
          "adaptiveLearning.assessment.submittingGeneration",
          "正在提交生成任务",
        ),
      },
      error: "",
    });
    setNotice("");
    try {
      if (contentMutationLocked)
        throw new Error(
          trans(
            "adaptiveLearning.assessment.questionRegenerationLocked",
            "整课后台任务正在处理，完成后才能重新生成题目",
          ),
        );
      const payload =
        mode === "pre"
          ? {
              purpose: "pre",
              lesson: lessonPayload,
              knowledgePoints: lesson.knowledgePoints,
              count: buildPreAssessmentBlueprint(lesson.knowledgePoints).length,
              diagnosticBlueprintSlots: buildPreAssessmentBlueprint(
                lesson.knowledgePoints,
              ),
              teacherInstruction,
            }
          : {
              purpose: "post",
              lesson: lessonPayload,
              knowledgePoints: lesson.knowledgePoints,
              countPerKnowledgePoint: PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
              reviewCount: COMPOSITE_REVIEW_POOL_SIZE,
              teacherInstruction,
            };
      const updateProgress = (status) =>
        setQuestionGeneration({
          mode,
          scope: generationScope,
          status,
          error: "",
        });
      const existingKnowledgeQuestions = sourceContent.postQuestions.filter(
        (item) => item.phase !== "review",
      );
      const existingReviewQuestions = sourceContent.postQuestions.filter(
        (item) => item.phase === "review",
      );
      const response =
        mode === "pre"
          ? await generateQuestionsWithRetry(
              payload,
              updateProgress,
              (result) =>
                ensureUniqueQuestionStems([
                  ...result.questions,
                  ...sourceContent.postQuestions,
                ]),
            )
          : await generatePracticeQuestionsByKnowledgePoint(
              {
                lesson: lessonPayload,
                knowledgePoints: lesson.knowledgePoints,
                teacherInstruction,
                generationScope:
                  generationScope === "review" ? "review" : "knowledge",
                existingQuestions: [
                  ...sourceContent.preQuestions,
                  ...(generationScope === "review"
                    ? existingKnowledgeQuestions
                    : existingReviewQuestions),
                ],
                assessmentMatrices: sourceContent.assessmentMatrices || {},
              },
              updateProgress,
            );
      const nextQuestions =
        mode === "pre"
          ? response.questions
          : generationScope === "review"
            ? [
                ...existingKnowledgeQuestions,
                ...response.questions.map((item) => ({
                  ...item,
                  phase: "review",
                })),
              ]
            : [
                ...response.questions.filter((item) => item.phase !== "review"),
                ...existingReviewQuestions,
              ];
      assertContentVersion(sourceSnapshot);
      saveDraft({
        [mode === "pre" ? "preQuestions" : "postQuestions"]: nextQuestions,
        version: sourceSnapshot.version + 1,
      });
      setQuestionGeneration({ mode: "", scope: "", status: null, error: "" });
      const scopeLabel =
        generationScope === "pre"
          ? trans(
              "adaptiveLearning.assessment.preAssessmentQuestions",
              "课前测验题",
            )
          : generationScope === "review"
            ? trans(
                "adaptiveLearning.assessment.compositePracticeQuestions",
                "综合练习题",
              )
            : trans(
                "adaptiveLearning.assessment.knowledgeQuestionPool",
                "单点题池",
              );
      const message = trans(
        "adaptiveLearning.assessment.questionSetGenerated",
        "已生成{$scope}，可直接查看和调整",
        { scope: scopeLabel },
      );
      setNotice(message);
      return { ok: true, message, count: response.questions.length };
    } catch (error) {
      setQuestionGeneration({
        mode: "",
        scope: "",
        status: null,
        error: error.message,
      });
      setNotice(
        noticeMessage(
          "error",
          error.message ||
            trans(
              "adaptiveLearning.assessment.questionGenerationFailed",
              "题目生成失败",
            ),
        ),
      );
      return { ok: false, message: error.message };
    }
  };

  const generateKnowledgePointAssessmentMatrix = async (knowledgePointId) => {
    const { isComposite, knowledgePoint, sourceContent } =
      resolveKnowledgeAssessmentContext(knowledgePointId);
    if (!knowledgePoint) return;
    const sourceSnapshot = contentVersionSnapshot();
    setQuestionGeneration({
      mode: "knowledge-matrix",
      scope: knowledgePointId,
      status: {
        message: trans(
          "adaptiveLearning.assessment.generatingMatrixFor",
          "正在为“{$name}”生成评估矩阵",
          { name: knowledgePoint.name },
        ),
      },
      error: "",
    });
    setNotice("");
    try {
      if (contentMutationLocked)
        throw new Error(
          trans(
            "adaptiveLearning.assessment.matrixGenerationLocked",
            "整课后台任务正在处理，完成后才能生成评估矩阵",
          ),
        );
      const response = await generateAssessmentMatrices({
        lesson: lessonPayload,
        knowledgePoints: [knowledgePoint],
        teacherInstruction: isComposite
          ? "生成整课综合能力的稀疏评估矩阵，覆盖整课各知识点的综合应用、问题解决与迁移建构，不生成题目。"
          : "独立生成该知识点的稀疏评估矩阵，不生成题目。",
      });
      const assessmentMatrix =
        response.assessmentMatrix ||
        response.assessmentMatrices?.[knowledgePointId] ||
        response.assessmentMatrices?.composite;
      if (!assessmentMatrix?.cells?.length)
        throw new Error(
          trans(
            "adaptiveLearning.assessment.noUsableMatrix",
            "AI 未返回可用评估矩阵，请重新生成",
          ),
        );
      assertContentVersion(sourceSnapshot);
      const saved = saveDraft({
        assessmentMatrices: {
          ...sourceContent.assessmentMatrices,
          [knowledgePointId]: assessmentMatrix,
        },
        assessmentQuestionSlots: Object.fromEntries(
          Object.entries(sourceContent.assessmentQuestionSlots || {}).filter(
            ([id]) => id !== knowledgePointId,
          ),
        ),
        version: sourceSnapshot.version + 1,
      });
      if (!saved)
        throw new Error(
          trans(
            "adaptiveLearning.assessment.matrixReadOnly",
            "当前内容暂时只读，评估矩阵未保存",
          ),
        );
      setNotice(
        trans(
          "adaptiveLearning.assessment.matrixSaved",
          "“{$name}”评估矩阵已保存到草稿，原题池未改动",
          { name: knowledgePoint.name },
        ),
      );
    } catch (error) {
      setNotice(
        noticeMessage(
          "error",
          error.message ||
            trans(
              "adaptiveLearning.assessment.matrixGenerationFailed",
              "评估矩阵生成失败",
            ),
        ),
      );
    } finally {
      setQuestionGeneration({ mode: "", scope: "", status: null, error: "" });
    }
  };

  const generateKnowledgePointQuestionSlots = async (knowledgePointId) => {
    const { isComposite, knowledgePoint, sourceContent, assessmentMatrix } =
      resolveKnowledgeAssessmentContext(knowledgePointId);
    if (!knowledgePoint) return;
    if (!assessmentMatrix?.cells?.length) {
      setNotice(
        noticeMessage(
          "warning",
          trans(
            "adaptiveLearning.assessment.generateAndConfirmMatrixFirst",
            "请先生成并确认该评估矩阵",
          ),
        ),
      );
      return;
    }
    const sourceSnapshot = contentVersionSnapshot();
    setQuestionGeneration({
      mode: "knowledge-slots",
      scope: knowledgePointId,
      status: {
        message: trans(
          "adaptiveLearning.planningQuestionSlots",
          "正在为“{$name}”规划题目插槽",
          { name: knowledgePoint.name },
        ),
      },
      error: "",
    });
    setNotice("");
    try {
      if (contentMutationLocked)
        throw new Error(
          trans(
            "adaptiveLearning.slotPlanningLocked",
            "整课后台任务正在处理，完成后才能生成题目插槽",
          ),
        );
      const response = await generateAssessmentQuestionSlots({
        lesson: lessonPayload,
        knowledgePoints: [knowledgePoint],
        assessmentMatrices: { [knowledgePointId]: assessmentMatrix },
        teacherInstruction: isComposite
          ? "根据已确认的整课综合评估矩阵独立规划题目插槽，不生成题目。"
          : "根据已确认的知识点评估矩阵独立规划题目插槽，不生成题目。",
      });
      const slots = response.assessmentQuestionSlots?.[knowledgePointId] || [];
      if (slots.length === 0)
        throw new Error(
          trans(
            "adaptiveLearning.noUsableQuestionSlots",
            "AI 未返回可用题目插槽，请重新生成",
          ),
        );
      assertContentVersion(sourceSnapshot);
      const currentContent = readTeacherContent()[lesson.id] || sourceContent;
      const saved = saveDraft({
        assessmentQuestionSlots: {
          ...currentContent.assessmentQuestionSlots,
          [knowledgePointId]: slots,
        },
        version: Number(currentContent.version || 0) + 1,
      });
      if (!saved)
        throw new Error(
          trans(
            "adaptiveLearning.questionSlotsReadOnly",
            "当前内容暂时只读，题目插槽未保存",
          ),
        );
      setNotice(
        trans(
          "adaptiveLearning.questionSlotsSaved",
          "已根据“{$name}”评估矩阵规划并保存 {$count} 个题目插槽，尚未生成题目",
          { name: knowledgePoint.name, count: slots.length },
        ),
      );
    } catch (error) {
      setNotice(
        noticeMessage(
          "error",
          error.message ||
            trans(
              "adaptiveLearning.questionSlotPlanningFailed",
              "题目插槽规划失败",
            ),
        ),
      );
    } finally {
      setQuestionGeneration({ mode: "", scope: "", status: null, error: "" });
    }
  };

  const generateKnowledgePointQuestionPool = async (knowledgePointId) => {
    const { isComposite, knowledgePoint, sourceContent, assessmentMatrix } =
      resolveKnowledgeAssessmentContext(knowledgePointId);
    if (!knowledgePoint) return;
    if (!assessmentMatrix?.cells?.length) {
      setNotice(
        noticeMessage(
          "warning",
          trans(
            "adaptiveLearning.assessment.generateAndConfirmMatrixFirst",
            "请先生成并确认该评估矩阵",
          ),
        ),
      );
      return;
    }
    const blueprintSlots =
      sourceContent.assessmentQuestionSlots?.[knowledgePointId] || [];
    if (blueprintSlots.length === 0) {
      setNotice(
        noticeMessage(
          "warning",
          trans(
            "adaptiveLearning.assessment.generateAndConfirmSlotsFirst",
            "请先根据评估矩阵生成并确认题目插槽",
          ),
        ),
      );
      return;
    }
    const previousSlots =
      questionGeneration.scope === knowledgePointId
        ? questionGeneration.slots || []
        : [];
    const retrySlotIds = new Set(
      previousSlots
        .filter((slot) => ["failed", "stopped"].includes(slot.status))
        .map((slot) => slot.id),
    );
    const retryingPartialRun =
      questionGeneration.scope === knowledgePointId &&
      questionGeneration.phase === "partial" &&
      retrySlotIds.size > 0;
    const slotsToGenerate = retryingPartialRun
      ? blueprintSlots.filter((slot) => retrySlotIds.has(slot.id))
      : blueprintSlots;
    const initialSlots = blueprintSlots.map((slot) => {
      const previous = previousSlots.find((item) => item.id === slot.id);
      const retainSuccess =
        retryingPartialRun && previous?.status === "success";
      return {
        id: slot.id,
        status: retainSuccess
          ? "success"
          : slotsToGenerate.some((item) => item.id === slot.id)
            ? "pending"
            : "stopped",
        questionId: retainSuccess ? previous.questionId : "",
        error: "",
      };
    });
    questionPoolAbortRef.current?.abort();
    const controller = new AbortController();
    questionPoolAbortRef.current = controller;
    setQuestionGeneration({
      mode: "knowledge-questions",
      scope: knowledgePointId,
      phase: "running",
      status: {
        message: trans(
          "adaptiveLearning.assessment.preparingSlotGeneration",
          "准备按“{$name}”评估矩阵并发生成题目",
          { name: knowledgePoint.name },
        ),
      },
      slots: initialSlots,
      error: "",
    });
    setNotice("");
    let successCount = initialSlots.filter(
      (slot) => slot.status === "success",
    ).length;
    let failedCount = 0;
    let completedCount = 0;
    const updateSlot = (slotId, patch) =>
      setQuestionGeneration((current) => ({
        ...current,
        slots: (current.slots || []).map((slot) =>
          slot.id === slotId ? { ...slot, ...patch } : slot,
        ),
      }));
    const persistGeneratedQuestion = (slot, response) => {
      if (
        response.questions?.length !== 1 ||
        response.questions[0]?.blueprintSlotId !== slot.id
      ) {
        throw new Error(
          trans(
            "adaptiveLearning.assessment.generatedQuestionSlotMismatch",
            "返回题目没有匹配当前插槽",
          ),
        );
      }
      const generatedQuestion = response.questions[0];
      const saved = saveDraft((currentLesson) => {
        const currentQuestions = currentLesson.postQuestions || [];
        const duplicateStem = currentQuestions.some(
          (question) =>
            normalizedQuestionStem(question) &&
            normalizedQuestionStem(question) ===
              normalizedQuestionStem(generatedQuestion),
        );
        if (duplicateStem)
          throw new Error(
            trans(
              "adaptiveLearning.assessment.duplicateQuestionStem",
              "题干与已有题目重复",
            ),
          );
        return {
          postQuestions: appendQuestionBoundToSlot({
            existingQuestions: currentQuestions,
            generatedQuestion,
            slotId: slot.id,
            isComposite,
          }),
          version: Number(currentLesson.version || 0) + 1,
        };
      });
      if (!saved)
        throw new Error(
          trans(
            "adaptiveLearning.assessment.generatedQuestionReadOnly",
            "当前内容暂时只读，生成题目未保存",
          ),
        );
      return generatedQuestion;
    };
    try {
      if (contentMutationLocked)
        throw new Error(
          trans(
            "adaptiveLearning.assessment.questionPoolGenerationLocked",
            "整课后台任务正在处理，完成后才能生成题池",
          ),
        );
      const slotsById = new Map(slotsToGenerate.map((slot) => [slot.id, slot]));
      let stopped = false;
      try {
        await generateQuestionSlotsConcurrently(
          {
            purpose: isComposite ? "review" : "post",
            lesson: lessonPayload,
            knowledgePoints: [knowledgePoint],
            countPerKnowledgePoint: isComposite ? 0 : 1,
            reviewCount: isComposite ? 1 : 0,
            assessmentMatrices: { [knowledgePointId]: assessmentMatrix },
            skipAssessmentMatrixPlanning: true,
            poolBlueprintSlots: slotsToGenerate,
            teacherInstruction: isComposite
              ? "按每个整课综合评估矩阵插槽独立生成一道综合题目，不修改矩阵或插槽。"
              : "按每个评估矩阵插槽独立生成一道证据题，不修改矩阵或插槽。",
          },
          {
            signal: controller.signal,
            onEvent: (event) => {
              const slot = slotsById.get(event.slotId);
              if (event.type === "status") {
                setQuestionGeneration((current) => ({
                  ...current,
                  status: {
                    message: trans(
                      "adaptiveLearning.assessment.slotEventProgress",
                      "{$message} · 共 {$count} 个插槽",
                      {
                        message: event.message,
                        count: slotsToGenerate.length,
                      },
                    ),
                  },
                }));
                return;
              }
              if (!slot) return;
              if (event.type === "slot-started") {
                updateSlot(slot.id, { status: "running", error: "" });
                return;
              }
              if (event.type === "slot-complete") {
                try {
                  const generatedQuestion = persistGeneratedQuestion(
                    slot,
                    event.data || {},
                  );
                  successCount += 1;
                  updateSlot(slot.id, {
                    status: "success",
                    questionId: generatedQuestion.id,
                    error: "",
                  });
                } catch (error) {
                  failedCount += 1;
                  updateSlot(slot.id, {
                    status: "failed",
                    error:
                      slotQuestionAppendIssueMessage(error) ||
                      trans(
                        "adaptiveLearning.assessment.saveFailed",
                        "保存失败",
                      ),
                  });
                }
                completedCount += 1;
              } else if (event.type === "slot-error") {
                failedCount += 1;
                completedCount += 1;
                updateSlot(slot.id, {
                  status: "failed",
                  error:
                    event.message ||
                    trans(
                      "adaptiveLearning.assessment.slotGenerationFailed",
                      "生成失败",
                    ),
                });
              }
              setQuestionGeneration((current) => ({
                ...current,
                status: {
                  message: trans(
                    "adaptiveLearning.assessment.parallelGenerationProgress",
                    "并发生成 · 已完成 {$completed} / {$total}",
                    {
                      completed: completedCount,
                      total: slotsToGenerate.length,
                    },
                  ),
                },
              }));
            },
          },
        );
      } catch (error) {
        if (isGenerationCancelled(error) || controller.signal.aborted)
          stopped = true;
        else throw error;
      }
      stopped = stopped || controller.signal.aborted;
      setQuestionGeneration((current) => ({
        ...current,
        phase: stopped || failedCount > 0 ? "partial" : "completed",
        status: {
          message: stopped
            ? trans(
                "adaptiveLearning.assessment.generationStoppedStatus",
                "生成已停止，已成功题目均已保留",
              )
            : failedCount > 0
              ? trans(
                  "adaptiveLearning.assessment.partialSlotFailureStatus",
                  "部分插槽生成失败，可单独重试",
                )
              : trans(
                  "adaptiveLearning.assessment.allSlotsGeneratedStatus",
                  "矩阵要求的全部插槽已生成",
                ),
        },
        slots: (current.slots || []).map((slot) =>
          stopped && ["pending", "running"].includes(slot.status)
            ? { ...slot, status: "stopped" }
            : slot,
        ),
      }));
      if (stopped)
        setNotice(
          noticeMessage(
            "warning",
            trans(
              "adaptiveLearning.assessment.generationStoppedNotice",
              "已停止生成，保留 {$count} 道已生成题目",
              { count: successCount },
            ),
          ),
        );
      else if (failedCount > 0)
        setNotice(
          noticeMessage(
            "warning",
            trans(
              "adaptiveLearning.assessment.partialSlotFailureNotice",
              "{$success} 道题已保存，{$failed} 个插槽生成失败，可单独重试",
              { success: successCount, failed: failedCount },
            ),
          ),
        );
      else
        setNotice(
          trans(
            "adaptiveLearning.assessment.questionsSavedFromSlots",
            "已按矩阵要求生成并保存 {$count} 道题，矩阵未改动",
            { count: successCount },
          ),
        );
    } catch (error) {
      if (!isGenerationCancelled(error))
        setNotice(
          noticeMessage(
            "error",
            error.message ||
              trans(
                "adaptiveLearning.assessment.questionPoolGenerationFailed",
                "题池生成失败",
              ),
          ),
        );
    } finally {
      if (questionPoolAbortRef.current === controller)
        questionPoolAbortRef.current = null;
    }
  };

  const stopKnowledgePointQuestionPool = () => {
    questionPoolAbortRef.current?.abort(generationCancelledError());
  };

  return {
    generateQuestionSet,
    generateKnowledgePointAssessmentMatrix,
    generateKnowledgePointQuestionSlots,
    generateKnowledgePointQuestionPool,
    stopKnowledgePointQuestionPool,
  };
}
