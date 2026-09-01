import { storageKeys } from "../../shared/contracts/storageKeys";
import {
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage";
import {
  completeLearningPeriod,
  getLearningPeriod,
  openTeacherEventStream,
  teacherRequest,
} from "../../shared/infrastructure/classroomApi";
import {
  teacherClassesFromApi,
  teacherPeriodsFromApi,
} from "./classroomDirectoryMapper";
import { classroomReportFromApi } from "./classroomReportMapper";
import {
  classRosterCredentialFromApi,
  classRosterFromApi,
} from "./classRosterMapper";
import { teacherStorageKey } from "./teacherStoragePartition";

export const CLASSROOM_DIRECTORY_ISSUES = Object.freeze({
  CLASS_LOAD_FAILED: "CLASS_LOAD_FAILED",
  PERIOD_LOAD_FAILED: "PERIOD_LOAD_FAILED",
});

export const CLASS_ROSTER_ISSUES = Object.freeze({
  CLASS_NOT_FOUND: "CLASS_NOT_FOUND",
  ROSTER_LOAD_FAILED: "ROSTER_LOAD_FAILED",
});

/**
 *
 * @param code
 */
function codedIssue(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

/**
 *
 * @param periodId
 */
export function fetchClassroomSnapshot(periodId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/snapshot`,
  );
}

/**
 *
 * @param periodId
 */
export function fetchClassroomReports(periodId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/reports`,
  );
}

/**
 * 一次读取课堂报告所需数据，并在 repository 边界转换为稳定页面模型。
 * @param {string} periodId 课堂标识
 * @returns {Promise<object>} 教师报告页面模型
 */
export async function fetchClassroomReportView(periodId) {
  const [period, snapshot, reports] = await Promise.all([
    getLearningPeriod(periodId),
    fetchClassroomSnapshot(periodId),
    fetchClassroomReports(periodId),
  ]);
  return classroomReportFromApi({ period, snapshot, reports });
}

/**
 *
 */
export async function fetchTeacherLearningPeriods() {
  try {
    return teacherPeriodsFromApi(
      await teacherRequest("/api/v1/teacher/learning-periods"),
    );
  } catch {
    throw codedIssue(CLASSROOM_DIRECTORY_ISSUES.PERIOD_LOAD_FAILED);
  }
}

/**
 *
 */
export async function fetchTeacherClasses() {
  try {
    return teacherClassesFromApi(
      await teacherRequest("/api/v1/teacher/classes"),
    );
  } catch {
    throw codedIssue(CLASSROOM_DIRECTORY_ISSUES.CLASS_LOAD_FAILED);
  }
}

/**
 *
 * @param periodId
 * @param studentId
 */
export function fetchTeacherStudentLearningHome(periodId, studentId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/students/${encodeURIComponent(studentId)}/live-view`,
  );
}

/**
 *
 * @param classId
 * @param options
 */
export function fetchTeacherClass(classId, options = {}) {
  return teacherRequest(
    `/api/v1/teacher/classes/${encodeURIComponent(classId)}`,
    options,
  );
}

/**
 *
 * @param classId
 * @param options
 */
export function fetchTeacherClassStudents(classId, options = {}) {
  return teacherRequest(
    `/api/v1/teacher/classes/${encodeURIComponent(classId)}/students`,
    options,
  );
}

/**
 * 一次读取班级详情和学生概览，并在 repository 边界转换为稳定花名册模型。
 * @param {string} classId 班级标识
 * @param {RequestInit} options 请求选项
 * @returns {Promise<object>} 稳定花名册页面模型
 */
export async function fetchTeacherClassRosterView(classId, options = {}) {
  try {
    const [classDetails, students] = await Promise.all([
      fetchTeacherClass(classId, options),
      fetchTeacherClassStudents(classId, options),
    ]);
    return classRosterFromApi(classDetails, students);
  } catch (error) {
    throw codedIssue(
      error?.status === 404
        ? CLASS_ROSTER_ISSUES.CLASS_NOT_FOUND
        : CLASS_ROSTER_ISSUES.ROSTER_LOAD_FAILED,
    );
  }
}

/**
 *
 * @param classId
 * @param studentId
 * @param options
 */
export function fetchTeacherClassStudentLearningHome(
  classId,
  studentId,
  options = {},
) {
  return teacherRequest(
    `/api/v1/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/live-view`,
    options,
  );
}

/**
 *
 * @param classId
 * @param studentId
 */
export async function rotateClassStudentAccessCredential(classId, studentId) {
  return classRosterCredentialFromApi(
    await teacherRequest(
      `/api/v1/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/credential`,
      { method: "POST" },
    ),
  );
}

/**
 *
 * @param classId
 * @param studentId
 */
export function revokeClassStudentAccessCredential(classId, studentId) {
  return teacherRequest(
    `/api/v1/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/credential`,
    { method: "DELETE" },
  );
}

/**
 *
 * @param periodId
 * @param studentId
 */
export function createFamilyStudentShare(periodId, studentId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/students/${encodeURIComponent(studentId)}/family-share`,
    { method: "POST" },
  );
}

