import React, { useRef } from "react";

import useVoiceRecorder from "../lib/useVoiceRecorder";
import { Mic, Square } from "./Icons";

/**
 *
 * @param root0
 * @param root0.value
 * @param root0.onChange
 * @param root0.disabled
 */
export default function VoiceAnswerInput({ value, onChange, disabled }) {
  const baseRef = useRef("");
  const applyText = (text) => {
    const base = baseRef.current.trimEnd();
    onChange(`${base}${base ? " " : ""}${text}`);
  };
  const recorder = useVoiceRecorder({
    onPartial: applyText,
    onTranscription: applyText,
  });
  const busy = recorder.connecting || recorder.transcribing;

  return (
    <div className="answer-voice-row">
      <button
        className={
          recorder.recording
            ? "answer-voice-button recording"
            : "answer-voice-button"
        }
        type="button"
        aria-busy={busy}
        disabled={disabled || busy}
        onClick={
          recorder.recording
            ? recorder.stopRecording
            : () => {
                baseRef.current = String(value || "");
                recorder.startRecording();
              }
        }
      >
        {recorder.recording ? <Square size={13} /> : <Mic size={17} />}
        {recorder.connecting
          ? "正在连接…"
          : recorder.recording
            ? `结束录音 · ${recorder.elapsedSeconds}s`
            : recorder.transcribing
              ? "正在确认文字…"
              : "语音输入"}
      </button>
      {recorder.error && <small role="alert">{recorder.error}</small>}
    </div>
  );
}
