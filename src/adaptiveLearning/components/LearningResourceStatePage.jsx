import React from "react";
import {
  BookOpenCheck,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import AppShell from "./AppShell";

const stateCopy = {
  loading: {
    title: "正在读取学习资源",
    description: "正在确认已发布内容和互动课堂…",
  },
  unpublished: {
    title: "这部分内容还没有发布",
    description: "老师发布后就可以开始学习。",
  },
  unavailable: {
    title: "互动学习资源暂时不可用",
    description: "你可以重新尝试；如果仍然失败，返回学习列表后稍后再来。",
  },
  invalid: {
    title: "没有找到这个学习内容",
    description: "知识点可能已调整，请返回学习列表重新选择。",
  },
};

/**
 *
 * @param root0
 * @param root0.lessonTitle
 * @param root0.state
 * @param root0.reason
 * @param root0.onRetry
 * @param root0.onBack
 */
export default function LearningResourceStatePage({
  lessonTitle = "知识点学习",
  state = "loading",
  reason = "",
  onRetry,
  onBack,
}) {
  const copy = stateCopy[state] || stateCopy.unavailable;
  const isLoading = state === "loading";
  const isUnpublished = state === "unpublished";
  const Icon = isLoading
    ? LoaderCircle
    : isUnpublished
      ? BookOpenCheck
      : CircleAlert;

  return (
    <AppShell title={lessonTitle} eyebrow="互动学习" onBack={onBack} compact>
      <section
        className={`learning-resource-state ${state}`}
        role={isLoading ? "status" : "alert"}
        aria-live="polite"
      >
        <div className="learning-resource-state-icon" aria-hidden="true">
          <Icon size={30} className={isLoading ? "spin" : ""} />
        </div>
        <h1>{copy.title}</h1>
        {!reason && <p>{copy.description}</p>}
        {reason && (
          <div className="learning-resource-reason">
            <span>具体原因</span>
            <strong>{reason}</strong>
          </div>
        )}
        {!isLoading && (
          <div className="learning-resource-actions">
            {onRetry && (
              <button
                className="primary-button"
                type="button"
                onClick={onRetry}
              >
                <RefreshCw size={16} />
                重新加载
              </button>
            )}
            <button className="neutral-button" type="button" onClick={onBack}>
              返回学习列表
            </button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
