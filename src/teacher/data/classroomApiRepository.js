import { completeLearningPeriod, openTeacherEventStream, teacherRequest } from '../../shared/infrastructure/classroomApi';
import { readJson, writeJson } from '../../shared/infrastructure/browserStorage';
import { storageKeys } from '../../shared/contracts/storageKeys';
import { teacherStorageKey } from './teacherStoragePartition';

export function fetchClassroomSnapshot(periodId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/snapshot`);
}

export function fetchClassroomReports(periodId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/reports`);
}

export function fetchTeacherLearningPeriods() {
  return teacherRequest('/api/v1/teacher/learning-periods');
}

export function fetchTeacherClasses() {
  return teacherRequest('/api/v1/teacher/classes');
}

export function fetchTeacherStudentLearningHome(periodId, studentId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/students/${encodeURIComponent(studentId)}/live-view`);
}

export function fetchTeacherClass(classId, options = {}) {
  return teacherRequest(`/api/v1/teacher/classes/${encodeURIComponent(classId)}`, options);
}

export function fetchTeacherClassStudents(classId, options = {}) {
  return teacherRequest(`/api/v1/teacher/classes/${encodeURIComponent(classId)}/students`, options);
}

export function fetchTeacherClassStudentLearningHome(classId, studentId, options = {}) {
  return teacherRequest(`/api/v1/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/live-view`, options);
}

export function rotateClassStudentAccessCredential(classId, studentId) {
  return teacherRequest(`/api/v1/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/credential`, { method: 'POST' });
}

export function revokeClassStudentAccessCredential(classId, studentId) {
  return teacherRequest(`/api/v1/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/credential`, { method: 'DELETE' });
}

export function createFamilyStudentShare(periodId, studentId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/students/${encodeURIComponent(studentId)}/family-share`, { method: 'POST' });
}

export function revokeFamilyStudentShare(periodId, studentId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/students/${encodeURIComponent(studentId)}/family-share/revoke`, { method: 'POST' });
}

export function publishStudentScore(sessionId, reviewedBy = 'current-teacher') {
  return teacherRequest(`/api/v1/teacher/student-sessions/${encodeURIComponent(sessionId)}/score/publish`, {
    method: 'POST', body: JSON.stringify({ reviewedBy }),
  });
}

export function fetchHelpRequests(periodId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/help-requests?activeOnly=true`);
}

export function acknowledgeHelpRequest(periodId, requestId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/help-requests/${encodeURIComponent(requestId)}/acknowledge`, { method: 'POST' });
}

export function resolveHelpRequest(periodId, requestId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/help-requests/${encodeURIComponent(requestId)}/resolve`, { method: 'POST' });
}

export function fetchSupportHelpRequests() {
  return teacherRequest('/api/v1/teacher/help-requests?activeOnly=true');
}

export function acknowledgeSupportHelpRequest(requestId) {
  return teacherRequest(`/api/v1/teacher/help-requests/${encodeURIComponent(requestId)}/acknowledge`, { method: 'POST' });
}

export function resolveSupportHelpRequest(requestId) {
  return teacherRequest(`/api/v1/teacher/help-requests/${encodeURIComponent(requestId)}/resolve`, { method: 'POST' });
}

export function fetchAttentionAlerts(periodId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/attention-alerts?activeOnly=true`);
}

export function acknowledgeAttentionAlert(periodId, alertId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/attention-alerts/${encodeURIComponent(alertId)}/acknowledge`, { method: 'POST' });
}

export function resolveAttentionAlert(periodId, alertId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/attention-alerts/${encodeURIComponent(alertId)}/resolve`, { method: 'POST' });
}

export function confirmAttentionAlertInvalid(periodId, alertId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/attention-alerts/${encodeURIComponent(alertId)}/confirm-invalid`, { method: 'POST' });
}

export function markAttentionAlertFalsePositive(periodId, alertId) {
  return teacherRequest(`/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/attention-alerts/${encodeURIComponent(alertId)}/misclassify`, { method: 'POST' });
}

export function endClassroom(periodId) { return completeLearningPeriod(periodId); }

export function forgetCurrentPeriod() { writeJson(teacherStorageKey(storageKeys.currentTeacherPeriod), ''); }
export function forgetCurrentClass() { writeJson(teacherStorageKey(storageKeys.currentTeacherClass), ''); }

export function subscribeClassroom(periodId, onEvent, signal) {
  return openTeacherEventStream(periodId, onEvent, signal);
}

export function rememberCurrentPeriod(periodId) { if (periodId && periodId !== 'demo') writeJson(teacherStorageKey(storageKeys.currentTeacherPeriod), periodId); }
export function readCurrentPeriod() { return readJson(teacherStorageKey(storageKeys.currentTeacherPeriod), ''); }
export function rememberCurrentClass(classId) { if (classId) writeJson(teacherStorageKey(storageKeys.currentTeacherClass), classId); }
export function readCurrentClass() { return readJson(teacherStorageKey(storageKeys.currentTeacherClass), ''); }
