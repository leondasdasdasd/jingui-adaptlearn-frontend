import { storageKeys } from "../../shared/contracts/storageKeys.js";
import {
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";
import { teacherStorageKey } from "./teacherStoragePartition.js";

const SESSION_SCHEMA_VERSION = 1;
const MAX_MESSAGES_PER_SCOPE = 80;

/**
 *
 * @param value
 */
function scopedObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

/**
 *
 * @param messagesByScope
 */
function compactMessages(messagesByScope) {
  return Object.fromEntries(
    Object.entries(scopedObject(messagesByScope)).map(([scope, messages]) => {
      const compacted = (Array.isArray(messages) ? messages : [])
        .slice(-MAX_MESSAGES_PER_SCOPE)
        .map((message) => ({
          id: String(message?.id || ""),
          role: message?.role === "user" ? "user" : "assistant",
          text: String(message?.text || "").replaceAll(/。{2,}/g, "。"),
        }))
        .filter(
          (message) =>
            message.id &&
            message.text &&
            !/^后台任务 .+ 没有全部完成：正在把整课任务写入数据库/.test(
              message.text,
            ),
        );
      const failedRunPrefixes = new Set(
        compacted.flatMap((message) => {
          const match = message.text.match(/^后台任务 (\S+) 没有全部完成/);
          return match ? [match[1]] : [];
        }),
      );
      return [
        scope,
        compacted.filter((message) => {
          const match = message.text.match(/^后台任务 (\S+) 已完成/);
          return !match || !failedRunPrefixes.has(match[1]);
        }),
      ];
    }),
  );
}

/**
 *
 * @param lessonId
 */
export function emptyTeacherAgentSession(lessonId) {
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    lessonId,
    drafts: {},
    messagesByScope: {},
    errorsByScope: {},
    plansByScope: {},
    stepStatusesByScope: {},
    runLinksByScope: {},
    updatedAt: "",
  };
}

/**
 *
 * @param lessonId
 * @param value
 */
export function normalizeTeacherAgentSession(lessonId, value) {
  if (!value || value.lessonId !== lessonId)
    return emptyTeacherAgentSession(lessonId);
  return {
    ...emptyTeacherAgentSession(lessonId),
    drafts: scopedObject(value.drafts),
    messagesByScope: compactMessages(value.messagesByScope),
    errorsByScope: scopedObject(value.errorsByScope),
    plansByScope: scopedObject(value.plansByScope),
    stepStatusesByScope: Object.fromEntries(
      Object.entries(scopedObject(value.stepStatusesByScope)).map(
        ([scope, statuses]) => [
          scope,
          Object.fromEntries(
            Object.entries(scopedObject(statuses)).map(([stepId, status]) => [
              stepId,
              status === "running" ? "failed" : status,
            ]),
          ),
        ],
      ),
    ),
    runLinksByScope: scopedObject(value.runLinksByScope),
    updatedAt: String(value.updatedAt || ""),
  };
}

/**
 *
 * @param lessonId
 */
export function readTeacherAgentSession(lessonId) {
  return normalizeTeacherAgentSession(
    lessonId,
    readJson(
      teacherStorageKey(storageKeys.teacherAgentSession(lessonId)),
      null,
    ),
  );
}

/**
 *
 * @param lessonId
 * @param value
 */
export function writeTeacherAgentSession(lessonId, value) {
  const session = normalizeTeacherAgentSession(lessonId, {
    ...value,
    lessonId,
    updatedAt: new Date().toISOString(),
  });
  session.updatedAt = new Date().toISOString();
  return writeJson(
    teacherStorageKey(storageKeys.teacherAgentSession(lessonId)),
    session,
  );
}
