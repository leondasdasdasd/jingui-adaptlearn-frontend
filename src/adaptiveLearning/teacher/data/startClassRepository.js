import {
  createLearningPeriod,
  publishLearningPeriod,
} from "../../shared/infrastructure/classroomApi";
import { START_CLASS_ISSUES, startClassIssue } from "../domain/startClassIssue";
import { rememberCurrentPeriod } from "./classroomApiRepository";

/**
 * 将开课 application command 映射为课堂服务 DTO；UI 不感知传输层字段。
 * @param {object} launch 开课命令
 * @returns {object} 课堂服务创建 DTO
 */
export function toLearningPeriodCreateDto(launch) {
  const { teachingCourse, linkedLessonContent, rosterSelection, schedule } =
    launch;
  return {
    classId: rosterSelection.classId,
    className: rosterSelection.className,
    title: linkedLessonContent.title,
    contentVersionId: linkedLessonContent.contentVersionId,
    linkedLessonIds: linkedLessonContent.lessonIds,
    teachingCourseId: teachingCourse.courseId,
    teachingCourseName: teachingCourse.courseName,
    subjectId: teachingCourse.subjectId,
    semesterId: teachingCourse.semesterId,
    semesterName: teachingCourse.semesterName,
    scheduledStartAt: schedule.scheduledStartAt,
    createdBy: "current-teacher",
    students: rosterSelection.students,
  };
}

/**
 * 创建并发布真实课堂，向上层只返回稳定的 periodId。
 * @param {object} launch 开课命令
 * @returns {Promise<{periodId:string}>} 已发布课堂标识
 */
export async function launchLearningPeriod(launch) {
  const created = await createLearningPeriod(toLearningPeriodCreateDto(launch));
  const periodId = String(created?.period?.id || "").trim();
  if (!periodId) {
    throw startClassIssue(START_CLASS_ISSUES.CREATE_FAILED);
  }
  await publishLearningPeriod(periodId);
  rememberCurrentPeriod(periodId);
  return { periodId };
}
