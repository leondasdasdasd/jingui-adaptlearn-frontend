import {
  clientEvents,
  storageKeys,
} from "../../shared/contracts/storageKeys.js";
import {
  emitClientEvent,
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";
import { enqueueClassroomEvent } from "./classroomSyncRepository.js";
import {
  markQuestionSeen,
  seenQuestionScope,
} from "./seenQuestionRepository.js";
import { readStudentSession } from "./studentSessionRepository.js";

const now = () => new Date().toISOString();

/**
 *
 * @param event
 * @param selectionOverride
 */
export function recordLearningEvent(event, selectionOverride = null) {
  const events = readJson(storageKeys.learningEvents, []);
  const active = readStudentSession();
  const selection = selectionOverride || active.selection || {};
  const record = {
    id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    occurredAt: now(),
    studentSessionId: selection.studentSessionId || "legacy-session",
    lessonId: selection.section?.id || "",
    ...event,
  };
  writeJson(storageKeys.learningEvents, [...events.slice(-199), record]);
  if (record.type === "question_presented") {
    markQuestionSeen(seenQuestionScope(selection), {
      id: record.questionId,
      stem: record.stem,
    });
  }
  enqueueClassroomEvent(record, record.occurredAt, {
    sessionId: selection.studentSessionId,
    accessToken: selection.classroomAccessToken,
  });
  emitClientEvent(clientEvents.learningEventRecorded, record);
  return record;
}
