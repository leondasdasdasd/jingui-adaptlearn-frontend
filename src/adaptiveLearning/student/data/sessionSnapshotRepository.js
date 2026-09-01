import {
  clientEvents,
  storageKeys,
} from "../../shared/contracts/storageKeys.js";
import { normalizeKnowledgePracticeQuestion } from "../../shared/domain/questionPurpose.js";
import {
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";
import {
  getStudentSessionMedia,
  getStudentSessionSnapshot,
  putStudentSessionSnapshot,
  uploadStudentSessionMedia,
} from "../../shared/infrastructure/classroomApi.js";
import { createClientId } from "../../shared/infrastructure/clientId.js";
import { throwIfRequestAborted } from "../../shared/infrastructure/requestCancellation.js";
import { sha256Hex } from "../../shared/infrastructure/sha256.js";
import { readAllQuizDrafts } from "./studentSessionRepository.js";

export const SNAPSHOT_SCHEMA_VERSION = 1;

/**
 *
 * @param detail
 */
function emitStatus(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(clientEvents.persistenceStatusChanged, { detail }),
  );
}

/**
 *
 * @param session
 */
function withoutCredentials(session = {}) {
  const selection = session.selection ? { ...session.selection } : null;
  if (selection) delete selection.classroomAccessToken;
  const contextSelection = session.learningFlow?.context?.selection
    ? { ...session.learningFlow.context.selection }
    : null;
  if (contextSelection) delete contextSelection.classroomAccessToken;
  return {
    ...session,
    selection,
    learningFlow: contextSelection
      ? {
          ...session.learningFlow,
          context: {
            ...session.learningFlow.context,
            selection: contextSelection,
          },
        }
      : session.learningFlow,
  };
}

/**
 *
 * @param value
 */
function dataUrlParts(value = "") {
  const match = /^data:([^,;]+);base64,(.+)$/s.exec(value);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return { blob: new Blob([bytes], { type: match[1] }), contentType: match[1] };
}

/**
 *
 * @param draft
 * @param credentials
 */
async function persistDraftImage(draft, credentials) {
  const image = draft?.currentImage;
  if (!image?.dataUrl || image.mediaId) return draft;
  const parsed = dataUrlParts(image.dataUrl);
  if (!parsed) return draft;
  const sha256 = await sha256Hex(parsed.blob);
  const media = await uploadStudentSessionMedia(
    credentials.sessionId,
    credentials.accessToken,
    {
      blob: parsed.blob,
      filename: image.name || `answer-${sha256.slice(0, 12)}`,
      idempotencyKey: `answer-image-${sha256}`,
      metadata: {
        purpose: "QUIZ_DRAFT_ANSWER",
        source: image.source || "photo",
        width: image.width || null,
        height: image.height || null,
        sha256,
      },
    },
  );
  return {
    ...draft,
    currentImage: {
      ...image,
      dataUrl: undefined,
      mediaId: media.id,
      mediaSha256: media.sha256,
      contentType: media.contentType,
    },
  };
}

/**
 *
 * @param blob
 */
async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("学习附件读取失败"));
    reader.addEventListener("load", () => resolve(reader.result));
    reader.readAsDataURL(blob);
  });
}

/**
 *
 * @param draft
 * @param credentials
 * @param options
 */
async function hydrateDraftImage(draft, credentials, options = {}) {
  const image = draft?.currentImage;
  if (!image?.mediaId || image.dataUrl) return draft;
  const blob = await getStudentSessionMedia(
    credentials.sessionId,
    credentials.accessToken,
    image.mediaId,
    options,
  );
  throwIfRequestAborted(options.signal);
  return {
    ...draft,
    currentImage: { ...image, dataUrl: await blobToDataUrl(blob) },
  };
}

/**
 *
 * @param sessionId
 */
export function snapshotSyncMetadata(sessionId) {
  const stored = readJson(storageKeys.classroomSnapshotSync, {});
  return stored.sessionId === sessionId ? stored : { sessionId, revision: 0 };
}

/**
 *
 * @param sessionId
 * @param revision
 */
export function rememberSnapshotRevision(sessionId, revision) {
  writeJson(storageKeys.classroomSnapshotSync, {
    sessionId,
    revision,
    updatedAt: new Date().toISOString(),
  });
}

