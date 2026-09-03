import { createEmptyLearningSession } from "../../session/learningSessionModel";
import { mapContentVersionToStudentLesson } from "../domain/publishedLessonMapper.js";

/**
 * 将教师选中的不可变发布版本转换为学生学习流所需的会话。
 * 试做身份与课堂身份隔离，不携带 access token，因此不会写入真实课堂记录。
 * @param {object} input 试做上下文
 * @param {object} input.lesson 当前教材课时
 * @param {object} input.publishedVersion 当前选中的发布版本
 * @param {string} input.returnPath 退出试做后返回的教师页
 * @param {string} [input.startedAt] 试做开始时间
 * @returns {object} 学生学习会话
 */
export function createTeacherLessonPreviewSession({
  lesson,
  publishedVersion,
  returnPath,
  startedAt = new Date().toISOString(),
}) {
  const published = mapContentVersionToStudentLesson(publishedVersion);
  const catalogKnowledgePoints = lesson.knowledgePoints || [];
  const knowledgePoints = published.knowledgeObjectives.map((objective) => ({
    ...catalogKnowledgePoints.find((item) => item.id === objective.id),
    ...objective,
  }));
  const previewScope = `teacher-preview:${published.versionId}`;

  return {
    ...createEmptyLearningSession(),
    selection: {
      chapter: {
        id: lesson.chapter?.id || `teacher-preview:${lesson.id}`,
        title: lesson.chapter?.title || lesson.chapterTitle || "",
      },
      section: {
        ...lesson,
        knowledgePoints,
      },
      knowledgePoints,
      contentVersion: published.version,
      contentVersionId: published.versionId,
      contentStatus: "published",
      generationPolicy: published.generationPolicy,
      questionDistribution: published.questionDistribution,
      studentSessionId: `${previewScope}:${Date.parse(startedAt)}`,
      studentId: previewScope,
      studentName: "教师试做用户",
      startedAt,
      sessionType: "teacher_preview",
      teacherPreview: {
        returnPath,
        publishedVersionId: published.versionId,
      },
    },
    preQuestions: published.preQuestions,
    postQuestions: published.postQuestions,
    publishedContent: {
      assessmentMatrices: published.assessmentMatrices,
      learningContent: published.learningContent,
      knowledgePracticePools: published.knowledgePracticePools,
      compositeReviewPool: published.compositeReviewPool,
    },
  };
}

/**
 * 解析学习流退出地址。教师试做始终回到发起试做的课时页。
 * @param {object} session 当前学习会话
 * @param {string} fallback 普通学生流程返回地址
 * @returns {string} 退出地址
 */
export function learningSessionExitPath(session, fallback) {
  return session.selection?.teacherPreview?.returnPath || fallback;
}

/**
 * @param {object} session 当前学习会话
 * @returns {boolean} 是否为教师试做会话
 */
export function isTeacherLessonPreview(session) {
  return session.selection?.sessionType === "teacher_preview";
}
