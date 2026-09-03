import { useEffect, useRef, useState } from "react";

import { stopMediaStreamTracks } from "./mediaStream";
import { transcribeSpeech } from "./speechApi";
import {
  speechStreamUrl,
  voiceInputEnvironment,
} from "./voiceInputEnvironment";

const TARGET_SAMPLE_RATE = 16_000;
const MAX_RECORDING_MS = 60_000;

/**
 *
 * @param source
 * @param sourceRate
 */
function downsampleSamples(source, sourceRate) {
  const ratio = sourceRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.floor(source.length / ratio);
  const output = new Int16Array(outputLength);
  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio);
    const end = Math.min(source.length, Math.floor((outputIndex + 1) * ratio));
    let total = 0;
    for (let sourceIndex = start; sourceIndex < end; sourceIndex += 1)
      total += source[sourceIndex];
    const sample = Math.max(-1, Math.min(1, total / Math.max(1, end - start)));
    output[outputIndex] = sample < 0 ? sample * 0x80_00 : sample * 0x7f_ff;
  }
  return new Uint8Array(output.buffer);
}

/**
 *
 * @param chunks
 * @param sourceRate
 */
function downsampleChunks(chunks, sourceRate) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const source = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    source.set(chunk, offset);
    offset += chunk.length;
  }
  return downsampleSamples(source, sourceRate);
}

/**
 *
 * @param bytes
 */
function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x80_00;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return window.btoa(binary);
}

/**
 *
 * @param root0
 * @param root0.onPartial
 * @param root0.onTranscription
 */
