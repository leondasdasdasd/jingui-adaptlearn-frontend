import { clientEvents, storageKeys } from '../../shared/contracts/storageKeys.js';
import {
  readJson, removeStoredValue, removeStoredValuesByPrefix, writeJson,
} from '../../shared/infrastructure/browserStorage.js';

function draftIds() {
  return readJson(storageKeys.quizDraftIndex, []);
}

function updateDraftIndex(draftId, present) {
  const current = new Set(draftIds());
  if (present) current.add(draftId);
  else current.delete(draftId);
  writeJson(storageKeys.quizDraftIndex, [...current]);
}

function notifyDraftUpdated(draftId) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(clientEvents.quizDraftUpdated, { detail: { draftId } }));
}

export function readStudentSession(fallback = {}) {
  return readJson(storageKeys.studentSession, fallback);
}

export function writeStudentSession(session) {
  writeJson(storageKeys.studentSession, session);
}

export function clearStudentSession() {
  removeStoredValue(storageKeys.studentSession);
}

export function readQuizDraft(draftId) {
  return readJson(storageKeys.quizDraft(draftId), {});
}

export function writeQuizDraft(draftId, draft) {
  writeJson(storageKeys.quizDraft(draftId), draft);
  updateDraftIndex(draftId, true);
  notifyDraftUpdated(draftId);
}

export function clearQuizDraft(draftId) {
  removeStoredValue(storageKeys.quizDraft(draftId));
  updateDraftIndex(draftId, false);
  notifyDraftUpdated(draftId);
}

export function clearAllQuizDrafts() {
  clearQuizDraft('pre');
  clearQuizDraft('post');
  removeStoredValuesByPrefix('adaptive-quiz-');
  removeStoredValue(storageKeys.quizDraftIndex);
  notifyDraftUpdated('*');
}

export function readAllQuizDrafts() {
  return Object.fromEntries(draftIds().map((draftId) => [draftId, readQuizDraft(draftId)]));
}

export function restoreQuizDrafts(drafts = {}) {
  clearAllQuizDrafts();
  Object.entries(drafts).forEach(([draftId, draft]) => {
    writeJson(storageKeys.quizDraft(draftId), draft);
    updateDraftIndex(draftId, true);
  });
  notifyDraftUpdated('*');
}
