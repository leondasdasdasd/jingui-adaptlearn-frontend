import { storageKeys } from '../../shared/contracts/storageKeys';
import { readJson, removeStoredValue, writeJson } from '../../shared/infrastructure/browserStorage';

export function normalizeClassStudentIdentity(payload, accessToken) {
  const student = payload?.student || payload || {};
  return {
    accessToken,
    classId: payload?.classId || payload?.class?.id || student.classId || '',
    className: payload?.className || payload?.class?.name || student.className || '',
    studentId: student.id || student.studentId || payload?.studentId || '',
    studentName: student.name || student.studentName || payload?.studentName || '',
  };
}

export function readClassStudentIdentity() {
  const identity = readJson(storageKeys.classStudentIdentity, null);
  return identity?.studentId && identity?.accessToken ? identity : null;
}

export function rememberClassStudentIdentity(identity) {
  if (!identity?.studentId || !identity?.accessToken) return false;
  return writeJson(storageKeys.classStudentIdentity, identity);
}

export function forgetClassStudentIdentity() {
  removeStoredValue(storageKeys.classStudentIdentity);
}
