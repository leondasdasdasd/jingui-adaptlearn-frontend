/* eslint-disable complexity, sonarjs/cognitive-complexity, unicorn/consistent-function-scoping -- 整课生成的内部合并函数只服务同一运行上下文，不扩展为第二套公共入口。 */
import {
  buildPreAssessmentBlueprint,
  diagnosticSlotForQuestion,
} from "../../shared/domain/preAssessmentBlueprint";
import {
  COMPOSITE_REVIEW_POOL_SIZE,
  PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
} from "../../shared/domain/questionPoolPolicy";
import { buildParallelLessonGenerationLanes } from "../domain/lessonContentGeneration";
import {
  ensureUniqueQuestionStems,
  generateQuestionsWithRetry,
  generationCancelledError,
  isGenerationCancelled,
} from "./teacherContentRouteSupport";

/**
 *
 * @param root0
 * @param root0.activeOpenMaicJobsRef
 * @param root0.base
 * @param root0.createOpenMaicRuntime
 * @param root0.generationAbortRef
 * @param root0.generationRunRef
 * @param root0.lesson
 * @param root0.lessonPayload
 * @param root0.persistDraftContent
 * @param root0.saveOpenMaicJobCheckpoint
 * @param root0.setLessonGeneration
 * @param root0.setModuleStatus
 * @param root0.setOpenMaicJob
 * @param root0.setQuestionGeneration
 * @param root0.storedLearningContent
 */
