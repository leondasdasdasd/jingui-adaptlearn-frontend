import { classroomApiUrl } from "./runtimeEndpoints.js";

/**
 *
 * @param path
 * @param options
 */
async function request(path, options = {}) {
  const response = await fetch(classroomApiUrl(path), options);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const issueText = payload?.issues?.map((item) => item.message).join("；");
    const error = new Error(
      issueText || payload?.message || `课堂服务请求失败（${response.status}）`,
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

const jsonHeaders = { "Content-Type": "application/json" };
export const classroomApiBaseUrl = classroomApiUrl("");

/**
 *
 * @param path
 * @param options
 */
export function teacherRequest(path, options = {}) {
  return request(path, {
    ...options,
    headers: { ...jsonHeaders, ...options.headers },
  });
}

/**
 *
 * @param path
 * @param options
 */
export function multiLessonTeacherRequest(path, options = {}) {
  return teacherRequest(path, options);
}

/**
 *
 * @param path
 * @param accessToken
 * @param options
 */
export function studentRequest(path, accessToken, options = {}) {
  return request(path, {
    ...options,
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
}

/**
 *
 * @param lessonId
 * @param payload
 */
export function publishLessonVersion(lessonId, payload) {
  return teacherRequest(
    `/api/v1/textbook-lessons/${encodeURIComponent(lessonId)}/content-versions/publish`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

/**
 *
 * @param lessonId
 * @param payload
 * @param options
 */
export function validateLessonVersion(lessonId, payload, options = {}) {
  return teacherRequest(
    `/api/v1/textbook-lessons/${encodeURIComponent(lessonId)}/content-versions/validate`,
    {
      ...options,
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/**
 *
 * @param lessonId
 * @param options
 */
export function getLatestLessonVersion(lessonId, options = {}) {
  return teacherRequest(
    `/api/v1/textbook-lessons/${encodeURIComponent(lessonId)}/content-versions/latest`,
    options,
  );
}

/**
 *
 * @param lessonId
 * @param options
 */
export function getLessonVersions(lessonId, options = {}) {
  return teacherRequest(
    `/api/v1/textbook-lessons/${encodeURIComponent(lessonId)}/content-versions`,
    options,
  );
}

/**
 *
 * @param lessonId
 */
export function getPublishedLessonVersion(lessonId) {
  return request(
    `/api/v1/student/textbook-lessons/${encodeURIComponent(lessonId)}/content-version`,
  );
}

/**
 *
 * @param lessonIds
 */
export function getPublishedLessonVersions(lessonIds, options = {}) {
  const params = new URLSearchParams();
  for (const lessonId of lessonIds) params.append("lessonIds", lessonId);
  return request(
    `/api/v1/student/textbook-lessons/content-versions?${params.toString()}`,
    options,
  );
}

// Student-facing directory projection. The classroom service may return an
// array or an object containing items/learningPeriods; the domain mapper owns
// that compatibility boundary.
/**
 *
 * @param accessToken
 * @param options
 */
export function getStudentLearningPeriods(accessToken, options = {}) {
  const path = "/api/v1/student/learning-periods";
  return accessToken
    ? studentRequest(path, accessToken, options)
    : request(path, options);
}

/**
 *
 * @param accessToken
 * @param options
 */
export function getClassStudentIdentity(accessToken, options = {}) {
  return studentRequest("/api/v1/student/identity", accessToken, options);
}

/**
 *
 * @param textbookLessonId
 * @param accessToken
 * @param options
 */
export function createSelfStudySession(
  textbookLessonId,
  accessToken,
  options = {},
) {
  return studentRequest("/api/v1/student/self-study-sessions", accessToken, {
    ...options,
    method: "POST",
    body: JSON.stringify({ textbookLessonId }),
  });
}

/**
 *
 */
export function getClassroomPlans() {
  return multiLessonTeacherRequest("/api/v1/teacher/classroom-plans");
}

/**
 *
 * @param planId
 */
export function getClassroomPlan(planId) {
  return multiLessonTeacherRequest(
    `/api/v1/teacher/classroom-plans/${encodeURIComponent(planId)}`,
  );
}

/**
 *
 * @param payload
 */
export function publishClassroomPlan(payload) {
  return multiLessonTeacherRequest("/api/v1/teacher/classroom-plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 *
 * @param planId
 */
export function deleteClassroomPlan(planId) {
  return multiLessonTeacherRequest(
    `/api/v1/teacher/classroom-plans/${encodeURIComponent(planId)}`,
    {
      method: "DELETE",
    },
  );
}

/**
 *
 * @param payload
 */
export function createLearningPeriod(payload) {
  return teacherRequest("/api/v1/learning-periods", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 *
 * @param periodId
 */
export function getLearningPeriod(periodId) {
  return teacherRequest(
    `/api/v1/learning-periods/${encodeURIComponent(periodId)}`,
  );
}

/**
 *
 * @param periodId
 */
export function getLearningPeriodAssignments(periodId) {
  return teacherRequest(
    `/api/v1/learning-periods/${encodeURIComponent(periodId)}/assignments`,
  );
}

/**
 *
 * @param periodId
 */
export function publishLearningPeriod(periodId) {
  return teacherRequest(
    `/api/v1/learning-periods/${encodeURIComponent(periodId)}/publish`,
    { method: "POST" },
  );
}

/**
 *
 * @param periodId
 */
export function completeLearningPeriod(periodId) {
  return teacherRequest(
    `/api/v1/learning-periods/${encodeURIComponent(periodId)}/complete`,
    { method: "POST" },
  );
}

/**
 *
 * @param periodId
 * @param accessToken
 */
export function startStudentSession(periodId, accessToken) {
  return studentRequest(
    `/api/v1/learning-periods/${encodeURIComponent(periodId)}/student-session`,
    accessToken,
    { method: "POST" },
  );
}

/**
 *
 * @param sessionId
 * @param accessToken
 */
export function getStudentSessionContent(sessionId, accessToken) {
  return studentRequest(
    `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/content`,
    accessToken,
  );
}

/**
 *
 * @param sessionId
 * @param accessToken
 */
export function getStudentSessionReport(sessionId, accessToken) {
  return studentRequest(
    `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/report`,
    accessToken,
  );
}

/**
 *
 * @param sessionId
 * @param accessToken
 */
export function getStudentSessionAnswers(sessionId, accessToken) {
  return studentRequest(
    `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/answers`,
    accessToken,
  );
}

/**
 *
 * @param sessionId
 * @param accessToken
 * @param options
 */
export function getStudentSessionSnapshot(
  sessionId,
  accessToken,
  options = {},
) {
  return studentRequest(
    `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/snapshot`,
    accessToken,
    options,
  );
}

/**
 *
 * @param sessionId
 * @param accessToken
 * @param payload
 * @param options
 */
export function putStudentSessionSnapshot(
  sessionId,
  accessToken,
  payload,
  options = {},
) {
  return studentRequest(
    `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/snapshot`,
    accessToken,
    {
      ...options,
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

/**
 *
 * @param sessionId
 * @param accessToken
 * @param mediaId
 * @param options
 */
export function getStudentSessionMedia(
  sessionId,
  accessToken,
  mediaId,
  options = {},
) {
  return fetch(
    classroomApiUrl(
      `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/media/${encodeURIComponent(mediaId)}/content`,
    ),
    {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
    },
  ).then((response) => {
    if (!response.ok) throw new Error(`学习附件读取失败（${response.status}）`);
    return response.blob();
  });
}

/**
 *
 * @param sessionId
 * @param accessToken
 * @param root0
 * @param root0.blob
 * @param root0.filename
 * @param root0.idempotencyKey
 * @param root0.metadata
 * @param options
 */
export function uploadStudentSessionMedia(
  sessionId,
  accessToken,
  { blob, filename, idempotencyKey, metadata },
  options = {},
) {
  const form = new FormData();
  form.append("file", blob, filename || "learning-attachment");
  form.append("idempotencyKey", idempotencyKey);
  if (metadata) form.append("metadata", JSON.stringify(metadata));
  return request(
    `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/media`,
    {
      ...options,
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
      body: form,
    },
  );
}

/**
 *
 * @param periodId
 * @param studentId
 */
export function getStudentAccessCredentialStatus(periodId, studentId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/students/${encodeURIComponent(studentId)}/access-credential`,
  );
}

/**
 *
 * @param periodId
 * @param studentId
 */
export function rotateStudentAccessCredential(periodId, studentId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/students/${encodeURIComponent(studentId)}/access-credential`,
    { method: "POST" },
  );
}

/**
 *
 * @param periodId
 * @param studentId
 */
export function revokeStudentAccessCredential(periodId, studentId) {
  return teacherRequest(
    `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/students/${encodeURIComponent(studentId)}/access-credential`,
    { method: "DELETE" },
  );
}

/**
 *
 * @param sessionId
 * @param accessToken
 * @param options
 */
export function getStudentLearningHome(sessionId, accessToken, options = {}) {
  const path = sessionId
    ? `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/live-view`
    : "/api/v1/student/live-view";
  return studentRequest(path, accessToken, options);
}

/**
 *
 * @param sessionId
 * @param accessToken
 * @param options
 */
export function getStudentLearningProfile(
  sessionId,
  accessToken,
  options = {},
) {
  const path = sessionId
    ? `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/profile`
    : "/api/v1/student/profile";
  return studentRequest(path, accessToken, options);
}

/**
 *
 * @param shareToken
 * @param options
 */
export function getFamilyStudentMonitor(shareToken, options = {}) {
  return request(
    `/api/v1/family-shares/${encodeURIComponent(shareToken)}`,
    options,
  );
}

/**
 *
 * @param sessionId
 * @param accessToken
 */
export function getStudentHelpRequests(sessionId, accessToken) {
  return studentRequest(
    `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/help-requests`,
    accessToken,
  );
}

/**
 *
 * @param sessionId
 * @param accessToken
 * @param payload
 */
export function createStudentHelpRequest(sessionId, accessToken, payload) {
  return studentRequest(
    `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/help-requests`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/**
 *
 * @param sessionId
 * @param helpRequestId
 * @param accessToken
 */
export function cancelStudentHelpRequest(
  sessionId,
  helpRequestId,
  accessToken,
) {
  return studentRequest(
    `/api/v1/student-sessions/${encodeURIComponent(sessionId)}/help-requests/${encodeURIComponent(helpRequestId)}/cancel`,
    accessToken,
    {
      method: "POST",
    },
  );
}

/**
 *
 * @param payload
 */
export function createStudentSupportSession(payload) {
  return request("/api/v1/student-support/sessions", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

/**
 *
 * @param sessionId
 * @param accessToken
 */
export function getSupportHelpRequests(sessionId, accessToken) {
  return studentRequest(
    `/api/v1/student-support/sessions/${encodeURIComponent(sessionId)}/help-requests`,
    accessToken,
  );
}

/**
 *
 * @param sessionId
 * @param accessToken
 * @param payload
 * @param options
 */
export function createSupportHelpRequest(
  sessionId,
  accessToken,
  payload,
  options = {},
) {
  return studentRequest(
    `/api/v1/student-support/sessions/${encodeURIComponent(sessionId)}/help-requests`,
    accessToken,
    {
      ...options,
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/**
 *
 * @param sessionId
 * @param helpRequestId
 * @param accessToken
 */
export function cancelSupportHelpRequest(
  sessionId,
  helpRequestId,
  accessToken,
) {
  return studentRequest(
    `/api/v1/student-support/sessions/${encodeURIComponent(sessionId)}/help-requests/${encodeURIComponent(helpRequestId)}/cancel`,
    accessToken,
    {
      method: "POST",
    },
  );
}

/**
 *
 * @param periodId
 * @param onEvent
 * @param signal
 */
export async function openTeacherEventStream(periodId, onEvent, signal) {
  const response = await fetch(
    classroomApiUrl(
      `/api/v1/teacher/learning-periods/${encodeURIComponent(periodId)}/stream`,
    ),
    {
      headers: { Accept: "text/event-stream" },
      signal,
    },
  );
  if (!response.ok || !response.body)
    throw new Error(`实时课堂连接失败（${response.status}）`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";
    for (const block of blocks) {
      let eventName = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        onEvent({ type: eventName, data: JSON.parse(data) });
      } catch {
        onEvent({ type: eventName, data });
      }
    }
  }
}
