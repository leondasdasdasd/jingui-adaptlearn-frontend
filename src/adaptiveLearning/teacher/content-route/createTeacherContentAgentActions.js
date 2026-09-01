import { planTeacherContentInstruction } from "../../lib/teacherContentAgentApi";
/* eslint-disable complexity, sonarjs/cognitive-complexity -- 教师 Agent 命令在一个工厂内保持唯一的计划、执行、质检与发布入口。 */
import {
  readTeacherContent,
  writeTeacherContent,
} from "../data/teacherContentRepository";
import { buildLessonGenerationModules } from "../domain/lessonContentGeneration";
import { teacherContentNoticeText } from "../presentation/teacherContentNoticePresentation";
import {
  generationCancelledError,
  isGenerationCancelled,
  noticeMessage,
} from "./teacherContentRouteSupport";

/**
 *
 * @param root0
 * @param root0.activeLearningScope
 * @param root0.assertContentVersion
 * @param root0.base
 * @param root0.checkedGenerationProposalMatchesCurrentDraft
 * @param root0.contentMutationLocked
 * @param root0.contentVersionSnapshot
 * @param root0.generateOpenMaic
 * @param root0.generateQuestionAction
 * @param root0.generateQuestionSet
 * @param root0.generateWholeLesson
 * @param root0.generationAbortRef
 * @param root0.generationRunRef
 * @param root0.lesson
 * @param root0.lessonGeneration
 * @param root0.lessonPayload
 * @param root0.openTeacherAgent
 * @param root0.persistDraftContent
 * @param root0.publishReadyContent
 * @param root0.publishing
 * @param root0.saveDraft
 * @param root0.setAllContent
 * @param root0.setLessonGeneration
 * @param root0.setNotice
 * @param root0.setPublishing
 * @param root0.setQuestionGeneration
 * @param root0.stopWholeLessonGeneration
 * @param root0.storedLearningContent
 * @param root0.teacherAgent
 * @param root0.runRequestedGeneration
 * @param root0.validateContent
 */