export default function useVoiceRecorder({ onPartial, onTranscription }) {
  const recorderRef = useRef(null);
  const stopRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");

  const releaseAudio = async (recorder) => {
    if (!recorder?.context) return;
    window.clearInterval(recorder.intervalId);
    window.clearTimeout(recorder.timeoutId);
    recorder.processor?.disconnect();
    recorder.source?.disconnect();
    stopMediaStreamTracks(recorder.stream);
    await recorder.context.close().catch(() => {});
    recorder.context = null;
  };

  const closeSocket = (recorder) => {
    if (recorder?.socket && recorder.socket.readyState < WebSocket.CLOSING)
      recorder.socket.close();
  };

  const connectStream = (recorder) =>
    new Promise((resolve, reject) => {
      const socket = new WebSocket(speechStreamUrl(window.location));
      socket.binaryType = "arraybuffer";
      recorder.socket = socket;
      const timeoutId = window.setTimeout(
        () => reject(new Error("实时转写连接超时")),
        15_000,
      );
      recorder.streamReadyTimeoutId = timeoutId;
      socket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === "ready") {
          window.clearTimeout(timeoutId);
          recorder.streaming = true;
          resolve();
        } else if (message.type === "partial" && message.text) {
          recorder.latestText = String(message.text);
          onPartial?.(recorder.latestText);
        } else if (message.type === "final") {
          recorder.latestText = String(
            message.text || recorder.latestText || "",
          );
          onPartial?.(recorder.latestText);
          recorder.resolveFinal?.(recorder.latestText);
        } else if (message.type === "error") {
          recorder.streamError = String(message.message || "实时转写暂时中断");
          if (recorder.streaming) {
            recorder.rejectFinal?.(new Error(recorder.streamError));
          } else {
            reject(new Error(recorder.streamError));
          }
        }
      };
      socket.onerror = () => {
        window.clearTimeout(timeoutId);
        const streamError = new Error("实时转写暂时不可用");
        if (recorder.streaming) {
          recorder.rejectFinal?.(streamError);
        } else {
          reject(streamError);
        }
      };
    });

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || !recording || transcribing) return;
    setRecording(false);
    setTranscribing(true);
    setError("");
    await releaseAudio(recorder);
    try {
      let text = recorder.latestText;
      if (
        recorder.streaming &&
        recorder.socket?.readyState === WebSocket.OPEN
      ) {
        const finalPromise = new Promise((resolve, reject) => {
          recorder.resolveFinal = resolve;
          recorder.rejectFinal = reject;
        });
        recorder.socket.send(JSON.stringify({ type: "finish" }));
        text = await Promise.race([
          finalPromise,
          new Promise((_, reject) =>
            window.setTimeout(
              () => reject(new Error("实时转写等待超时")),
              12_000,
            ),
          ),
        ]);
      }
      if (!text) {
        const pcm = downsampleChunks(recorder.chunks, recorder.sampleRate);
        if (pcm.length < TARGET_SAMPLE_RATE * 2 * 0.35)
          throw new Error("录音太短，请再说一次");
        text = await transcribeSpeech(bytesToBase64(pcm));
      }
      if (!text) throw new Error("没有听清，请靠近一点再说一次");
      onTranscription(text);
    } catch (requestError) {
      try {
        const pcm = downsampleChunks(recorder.chunks, recorder.sampleRate);
        if (pcm.length < TARGET_SAMPLE_RATE * 2 * 0.35) throw requestError;
        const fallbackText = await transcribeSpeech(bytesToBase64(pcm));
        if (!fallbackText) throw requestError;
        onTranscription(fallbackText);
      } catch {
        setError(requestError.message);
      }
    } finally {
      closeSocket(recorder);
      recorderRef.current = null;
      setTranscribing(false);
      setElapsedSeconds(0);
    }
  };
  stopRef.current = stopRecording;

  const startRecording = async () => {
    if (recording || connecting || transcribing) return;
    setError("");
    setConnecting(true);
    const recorder = {
      chunks: [],
      streaming: false,
      latestText: "",
      socket: null,
    };
    recorderRef.current = recorder;
    try {
      const environment = voiceInputEnvironment({
        isSecureContext: window.isSecureContext,
        mediaDevices: navigator.mediaDevices,
        AudioContext: window.AudioContext || window.webkitAudioContext,
      });
      if (!environment.available) throw new Error(environment.message);
      try {
        await connectStream(recorder);
      } catch (streamError) {
        recorder.streamError = streamError.message;
        closeSocket(recorder);
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      recorder.stream = stream;
      recorder.context = context;
      recorder.source = source;
      recorder.processor = processor;
      recorder.sampleRate = context.sampleRate;
      processor.onaudioprocess = (event) => {
        const samples = new Float32Array(event.inputBuffer.getChannelData(0));
        recorder.chunks.push(samples);
        if (
          recorder.streaming &&
          recorder.socket?.readyState === WebSocket.OPEN
        ) {
          recorder.socket.send(downsampleSamples(samples, context.sampleRate));
        }
        event.outputBuffer.getChannelData(0).fill(0);
      };
      source.connect(processor);
      processor.connect(context.destination);
      const startedAt = Date.now();
      recorder.intervalId = window.setInterval(() => {
        setElapsedSeconds(
          Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
        );
      }, 500);
      recorder.timeoutId = window.setTimeout(
        () => stopRef.current?.(),
        MAX_RECORDING_MS,
      );
      setElapsedSeconds(0);
      setRecording(true);
    } catch (requestError) {
      await releaseAudio(recorder);
      closeSocket(recorder);
      recorderRef.current = null;
      const deviceErrors = {
        NotAllowedError: "需要在浏览器地址栏允许使用麦克风后才能说话",
        NotFoundError: "没有检测到可用的麦克风",
        NotReadableError: "麦克风正被其他应用占用，请关闭后重试",
        AbortError: "麦克风启动失败，请重新尝试",
      };
      setError(deviceErrors[requestError.name] || requestError.message);
    } finally {
      setConnecting(false);
    }
  };

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder) {
        releaseAudio(recorder);
        closeSocket(recorder);
      }
    },
    [],
  );

  return {
    recording,
    connecting,
    transcribing,
    elapsedSeconds,
    error,
    startRecording,
    stopRecording,
  };
}
