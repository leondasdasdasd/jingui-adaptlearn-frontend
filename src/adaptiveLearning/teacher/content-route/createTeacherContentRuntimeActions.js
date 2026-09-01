/* eslint-disable complexity, sonarjs/cognitive-complexity -- 运行时工厂统一协调草稿、发布版本和长任务轮询状态。 */
import {
  mergeGenerationRunDraft,
  publishGenerationRun,
} from "../../lib/generationRunApi";
import { createOpenMaicClassroom, getOpenMaicJob } from "../../lib/openMaicApi";
import { publishLessonVersion } from "../../shared/infrastructure/classroomApi";
import {
  readTeacherContent,
  writeTeacherContent,
} from "../data/teacherContentRepository";
import { buildPublishedContentPackage } from "../domain/publishedContentPackage";
import { applyTeacherDraftMutation } from "../domain/teacherDraftMutation";
import { teacherContentNoticeText } from "../presentation/teacherContentNoticePresentation";
import {
  generationCancelledError,
  isGenerationCancelled,
  noticeMessage,
  openMaicStepCopy,
} from "./teacherContentRouteSupport";

/**
 *
 * @param root0
 * @param root0.activeLearningScope
 * @param root0.activeOpenMaicJobsRef
 * @param root0.backendGenerationRun
 * @param root0.base
 * @param root0.contentMutationLocked
 * @param root0.generationAbortRef
 * @param root0.generationRunRef
 * @param root0.lesson
 * @param root0.lessonPayload
 * @param root0.refreshPublishedVersions
 * @param root0.resumedJobs
 * @param root0.setAllContent
 * @param root0.setBackendGenerationRun
 * @param root0.setLessonGeneration
 * @param root0.setModuleStatus
 * @param root0.setNotice
 * @param root0.setOpenMaicJob
 * @param root0.setPublishing
 * @param root0.storedLearningContent
 */
