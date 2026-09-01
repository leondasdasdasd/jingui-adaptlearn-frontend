const asItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const normalizedId = (value) => String(value ?? "").trim();
const normalizedText = (value, fallback = "") =>
  String(value ?? fallback).trim();

/**
 * 将测验平台学科响应转换为开课目录模型。
 * @param {unknown} payload 测验平台响应或 content 数组。
 * @returns {Array<{subjectId:string, subjectName:string}>} 可选择学科。
 */
export function mapPlatformSubjects(payload) {
  return asItems(payload)
    .map((item) => ({
      subjectId: normalizedId(item?.subjectId ?? item?.id),
      subjectName: normalizedText(item?.subjectName ?? item?.name),
    }))
    .filter((item) => item.subjectId);
}

/**
 * 将测验平台课程响应转换为稳定课程模型。
 * @param {unknown} payload 测验平台响应或 content 数组。
 * @returns {Array<{courseId:string, courseName:string, subjectId:string}>} 系统课程。
 */
export function mapPlatformCourses(payload) {
  return asItems(payload)
    .map((item) => ({
      courseId: normalizedId(item?.courseId ?? item?.id),
      courseName: normalizedText(item?.courseName ?? item?.name),
      subjectId: normalizedId(item?.subjectId),
    }))
    .filter((item) => item.courseId);
}

/**
 *
 * @param item
 */
function sourceRosterStudents(item) {
  if (Array.isArray(item?.students)) return item.students;
  if (Array.isArray(item?.studentList)) return item.studentList;
  return [];
}

/**
 *
 * @param item
 * @param classroom
 */
function mapPlatformStudent(item, classroom) {
  const studentId = normalizedId(item?.studentId ?? item?.id);
  if (!studentId) return null;
  return {
    studentId,
    studentName: normalizedText(item?.studentName ?? item?.name),
    studentCode: normalizedText(
      item?.studentCode ?? item?.studentNo ?? item?.englishName,
      "—",
    ),
    classId: classroom.classId,
    className: classroom.className,
    avatarUrl: normalizedText(item?.stuAvatar ?? item?.avatarUrl),
  };
}

/**
 *
 * @param item
 */
function mapPlatformClass(item) {
  const classId = normalizedId(item?.classId ?? item?.groupCourseId);
  if (!classId) return null;
  const classroom = {
    classId,
    className: normalizedText(
      item?.className ??
        item?.studentGroupName ??
        item?.studentGroupEnglishName,
    ),
  };
  const students = sourceRosterStudents(item)
    .map((student) => mapPlatformStudent(student, classroom))
    .filter(Boolean);
  const declaredStudentCount = Number(
    item?.studentCount ?? item?.groupCourseStudentNumbers,
  );
  return {
    ...classroom,
    studentCount:
      declaredStudentCount > 0 ? declaredStudentCount : students.length,
    students,
  };
}

/**
 * 将课程花名册响应一次性转换为班级及学生模型，页面不感知平台 DTO。
 * @param {unknown} payload `/api/getCourseStudents` 响应或 content 数组。
 * @returns {Array<{classId:string, className:string, studentCount:number, students:Array<object>}>} 真实课程班级。
 */
export function mapPlatformCourseRoster(payload) {
  return asItems(payload)
    .map((item) => mapPlatformClass(item))
    .filter(Boolean);
}
