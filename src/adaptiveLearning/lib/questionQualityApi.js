const DEFAULT_TIMEOUT_MS = 15_000;

/**
 *
 * @param path
 * @param options
 */
async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs || DEFAULT_TIMEOUT_MS,
  );
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  try {
    const {
      timeoutMs: _timeoutMs,
      signal: _signal,
      ...requestOptions
    } = options;
    const response = await fetch(adaptiveApiUrl(path), {
      ...requestOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...requestOptions.headers,
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        body.message || `题目质检服务返回 ${response.status}`,
      );
      error.status = response.status;
      throw error;
    }
    return body;
  } catch (error) {
    if (error?.name === "AbortError" && !options.signal?.aborted) {
      throw new Error("题目质检服务响应超时，请稍后重试");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}

/**
 *
 * @param response
 */
export function unwrapQuestionQualityJob(response) {
  return (
    response?.job || response?.data?.job || response?.data || response || null
  );
}

/**
 *
 * @param payload
 * @param options
 */
export async function createQuestionQualityJob(payload, options = {}) {
  return unwrapQuestionQualityJob(
    await request("/api/question-quality/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
      signal: options.signal,
      timeoutMs: 30_000,
    }),
  );
}

/**
 *
 * @param jobId
 * @param options
 */
export async function getQuestionQualityJob(jobId, options = {}) {
  return unwrapQuestionQualityJob(
    await request(`/api/question-quality/jobs/${encodeURIComponent(jobId)}`, {
      signal: options.signal,
    }),
  );
}

/**
 *
 * @param jobId
 * @param options
 */
export async function cancelQuestionQualityJob(jobId, options = {}) {
  return unwrapQuestionQualityJob(
    await request(`/api/question-quality/jobs/${encodeURIComponent(jobId)}`, {
      method: "DELETE",
      signal: options.signal,
    }),
  );
}

/**
 *
 * @param jobId
 * @param questionId
 * @param options
 */
export async function retryQuestionQualityQuestion(
  jobId,
  questionId,
  options = {},
) {
  return unwrapQuestionQualityJob(
    await request(
      `/api/question-quality/jobs/${encodeURIComponent(jobId)}/questions/${encodeURIComponent(questionId)}/retry`,
      {
        method: "POST",
        signal: options.signal,
      },
    ),
  );
}
import { adaptiveApiUrl } from "../shared/infrastructure/runtimeEndpoints.js";
