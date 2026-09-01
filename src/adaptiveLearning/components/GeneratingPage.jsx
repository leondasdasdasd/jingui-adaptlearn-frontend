import React from "react";

import AppShell from "./AppShell";
import { Sparkles } from "./Icons";

/**
 *
 * @param root0
 * @param root0.lessonTitle
 * @param root0.phase
 * @param root0.error
 * @param root0.generationStatus
 * @param root0.onRetry
 * @param root0.onBack
 */
export default function GeneratingPage({
  lessonTitle,
  phase = "pre",
  error,
  generationStatus,
  onRetry,
  onBack,
}) {
  const isPre = phase === "pre";
  return (
    <AppShell
      title={lessonTitle}
      eyebrow={isPre ? "课前小测" : "巩固练习"}
      onBack={onBack}
      compact
    >
      <div className="generating-card" role={error ? "alert" : "status"}>
        <div className={error ? "generating-icon error" : "generating-icon"}>
          <Sparkles size={28} />
        </div>
        <h1>{error ? "题目准备失败" : "正在准备题目"}</h1>
        {error && <p>{error}</p>}
        {!error && (
          <div className="thinking-stream" aria-live="polite">
            <div className="thinking-line">
              <strong>准备中</strong>
              <span className="thinking-caterpillar" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              <small>{generationStatus?.elapsedSeconds || 0}s</small>
            </div>
            <p>{generationStatus?.message || "正在了解本次学习内容…"}</p>
            <div className="stream-cursor" aria-hidden="true" />
          </div>
        )}
        {error && (
          <button className="primary-button" type="button" onClick={onRetry}>
            再试一次
          </button>
        )}
      </div>
    </AppShell>
  );
}
