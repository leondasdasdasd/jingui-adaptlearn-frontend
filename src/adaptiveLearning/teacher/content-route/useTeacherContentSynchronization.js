/* eslint-disable complexity, sonarjs/cognitive-complexity, promise/always-return, promise/catch-or-return -- 同步 hook 统一恢复服务端运行、已发布版本与本地草稿。 */
import { useCallback, useEffect } from "react";

import {
  generationStateFromRun,
  getCurrentLessonGenerationRun,
  mergeGenerationRunDraft,
  presentGenerationQualityIssues,
} from "../../lib/generationRunApi";
import { createOpenMaicClassroom } from "../../lib/openMaicApi";
import {
  flattenPublishedQuestions,
  normalizePublishedContentPackage,
} from "../../shared/domain/publishedLearningContent";
import {
  getLatestLessonVersion,
  getLessonVersions,
} from "../../shared/infrastructure/classroomApi";
import {
  readTeacherContent,
  writeTeacherContent,
} from "../data/teacherContentRepository";
import { noticeMessage } from "./teacherContentRouteSupport";

/**
 *
 * @param root0
 * @param root0.backendGenerationRun
 * @param root0.backendPollRevision
 * @param root0.backendRunChecked
 * @param root0.base
 * @param root0.learningContent
 * @param root0.lesson
 * @param root0.lessonPayload
 * @param root0.loadedLessonId
 * @param root0.recoveredLesson
 * @param root0.setAllContent
 * @param root0.setBackendGenerationRun
 * @param root0.setBackendRunChecked
 * @param root0.setLessonGeneration
 * @param root0.setLoadedLessonId
 * @param root0.setNotice
 * @param root0.setPublishedVersions
 */
