import { START_CLASS_ISSUES, startClassIssue } from "./startClassIssue";

function validatedTeachingCourse(teachingCourse) {
  if (!teachingCourse?.courseId || !teachingCourse?.semesterId) {
    throw startClassIssue(START_CLASS_ISSUES.SELECT_COURSE);
  }
  return {
    courseId: teachingCourse.courseId,
    courseName: teachingCourse.courseName || "",
    subjectId: teachingCourse.subjectId || "",
    semesterId: teachingCourse.semesterId,
    semesterName: teachingCourse.semesterName || "",
  };
}

function validatedLessonContent(content, teachingCourse) {
  const linkedLessonIds = content?.sourceLessonIds || [];
  if (
    !content?.contentVersionId ||
    linkedLessonIds.length === 0 ||
    linkedLessonIds.length > 3
  ) {
    throw startClassIssue(START_CLASS_ISSUES.SELECT_LESSONS);
  }
  return {
    contentVersionId: content.contentVersionId,
    lessonIds: linkedLessonIds,
    title: content.title || teachingCourse.courseName || "Adaptive classroom",
  };
}

function validatedRoster(activeClass, selectedStudentIds) {
  if (!activeClass?.classId) {
    throw startClassIssue(START_CLASS_ISSUES.SELECT_CLASS);
  }
  const students = (activeClass.students || [])
    .filter((student) => selectedStudentIds.has(student.studentId))
    .map((student) => ({
      studentId: student.studentId,
      studentName: student.studentName,
    }));
  if (students.length === 0) {
    throw startClassIssue(START_CLASS_ISSUES.SELECT_STUDENTS);
  }
  return {
    classId: activeClass.classId,
    className: activeClass.className,
    students,
  };
}

function validatedSchedule(classDate, classTime) {
  const scheduledStartAt = new Date(`${classDate}T${classTime}:00`);
  if (Number.isNaN(scheduledStartAt.getTime())) {
    throw startClassIssue(START_CLASS_ISSUES.INVALID_START_TIME, TypeError);
  }
  return { scheduledStartAt: scheduledStartAt.toISOString() };
}

/**
 * 构建课堂服务创建请求；只允许当前真实班级中的学生进入请求。
 * @param {object} input 真实课程、关联内容、花名册选择和排课时间。
 * @param input.teachingCourse
 * @param input.activeClass
 * @param input.selectedStudentIds
 * @param input.content
 * @param input.classDate
 * @param input.classTime
 * @returns {object} `createLearningPeriod` 领域请求。
 */
export function buildStartClassLaunch({
  teachingCourse,
  activeClass,
  selectedStudentIds,
  content,
  classDate,
  classTime,
}) {
  const validatedCourse = validatedTeachingCourse(teachingCourse);
  return {
    teachingCourse: validatedCourse,
    linkedLessonContent: validatedLessonContent(content, validatedCourse),
    rosterSelection: validatedRoster(activeClass, selectedStudentIds),
    schedule: validatedSchedule(classDate, classTime),
  };
}
