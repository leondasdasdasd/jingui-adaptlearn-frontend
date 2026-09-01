import { adaptiveApiUrl } from "../shared/infrastructure/runtimeEndpoints.js";

/**
 *
 * @param path
 * @param options
 */
async function request(path, options = {}) {
  const response = await fetch(adaptiveApiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      body.message || `整课生成服务返回 ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }
  return body;
}

/**
 *
 * @param lesson
 * @param draft
 * @param root0
 * @param root0.runId
 * @param root0.idempotencyKey
 * @param root0.operation
 * @param root0.teacherInstruction
 * @param root0.sourceIssues
 */
export function createLessonGenerationRun(
  lesson,
  draft,
  {
    runId,
    idempotencyKey,
    operation = "generate_whole_lesson",
    teacherInstruction = "",
    sourceIssues = [],
  } = {},
) {
  return request(
    `/api/textbook-lessons/${encodeURIComponent(lesson.id)}/generation-runs`,
    {
      method: "POST",
      body: JSON.stringify({
        lesson,
        draft,
        runId,
        idempotencyKey,
        operation,
        teacherInstruction,
        sourceIssues,
      }),
    },
  );
}

/**
 *
 * @param lessons
 * @param drafts
 * @param root0
 * @param root0.idempotencyKey
 */
export function createLessonGenerationRuns(
  lessons,
  drafts,
  { idempotencyKey } = {},
) {
  return request("/api/generation-runs/batch", {
    method: "POST",
    body: JSON.stringify({ lessons, drafts, idempotencyKey }),
  });
}

/**
 *
 * @param runId
 * @param root0
 * @param root0.signal
 */
export function getGenerationRun(runId, { signal } = {}) {
  return request(`/api/generation-runs/${encodeURIComponent(runId)}`, {
    signal,
  });
}

/**
 *
 * @param lessonId
 * @param root0
 * @param root0.signal
 */
export function getCurrentLessonGenerationRun(lessonId, { signal } = {}) {
  return request(
    `/api/textbook-lessons/${encodeURIComponent(lessonId)}/generation-runs/current`,
    { signal },
  );
}

/**
 *
 * @param lessonIds
 * @param root0
 * @param root0.signal
 */
export function getLessonGenerationRuns(lessonIds, { signal } = {}) {
  const ids = [...new Set(lessonIds)].filter(Boolean);
  if (ids.length === 0) return Promise.resolve({});
  return request(
    `/api/generation-runs?lessonIds=${encodeURIComponent(ids.join(","))}`,
    { signal },
  ).then((body) =>
    Object.fromEntries(
      Object.entries(body.runs || {}).filter(([, run]) => Boolean(run)),
    ),
  );
}

/**
 *
 * @param runId
 */
export function cancelGenerationRun(runId) {
  return request(`/api/generation-runs/${encodeURIComponent(runId)}/cancel`, {
    method: "POST",
  });
}

/**
 *
 * @param runId
 * @param publishedBy
 */
export function publishGenerationRun(runId, publishedBy = "current-teacher") {
  return request(`/api/generation-runs/${encodeURIComponent(runId)}/publish`, {
    method: "POST",
    body: JSON.stringify({ publishedBy }),
  });
}

const activeStatuses = new Set([
  "queued",
  "running",
  "quality_check",
  "repairing",
]);

/**
 *
 * @param questionId
 */
function fallbackQuestionLabel(questionId) {
  const id = String(questionId || "");
  if (id.includes("__pre-assessment__")) return "课前测验中的命中题目";
  if (id.includes("__composite-review__")) return "综合练习中的命中题目";
  if (id.includes("__knowledge-questions")) return "单点题池中的命中题目";
  return "命中题目";
}

/**
 *
 * @param value
 * @param search
 * @param replacement
 */
function replaceAllLiteral(value, search, replacement) {
  return search ? String(value).split(search).join(replacement) : String(value);
}

/**
 *
 * @param issues
 * @param content
 */
export function presentGenerationQualityIssues(issues = [], content = {}) {
  const knowledgeQuestions = (content.postQuestions || []).filter(
    (question) => question.phase !== "review",
  );
  const reviewQuestions = (content.postQuestions || []).filter(
    (question) => question.phase === "review",
  );
  const labels = new Map([
    ...(content.preQuestions || []).map((question, index) => [
      String(question.id || ""),
      `课前测验第 ${index + 1} 题`,
    ]),
    ...knowledgeQuestions.map((question, index) => [
      String(question.id || ""),
      `单点题池第 ${index + 1} 题`,
    ]),
    ...reviewQuestions.map((question, index) => [
      String(question.id || ""),
      `综合练习第 ${index + 1} 题`,
    ]),
  ]);

  return (issues || []).map((issue) => {
    const references = [
      ...new Set(
        [issue?.questionId, issue?.duplicateQuestionId].filter(Boolean),
      ),
    ]
      .map((questionId) => [
        String(questionId),
        labels.get(String(questionId)) || fallbackQuestionLabel(questionId),
      ])
      .sort((left, right) => right[0].length - left[0].length);
    let message = String(issue?.message || "发现需要处理的题目质量问题");
    for (const [questionId, label] of references) {
      message = replaceAllLiteral(message, `题目 ${questionId}`, label);
      message = replaceAllLiteral(message, questionId, label);
    }
    const primaryLabel = references.find(
      ([questionId]) => questionId === String(issue?.questionId || ""),
    )?.[1];
    if (primaryLabel) {
      const repeatedPrefix = `${primaryLabel}：${primaryLabel}：`;
      while (message.startsWith(repeatedPrefix))
        message = message.slice(primaryLabel.length + 1);
    }
    return { ...issue, message };
  });
}

/**
 *
 * @param run
 */
export function generationStateFromRun(run) {
  if (!run) return null;
  const operation = run.checkpoint?.teacherAgent?.operation || "";
  const aiQualityRun = operation === "ai_quality_repair";
  const status =
    run.status === "awaiting_review"
      ? "ready"
      : run.status === "published"
        ? "completed"
        : run.status === "quality_check"
          ? "validating"
          : run.status === "repairing"
            ? "repairing"
            : run.status === "running"
              ? "generating"
              : run.status;
  return {
    runId: run.runId,
    status,
    phase: run.status,
    progress: Number(run.progress || 0),
    message:
      run.status === "awaiting_review"
        ? aiQualityRun
          ? "AI 轻量质检与单题补齐已完成，请预览修改结果"
          : "生成与快速结构检查已完成，等待教师预览确认"
        : run.status === "published"
          ? `教师已确认发布${run.draft?.publishedVersionNumber ? ` V${run.draft.publishedVersionNumber}` : ""}`
          : run.status === "quality_check"
            ? aiQualityRun
              ? "AI 正按题目模块进行轻量质检"
              : "正在快速检查题量、JSON 结构和重复题"
            : run.status === "repairing"
              ? "AI 正在定向修改未通过的题目"
              : run.status === "queued"
                ? "任务已写入数据库，正在等待后端工作器"
                : run.status === "running"
                  ? "后端正在并行生成，关闭页面也会继续"
                  : run.status === "canceled"
                    ? "已取消未完成任务，已生成内容仍保留"
                    : run.errorMessage || "整课生成需要处理",
    issues: run.qualityIssues || [],
    databaseAuthoritative: true,
    reviewRequired:
      run.status === "awaiting_review" || run.reviewRequired === true,
    publishedVersionNumber:
      Number(run.draft?.publishedVersionNumber || 0) || null,
    updatedAt: run.updatedAt,
    completedAt: run.completedAt,
    active: activeStatuses.has(run.status),
  };
}

/**
 *
 * @param modules
 */
function effectiveModules(modules = {}) {
  const effective = new Map();
  for (const module of Object.values(modules)) {
    if (!module?.targetModuleId && !module?.graphNodeId) continue;
    const target = module.targetModuleId || module.graphNodeId;
    const current = effective.get(target);
    if (
      !current ||
      Number(module.repairRound || 0) >= Number(current.repairRound || 0)
    ) {
      effective.set(target, module);
    }
  }
  return effective;
}

/**
 *
 * @param runtime
 */
function normalizeOpenMaicRuntime(runtime) {
  if (!runtime) return null;
  return {
    ...runtime,
    status: runtime.status || "succeeded",
    progress: runtime.progress ?? 100,
    classroomUrl: runtime.classroomUrl || runtime.url || "",
  };
}

/**
 *
 * @param current
 * @param run
 */
export function mergeGenerationRunDraft(current = {}, run) {
  if (!run?.draft) return current;
  const draft = run.draft;
  const generationStatus = generationStateFromRun(run);
  const hasPublishedVersion = Boolean(
    current.publishedVersionId || current.publishedSnapshot,
  );
  const currentDraftBelongsToRun =
    current.generationStatus?.databaseAuthoritative &&
    current.generationStatus?.runId === run.runId;
  const terminalWithoutPublication = ["canceled", "failed"].includes(
    run.status,
  );

  // A canceled/failed generation run is operational history, not a new
  // publishable draft. Once the content-version service has supplied an
  // authoritative version, do not let the terminal run's partial checkpoint
  // repeatedly replace that published content in browser storage.
  if (
    hasPublishedVersion &&
    terminalWithoutPublication &&
    (current.status === "published" || currentDraftBelongsToRun)
  ) {
    return {
      ...current,
      lessonId: run.lessonId,
      status: "published",
      version: Math.max(
        Number(current.version || 0),
        Number(current.publishedVersionNumber || 0),
        1,
      ),
      updatedAt:
        current.publishedAt ||
        current.publishedSnapshot?.publishedAt ||
        current.updatedAt,
      generationStatus,
    };
  }
  const currentPublishedVersionNumber = Number(
    current.publishedVersionNumber || 0,
  );
  const runPublishedVersionNumber = Number(draft.publishedVersionNumber || 0);
  // The content-version service may already have a newer teacher-published
  // version than the historic generation run returned by polling. Keep the
  // fields from whichever source has the larger immutable version number so a
  // completed V3 run can never roll the directory back from authoritative V4.
  const currentPublicationIsLatest =
    currentPublishedVersionNumber > 0 &&
    currentPublishedVersionNumber >= runPublishedVersionNumber;
  const latestPublishedVersionNumber =
    Math.max(currentPublishedVersionNumber, runPublishedVersionNumber) ||
    undefined;
  const modules = effectiveModules(draft.modules || {});
  const knowledgePoints =
    draft.knowledgePoints || run.graph?.knowledgePoints || [];
  const preQuestions = modules.get("generate:pre-assessment")?.result
    ?.questions;
  const reviewQuestions =
    modules.get("generate:composite-review")?.result?.questions || [];
  const knowledgeQuestions = knowledgePoints.flatMap(
    (knowledgePoint) =>
      modules.get(`generate:knowledge-questions:${knowledgePoint.id}`)?.result
        ?.questions || [],
  );
  const composite = normalizeOpenMaicRuntime(
    modules.get("generate:openmaic:composite")?.result,
  );
  const generatedKnowledgeContent = knowledgePoints.flatMap(
    (knowledgePoint) => {
      const runtime = normalizeOpenMaicRuntime(
        modules.get(`generate:openmaic:${knowledgePoint.id}`)?.result,
      );
      return runtime
        ? [{ knowledgeObjectiveId: knowledgePoint.id, openMaic: runtime }]
        : [];
    },
  );
  const draftComposite = normalizeOpenMaicRuntime(
    draft.learningContent?.composite,
  );
  const draftKnowledgeContent = (
    draft.learningContent?.knowledgePoints || []
  ).map((item) => ({
    ...item,
    openMaic: normalizeOpenMaicRuntime(item.openMaic),
  }));
  const qualityModules = [...modules.values()]
    .filter((module) => module.kind === "quality_check")
    .sort(
      (left, right) =>
        Number(left.result?.round || left.repairRound || 0) -
        Number(right.result?.round || right.repairRound || 0),
    );
  const latestQuality = qualityModules.at(-1)?.result;
  const hasQualityEvidence =
    Boolean(latestQuality) ||
    ["quality_check", "repairing", "awaiting_review"].includes(run.status);

  return {
    ...draft,
    ...current,
    lessonId: run.lessonId,
    status:
      run.status === "published" || draft.status === "published"
        ? "published"
        : "draft",
    version:
      run.status === "published"
        ? Math.max(
            Number(current.version || 0),
            Number(draft.publishedVersionNumber || draft.version || 0),
            latestPublishedVersionNumber || 0,
            1,
          )
        : Number(current.version || draft.version || 1),
    publishedVersionId: currentPublicationIsLatest
      ? current.publishedVersionId
      : draft.publishedVersionId || current.publishedVersionId,
    publishedVersionNumber: latestPublishedVersionNumber,
    publishedAt: currentPublicationIsLatest
      ? current.publishedAt
      : draft.publishedAt || current.publishedAt,
    preQuestions:
      preQuestions || draft.preQuestions || current.preQuestions || [],
    postQuestions:
      knowledgeQuestions.length > 0 || reviewQuestions.length > 0
        ? [...knowledgeQuestions, ...reviewQuestions]
        : draft.postQuestions || current.postQuestions || [],
    learningContent: {
      ...current.learningContent,
      ...draft.learningContent,
      composite:
        composite ||
        draftComposite ||
        current.learningContent?.composite ||
        null,
      knowledgePoints:
        generatedKnowledgeContent.length > 0
          ? generatedKnowledgeContent
          : draftKnowledgeContent.length > 0
            ? draftKnowledgeContent
            : current.learningContent?.knowledgePoints || [],
    },
    qualityReport: hasQualityEvidence
      ? {
          passed: (run.qualityIssues || []).length === 0,
          issues: run.qualityIssues || [],
          semanticReview: latestQuality || null,
          reviewMode:
            run.checkpoint?.teacherAgent?.operation === "ai_quality_repair"
              ? "ai-light-module-repair"
              : "fast-deterministic",
          checkedAt: run.updatedAt,
        }
      : draft.qualityReport || current.qualityReport,
    generationStatus,
    updatedAt: run.updatedAt,
  };
}
