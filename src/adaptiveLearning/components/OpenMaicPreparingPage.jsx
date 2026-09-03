import React from "react";

import AppShell from "./AppShell";
import { Sparkles } from "./Icons";

const stepLabels = {
  queued: "正在准备",
  initializing: "正在开始准备",
  researching: "正在理解你的问题",
  generating_outlines: "正在安排讲解顺序",
  generating_scenes: "正在准备讲解内容",
  generating_media: "正在整理学习材料",
  generating_tts: "正在准备老师语音",
  persisting: "马上就好",
};

/**
 *
 * @param root0
 * @param root0.lessonTitle
 * @param root0.job
 * @param root0.error
 * @param root0.onRetry
 * @param root0.onBack
 */
export default function OpenMaicPreparingPage({
  lessonTitle,
  job,
  error,
  onRetry,
  onBack,
}) {
  const progress = Math.max(3, Number(job?.progress || 0));
  const unavailable = job?.status === "unavailable";
  return (
    <AppShell
      title={lessonTitle}
      eyebrow="重点讲解"
      progress={unavailable ? undefined : progress}
      onBack={onBack}
      compact
    >
      <div className="generating-card" role={error ? "alert" : "status"}>
        <div className={error ? "generating-icon error" : "generating-icon"}>
          <Sparkles size={28} />
        </div>
        <h1>
          {unavailable
            ? "当前课堂暂未安排"
            : error
              ? "讲解准备失败"
              : stepLabels[job?.step] || "正在准备重点讲解"}
        </h1>
        {error && <p>{error}</p>}
        {!error && (
          <div className="openmaic-progress-detail">
            <div>
              <span style={{ width: `${progress}%` }} />
            </div>
            <small>
              {progress}%
              {job?.scenesGenerated
                ? ` · 已准备 ${job.scenesGenerated} 个部分`
                : ""}
            </small>
          </div>
        )}
        {error && !unavailable && (
          <button className="primary-button" type="button" onClick={onRetry}>
            再试一次
          </button>
        )}
        {unavailable && (
          <button className="neutral-button" type="button" onClick={onBack}>
            返回学习列表
          </button>
        )}
      </div>
    </AppShell>
  );
}