export function createTeacherContentRuntimeActions({
  activeLearningScope,
  activeOpenMaicJobsRef,
  backendGenerationRun,
  base,
  contentMutationLocked,
  generationAbortRef,
  generationRunRef,
  lesson,
  lessonPayload,
  refreshPublishedVersions,
  resumedJobs,
  setAllContent,
  setBackendGenerationRun,
  setLessonGeneration,
  setModuleStatus,
  setNotice,
  setOpenMaicJob,
  setPublishing,
  storedLearningContent,
}) {
  const save = (next) => {
    setAllContent(() => {
      const current = readTeacherContent();
      const value = { ...current, [lesson.id]: next };
      writeTeacherContent(value);
      return value;
    });
  };
  const saveDraft = (patchOrUpdater) => {
    if (contentMutationLocked) {
      setNotice(
        "整课后台任务正在处理，当前内容暂时只读；可在教师智能体中查看或停止任务",
      );
      return false;
    }
    const current = readTeacherContent();
    const currentLesson = current[lesson.id] || base;
    const nextLesson = applyTeacherDraftMutation(currentLesson, patchOrUpdater);
    const value = { ...current, [lesson.id]: nextLesson };
    writeTeacherContent(value);
    setAllContent(value);
    setLessonGeneration((current) =>
      ["generating", "validating", "repairing"].includes(current.phase)
        ? current
        : {
            ...current,
            phase: "dirty",
            message: "内容有修改，正在准备重新校验并发布",
            issues: [],
          },
    );
    return nextLesson;
  };

  const persistDraftContent = (content, patch = {}) => {
    if (contentMutationLocked)
      throw new Error("整课后台任务正在处理，本次本地修改未写入");
    const next = {
      ...content,
      qualityReport: null,
      inspectionStatus: null,
      ...patch,
      status: "draft",
      updatedAt: new Date().toISOString(),
    };
    setAllContent(() => {
      const current = readTeacherContent();
      const value = { ...current, [lesson.id]: next };
      writeTeacherContent(value);
      return value;
    });
    return next;
  };

  const saveLearningRuntime = (scope, nextRuntime, extra = {}) => {
    if (contentMutationLocked)
      throw new Error("整课后台任务正在处理，本次学习内容未写入");
    setAllContent(() => {
      const current = readTeacherContent();
      const currentLesson = current[lesson.id] || base;
      const currentLearningContent = currentLesson.learningContent || {
        composite: currentLesson.openMaic || null,
        knowledgePoints: [],
      };
      const nextLearningContent =
        scope === "composite"
          ? { ...currentLearningContent, composite: nextRuntime }
          : {
              ...currentLearningContent,
              knowledgePoints: [
                ...currentLearningContent.knowledgePoints.filter(
                  (item) => item.knowledgeObjectiveId !== scope,
                ),
                { knowledgeObjectiveId: scope, openMaic: nextRuntime },
              ],
            };
      const value = {
        ...current,
        [lesson.id]: {
          ...currentLesson,
          ...extra,
          learningContent: nextLearningContent,
          qualityReport: null,
          inspectionStatus: null,
          status: "draft",
          updatedAt: new Date().toISOString(),
        },
      };
      writeTeacherContent(value);
      return value;
    });
    setLessonGeneration((current) =>
      ["generating", "validating", "repairing"].includes(current.phase)
        ? current
        : {
            ...current,
            phase: "dirty",
            message: "内容有修改，正在准备重新校验并发布",
            issues: [],
          },
    );
  };

  const contentVersionSnapshot = () => {
    const current = readTeacherContent()[lesson.id] || base;
    return {
      version: Number(current.version || 0),
      generationRunId: current.generationStatus?.runId || "",
      contentFingerprint: JSON.stringify([
        current.preQuestions || [],
        current.postQuestions || [],
        current.learningContent || null,
        current.assessmentMatrices || {},
      ]),
    };
  };
  const assertContentVersion = (expected) => {
    const current = contentVersionSnapshot();
    if (
      current.version !== expected.version ||
      current.generationRunId !== expected.generationRunId ||
      current.contentFingerprint !== expected.contentFingerprint
    ) {
      throw new Error(
        "课时内容在智能体处理期间已发生变化，本次结果未写入；请基于最新内容重新发送要求",
      );
    }
  };

  const saveOpenMaicJobCheckpoint = (scope, job) => {
    setAllContent(() => {
      const current = readTeacherContent();
      const currentLesson = current[lesson.id] || base;
      const openMaicJobs = { ...currentLesson.openMaicJobs };
      if (job) openMaicJobs[scope] = job;
      else delete openMaicJobs[scope];
      const value = {
        ...current,
        [lesson.id]: {
          ...currentLesson,
          openMaicJobs,
          // Keep the legacy field while older drafts still depend on it.
          openMaicJob:
            job ||
            (currentLesson.openMaicJob?.scope === scope
              ? null
              : currentLesson.openMaicJob),
          status: "draft",
          updatedAt: new Date().toISOString(),
        },
      };
      writeTeacherContent(value);
      return value;
    });
  };

  const checkedGenerationProposalMatchesCurrentDraft = () => {
    if (
      !backendGenerationRun?.runId ||
      backendGenerationRun.status !== "awaiting_review"
    )
      return false;
    if (base.updatedAt && backendGenerationRun.updatedAt) {
      return (
        new Date(base.updatedAt) <= new Date(backendGenerationRun.updatedAt)
      );
    }
    const proposal = backendGenerationRun.draft || {};
    return (
      JSON.stringify([
        base.preQuestions || [],
        base.postQuestions || [],
        storedLearningContent,
      ]) ===
      JSON.stringify([
        proposal.preQuestions || [],
        proposal.postQuestions || [],
        proposal.learningContent || { composite: null, knowledgePoints: [] },
      ])
    );
  };

  const publishReadyContent = async () => {
    if (
      backendGenerationRun?.runId &&
      ["queued", "running", "quality_check", "repairing"].includes(
        backendGenerationRun.status,
      )
    ) {
      setNotice("数据库整课任务正在处理，请等待提案完成");
      return;
    }
    if (checkedGenerationProposalMatchesCurrentDraft()) {
      setPublishing(true);
      setNotice("正在按教师确认发布这份提案…");
      try {
        const publishedRun = await publishGenerationRun(
          backendGenerationRun.runId,
          "current-teacher",
        );
        setBackendGenerationRun(publishedRun);
        const publishedContent = mergeGenerationRunDraft(base, publishedRun);
        save(publishedContent);
        await refreshPublishedVersions();
        setNotice(
          `V${publishedRun.draft?.publishedVersionNumber || publishedContent.publishedVersionNumber} 已经教师确认发布`,
        );
      } catch (error) {
        setNotice(error.message || "教师确认发布失败");
      } finally {
        setPublishing(false);
      }
      return;
    }
    const qualityReport = base.qualityReport || {
      passed: true,
      issues: [],
      reviewMode: "fast-deterministic",
      checkedAt: new Date().toISOString(),
    };
    setPublishing(true);
    setNotice(teacherContentNoticeText("checkingAndPublishing"));
    try {
      const contentPackage = buildPublishedContentPackage({
        lesson,
        content: { ...base, learningContent: storedLearningContent },
      });
      const published = await publishLessonVersion(lesson.id, {
        schemaVersion: "2.0",
        contentPackage,
        qualityReport,
        publishedBy: "current-teacher",
      });
      const publishedAt = published.publishedAt;
      const snapshotSource = { ...base };
      delete snapshotSource.publishedSnapshot;
      const publishedSnapshot = {
        ...snapshotSource,
        learningContent: storedLearningContent,
        status: "published",
        publishedAt,
      };
      save({
        ...base,
        learningContent: storedLearningContent,
        status: "published",
        publishedAt,
        publishedSnapshot,
        publishedVersionId: published.id,
        publishedVersionNumber: published.versionNumber,
        qualityReport: published.qualityReport,
      });
      await refreshPublishedVersions();
      setNotice(
        `V${published.versionNumber} 已发布，可前往“实时课堂”进入上课模式`,
      );
    } catch (error) {
      const issues = error.payload?.issues;
      setLessonGeneration((current) => ({
        ...current,
        phase: "failed",
        message: error.message || "发布失败",
        issues: Array.isArray(issues) ? issues : current.issues,
      }));
      setNotice(
        Array.isArray(issues) && issues.length > 0
          ? {
              title: teacherContentNoticeText("publishFailedIssuesRetained"),
              items: issues.map((item) => item.message),
            }
          : error.message,
      );
    } finally {
      setPublishing(false);
    }
  };

  const pollOpenMaic = async (
    jobId,
    teacherInstruction,
    scope = "composite",
    runId = generationRunRef.current,
  ) => {
    let consecutiveFetchFailures = 0;
    // 任务以服务端终态或主动取消为唯一退出条件。
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (
        generationRunRef.current !== runId ||
        generationAbortRef.current?.signal.aborted
      ) {
        throw generationCancelledError();
      }
      let job;
      try {
        job = await getOpenMaicJob(jobId);
        if (
          generationRunRef.current !== runId ||
          generationAbortRef.current?.signal.aborted
        ) {
          throw generationCancelledError();
        }
        consecutiveFetchFailures = 0;
      } catch (error) {
        if (isGenerationCancelled(error)) throw error;
        consecutiveFetchFailures += 1;
        const reconnecting = {
          jobId,
          scope,
          status: "reconnecting",
          progress: 0,
          message: "进度连接暂时中断，正在自动重连",
          teacherInstruction,
        };
        setOpenMaicJob(reconnecting);
        saveOpenMaicJobCheckpoint(scope, reconnecting);
        if (consecutiveFetchFailures >= 5) throw error;
        await new Promise((resolve) =>
          window.setTimeout(resolve, 3000 * consecutiveFetchFailures),
        );
        continue;
      }
      setOpenMaicJob({ ...job, jobId, scope });
      const moduleId =
        scope === "composite"
          ? "composite-classroom"
          : `knowledge-classroom:${scope}`;
      const scopeName =
        scope === "composite"
          ? "复合 MAIC 课堂"
          : lesson.knowledgePoints.find((item) => item.id === scope)?.name ||
            "单点 MAIC 课堂";
      const queuePosition = Number(
        job.queuePosition || job.queue?.position || 0,
      );
      const queued = job.status === "queued";
      const queueCopy = queuePosition
        ? `（前面 ${Math.max(0, queuePosition - 1)} 个任务）`
        : "";
      setModuleStatus([moduleId], queued ? "queued" : "generating");
      setLessonGeneration((current) => ({
        ...current,
        message: queued
          ? `${scopeName}：排队中${queueCopy} · 不影响其他题目继续生成`
          : `${scopeName}：${openMaicStepCopy[job.step] || job.message || "正在生成"} ${Math.round(job.progress || 0)}% · 已完成内容会持续保存`,
        moduleProgress: {
          ...current.moduleProgress,
          [moduleId]: {
            ...current.moduleProgress?.[moduleId],
            status: queued ? "queued" : "generating",
            progress: Math.round(job.progress || 0),
            step: job.step,
            message: job.message,
            queuePosition: queuePosition || null,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      saveOpenMaicJobCheckpoint(scope, {
        ...job,
        jobId,
        scope,
        teacherInstruction,
      });
      if (job.partialResult?.classroomId) {
        saveLearningRuntime(scope, {
          jobId,
          status: "partial",
          progress: job.progress,
          classroomId: job.partialResult.classroomId,
          classroomUrl: job.partialResult.url,
          scenesCount: job.partialResult.scenesCount,
          totalScenes: job.partialResult.totalScenes,
          teacherInstruction,
          generatedAt: new Date().toISOString(),
          partial: true,
        });
      }
      switch (job.status) {
        case "succeeded": {
          saveOpenMaicJobCheckpoint(scope, null);
          return {
            jobId,
            status: "succeeded",
            progress: 100,
            classroomId: job.result.classroomId,
            classroomUrl: job.result.url,
            scenesCount: job.result.scenesCount,
            teacherInstruction,
            generatedAt: new Date().toISOString(),
          };
        }
        case "canceled":
        case "cancelled": {
          throw generationCancelledError();
        }
        case "failed": {
          throw new Error(job.error || "课堂生成失败");
        }
        default: {
          await new Promise((resolve) =>
            window.setTimeout(resolve, job.pollIntervalMs || 3000),
          );
        }
      }
    }
  };

  const savedOpenMaicJobs = {
    ...base.openMaicJobs,
    ...(base.openMaicJob?.jobId
      ? { [base.openMaicJob.scope || "composite"]: base.openMaicJob }
      : {}),
  };
  const savedOpenMaicJobKey = Object.values(savedOpenMaicJobs)
    .map((job) => job?.jobId || "")
    .filter(Boolean)
    .sort()
    .join("|");

  const createOpenMaicRuntime = async (
    scope = activeLearningScope,
    runId = generationRunRef.current,
    teacherInstruction = "",
  ) => {
    setOpenMaicJob({
      status: "queued",
      progress: 2,
      message: "正在提交课堂生成任务",
      scope,
    });
    const response = await createOpenMaicClassroom({
      lesson: lessonPayload,
      knowledgePoints:
        scope === "composite"
          ? lesson.knowledgePoints
          : lesson.knowledgePoints.filter((item) => item.id === scope),
      generationMode: "deep",
      cacheOnly: false,
      teacherInstruction,
    });
    if (response.status === "succeeded" && response.result?.classroomId) {
      saveOpenMaicJobCheckpoint(scope, null);
      return {
        status: "succeeded",
        progress: 100,
        classroomId: response.result.classroomId,
        classroomUrl: response.result.url,
        scenesCount: response.result.scenesCount,
        teacherInstruction,
        generatedAt: new Date().toISOString(),
        cached: Boolean(response.cached),
      };
    }
    resumedJobs.current.add(response.jobId);
    activeOpenMaicJobsRef.current.set(response.jobId, scope);
    saveOpenMaicJobCheckpoint(scope, {
      jobId: response.jobId,
      status: response.status || "queued",
      progress: response.progress || 2,
      teacherInstruction,
      scope,
    });
    try {
      return await pollOpenMaic(
        response.jobId,
        teacherInstruction,
        scope,
        runId,
      );
    } catch (error) {
      saveOpenMaicJobCheckpoint(scope, null);
      throw error;
    } finally {
      activeOpenMaicJobsRef.current.delete(response.jobId);
    }
  };

  const generateOpenMaic = async (
    scope = activeLearningScope,
    teacherInstruction = "",
  ) => {
    const sourceSnapshot = contentVersionSnapshot();
    setNotice("");
    try {
      if (contentMutationLocked)
        throw new Error("整课后台任务正在处理，完成后才能重新生成学习内容");
      const nextRuntime = await createOpenMaicRuntime(
        scope,
        generationRunRef.current,
        teacherInstruction,
      );
      assertContentVersion(sourceSnapshot);
      saveLearningRuntime(scope, nextRuntime, {
        openMaicJob: null,
        version: sourceSnapshot.version + 1,
        lastInstruction: nextRuntime.teacherInstruction,
      });
      setOpenMaicJob(nextRuntime);
      setNotice(
        nextRuntime.cached
          ? "已加载匹配的学习课堂，可直接使用"
          : "新的学习课堂已生成，可直接使用，也可以继续预览调整",
      );
      return nextRuntime;
    } catch (error) {
      setOpenMaicJob({ status: "failed", progress: 0, message: error.message });
      setNotice(noticeMessage("error", error.message || "学习课堂生成失败"));
      throw error;
    }
  };

  return {
    save,
    saveDraft,
    persistDraftContent,
    saveLearningRuntime,
    contentVersionSnapshot,
    assertContentVersion,
    saveOpenMaicJobCheckpoint,
    checkedGenerationProposalMatchesCurrentDraft,
    publishReadyContent,
    pollOpenMaic,
    savedOpenMaicJobs,
    savedOpenMaicJobKey,
    createOpenMaicRuntime,
    generateOpenMaic,
  };
}
