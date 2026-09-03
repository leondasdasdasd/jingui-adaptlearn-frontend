import React, { useEffect, useRef, useState } from "react";

import { teacherSpeechUrl } from "../lib/speechApi";
import useVoiceRecorder from "../lib/useVoiceRecorder";
import { localizedQuestionResult } from "../shared/presentation/questionResultPresentation";
import {
  readAutoSpeechPreference,
  writeAutoSpeechPreference,
} from "../student/data/studentPreferencesRepository";
import AppShell from "./AppShell";
import {
  ChevronRight,
  ClipboardList,
  Mic,
  Pause,
  Send,
  Sparkles,
  Square,
  Volume2,
  X,
} from "./Icons";
import MathContent from "./MathContent";

const causeLabels = {
  concept_gap: "这一点还需要理一理",
  question_understanding: "读题思路需要调整",
  calculation_error: "计算步骤需要检查",
  careless: "注意检查符号和选项",
  other: "再确认一下思路",
};

const answerTypeLabels = {
  single_choice: "单选题",
  multiple_choice: "多选题",
  fill_blank: "题干内填空",
  short_answer: "问答题",
  judgement: "判断题",
  ordering: "排序题",
  classification: "分类题",
  matching: "匹配题",
  line_connect: "连线题",
  text_marker: "文本标记题",
  word_builder: "组式题",
};

/**
 *
 * @param item
 */
function accuracyPercent(item) {
  if (item?.scoreRatio != null)
    return Math.round(Number(item.scoreRatio) * 100);
  const score = Number(item?.score);
  const maxScore = Number(item?.maxScore);
  return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
    ? Math.round((score / maxScore) * 100)
    : null;
}

/**
 *
 * @param root0
 * @param root0.lesson
 * @param root0.evidence
 * @param root0.messages
 * @param root0.diagnosis
 * @param root0.sending
 * @param root0.error
 * @param root0.studentName
 * @param root0.onSend
 * @param root0.onGenerateRemediation
 * @param root0.onContinue
 * @param root0.onBack
 */
