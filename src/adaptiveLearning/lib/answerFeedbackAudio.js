const feedbackAudioUrls = {
  correct: "/audio/answer-correct.mp3",
  incorrect: "/audio/answer-incorrect.mp3",
};

let audioContext = null;
let activeSource = null;
const bufferPromises = new Map();

/**
 *
 */
function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

/**
 *
 * @param context
 * @param tone
 */
function loadFeedbackBuffer(context, tone) {
  if (!bufferPromises.has(tone)) {
    const promise = fetch(feedbackAudioUrls[tone])
      .then((response) => {
        if (!response.ok)
          throw new Error(`Feedback audio failed to load: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .catch((error) => {
        bufferPromises.delete(tone);
        throw error;
      });
    bufferPromises.set(tone, promise);
  }
  return bufferPromises.get(tone);
}

/**
 *
 */
export function prepareAnswerFeedbackAudio() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume().catch(() => {});
  for (const tone of Object.keys(feedbackAudioUrls)) {
    void loadFeedbackBuffer(context, tone).catch(() => {});
  }
}

/**
 *
 * @param correct
 */
export async function playAnswerFeedbackAudio(correct) {
  const context = getAudioContext();
  if (!context) return false;
  const tone = correct ? "correct" : "incorrect";
  try {
    if (context.state === "suspended") await context.resume();
    const buffer = await loadFeedbackBuffer(context, tone);
    activeSource?.stop();
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = correct ? 0.5 : 0.42;
    source.connect(gain);
    gain.connect(context.destination);
    source.addEventListener(
      "ended",
      () => {
        if (activeSource === source) activeSource = null;
      },
      { once: true },
    );
    activeSource = source;
    source.start(0);
    return true;
  } catch {
    return false;
  }
}