/**
 *
 */
export function clearSnapshotRevision() {
  writeJson(storageKeys.classroomSnapshotSync, {});
}

/**
 *
 * @param session
 * @param route
 * @param credentials
 */
export async function buildSessionSnapshotPayload(session, route, credentials) {
  const draftEntries = await Promise.all(
    Object.entries(readAllQuizDrafts()).map(async ([id, draft]) => [
      id,
      await persistDraftImage(draft, credentials),
    ]),
  );
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    route,
    session: withoutCredentials(session),
    drafts: Object.fromEntries(draftEntries),
    knowledgeProfile: readJson(storageKeys.knowledgeProfile, {}),
    learningHistory: readJson(storageKeys.studentLearningHistory, []),
    savedAt: new Date().toISOString(),
  };
}

/**
 *
 * @param snapshot
 * @param credentials
 * @param options
 */
export async function hydrateSessionSnapshot(
  snapshot,
  credentials,
  options = {},
) {
  const payload = snapshot?.payload || {};
  const draftEntries = await Promise.all(
    Object.entries(payload.drafts || {}).map(async ([id, draft]) => [
      id,
      await hydrateDraftImage(draft, credentials, options),
    ]),
  );
  throwIfRequestAborted(options.signal);
  const selection = payload.session?.selection
    ? {
        ...payload.session.selection,
        studentSessionId: credentials.sessionId,
        classroomAccessToken: credentials.accessToken,
      }
    : null;
  const contextSelection = payload.session?.learningFlow?.context?.selection
    ? {
        ...payload.session.learningFlow.context.selection,
        studentSessionId: credentials.sessionId,
        classroomAccessToken: credentials.accessToken,
      }
    : null;
  const postQuestions = Array.isArray(payload.session?.postQuestions)
    ? payload.session.postQuestions.map((question) =>
        question.phase === "review"
          ? question
          : normalizeKnowledgePracticeQuestion(question),
      )
    : payload.session?.postQuestions;
  return {
    ...payload,
    session: payload.session
      ? {
          ...payload.session,
          selection,
          postQuestions,
          learningFlow: contextSelection
            ? {
                ...payload.session.learningFlow,
                context: {
                  ...payload.session.learningFlow.context,
                  selection: contextSelection,
                },
              }
            : payload.session.learningFlow,
        }
      : null,
    drafts: Object.fromEntries(draftEntries),
  };
}

/**
 *
 * @param credentials
 * @param options
 */
export async function loadSessionSnapshot(credentials, options = {}) {
  const snapshot = await getStudentSessionSnapshot(
    credentials.sessionId,
    credentials.accessToken,
    options,
  );
  throwIfRequestAborted(options.signal);
  if (!snapshot.revision || !snapshot.payload?.session) {
    rememberSnapshotRevision(credentials.sessionId, snapshot.revision);
    return { ...snapshot, hydrated: null };
  }
  const hydrated = await hydrateSessionSnapshot(snapshot, credentials, options);
  throwIfRequestAborted(options.signal);
  rememberSnapshotRevision(credentials.sessionId, snapshot.revision);
  return {
    ...snapshot,
    hydrated,
  };
}

/**
 *
 * @param root0
 * @param root0.session
 * @param root0.route
 * @param root0.credentials
 * @param root0.expectedRevision
 */
export async function saveSessionSnapshot({
  session,
  route,
  credentials,
  expectedRevision,
}) {
  emitStatus({ status: "saving" });
  try {
    const payload = await buildSessionSnapshotPayload(
      session,
      route,
      credentials,
    );
    const saved = await putStudentSessionSnapshot(
      credentials.sessionId,
      credentials.accessToken,
      {
        expectedRevision,
        idempotencyKey: createClientId(),
        payload,
      },
    );
    rememberSnapshotRevision(credentials.sessionId, saved.revision);
    emitStatus({
      status: "saved",
      revision: saved.revision,
      updatedAt: saved.updatedAt,
    });
    return saved;
  } catch (error) {
    emitStatus({
      status:
        error.status === 409
          ? "conflict"
          : navigator.onLine
            ? "error"
            : "offline",
      message:
        error.status === 409
          ? "这个链接已在其他设备上继续学习，请重新载入最新进度"
          : error.message,
    });
    throw error;
  }
}
