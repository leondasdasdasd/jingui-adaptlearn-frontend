export async function transcribeSpeech(pcmBase64) {
  const response = await fetch('/api/speech/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pcmBase64, sampleRate: 16000 }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || '暂时没听清，请重新说一次');
  return String(body.text || '').trim();
}

export function teacherSpeechUrl(text) {
  return `/api/speech/synthesize?text=${encodeURIComponent(text)}`;
}
