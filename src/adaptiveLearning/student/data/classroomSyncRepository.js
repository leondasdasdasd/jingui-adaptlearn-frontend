import { storageKeys } from "../../shared/contracts/storageKeys.js";
import { assessmentPurposeForQuestion } from "../../shared/domain/questionPurpose.js";
import {
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";
import {
  studentRequest,
  uploadStudentSessionMedia,
} from "../../shared/infrastructure/classroomApi.js";
import { createClientId } from "../../shared/infrastructure/clientId.js";
import { readStudentSession } from "./studentSessionRepository.js";

let flushing = false;

/**
 *
 * @param error
 * @param previous
 */
function syncFailure(error, previous = {}) {
  return {
    retryCount: Number(previous.retryCount || 0) + 1,
    lastAttemptAt: new Date().toISOString(),
    lastError: error?.message || "课堂记录同步失败",
    lastErrorStatus: Number(error?.status) || null,
  };
}

/**
 *
 */
function nextSequence() {
  const current = Number(readJson(storageKeys.classroomClientSequence, 0));
  // A long-lived student session can be resumed after browser storage was
  // cleared. Keep the sequence above any earlier small counter so the server
  // does not silently classify new learning events as idempotent replays.
  const sequence = Math.max(
    Number.isSafeInteger(current) ? current + 1 : 1,
    Date.now() * 1000,
  );
  writeJson(storageKeys.classroomClientSequence, sequence);
  return sequence;
}

/**
 *
 * @param credentials
 */
function activeCredentials(credentials = null) {
  if (credentials) {
    return {
      sessionId: credentials.sessionId,
      accessToken: credentials.accessToken,
    };
  }
  const selection = readStudentSession({}).selection || {};
  return {
    sessionId: selection.studentSessionId,
    accessToken: selection.classroomAccessToken,
  };
}

/**
 *
 * @param key
 * @param record
 */
function append(key, record) {
  writeJson(key, [...readJson(key, []), record].slice(-1000));
}

/**
 *
 * @param group
 */
async function flushEventGroup(group) {
  const payload = group.records.map((record) => ({
    clientSequence: record.clientSequence,
    eventType: record.event.type,
    knowledgeObjectiveId: record.event.knowledgePointId || null,
    payload: record.event,
    occurredAt: record.occurredAt,
  }));
  await studentRequest(
    `/api/v1/student-sessions/${group.sessionId}/events`,
    group.accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/**
 *
 * @param record
 */
async function flushAnswer(record) {
  let submission = record.submission;
  if (record.imageDataUrl && !submission.answerContent?.mediaId) {
    const match = /^data:([^,;]+);base64,(.+)$/s.exec(record.imageDataUrl);
    if (!match) throw new Error("图片格式无法同步");
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1)
      bytes[index] = binary.charCodeAt(index);
    const media = await uploadStudentSessionMedia(
      record.sessionId,
      record.accessToken,
      {
        blob: new Blob([bytes], { type: match[1] }),
        filename: record.imageName || `answer-${record.outboxId}`,
        idempotencyKey: `answer-image-${record.outboxId}`,
        metadata: {
          purpose: "ANSWER_SUBMISSION",
          questionId: submission.questionId,
        },
      },
    );
    submission = {
      ...submission,
      answerContent: {
        ...submission.answerContent,
        mediaId: media.id,
        mediaSha256: media.sha256,
        mediaContentType: media.contentType,
      },
    };
  }
  return studentRequest(
    `/api/v1/student-sessions/${record.sessionId}/answers`,
    record.accessToken,
    {
      method: "POST",
      body: JSON.stringify(submission),
    },
  );
}

/**
 *
 * @param records
 */
function groupedEvents(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.sessionId}:${record.accessToken}`;
    if (!groups.has(key))
      groups.set(key, {
        sessionId: record.sessionId,
        accessToken: record.accessToken,
        records: [],
      });
    groups.get(key).records.push(record);
  }
  return [...groups.values()];
}

/**
 *
 */
export async function flushClassroomOutbox() {
  if (flushing || !navigator.onLine) return getClassroomOutboxStatus();
  flushing = true;
  try {
    const events = readJson(storageKeys.classroomEventOutbox, []);
    for (const group of groupedEvents(events)) {
      try {
        await flushEventGroup(group);
        const uploaded = new Set(group.records.map((item) => item.outboxId));
        writeJson(
          storageKeys.classroomEventOutbox,
          readJson(storageKeys.classroomEventOutbox, []).filter(
            (item) => !uploaded.has(item.outboxId),
          ),
        );
      } catch (error) {
        // 保留本组，恢复网络后使用相同 clientSequence 重传。
        const failedIds = new Set(group.records.map((item) => item.outboxId));
        writeJson(
          storageKeys.classroomEventOutbox,
          readJson(storageKeys.classroomEventOutbox, []).map((item) =>
            failedIds.has(item.outboxId)
              ? { ...item, ...syncFailure(error, item) }
              : item,
          ),
        );
      }
    }
    for (const record of readJson(storageKeys.classroomAnswerOutbox, [])) {
      try {
        const authoritativeAnswer = await flushAnswer(record);
        writeJson(
          storageKeys.classroomAnswerOutbox,
          readJson(storageKeys.classroomAnswerOutbox, []).filter(
            (item) => item.outboxId !== record.outboxId,
          ),
        );
        if (typeof CustomEvent !== "undefined")
          window.dispatchEvent?.(
            new CustomEvent("adaptive-classroom-answer-synced", {
              detail: {
                sessionId: record.sessionId,
                clientSubmissionId: record.submission.clientSubmissionId,
                answer: authoritativeAnswer,
              },
            }),
          );
      } catch (error) {
        // 作答使用稳定 clientSubmissionId，重复重传不会重复生成证据。
        writeJson(
          storageKeys.classroomAnswerOutbox,
          readJson(storageKeys.classroomAnswerOutbox, []).map((item) =>
            item.outboxId === record.outboxId
              ? { ...item, ...syncFailure(error, item) }
              : item,
          ),
        );
      }
    }
  } finally {
    flushing = false;
  }
  return getClassroomOutboxStatus();
}

/**
 *
 * @param sessionId
 */
export function getClassroomOutboxStatus(sessionId = "") {
  const forSession = (item) => !sessionId || item.sessionId === sessionId;
  const answerRecords = readJson(storageKeys.classroomAnswerOutbox, []).filter(
    forSession,
  );
  const eventRecords = readJson(storageKeys.classroomEventOutbox, []).filter(
    forSession,
  );
  const latestFailure = [...answerRecords, ...eventRecords]
    .filter((item) => item.lastError)
    .sort((left, right) =>
      String(right.lastAttemptAt).localeCompare(String(left.lastAttemptAt)),
    )[0];
  return {
    answers: answerRecords.length,
    events: eventRecords.length,
    lastError: latestFailure?.lastError || "",
    lastErrorStatus: latestFailure?.lastErrorStatus || null,
  };
}

/**
 *
 * @param event
 * @param occurredAt
 * @param credentials
 */
export function enqueueClassroomEvent(
  event,
  occurredAt = new Date().toISOString(),
  credentials = null,
) {
  const { sessionId, accessToken } = activeCredentials(credentials);
  if (!sessionId || !accessToken) return;
  append(storageKeys.classroomEventOutbox, {
    outboxId: createClientId(),
    sessionId,
    accessToken,
    clientSequence: nextSequence(),
    occurredAt,
    event,
  });
  void flushClassroomOutbox();
}

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.attempt
 * @param root0.mode
 * @param root0.image
 * @param root0.credentials
 */
export function enqueueAnswerSubmission({
  question,
  attempt,
  mode,
  image = null,
  credentials = null,
}) {
  const { sessionId, accessToken } = activeCredentials(credentials);
  if (!sessionId || !accessToken) return;
  const knowledgePointIds = question.knowledgePointIds?.length
    ? question.knowledgePointIds
    : ["unmapped"];
  const rawWeights = question.knowledgePointWeights || {};
  const primaryKnowledgePointId =
    question.primaryKnowledgePointId || knowledgePointIds[0] || "";
  const questionEvidenceMap = Array.isArray(question.knowledgeEvidenceMap)
    ? question.knowledgeEvidenceMap
    : [];
  const attemptEvidenceMap = Array.isArray(attempt.knowledgeEvidenceMap)
    ? attempt.knowledgeEvidenceMap
    : [];
  const scoreForKnowledgePoint = (id) => {
    const questionEvidence = questionEvidenceMap.filter(
      (item) => item.knowledgePointId === id,
    );
    const scoringPointScores =
      attempt.scoringPointScores &&
      typeof attempt.scoringPointScores === "object"
        ? attempt.scoringPointScores
        : {};
    if (
      questionEvidence.length > 0 &&
      Object.keys(scoringPointScores).length > 0
    ) {
      const rows = questionEvidence
        .map((item) => scoringPointScores[item.scoringPointId])
        .filter(Boolean);
      if (rows.length !== questionEvidence.length) return null;
      const score = rows.reduce(
        (sum, item) => sum + Number(item.score || 0),
        0,
      );
      const maxScore = rows.reduce(
        (sum, item) => sum + Number(item.maxScore || 0),
        0,
      );
      const weightedConfidence = rows.reduce(
        (sum, item) =>
          sum +
          Number(
            item.gradingConfidence ??
              attempt.gradingConfidence ??
              attempt.confidence ??
              0.9,
          ) *
            Number(item.maxScore || 0),
        0,
      );
      if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0) {
        return {
          score,
          maxScore,
          gradingConfidence: weightedConfidence / maxScore,
        };
      }
      return null;
    }
    const firstEvidence = questionEvidence[0];
    const attemptEvidence =
      attemptEvidenceMap.find((item) => item.knowledgePointId === id) ||
      attempt.knowledgePointScores?.[id] ||
      attempt.knowledgeObjectiveScores?.[id];
    const scoringPointId =
      firstEvidence?.scoringPointId || firstEvidence?.subQuestionId;
    const scoringPoint = scoringPointId
      ? attempt.scoringPointScores?.[scoringPointId] ||
        attempt.scoringPoints?.find?.((item) => item.id === scoringPointId)
      : null;
    const resolved = attemptEvidence || scoringPoint;
    const score = Number(resolved?.score);
    const maxScore = Number(resolved?.maxScore ?? firstEvidence?.maxScore);
    return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
      ? {
          score,
          maxScore,
          gradingConfidence: Number(
            resolved?.gradingConfidence ??
              attempt.gradingConfidence ??
              attempt.confidence ??
              0.9,
          ),
        }
      : null;
  };
  const compoundRequiresIndependentScores = questionEvidenceMap.length > 1;
  const knowledgeObjectives = knowledgePointIds.flatMap((id) => {
    const independentScore = scoreForKnowledgePoint(id);
    if (
      compoundRequiresIndependentScores &&
      id !== primaryKnowledgePointId &&
      !independentScore
    )
      return [];
    return [
      {
        id,
        weight: Math.max(
          0.05,
          Math.min(
            1,
            Number(
              rawWeights[id] || (id === primaryKnowledgePointId ? 1 : 0.3),
            ),
          ),
        ),
        ...independentScore,
      },
    ];
  });
  const purpose = assessmentPurposeForQuestion(question, mode);
  const clientSubmissionId = attempt.clientSubmissionId || createClientId();
  append(storageKeys.classroomAnswerOutbox, {
    outboxId: clientSubmissionId,
    sessionId,
    accessToken,
    imageDataUrl: image?.dataUrl || "",
    imageName: image?.name || attempt.answerImageName || "",
    submission: {
      clientSubmissionId,
      questionId: question.id,
      questionSnapshot: {
        id: question.id,
        stem: question.stem,
        type: question.type,
        difficulty: question.difficulty,
        phase: question.phase,
        purpose,
        blueprintSlotId:
          question.blueprintSlotId || question.preAssessmentSlotId || "",
      },
      difficulty: question.difficulty,
      sourceType: purpose,
      primaryKnowledgePointId,
      secondaryKnowledgePointIds: (question.knowledgePointIds || []).filter(
        (id) => id !== primaryKnowledgePointId,
      ),
      knowledgeObjectives,
      knowledgePointWeights: rawWeights,
      blueprintSlotId:
        question.blueprintSlotId || question.preAssessmentSlotId || "",
      purpose,
      answerContent: {
        text: attempt.recognizedAnswer || attempt.answer || "",
        imageName: attempt.answerImageName || "",
        disposition: attempt.disposition || "ANSWERED",
      },
      score: Number(attempt.score || 0),
      maxScore: Number(attempt.maxScore || question.maxScore || 1),
      independenceFactor: 1,
      itemConfidence: Math.max(
        0,
        Math.min(1, Number(attempt.confidence ?? 0.9)),
      ),
      hintUsed: Boolean(attempt.hintUsed || question.hintUsed),
      novelty: attempt.novelty || question.novelty || "NEW",
      itemQuality: Number(attempt.itemQuality ?? question.itemQuality ?? 1),
      gradingConfidence: Number(
        attempt.gradingConfidence ?? attempt.confidence ?? 0.9,
      ),
      gradingResult: { preview: true },
      attemptStage:
        attempt.attemptStage === "correction" || attempt.correctionAttempted
          ? "correction"
          : "initial",
      formalGradeReceipt: attempt.formalGradeReceipt || "",
      submittedAt: attempt.submittedAt,
    },
  });
  void flushClassroomOutbox();
}

if (typeof window !== "undefined")
  window.addEventListener("online", () => {
    void flushClassroomOutbox();
  });