/**
 *
 * @param periodId
 * @param studentId
 */
export function revokeFamilyStudentShare(periodId, studentId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/students/${encodeURIComponent(studentId)}/family-share/revoke`,
    { method: "POST" },
  );
}

/**
 *
 * @param sessionId
 * @param reviewedBy
 */
export function publishStudentScore(sessionId, reviewedBy = "current-teacher") {
  return teacherRequest(
    `/api/v1/teacher/student-sessions/${encodeURIComponent(sessionId)}/score/publish`,
    {
      method: "POST",
      body: JSON.stringify({ reviewedBy }),
    },
  );
}

/**
 *
 * @param periodId
 */
export function fetchHelpRequests(periodId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/help-requests?activeOnly=true`,
  );
}

/**
 *
 * @param periodId
 * @param requestId
 */
export function acknowledgeHelpRequest(periodId, requestId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/help-requests/${encodeURIComponent(requestId)}/acknowledge`,
    { method: "POST" },
  );
}

/**
 *
 * @param periodId
 * @param requestId
 */
export function resolveHelpRequest(periodId, requestId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/help-requests/${encodeURIComponent(requestId)}/resolve`,
    { method: "POST" },
  );
}

/**
 *
 */
export function fetchSupportHelpRequests() {
  return teacherRequest("/api/v1/teacher/help-requests?activeOnly=true");
}

/**
 *
 * @param requestId
 */
export function acknowledgeSupportHelpRequest(requestId) {
  return teacherRequest(
    `/api/v1/teacher/help-requests/${encodeURIComponent(requestId)}/acknowledge`,
    { method: "POST" },
  );
}

/**
 *
 * @param requestId
 */
export function resolveSupportHelpRequest(requestId) {
  return teacherRequest(
    `/api/v1/teacher/help-requests/${encodeURIComponent(requestId)}/resolve`,
    { method: "POST" },
  );
}

/**
 *
 * @param periodId
 */
export function fetchAttentionAlerts(periodId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/attention-alerts?activeOnly=true`,
  );
}

/**
 *
 * @param periodId
 * @param alertId
 */
export function acknowledgeAttentionAlert(periodId, alertId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/attention-alerts/${encodeURIComponent(alertId)}/acknowledge`,
    { method: "POST" },
  );
}

/**
 *
 * @param periodId
 * @param alertId
 */
export function resolveAttentionAlert(periodId, alertId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/attention-alerts/${encodeURIComponent(alertId)}/resolve`,
    { method: "POST" },
  );
}

/**
 *
 * @param periodId
 * @param alertId
 */
export function confirmAttentionAlertInvalid(periodId, alertId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/attention-alerts/${encodeURIComponent(alertId)}/confirm-invalid`,
    { method: "POST" },
  );
}

/**
 *
 * @param periodId
 * @param alertId
 */
export function markAttentionAlertFalsePositive(periodId, alertId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/attention-alerts/${encodeURIComponent(alertId)}/misclassify`,
    { method: "POST" },
  );
}

/**
 *
 * @param periodId
 */
export function endClassroom(periodId) {
  return completeLearningPeriod(periodId);
}

/**
 *
 */
export function forgetCurrentPeriod() {
  writeJson(teacherStorageKey(storageKeys.currentTeacherPeriod), "");
}
/**
 *
 */
export function forgetCurrentClass() {
  writeJson(teacherStorageKey(storageKeys.currentTeacherClass), "");
}

/**
 *
 * @param periodId
 * @param onEvent
 * @param signal
 */
export function subscribeClassroom(periodId, onEvent, signal) {
  return openTeacherEventStream(periodId, onEvent, signal);
}

/**
 *
 * @param periodId
 */
export function rememberCurrentPeriod(periodId) {
  if (periodId)
    writeJson(teacherStorageKey(storageKeys.currentTeacherPeriod), periodId);
}
/**
 *
 */
export function readCurrentPeriod() {
  return readJson(teacherStorageKey(storageKeys.currentTeacherPeriod), "");
}
/**
 *
 * @param classId
 */
export function rememberCurrentClass(classId) {
  if (classId)
    writeJson(teacherStorageKey(storageKeys.currentTeacherClass), classId);
}
/**
 *
 */
export function readCurrentClass() {
  return readJson(teacherStorageKey(storageKeys.currentTeacherClass), "");
}