export function createTeacherContentGenerationActions({
  createOpenMaicRuntime,
  generationAbortRef,
  generationRunRef,
  lesson,
  lessonPayload,
  persistDraftContent,
  setLessonGeneration,
  setModuleStatus,
  setOpenMaicJob,
  setQuestionGeneration,
}) {
  const friendlyTaskError = (error, stage) => {
    const raw = String(error?.message || "");
    const unavailable =
      raw === "Failed to fetch" ||
      /fetch|network|网络|课堂服务请求失败（5\d\d）/i.test(raw) ||
      [500, 502, 503, 504].includes(Number(error?.status));
    if (unavailable) {
      if (stage === "validation")
        return "内容已生成，但暂时无法完成校验。已生成内容已保存，请稍后重新校验。";
      return "生成服务暂时无法连接，已完成内容已经保存，可以稍后继续补全。";
    }
    return (
      raw ||
      (stage === "validation" ? "暂时无法完成内容校验" : "内容生成暂未完成")
    );
  };

  const mergeLearningRuntime = (content, scope, nextRuntime) => {
    const currentLearningContent = content.learningContent || {
      composite: content.openMaic || null,
      knowledgePoints: [],
    };
    return {
      ...content,
      learningContent:
        scope === "composite"
          ? { ...currentLearningContent, composite: nextRuntime }
          : {
              ...currentLearningContent,
              knowledgePoints: [
                ...(currentLearningContent.knowledgePoints || []).filter(
                  (item) => item.knowledgeObjectiveId !== scope,
                ),
                { knowledgeObjectiveId: scope, openMaic: nextRuntime },
              ],
            },
      openMaicJob: null,
      lastInstruction: nextRuntime.teacherInstruction || "",
    };
  };

  const generateQuestionAction = async (action, content, runId) => {
    const updateProgress = (status) => {
      if (generationRunRef.current !== runId) return;
      setQuestionGeneration({
        mode: "whole-lesson",
        scope: "whole",
        status,
        error: "",
      });
      const elapsed = Number(status?.elapsedSeconds || 0);
      const elapsedCopy =
        elapsed >= 5 ? ` · 已等待 ${elapsed} 秒，可随时取消并保留已有内容` : "";
      setLessonGeneration((current) => ({
        ...current,
        message: `${status?.message || current.message}${elapsedCopy}`,
      }));
    };
    const applyTargetedReplacements = (existing, candidates) => {
      const targetIds = action.targetQuestionIds || [];
      if (targetIds.length === 0) return candidates;
      const targets = new Set(targetIds);
      let candidateIndex = 0;
      return existing.map((question) => {
        if (!targets.has(question.id)) return question;
        const replacement = candidates[candidateIndex];
        candidateIndex += 1;
        return replacement
          ? {
              ...replacement,
              id: question.id,
              phase: question.phase,
              purpose: question.purpose,
            }
          : question;
      });
    };
    const retainedQuestions = (questions) => {
      const targets = new Set(action.targetQuestionIds || []);
      if (targets.size === 0) return [];
      return questions.filter((question) => !targets.has(question.id));
    };
    const repairInstruction = (questions) => {
      if (!action.qualityIssues?.length) return "";
      const issueCopy = action.qualityIssues
        .map((issue) => issue.message)
        .filter(Boolean)
        .join("；");
      const forbiddenStems = questions
        .map((question) => String(question.stem || "").trim())
        .filter(Boolean)
        .slice(0, 60);
      return `这是发布前自动返修。必须解决：${issueCopy}。不要复用下列已有题干或只替换数字改写：${JSON.stringify(forbiddenStems)}`;
    };
    if (action.mode === "pre") {
      const existingPre = content.preQuestions || [];
      const targetIds = new Set(action.targetQuestionIds || []);
      const replacementSlots = existingPre
        .filter((question) => targetIds.has(question.id))
        .map((question) => diagnosticSlotForQuestion(question))
        .filter(Boolean);
      const diagnosticBlueprintSlots = action.targetBlueprintSlots?.length
        ? action.targetBlueprintSlots
        : replacementSlots.length > 0
          ? replacementSlots
          : buildPreAssessmentBlueprint(lesson.knowledgePoints);
      const isSlotAppend =
        targetIds.size === 0 && action.targetBlueprintSlots?.length > 0;
      const targetSlotIds = new Set(
        diagnosticBlueprintSlots.map((item) => item.id),
      );
      const protectedPre = isSlotAppend
        ? existingPre
        : retainedQuestions(existingPre);
      const protectedQuestions = [
        ...protectedPre,
        ...(content.postQuestions || []),
      ];
      const response = await generateQuestionsWithRetry(
        {
          purpose: "pre",
          lesson: lessonPayload,
          knowledgePoints: lesson.knowledgePoints,
          count: diagnosticBlueprintSlots.length,
          diagnosticBlueprintSlots,
          targetQuestionIds: action.targetQuestionIds || [],
          generationTaskType: "repair",
          teacherInstruction: repairInstruction(protectedQuestions),
        },
        updateProgress,
        (result) =>
          ensureUniqueQuestionStems([
            ...result.questions,
            ...protectedQuestions,
          ]),
        generationAbortRef.current?.signal,
      );
      return {
        ...content,
        preQuestions: isSlotAppend
          ? [
              ...existingPre.filter((question) => {
                const slot = diagnosticSlotForQuestion(question);
                return !slot || !targetSlotIds.has(slot.id);
              }),
              ...response.questions,
            ]
          : applyTargetedReplacements(existingPre, response.questions),
      };
    }

    if (action.mode === "knowledge") {
      const knowledgePoint = lesson.knowledgePoints.find(
        (item) => item.id === action.scope,
      );
      const preserved = (content.postQuestions || []).filter(
        (question) =>
          question.phase === "review" ||
          !(
            (question.knowledgePointIds ||
              question.knowledgeObjectiveIds ||
              [])[0] === action.scope
          ),
      );
      const existingScope = (content.postQuestions || []).filter(
        (question) =>
          question.phase !== "review" &&
          (question.knowledgePointIds ||
            question.knowledgeObjectiveIds ||
            [])[0] === action.scope,
      );
      const protectedQuestions = [
        ...preserved,
        ...retainedQuestions(existingScope),
      ];
      const response = await generateQuestionsWithRetry(
        {
          purpose: "post",
          lesson: lessonPayload,
          knowledgePoints: [knowledgePoint],
          countPerKnowledgePoint:
            action.targetQuestionIds?.length ||
            PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
          reviewCount: 0,
          targetQuestionIds: action.targetQuestionIds || [],
          teacherInstruction: repairInstruction(protectedQuestions),
        },
        updateProgress,
        (result) =>
          ensureUniqueQuestionStems([
            ...protectedQuestions,
            ...result.questions,
          ]),
        generationAbortRef.current?.signal,
      );
      if (generationRunRef.current !== runId) throw generationCancelledError();
      const review = preserved.filter(
        (question) => question.phase === "review",
      );
      const otherKnowledge = preserved.filter(
        (question) => question.phase !== "review",
      );
      const nextScope = applyTargetedReplacements(
        existingScope,
        response.questions,
      );
      return {
        ...content,
        postQuestions: [...otherKnowledge, ...nextScope, ...review],
      };
    }

    const knowledgeQuestions = (content.postQuestions || []).filter(
      (question) => question.phase !== "review",
    );
    const existingReview = (content.postQuestions || []).filter(
      (question) => question.phase === "review",
    );
    const protectedQuestions = [
      ...knowledgeQuestions,
      ...retainedQuestions(existingReview),
    ];
    const response = await generateQuestionsWithRetry(
      {
        purpose: "post",
        lesson: lessonPayload,
        knowledgePoints: lesson.knowledgePoints,
        countPerKnowledgePoint: 0,
        reviewCount:
          action.targetQuestionIds?.length || COMPOSITE_REVIEW_POOL_SIZE,
        targetQuestionIds: action.targetQuestionIds || [],
        teacherInstruction: repairInstruction(protectedQuestions),
      },
      updateProgress,
      (result) =>
        ensureUniqueQuestionStems([...protectedQuestions, ...result.questions]),
      generationAbortRef.current?.signal,
    );
    const candidates = response.questions.map((question) => ({
      ...question,
      phase: "review",
    }));
    return {
      ...content,
      postQuestions: [
        ...knowledgeQuestions,
        ...applyTargetedReplacements(existingReview, candidates),
      ],
    };
  };

  const mergeGeneratedActionContent = (current, action, generated) => {
    if (action.type === "openmaic") {
      const generatedLearning = generated.learningContent || {};
      const runtime =
        action.scope === "composite"
          ? generatedLearning.composite
          : (generatedLearning.knowledgePoints || []).find(
              (item) => item.knowledgeObjectiveId === action.scope,
            )?.openMaic;
      return runtime
        ? mergeLearningRuntime(current, action.scope, runtime)
        : current;
    }
    if (action.mode === "pre")
      return { ...current, preQuestions: generated.preQuestions || [] };
    if (action.mode === "knowledge") {
      const generatedQuestions = (generated.postQuestions || []).filter(
        (question) =>
          question.phase !== "review" &&
          (question.knowledgePointIds ||
            question.knowledgeObjectiveIds ||
            [])[0] === action.scope,
      );
      const currentQuestions = (current.postQuestions || []).filter(
        (question) =>
          question.phase === "review" ||
          (question.knowledgePointIds ||
            question.knowledgeObjectiveIds ||
            [])[0] !== action.scope,
      );
      const review = currentQuestions.filter(
        (question) => question.phase === "review",
      );
      return {
        ...current,
        postQuestions: [
          ...currentQuestions.filter((question) => question.phase !== "review"),
          ...generatedQuestions,
          ...review,
        ],
      };
    }
    const currentKnowledgeQuestions = (current.postQuestions || []).filter(
      (question) => question.phase !== "review",
    );
    const generatedReview = (generated.postQuestions || []).filter(
      (question) => question.phase === "review",
    );
    return {
      ...current,
      postQuestions: [...currentKnowledgeQuestions, ...generatedReview],
    };
  };

  const runGenerationActions = async (
    actions,
    initialContent,
    phase,
    runId,
  ) => {
    let workingContent = initialContent;
    const failures = [];
    let completedCount = 0;
    let commitQueue = Promise.resolve();
    for (const action of actions) setModuleStatus(action.moduleIds, "queued");
    const runLane = async (laneActions, concurrency) => {
      let cursor = 0;
      const runner = async () => {
        while (
          cursor < laneActions.length &&
          generationRunRef.current === runId
        ) {
          const index = cursor;
          cursor += 1;
          const action = laneActions[index];
          const startedAt = Date.now();
          setModuleStatus(action.moduleIds, "generating");
          setLessonGeneration((current) => ({
            ...current,
            phase,
            message: `${phase === "repairing" ? "正在并行修改问题内容" : "MAIC 和题目子任务正在并行生成"} · 已完成 ${completedCount}/${actions.length}`,
            moduleProgress: {
              ...current.moduleProgress,
              ...Object.fromEntries(
                action.moduleIds.map((moduleId) => [
                  moduleId,
                  {
                    ...current.moduleProgress?.[moduleId],
                    status: "generating",
                    startedAt: new Date(startedAt).toISOString(),
                    updatedAt: new Date(startedAt).toISOString(),
                  },
                ]),
              ),
            },
          }));
          try {
            const snapshot = workingContent;
            let generated;
            if (action.type === "questions") {
              generated = await generateQuestionAction(action, snapshot, runId);
            } else {
              const runtime = await createOpenMaicRuntime(action.scope, runId);
              generated = mergeLearningRuntime(snapshot, action.scope, runtime);
              setOpenMaicJob(runtime);
            }
            commitQueue = commitQueue.then(() => {
              if (generationRunRef.current !== runId) return null;
              workingContent = mergeGeneratedActionContent(
                workingContent,
                action,
                generated,
              );
              workingContent = persistDraftContent(workingContent, {
                version: Number(workingContent.version || 0) + 1,
              });
              completedCount += 1;
              setModuleStatus(action.moduleIds, "ready");
              setLessonGeneration((current) => ({
                ...current,
                message: `已完成 ${completedCount}/${actions.length} 个子任务，结果已保存到草稿`,
                moduleProgress: {
                  ...current.moduleProgress,
                  ...Object.fromEntries(
                    action.moduleIds.map((moduleId) => [
                      moduleId,
                      {
                        ...current.moduleProgress?.[moduleId],
                        status: "ready",
                        progress: 100,
                        durationSeconds: Math.max(
                          1,
                          Math.round((Date.now() - startedAt) / 1000),
                        ),
                        updatedAt: new Date().toISOString(),
                      },
                    ]),
                  ),
                },
              }));
              return null;
            });
            await commitQueue;
          } catch (error) {
            if (
              isGenerationCancelled(error) ||
              generationRunRef.current !== runId
            ) {
              setModuleStatus(action.moduleIds, "missing");
              continue;
            }
            setModuleStatus(action.moduleIds, "failed");
            setLessonGeneration((current) => ({
              ...current,
              moduleProgress: {
                ...current.moduleProgress,
                ...Object.fromEntries(
                  action.moduleIds.map((moduleId) => [
                    moduleId,
                    {
                      ...current.moduleProgress?.[moduleId],
                      status: "failed",
                      durationSeconds: Math.max(
                        1,
                        Math.round((Date.now() - startedAt) / 1000),
                      ),
                      updatedAt: new Date().toISOString(),
                    },
                  ]),
                ),
              },
            }));
            failures.push({
              code: "GENERATION_FAILED",
              message: friendlyTaskError(error, "generation"),
              moduleIds: action.moduleIds,
            });
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(concurrency, laneActions.length) }, () =>
          runner(),
        ),
      );
    };
    const lanes = buildParallelLessonGenerationLanes(actions);
    // 所有模块级任务同时起跑。以 3 个知识点为例：课前测 1 +
    // 单点题池 3 + 综合练习 1 + 单点 MAIC 3 + 综合 MAIC 1 = 9 路并发。
    // 两条通道只用于隔离进度与失败，不限制彼此的并发数。
    await Promise.all([
      runLane(lanes.questions, Math.max(1, lanes.questions.length)),
      runLane(lanes.openMaic, Math.max(1, lanes.openMaic.length)),
    ]);
    await commitQueue;
    setQuestionGeneration({ mode: "", scope: "", status: null, error: "" });
    return { content: workingContent, failures };
  };

  return {
    friendlyTaskError,
    mergeLearningRuntime,
    generateQuestionAction,
    mergeGeneratedActionContent,
    runGenerationActions,
  };
}