export function createTeacherContentAgentActions({
  activeLearningScope,
  assertContentVersion,
  base,
  checkedGenerationProposalMatchesCurrentDraft,
  contentMutationLocked,
  contentVersionSnapshot,
  generateOpenMaic,
  generateQuestionAction,
  generateQuestionSet,
  generateWholeLesson,
  generationAbortRef,
  generationRunRef,
  lesson,
  lessonGeneration,
  lessonPayload,
  openTeacherAgent,
  persistDraftContent,
  publishReadyContent,
  publishing,
  saveDraft,
  setAllContent,
  setLessonGeneration,
  setNotice,
  setPublishing,
  setQuestionGeneration,
  stopWholeLessonGeneration,
  storedLearningContent,
  teacherAgent,
  runRequestedGeneration,
  validateContent,
}) {
  const inspectCurrentLesson = async () => {
    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    generationAbortRef.current?.abort();
    generationAbortRef.current = new AbortController();
    const latest = readTeacherContent()[lesson.id] || base;
    setLessonGeneration((current) => ({
      ...current,
      operation: "fast_publish",
      phase: "validating",
      message: "正在快速检查题量、JSON 结构和重复题",
      issues: [],
    }));
    const result = await validateContent({
      ...latest,
      learningContent: latest.learningContent || storedLearningContent,
    });
    if (generationRunRef.current !== runId) throw generationCancelledError();
    const inspectedAt = new Date().toISOString();
    const reviewQuestions = (latest.postQuestions || []).filter(
      (question) => question.phase === "review",
    );
    const knowledgeQuestions = (latest.postQuestions || []).filter(
      (question) => question.phase !== "review",
    );
    const questionLabels = new Map([
      ...(latest.preQuestions || []).map((question, index) => [
        question.id,
        `课前测验第 ${index + 1} 题`,
      ]),
      ...knowledgeQuestions.map((question, index) => [
        question.id,
        `单点题池第 ${index + 1} 题`,
      ]),
      ...reviewQuestions.map((question, index) => [
        question.id,
        `综合练习第 ${index + 1} 题`,
      ]),
    ]);
    const visibleIssues = (result.issues || []).map((issue) => {
      const label = questionLabels.get(issue.questionId);
      if (!label || !issue.message) return issue;
      return {
        ...issue,
        message: issue.message.replace(
          `题目 ${issue.questionId}：`,
          `${label}：`,
        ),
      };
    });
    const visibleResult = { ...result, issues: visibleIssues };
    const qualityReport = {
      passed: result.passed,
      issues: visibleIssues,
      semanticReview: null,
      reviewMode: "fast-deterministic",
      checkedAt: inspectedAt,
    };
    const persistInspectionStatus = (inspectionStatus) => {
      setAllContent((current) => {
        const next = {
          ...current,
          [lesson.id]: {
            ...(current[lesson.id] || latest),
            inspectionStatus,
            qualityReport,
          },
        };
        writeTeacherContent(next);
        return next;
      });
    };
    if (result.passed) {
      persistInspectionStatus({
        passed: true,
        message: "快速检查通过，可以发布",
        issues: [],
        inspectedAt,
      });
      setLessonGeneration((current) => ({
        ...current,
        phase: latest.status === "published" ? "published" : "dirty",
        message: "快速检查通过，可以发布",
        issues: [],
        inspectedAt,
      }));
      setNotice("题量和结构检查通过，可以发布");
      return visibleResult;
    }
    persistInspectionStatus({
      passed: false,
      message: `检查发现 ${visibleIssues.length} 项需要处理`,
      issues: visibleIssues,
      inspectedAt,
    });
    setLessonGeneration((current) => ({
      ...current,
      phase: "dirty",
      message: `检查发现 ${visibleIssues.length} 项需要处理`,
      issues: visibleIssues,
      inspectedAt,
    }));
    setNotice({
      title: "快速检查发现以下问题：",
      items: visibleIssues.map((issue) => issue.message),
    });
    return visibleResult;
  };

  const removeQuestionTargets = async (questionIds) => {
    const targets = new Set(questionIds || []);
    const latest = readTeacherContent()[lesson.id] || base;
    const removedCount = [
      ...(latest.preQuestions || []),
      ...(latest.postQuestions || []),
    ].filter((question) => targets.has(question.id)).length;
    if (!removedCount)
      throw new Error("没有找到要删除的题目，内容可能已经发生变化");
    saveDraft({
      preQuestions: (latest.preQuestions || []).filter(
        (question) => !targets.has(question.id),
      ),
      postQuestions: (latest.postQuestions || []).filter(
        (question) => !targets.has(question.id),
      ),
      version: Number(latest.version || 0) + 1,
    });
    setNotice(`已删除 ${removedCount} 道题并保存到草稿`);
    return { removedCount };
  };

  const reviseQuestionTargets = async (questionIds, instruction) => {
    const targets = new Set(questionIds || []);
    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    generationAbortRef.current?.abort();
    generationAbortRef.current = new AbortController();
    let workingContent = readTeacherContent()[lesson.id] || base;
    const sourceSnapshot = contentVersionSnapshot();
    const preIds = (workingContent.preQuestions || [])
      .filter((question) => targets.has(question.id))
      .map((question) => question.id);
    const reviewIds = (workingContent.postQuestions || [])
      .filter(
        (question) => question.phase === "review" && targets.has(question.id),
      )
      .map((question) => question.id);
    const knowledgeGroups = new Map();
    for (const question of (workingContent.postQuestions || []).filter(
      (question) => question.phase !== "review" && targets.has(question.id),
    )) {
      const knowledgePointId = (question.knowledgePointIds ||
        question.knowledgeObjectiveIds ||
        [])[0];
      if (!knowledgeGroups.has(knowledgePointId))
        knowledgeGroups.set(knowledgePointId, []);
      knowledgeGroups.get(knowledgePointId).push(question.id);
    }
    const actions = [
      ...(preIds.length > 0
        ? [
            {
              mode: "pre",
              moduleIds: ["pre-assessment"],
              targetQuestionIds: preIds,
            },
          ]
        : []),
      ...[...knowledgeGroups.entries()].map(([scope, ids]) => ({
        mode: "knowledge",
        scope,
        moduleIds: [`knowledge-questions:${scope}`],
        targetQuestionIds: ids,
      })),
      ...(reviewIds.length > 0
        ? [
            {
              mode: "review",
              moduleIds: ["composite-review"],
              targetQuestionIds: reviewIds,
            },
          ]
        : []),
    ];
    if (actions.length === 0)
      throw new Error("没有找到要修改的题目，内容可能已经发生变化");
    setLessonGeneration((current) => ({
      ...current,
      phase: "repairing",
      message: `正在按要求改写 ${questionIds.length} 道题`,
      issues: [],
    }));
    try {
      for (const action of actions) {
        workingContent = await generateQuestionAction(
          {
            ...action,
            qualityIssues: [
              {
                message:
                  instruction || "按教师要求改写题目，并与现有题目保持明显差异",
              },
            ],
          },
          workingContent,
          runId,
        );
      }
      assertContentVersion(sourceSnapshot);
      persistDraftContent(workingContent, {
        version: sourceSnapshot.version + 1,
        lastInstruction: instruction,
      });
      setQuestionGeneration({ mode: "", scope: "", status: null, error: "" });
      setLessonGeneration((current) => ({
        ...current,
        phase: "dirty",
        message: `已改写 ${questionIds.length} 道题，等待教师检查`,
        issues: [],
      }));
      setNotice(`已按要求改写 ${questionIds.length} 道题并保存到草稿`);
      return { revisedCount: questionIds.length };
    } catch (error) {
      setQuestionGeneration({ mode: "", scope: "", status: null, error: "" });
      setLessonGeneration((current) => ({
        ...current,
        phase: "failed",
        message: error?.message || "题目改写没有完成，请基于最新内容重试",
      }));
      throw error;
    }
  };

  const knowledgeQuestions = base.postQuestions.filter(
    (item) => item.phase !== "review",
  );
  const reviewQuestions = base.postQuestions.filter(
    (item) => item.phase === "review",
  );
  const updatePostQuestionGroup = (phase, questions) =>
    saveDraft({
      postQuestions:
        phase === "review"
          ? [
              ...knowledgeQuestions,
              ...questions.map((item) => ({ ...item, phase: "review" })),
            ]
          : [
              ...questions.filter((item) => item.phase !== "review"),
              ...reviewQuestions,
            ],
      version: base.version + 1,
    });
  const activeScopeName =
    activeLearningScope === "composite"
      ? "复合学习课堂"
      : lesson.knowledgePoints.find((item) => item.id === activeLearningScope)
          ?.name || "单点学习课堂";
  const lessonGenerationModules = buildLessonGenerationModules({
    lesson,
    content: { ...base, learningContent: storedLearningContent },
  });
  const lessonGenerationRunning = [
    "generating",
    "validating",
    "repairing",
  ].includes(lessonGeneration.phase);
  const lessonGenerationComplete = lessonGenerationModules.every(
    (module) =>
      module.complete ||
      lessonGeneration.moduleStatuses?.[module.id] === "ready",
  );
  const teacherAgentQuestions = [
    ...base.preQuestions.map((question, index) => ({
      id: question.id,
      section: "pre",
      number: index + 1,
      stem: question.stem,
      type: question.type,
      difficulty: question.difficulty,
      knowledgePointIds:
        question.knowledgePointIds || question.knowledgeObjectiveIds || [],
    })),
    ...knowledgeQuestions.map((question, index) => ({
      id: question.id,
      section: "practice",
      number: index + 1,
      stem: question.stem,
      type: question.type,
      difficulty: question.difficulty,
      knowledgePointIds:
        question.knowledgePointIds || question.knowledgeObjectiveIds || [],
    })),
    ...reviewQuestions.map((question, index) => ({
      id: question.id,
      section: "review",
      number: index + 1,
      stem: question.stem,
      type: question.type,
      difficulty: question.difficulty,
      knowledgePointIds:
        question.knowledgePointIds || question.knowledgeObjectiveIds || [],
    })),
  ];
  const planTeacherAgentInstruction = (
    message,
    history,
    recentToolResult = null,
  ) =>
    planTeacherContentInstruction({
      message,
      history,
      context: {
        lesson: {
          id: lesson.id,
          title: lesson.title,
          chapterTitle: lessonPayload.chapterTitle,
          knowledgePoints: lesson.knowledgePoints,
        },
        activeScope: teacherAgent.scope,
        task: {
          phase: lessonGeneration.phase,
          message: lessonGeneration.message,
          issues: lessonGeneration.issues || [],
          running: lessonGenerationRunning,
        },
        modules: lessonGenerationModules.map((module) => ({
          id: module.id,
          kind: module.kind,
          label: module.label,
          complete:
            module.complete ||
            lessonGeneration.moduleStatuses?.[module.id] === "ready",
          currentCount: module.currentCount,
          requiredCount: module.requiredCount,
        })),
        questions: teacherAgentQuestions,
        publication: {
          status: base.status,
          version: base.version,
          updatedAt: base.updatedAt,
        },
        recentToolResult,
      },
    });

  const executeTeacherAgentStep = async (step) => {
    if (publishing && step.kind !== "inspect_lesson")
      throw new Error("当前正在发布，请等待发布完成后再修改内容");
    if (
      contentMutationLocked &&
      !["inspect_lesson", "cancel_generation"].includes(step.kind)
    ) {
      throw new Error(
        "整课后台任务正在处理；当前只支持查看状态、检查或停止任务，完成后再修改内容",
      );
    }
    if (step.kind === "inspect_lesson") return inspectCurrentLesson();
    if (step.kind === "generate_whole_lesson") {
      return generateWholeLesson({
        operation: step.kind,
        teacherInstruction: step.instruction,
      });
    }
    if (
      ["complete_missing_content", "repair_quality_issues"].includes(step.kind)
    ) {
      return runRequestedGeneration(step.kind, step.instruction);
    }
    if (step.kind === "generate_question_section") {
      const mode = step.scope === "pre" ? "pre" : "practice";
      const result = await generateQuestionSet(
        mode,
        step.instruction,
        step.scope,
      );
      if (result?.ok === false)
        throw new Error(result.message || "题目生成没有完成");
      return result;
    }
    if (step.kind === "revise_questions")
      return reviseQuestionTargets(step.questionIds, step.instruction);
    if (step.kind === "remove_questions")
      return removeQuestionTargets(step.questionIds);
    if (
      ["generate_learning_content", "revise_learning_content"].includes(
        step.kind,
      )
    ) {
      return generateOpenMaic(step.scope, step.instruction);
    }
    if (step.kind === "cancel_generation") return stopWholeLessonGeneration();
    throw new Error("这项操作暂未开放，请换一种方式描述");
  };
  const validateTeacherAgentPlan = async (plan) => {
    if (plan.baseLessonId && plan.baseLessonId !== lesson.id) {
      throw new Error("这份计划来自另一个课时，已停止执行");
    }
    const latest = readTeacherContent()[lesson.id] || base;
    if (
      plan.baseVersion !== null &&
      plan.baseVersion !== undefined &&
      Number(latest.version || 0) !== Number(plan.baseVersion)
    ) {
      throw new Error(
        "课时内容在计划生成后已发生变化，请基于最新内容重新发送要求",
      );
    }
    if (
      plan.baseUpdatedAt &&
      latest.updatedAt &&
      latest.updatedAt !== plan.baseUpdatedAt
    ) {
      throw new Error(
        "这份计划基于旧版本内容，已停止执行以避免覆盖教师的新修改",
      );
    }
  };
  const runInspection = async () => {
    try {
      return await inspectCurrentLesson();
    } catch (error) {
      if (isGenerationCancelled(error)) return null;
      const message = error?.message || "整课检查失败，请稍后重试";
      setLessonGeneration((current) => ({
        ...current,
        phase: "dirty",
        message,
      }));
      setNotice(noticeMessage("warning", message));
      return null;
    }
  };
  const completeCurrentLesson = async () => {
    if (publishing || lessonGenerationRunning || base.status === "published")
      return;
    openTeacherAgent("whole");
    setNotice("正在补齐当前缺失的题目或学习内容，完成后请预览结果");
    try {
      await runRequestedGeneration(
        "complete_missing_content",
        "只补齐当前明确缺失的内容，保留已经完成的题目和学习内容",
      );
    } catch (error) {
      setNotice(
        noticeMessage("error", error?.message || "自动补全未完成，请稍后重试"),
      );
    }
  };
  const publish = async () => {
    if (publishing || lessonGenerationRunning || base.status === "published")
      return;
    setPublishing(true);
    try {
      const checkedGenerationProposal =
        checkedGenerationProposalMatchesCurrentDraft();
      if (!checkedGenerationProposal) {
        setNotice("正在执行发布前快速检查…");
        const inspected = await runInspection();
        if (!inspected?.passed) {
          const issues = inspected?.issues || [];
          setNotice(
            issues.length > 0
              ? {
                  title: teacherContentNoticeText(
                    "qualityIssuesPublishing",
                  ),
                  items: issues.map((issue) => issue.message),
                }
              : noticeMessage(
                  "warning",
                  teacherContentNoticeText("prePublishUnavailablePublishing"),
                ),
          );
        }
        if (!lessonGenerationComplete) {
          setNotice(
            noticeMessage(
              "warning",
              teacherContentNoticeText("contentIncompletePublishing"),
            ),
          );
        }
      }
      await publishReadyContent();
    } finally {
      setPublishing(false);
    }
  };

  return {
    knowledgeQuestions,
    reviewQuestions,
    updatePostQuestionGroup,
    activeScopeName,
    lessonGenerationModules,
    lessonGenerationRunning,
    lessonGenerationComplete,
    teacherAgentQuestions,
    planTeacherAgentInstruction,
    executeTeacherAgentStep,
    validateTeacherAgentPlan,
    runInspection,
    completeCurrentLesson,
    publish,
  };
}