export function useTeacherContentSynchronization({
  backendGenerationRun,
  backendPollRevision,
  backendRunChecked,
  base,
  learningContent,
  lesson,
  lessonPayload,
  loadedLessonId,
  recoveredLesson,
  setAllContent,
  setBackendGenerationRun,
  setBackendRunChecked,
  setLessonGeneration,
  setLoadedLessonId,
  setNotice,
  setPublishedVersions,
}) {
  const refreshPublishedVersions = useCallback(async () => {
    try {
      const versions = await getLessonVersions(lesson.id);
      setPublishedVersions(Array.isArray(versions) ? versions : []);
      return versions;
    } catch (error) {
      if (error.status === 404) {
        setPublishedVersions([]);
        return [];
      }
      throw error;
    }
  }, [lesson.id]);

  useEffect(() => {
    let cancelled = false;
    refreshPublishedVersions().catch((error) => {
      if (!cancelled)
        setNotice(
          noticeMessage("warning", error.message || "暂时无法读取发布版本记录"),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [refreshPublishedVersions]);

  useEffect(() => {
    let stopped = false;
    const abortController = new AbortController();
    const refreshBackendRun = async () => {
      try {
        const run = await getCurrentLessonGenerationRun(lesson.id, {
          signal: abortController.signal,
        });
        if (stopped) return;
        if (!run) {
          setBackendGenerationRun(null);
          setBackendRunChecked(true);
          return false;
        }
        setBackendGenerationRun(run);
        setBackendRunChecked(true);
        const generation = generationStateFromRun(run);
        const phase =
          run.status === "awaiting_review"
            ? "ready"
            : run.status === "quality_check"
              ? "validating"
              : run.status === "repairing"
                ? "repairing"
                : run.status === "running" || run.status === "queued"
                  ? "generating"
                  : run.status;
        const modules = Object.values(run.draft?.modules || {});
        const localContent = readTeacherContent()[lesson.id];
        const restoredContent = mergeGenerationRunDraft(
          localContent || {},
          run,
        );
        const visibleRunIssues = presentGenerationQualityIssues(
          run.qualityIssues || [],
          restoredContent,
        );
        const localDraftIsNewer =
          localContent?.status === "draft" &&
          localContent.updatedAt &&
          run.updatedAt &&
          new Date(localContent.updatedAt) > new Date(run.updatedAt);
        if (!localDraftIsNewer) {
          setLessonGeneration((current) => ({
            ...(current.inspectedAt &&
            run.updatedAt &&
            new Date(current.inspectedAt) > new Date(run.updatedAt)
              ? current
              : {
                  ...current,
                  operation: run.checkpoint?.teacherAgent?.operation || "",
                  phase,
                  message: generation?.message || current.message,
                  issues: visibleRunIssues,
                  repairRound: Math.max(
                    0,
                    ...modules.map((module) => Number(module.repairRound || 0)),
                  ),
                  moduleStatuses: {
                    ...current.moduleStatuses,
                    ...Object.fromEntries(
                      modules.map((module) => [
                        module.targetModuleId || module.graphNodeId,
                        "ready",
                      ]),
                    ),
                  },
                  completedAt: run.completedAt,
                }),
          }));
        }
        setAllContent((current) => {
          if (current[lesson.id]?.generationStatus?.updatedAt === run.updatedAt)
            return current;
          const next = {
            ...current,
            [lesson.id]: mergeGenerationRunDraft(current[lesson.id] || {}, run),
          };
          writeTeacherContent(next);
          return next;
        });
        return ["queued", "running", "quality_check", "repairing"].includes(
          run.status,
        );
      } catch (error) {
        if (error.name === "AbortError") return;
        if (error.status === 404) {
          if (!stopped) {
            setBackendGenerationRun(null);
            setBackendRunChecked(true);
          }
          return false;
        }
        if (!stopped)
          setNotice(
            noticeMessage("error", error.message || "暂时无法读取后端生成进度"),
          );
        return true;
      }
    };
    let timer;
    const pollBackendRun = async () => {
      const shouldContinue = await refreshBackendRun();
      if (!stopped && shouldContinue) timer = setTimeout(pollBackendRun, 1500);
    };
    void pollBackendRun();
    return () => {
      stopped = true;
      clearTimeout(timer);
      abortController.abort();
    };
  }, [backendPollRevision, lesson.id]);

  useEffect(() => {
    let cancelled = false;
    getLatestLessonVersion(lesson.id)
      .then((published) => {
        if (cancelled) return;
        setAllContent(() => {
          const current = readTeacherContent();
          const local = current[lesson.id] || {};
          const terminalDatabaseRun =
            local.generationStatus?.databaseAuthoritative &&
            ["canceled", "failed"].includes(local.generationStatus.status);
          const hasBackendDraft =
            local.status === "draft" &&
            local.generationStatus?.databaseAuthoritative &&
            !terminalDatabaseRun;
          const hasNewerDraft =
            hasBackendDraft ||
            (local.status === "draft" &&
              !terminalDatabaseRun &&
              (local.publishedVersionId || local.publishedSnapshot) &&
              local.updatedAt &&
              new Date(local.updatedAt) > new Date(published.publishedAt));
          const packageContent = normalizePublishedContentPackage(
            published.contentPackage || {},
          );
          const publishedQuestions = flattenPublishedQuestions(packageContent);
          const restored = hasNewerDraft
            ? local
            : {
                ...local,
                lessonId: lesson.id,
                preQuestions: publishedQuestions
                  .filter((item) => item.purpose === "PRE")
                  .map((item) => ({
                    ...item,
                    knowledgePointIds:
                      item.knowledgeObjectiveIds || item.knowledgePointIds,
                  })),
                postQuestions: publishedQuestions
                  .filter((item) => ["PRACTICE", "POST"].includes(item.purpose))
                  .map((item) => ({
                    ...item,
                    knowledgePointIds:
                      item.knowledgeObjectiveIds || item.knowledgePointIds,
                  })),
                learningContent: packageContent.learningContent,
                assessmentMatrices: packageContent.assessmentMatrices,
                assessmentQuestionSlots: packageContent.assessmentQuestionSlots,
                status: "published",
                publishedAt: published.publishedAt,
              };
          const next = {
            ...restored,
            version: published.versionNumber,
            publishedVersionId: published.id,
            publishedVersionNumber: published.versionNumber,
            qualityReport: published.qualityReport,
          };
          const value = { ...current, [lesson.id]: next };
          writeTeacherContent(value);
          return value;
        });
      })
      .catch((error) => {
        if (!cancelled && error.status !== 404) {
          setNotice(
            noticeMessage(
              "warning",
              Number(error.status) >= 500
                ? "暂时无法读取已发布版本，当前仍可编辑本地草稿"
                : error.message,
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadedLessonId(lesson.id);
      });
    return () => {
      cancelled = true;
    };
  }, [lesson.id]);

  useEffect(() => {
    if (
      !backendRunChecked ||
      loadedLessonId !== lesson.id ||
      recoveredLesson.current === lesson.id
    )
      return;
    if (
      ["queued", "running", "quality_check", "repairing"].includes(
        backendGenerationRun?.status,
      )
    ) {
      return;
    }
    recoveredLesson.current = lesson.id;
    let cancelled = false;
    const recoverCachedSingleClassrooms = async () => {
      const currentKnowledgeContent = learningContent.knowledgePoints || [];
      const missing = lesson.knowledgePoints.filter(
        (knowledgePoint) =>
          !currentKnowledgeContent.find(
            (item) => item.knowledgeObjectiveId === knowledgePoint.id,
          )?.openMaic?.classroomUrl,
      );
      const recovered = [];
      for (const knowledgePoint of missing) {
        try {
          const response = await createOpenMaicClassroom({
            lesson: lessonPayload,
            knowledgePoints: [knowledgePoint],
            generationMode: "deep",
            cacheOnly: true,
            teacherInstruction: "",
          });
          if (response.status === "succeeded" && response.result?.classroomId) {
            recovered.push({
              knowledgeObjectiveId: knowledgePoint.id,
              openMaic: {
                status: "succeeded",
                progress: 100,
                classroomId: response.result.classroomId,
                classroomUrl: response.result.url,
                scenesCount: response.result.scenesCount,
                teacherInstruction: "",
                generatedAt: new Date().toISOString(),
              },
            });
          }
        } catch (error) {
          if (error.message !== "本课学习内容还在准备中，请稍后再来") {
            // 无缓存是正常草稿状态，不用错误打断教师编辑。
          }
        }
      }
      if (cancelled || recovered.length === 0) return;
      setAllContent(() => {
        const current = readTeacherContent();
        const currentLesson = current[lesson.id] || base;
        const currentLearning = currentLesson.learningContent || {
          composite: currentLesson.openMaic || null,
          knowledgePoints: [],
        };
        const recoveredIds = new Set(
          recovered.map((item) => item.knowledgeObjectiveId),
        );
        const nextLesson = {
          ...currentLesson,
          learningContent: {
            ...currentLearning,
            knowledgePoints: [
              ...currentLearning.knowledgePoints.filter(
                (item) => !recoveredIds.has(item.knowledgeObjectiveId),
              ),
              ...recovered,
            ],
          },
          status: "draft",
          updatedAt: new Date().toISOString(),
        };
        const value = { ...current, [lesson.id]: nextLesson };
        writeTeacherContent(value);
        return value;
      });
      setNotice(`已找回 ${recovered.length} 个生成完成的单点课堂，请预览确认`);
    };
    void recoverCachedSingleClassrooms();
    return () => {
      cancelled = true;
    };
    // 只在已发布内容恢复后执行一次，避免与教师正在编辑的状态竞争。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    backendGenerationRun?.status,
    backendRunChecked,
    loadedLessonId,
    lesson.id,
  ]);

  return { refreshPublishedVersions };
}
