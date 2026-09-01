import {
  clientEvents,
  storageKeys,
} from "../../shared/contracts/storageKeys.js";
import {
  readJson,
  removeStoredValue,
  removeStoredValuesByPrefix,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";

/**
 *
 */
function draftIds() {
  return readJson(storageKeys.quizDraftIndex, []);
}

/**
 *
 * @param draftId
 * @param present
 */
function updateDraftIndex(draftId, present) {
  const current = new Set(draftIds());
  if (present) current.add(draftId);
  else current.delete(draftId);
  writeJson(storageKeys.quizDraftIndex, [...current]);
}

/**
 *
 * @param draftId
 */
function notifyDraftUpdated(draftId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(clientEvents.quizDraftUpdated, { detail: { draftId } }),
  );
}

/**
 *
 * @param fallback
 */
export function readStudentSession(fallback = {}) {
  return readJson(storageKeys.studentSession, fallback);
}

/**
 *
 * @param session
 */
export function writeStudentSession(session) {
  writeJson(storageKeys.studentSession, session);
}

/**
 *
 */
export function clearStudentSession() {
  removeStoredValue(storageKeys.studentSession);
}

/**
 *
 * @param draftId
 */
export function readQuizDraft(draftId) {
  return readJson(storageKeys.quizDraft(draftId), {});
}

/**
 *
 * @param draftId
 * @param draft
 */
export function writeQuizDraft(draftId, draft) {
  writeJson(storageKeys.quizDraft(draftId), draft);
  updateDraftIndex(draftId, true);
  notifyDraftUpdated(draftId);
}

/**
 *
 * @param draftId
 */
export function clearQuizDraft(draftId) {
  removeStoredValue(storageKeys.quizDraft(draftId));
  updateDraftIndex(draftId, false);
  notifyDraftUpdated(draftId);
}

/**
 *
 */
export function clearAllQuizDrafts() {
  clearQuizDraft("pre");
  clearQuizDraft("post");
  removeStoredValuesByPrefix("adaptive-quiz-");
  removeStoredValue(storageKeys.quizDraftIndex);
  notifyDraftUpdated("*");
}

/**
 *
 */
export function readAllQuizDrafts() {
  return Object.fromEntries(
    draftIds().map((draftId) => [draftId, readQuizDraft(draftId)]),
  );
}

/**
 *
 * @param drafts
 */
export function restoreQuizDrafts(drafts = {}) {
  clearAllQuizDrafts();
  for (const [draftId, draft] of Object.entries(drafts)) {
    writeJson(storageKeys.quizDraft(draftId), draft);
    updateDraftIndex(draftId, true);
  }
  notifyDraftUpdated("*");
}
