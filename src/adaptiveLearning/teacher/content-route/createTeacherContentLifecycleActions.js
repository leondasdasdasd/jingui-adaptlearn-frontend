/* eslint-disable complexity, sonarjs/cognitive-complexity -- 生命周期工厂保持生成、校验、自动修复和取消的单一状态机入口。 */
import {
  cancelGenerationRun,
  createLessonGenerationRun,
} from "../../lib/generationRunApi";
import { cancelOpenMaicJob } from "../../lib/openMaicApi";
import { validateLessonVersion } from "../../shared/infrastructure/classroomApi";
import { readTeacherContent } from "../data/teacherContentRepository";
import { buildPublishedContentPackage } from "../domain/publishedContentPackage";
import { teacherContentNoticeText } from "../presentation/teacherContentNoticePresentation";
import {
  isGenerationCancelled,
  noticeMessage,
} from "./teacherContentRouteSupport";

/**
 *
 * @param root0
 * @param root0.activeOpenMaicJobsRef
 * @param root0.backendGenerationRun
 * @param root0.base
 * @param root0.friendlyTaskError
 * @param root0.generationAbortRef
 * @param root0.generationRunRef
 * @param root0.generationStartedAtRef
 * @param root0.lesson
 * @param root0.lessonGeneration
 * @param root0.lessonPayload
 * @param root0.persistDraftContent
 * @param root0.saveOpenMaicJobCheckpoint
 * @param root0.setBackendGenerationRun
 * @param root0.setBackendPollRevision
 * @param root0.setLessonGeneration
 * @param root0.setNotice
 * @param root0.setOpenMaicJob
 * @param root0.setQuestionGeneration
 * @param root0.storedLearningContent
 */
