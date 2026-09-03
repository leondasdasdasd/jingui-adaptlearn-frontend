import { storageKeys } from "../../shared/contracts/storageKeys";
import {
  readJson,
  readSessionValue,
  removeSessionValue,
  writeJson,
  writeSessionValue,
} from "../../shared/infrastructure/browserStorage";
import { createStudentSupportSession } from "../../shared/infrastructure/classroomApi";
import { createClientId } from "../../shared/infrastructure/clientId";

let pendingSession = null;

/**
 *
 */
function readStoredSupportSession() {
  return readJson(storageKeys.studentSupportSession, {});
}

/**
 *
 * @param selection
 * @param stored
 */
function desiredIdentity(selection, stored) {
  const clientInstanceId = stored.clientInstanceId || createClientId();
  return {
    clientInstanceId,
    studentId:
      selection?.studentId ||
      stored.studentId ||
      `local-${clientInstanceId.slice(0, 8)}`,
    studentName:
      selection?.studentName || stored.studentName || "当前学生（本机）",
    accessToken: stored.accessToken || `${createClientId()}${createClientId()}`,
  };
}

/**
 *
 * @param selection
 */
export async function ensureStudentSupportSession(selection) {
  const stored = readStoredSupportSession();
  const identity = desiredIdentity(selection, stored);
  if (
    stored.id &&
    stored.accessToken &&
    stored.studentId === identity.studentId &&
    stored.studentName === identity.studentName
  )
    return stored;
  const identityKey = `${identity.clientInstanceId}:${identity.studentId}:${identity.studentName}`;
  if (pendingSession?.identityKey === identityKey)
    return pendingSession.promise;
  writeJson(storageKeys.studentSupportSession, { ...stored, ...identity });
  const promise = createStudentSupportSession(identity)
    .then((credentials) => {
      const next = { ...identity, ...credentials };
      writeJson(storageKeys.studentSupportSession, next);
      return next;
    })
    .finally(() => {
      if (pendingSession?.promise === promise) pendingSession = null;
    });
  pendingSession = { identityKey, promise };
  return promise;
}

/**
 *
 */
export function resetStudentSupportCredentials() {
  const stored = readStoredSupportSession();
  writeJson(storageKeys.studentSupportSession, {
    clientInstanceId: stored.clientInstanceId,
    studentId: stored.studentId,
    studentName: stored.studentName,
    accessToken: stored.accessToken,
  });
}

/**
 *
 */
export function readCollapsedStudentHelpRequestId() {
  return readSessionValue(storageKeys.collapsedStudentHelpRequest, "");
}

/**
 *
 * @param requestId
 */
export function saveCollapsedStudentHelpRequestId(requestId) {
  return writeSessionValue(storageKeys.collapsedStudentHelpRequest, requestId);
}

/**
 *
 */
export function clearCollapsedStudentHelpRequestId() {
  removeSessionValue(storageKeys.collapsedStudentHelpRequest);
}
