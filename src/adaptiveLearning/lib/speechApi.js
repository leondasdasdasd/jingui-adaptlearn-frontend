import { adaptiveApiUrl } from "../shared/infrastructure/runtimeEndpoints.js";

/**
 *
 * @param pcmBase64
 */
export async function transcribeSpeech(pcmBase64) {
  const response = await fetch(adaptiveApiUrl("/api/speech/transcribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pcmBase64, sampleRate: 16_000 }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "暂时没听清，请重新说一次");
  return String(body.text || "").trim();
}

/**
 *
 * @param text
 */
export function teacherSpeechUrl(text) {
  return adaptiveApiUrl(
    `/api/speech/synthesize?text=${encodeURIComponent(text)}`,
  );
}