export function createTeacherContentLifecycleActions({
  activeOpenMaicJobsRef,
  backendGenerationRun,
  base,
  friendlyTaskError,
  generationAbortRef,
  generationRunRef,
  generationStartedAtRef,
  lesson,
  lessonGeneration,
  persistDraftContent,
  saveOpenMaicJobCheckpoint,
  setBackendGenerationRun,
  setBackendPollRevision,
  setLessonGeneration,
  setNotice,
  setOpenMaicJob,
  setQuestionGeneration,
  storedLearningContent,
}) {
  const validateContent = async (content) => {
    const contentPackage = buildPublishedContentPackage({ lesson, content });
    return validateLessonVersion(
      lesson.id,
      {
        schemaVersion: "2.0",
        contentPackage,
        qualityReport: {
          reviewMode: "fast-deterministic",
          reviewedBy: "current-teacher",
        },
      },
      { signal: generationAbortRef.current?.signal },
    );
  };

  const validateGeneratedContent = async (
    initialContent,
    initialFailures = [],
    runId,
  ) => {
    if (generationRunRef.current !== runId) return initialContent;
    setLessonGeneration((current) => ({
      ...current,
      phase: "validating",
      issues: [],
      message: teacherContentNoticeText("checkingGeneratedContent"),
    }));
    let quality;
    try {
      quality = await validateContent(initialContent);
    } catch (error) {
      if (isGenerationCancelled(error) || generationRunRef.current !== runId) {
        return initialContent;
      }
      const message = friendlyTaskError(error, "validation");
      setLessonGeneration((current) => ({
        ...current,
        phase: "ready",
        message: teacherContentNoticeText("checkUnavailablePublishable"),
        issues: initialFailures,
      }));
      setNotice(noticeMessage("error", message));
      return initialContent;
    }
    if (generationRunRef.current !== runId) return initialContent;
    const checkedAt = new Date().toISOString();
    const issues = [...(quality.issues || []), ...initialFailures];
    const workingContent = {
      ...initialContent,
      qualityReport: {
        ...quality.report,
        passed: issues.length === 0,
        issues,
        reviewMode: "fast-deterministic",
        checkedAt,
      },
      inspectionStatus: {
        passed: issues.length === 0,
        message: issues.length > 0
          ? teacherContentNoticeText("issuesFound", { count: issues.length })
          : teacherContentNoticeText("checkComplete"),
        issues,
        inspectedAt: checkedAt,
      },
    };
    persistDraftContent(workingContent, {
      qualityReport: workingContent.qualityReport,
      inspectionStatus: workingContent.inspectionStatus,
    });
    setLessonGeneration((current) => ({
      ...current,
      phase: "ready",
      message: workingContent.inspectionStatus.message,
      issues,
      completedAt: checkedAt,
    }));
    setNotice(issues.length > 0 ? {
      title: teacherContentNoticeText("issuesTeacherCanPublish"),
      items: issues.map((issue) => issue.message),
    } : teacherContentNoticeText("checkCompleteReadyToPublish"));
    return workingContent;
  };

  const generateWholeLesson = async ({
    operation = "generate_whole_lesson",
    teacherInstruction = "",
    sourceIssues = [],
  } = {}) => {
    if (
      ["generating", "validating", "repairing"].includes(lessonGeneration.phase)
    ) {
      return { background: true, alreadyRunning: true };
    }
    setNotice("");
    generationStartedAtRef.current = Date.now();
    const sourceContent = { ...base, learningContent: storedLearningContent };
    setLessonGeneration({
      operation,
      phase: "generating",
      message: "正在把整课任务写入数据库，关闭页面后仍会继续",
      moduleStatuses: {},
      moduleProgress: {},
      issues: [],
      repairRound: 0,
      startedAt: new Date(generationStartedAtRef.current).toISOString(),
      durationSeconds: 0,
    });
    try {
      const run = await createLessonGenerationRun(lesson, sourceContent, {
        idempotencyKey: `teacher-content-${operation}-${lesson.id}-${generationStartedAtRef.current}`,
        operation,
        teacherInstruction,
        sourceIssues,
      });
      setBackendGenerationRun(run);
      setBackendPollRevision((current) => current + 1);
      return {
        ...run,
        background: true,
        toolOperation: operation,
        requestedInstruction: teacherInstruction,
        sourceIssueCount: sourceIssues.length,
      };
    } catch (error) {
      setLessonGeneration((current) => ({
        ...current,
        phase: "failed",
        message: error.message,
      }));
      setNotice(noticeMessage("error", error.message || "整课任务入队失败"));
      throw error;
    }
  };

  const runRequestedGeneration = async (
    operation,
    teacherInstruction = "",
  ) => {
    return generateWholeLesson({
      operation,
      teacherInstruction,
      sourceIssues: lessonGeneration.issues || [],
    });
  };

  const stopWholeLessonGeneration = async () => {
    const runId = backendGenerationRun?.runId || base.generationStatus?.runId;
    if (runId) {
      try {
        const run = await cancelGenerationRun(runId);
        setBackendGenerationRun(run);
        setLessonGeneration((current) => ({
          ...current,
          phase: "stopped",
          message: "已取消未完成任务，完成内容仍保存在数据库草稿中",
        }));
        setNotice("已取消未完成任务，完成内容仍保留；其他课时不受影响");
      } catch (error) {
        setNotice(noticeMessage("error", error.message || "取消整课生成失败"));
        throw error;
      }
      return;
    }
    generationRunRef.current += 1;
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    const latestLesson = readTeacherContent()[lesson.id] || base;
    const persistedJobs = {
      ...latestLesson.openMaicJobs,
      ...(latestLesson.openMaicJob?.jobId
        ? {
            [latestLesson.openMaicJob.scope || "composite"]:
              latestLesson.openMaicJob,
          }
        : {}),
    };
    const activeJobMap = new Map(activeOpenMaicJobsRef.current);
    for (const [scope, job] of Object.entries(persistedJobs)) {
      if (job?.jobId) activeJobMap.set(job.jobId, scope);
    }
    const activeJobs = [...activeJobMap.entries()];
    activeOpenMaicJobsRef.current.clear();
    setQuestionGeneration({ mode: "", scope: "", status: null, error: "" });
    setOpenMaicJob((current) =>
      current
        ? {
            ...current,
            status: "cancelled",
            message: "已取消生成，完成内容已保留",
          }
        : current,
    );
    setLessonGeneration((current) => ({
      ...current,
      phase: "stopped",
      message: "正在取消未完成任务，已完成内容已经保存在草稿中",
      moduleStatuses: Object.fromEntries(
        Object.entries(current.moduleStatuses).map(([moduleId, status]) => [
          moduleId,
          status === "ready" ? "ready" : "missing",
        ]),
      ),
    }));
    setNotice("正在取消未完成任务，完成内容已保存");
    const cancelled = await Promise.allSettled(
      activeJobs.map(([jobId]) => cancelOpenMaicJob(jobId)),
    );
    for (const [, scope] of activeJobs) saveOpenMaicJobCheckpoint(scope, null);
    const failedCount = cancelled.filter(
      (result) => result.status === "rejected",
    ).length;
    const message = failedCount
      ? `已停止页面生成；${failedCount} 个后台任务暂时无法确认取消，刷新后会自动核对状态`
      : activeJobs.length > 0
        ? `已取消 ${activeJobs.length} 个未完成任务，完成内容已保存，可稍后继续补全`
        : "已取消当前处理，完成内容已保存，可稍后继续校验或补全";
    setLessonGeneration((current) => ({
      ...current,
      phase: "stopped",
      message,
    }));
    setNotice(message);
  };

  return {
    validateContent,
    validateGeneratedContent,
    generateWholeLesson,
    runRequestedGeneration,
    stopWholeLessonGeneration,
  };
}