export default function LearningCheckInPage({
  lesson,
  evidence = [],
  messages,
  diagnosis,
  sending,
  error,
  studentName = "我",
  onSend,
  onGenerateRemediation,
  onContinue,
  onBack,
}) {
  const [draft, setDraft] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [autoSpeech, setAutoSpeech] = useState(readAutoSpeechPreference);
  const [speechState, setSpeechState] = useState({
    loadingId: "",
    playingId: "",
    error: "",
  });
  const audioRef = useRef(null);
  const autoPlayedRef = useRef(new Set());
  const voiceDraftBaseRef = useRef("");
  const messagesEndRef = useRef(null);
  const evidenceCloseRef = useRef(null);
  const applyVoiceText = (text) => {
    const base = voiceDraftBaseRef.current.trimEnd();
    setDraft(`${base}${base ? " " : ""}${text}`);
  };
  const voiceRecorder = useVoiceRecorder({
    onPartial: applyVoiceText,
    onTranscription: applyVoiceText,
  });

  const submit = () => {
    const content = draft.trim();
    if (
      !content ||
      sending ||
      voiceRecorder.recording ||
      voiceRecorder.connecting ||
      voiceRecorder.transcribing
    )
      return;
    setDraft("");
    onSend(content);
  };

  const stopSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setSpeechState((current) => ({ ...current, loadingId: "", playingId: "" }));
  };

  const playSpeech = async (message, { silent = false } = {}) => {
    if (speechState.playingId === message.id) {
      stopSpeech();
      return;
    }
    stopSpeech();
    setSpeechState({ loadingId: message.id, playingId: "", error: "" });
    try {
      const audio = new Audio(teacherSpeechUrl(message.content));
      audioRef.current = audio;
      audio.addEventListener("playing", () =>
        setSpeechState({ loadingId: "", playingId: message.id, error: "" }),
      );
      audio.addEventListener("ended", () =>
        setSpeechState((current) => ({ ...current, playingId: "" })),
      );
      audio.onerror = () =>
        setSpeechState({
          loadingId: "",
          playingId: "",
          error: "暂时无法播放，请稍后再试",
        });
      await audio.play();
    } catch (error) {
      setSpeechState({
        loadingId: "",
        playingId: "",
        error: silent ? "" : error.message || "暂时无法播放，请稍后再试",
      });
    }
  };

  const toggleAutoSpeech = () => {
    const next = !autoSpeech;
    setAutoSpeech(next);
    writeAutoSpeechPreference(next);
    const latestTeacherMessage = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    if (next && latestTeacherMessage) {
      autoPlayedRef.current.add(latestTeacherMessage.id);
      playSpeech(latestTeacherMessage);
    } else if (!next) stopSpeech();
  };

  useEffect(() => {
    const latest = messages.at(-1);
    if (
      autoSpeech &&
      latest?.role === "assistant" &&
      !autoPlayedRef.current.has(latest.id)
    ) {
      autoPlayedRef.current.add(latest.id);
      playSpeech(latest, { silent: true });
    }
    // Only run when a teacher message is appended or the preference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, autoSpeech]);

  useEffect(
    () => () => {
      if (audioRef.current) audioRef.current.pause();
    },
    [],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
  }, [messages, sending]);

  useEffect(() => {
    if (!showEvidence) return;
    evidenceCloseRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowEvidence(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showEvidence]);

  const studentAvatar =
    String(studentName || "我")
      .trim()
      .slice(0, 1) || "我";

  const headerActions = (
    <div className="check-in-agent-header-actions">
      <button
        className={
          showEvidence
            ? "check-in-agent-control active"
            : "check-in-agent-control"
        }
        type="button"
        onClick={() => setShowEvidence((current) => !current)}
        aria-expanded={showEvidence}
      >
        <ClipboardList size={17} />
        <span>{showEvidence ? "收起题目" : "查看题目"}</span>
      </button>
      <button
        className={
          autoSpeech ? "check-in-agent-speech active" : "check-in-agent-speech"
        }
        type="button"
        role="switch"
        aria-checked={autoSpeech}
        aria-label={autoSpeech ? "关闭自动朗读" : "开启自动朗读"}
        title={autoSpeech ? "关闭自动朗读" : "开启自动朗读"}
        onClick={toggleAutoSpeech}
      >
        <Volume2 size={18} />
      </button>
    </div>
  );

  return (
    <AppShell
      title="学习智能体"
      eyebrow={lesson.title}
      actions={headerActions}
      onBack={onBack}
      immersive
      headerClassName="check-in-agent-header"
    >
      <div className="check-in-agent-page">
        <section className="check-in-agent-stage" aria-label="学习智能体对话">
          <div className="check-in-agent-messages" aria-live="polite">
            {messages.map((message) => (
              <article
                className={`check-in-agent-message ${message.role}`}
                key={message.id}
              >
                {message.role === "assistant" && (
                  <div
                    className="check-in-agent-avatar teacher"
                    aria-label="学习老师头像"
                  >
                    <Sparkles size={18} />
                    <i aria-hidden="true" />
                  </div>
                )}
                <div className="check-in-agent-message-column">
                  <div className="check-in-agent-bubble">
                    <p>{message.content}</p>
                    {message.role === "assistant" && (
                      <button
                        className={
                          speechState.playingId === message.id
                            ? "message-speech-button playing"
                            : "message-speech-button"
                        }
                        type="button"
                        onClick={() => playSpeech(message)}
                        disabled={speechState.loadingId === message.id}
                        aria-label={
                          speechState.playingId === message.id
                            ? "暂停朗读"
                            : "朗读老师回复"
                        }
                        title={
                          speechState.playingId === message.id
                            ? "暂停朗读"
                            : "朗读"
                        }
                      >
                        {speechState.playingId === message.id ? (
                          <Pause size={15} />
                        ) : (
                          <Volume2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {message.role === "user" && (
                  <div
                    className="check-in-agent-avatar student"
                    aria-label="学生头像"
                  >
                    {studentAvatar}
                  </div>
                )}
              </article>
            ))}
            {sending && (
              <article className="check-in-agent-message assistant pending">
                <div
                  className="check-in-agent-avatar teacher"
                  aria-label="学习老师头像"
                >
                  <Sparkles size={18} />
                  <i aria-hidden="true" />
                </div>
                <div className="check-in-agent-message-column">
                  <div className="check-in-agent-bubble">
                    <p>
                      正在看你的回答
                      <span className="thinking-dots" aria-hidden="true">
                        •••
                      </span>
                    </p>
                  </div>
                </div>
              </article>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="check-in-agent-bottom">
            {error && (
              <div className="check-in-agent-error" role="alert">
                <strong>暂时没能继续</strong>
                <span>{error}</span>
              </div>
            )}

            {diagnosis?.ready && (
              <div
                className={
                  diagnosis.needsRemediation
                    ? "check-in-agent-result needs-help"
                    : "check-in-agent-result clear"
                }
              >
                <div>
                  <strong>
                    {diagnosis.needsRemediation
                      ? causeLabels[diagnosis.causeType] || causeLabels.other
                      : "已经找到共同问题"}
                  </strong>
                  {diagnosis.studentTip && <span>{diagnosis.studentTip}</span>}
                </div>
                {diagnosis.needsRemediation ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={onGenerateRemediation}
                  >
                    听重点讲解 <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={onContinue}
                  >
                    继续练习 <ChevronRight size={16} />
                  </button>
                )}
              </div>
            )}

            {!diagnosis?.ready && (
              <div className="check-in-agent-composer">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="和学习老师说说你的想法…"
                  rows={2}
                  disabled={
                    sending ||
                    voiceRecorder.recording ||
                    voiceRecorder.connecting ||
                    voiceRecorder.transcribing
                  }
                />
                <div className="check-in-agent-composer-tools">
                  <button
                    className={
                      voiceRecorder.recording
                        ? "check-in-agent-voice recording"
                        : "check-in-agent-voice"
                    }
                    type="button"
                    onClick={
                      voiceRecorder.recording
                        ? voiceRecorder.stopRecording
                        : () => {
                            voiceDraftBaseRef.current = draft;
                            voiceRecorder.startRecording();
                          }
                    }
                    disabled={
                      sending ||
                      voiceRecorder.connecting ||
                      voiceRecorder.transcribing
                    }
                    aria-busy={
                      voiceRecorder.connecting || voiceRecorder.transcribing
                    }
                    aria-label={
                      voiceRecorder.recording ? "结束录音" : "语音输入"
                    }
                  >
                    {voiceRecorder.recording ? (
                      <Square size={14} />
                    ) : (
                      <Mic size={17} />
                    )}
                    <span>
                      {voiceRecorder.connecting
                        ? "正在连接…"
                        : voiceRecorder.recording
                          ? `${voiceRecorder.elapsedSeconds}s 后结束`
                          : voiceRecorder.transcribing
                            ? "转写中…"
                            : "语音输入"}
                    </span>
                  </button>
                  <button
                    className="check-in-agent-send"
                    type="button"
                    onClick={submit}
                    disabled={
                      !draft.trim() ||
                      sending ||
                      voiceRecorder.recording ||
                      voiceRecorder.connecting ||
                      voiceRecorder.transcribing
                    }
                    aria-busy={sending}
                    aria-label="发送"
                    title="发送"
                  >
                    <Send size={18} />
                  </button>
                </div>
                {(voiceRecorder.error || speechState.error) && (
                  <p className="check-in-agent-voice-error" role="alert">
                    {voiceRecorder.error || speechState.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {showEvidence && (
          <div
            className="check-in-question-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="check-in-question-drawer-title"
          >
            <button
              className="check-in-question-drawer-mask"
              type="button"
              aria-label="关闭题目记录"
              onClick={() => setShowEvidence(false)}
            />
            <aside>
              <header>
                <div>
                  <span>本轮回顾依据</span>
                  <h2 id="check-in-question-drawer-title">最近 3 题作答</h2>
                </div>
                <button
                  ref={evidenceCloseRef}
                  type="button"
                  aria-label="关闭题目记录"
                  onClick={() => setShowEvidence(false)}
                >
                  <X size={18} />
                </button>
              </header>
              <div className="check-in-question-drawer-list">
                {evidence.map((item, itemIndex) => (
                  <article key={item.questionId || itemIndex}>
                    <div>
                      <span>
                        第 {itemIndex + 1} 题 ·{" "}
                        {answerTypeLabels[item.type] || "练习题"}
                      </span>
                      <strong>
                        {localizedQuestionResult(
                          accuracyPercent(item) == null
                            ? null
                            : accuracyPercent(item) / 100,
                        )}
                      </strong>
                    </div>
                    <MathContent as="p" renderKey={item.stem}>
                      {item.stem}
                    </MathContent>
                    <MathContent
                      as="small"
                      renderKey={JSON.stringify(item.studentAnswer)}
                    >
                      <b>我的答案：</b>
                      {Array.isArray(item.studentAnswer)
                        ? item.studentAnswer.join("、")
                        : item.studentAnswer || "未填写"}
                    </MathContent>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
