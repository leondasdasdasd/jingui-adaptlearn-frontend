import React from "react";

import { Check } from "./Icons";

/**
 *
 * @param root0
 * @param root0.items
 * @param root0.title
 * @param root0.showSummary
 */
export default function KnowledgeProgressStrip({
  items,
  title = "知识点进度",
  showSummary = true,
}) {
  if (!items?.length) return null;
  const completed = items.filter(
    (item) => item.resolved ?? item.state === "complete",
  ).length;

  return (
    <section
      className="knowledge-progress-strip"
      role="progressbar"
      aria-label={title}
      aria-valuemin={0}
      aria-valuemax={items.length}
      aria-valuenow={completed}
      aria-valuetext={`已完成 ${completed}/${items.length} 个知识点诊断`}
    >
      <div className="knowledge-progress-heading">
        <strong>{title}</strong>
        {showSummary && (
          <span>
            已完成 {completed}/{items.length}
          </span>
        )}
      </div>
      <div className="knowledge-progress-items">
        {items.map((item, index) => (
          <div
            className={`knowledge-progress-item ${item.state}${item.tone ? ` ${item.tone}` : ""}`}
            key={item.id}
          >
            <span className="knowledge-progress-mark">
              {(item.resolved ?? item.state === "complete") ? (
                <Check size={13} />
              ) : (
                index + 1
              )}
            </span>
            <div>
              <strong>{item.name}</strong>
              <small>{item.label}</small>
            </div>
            <b>{item.mastery == null ? "—" : `${item.mastery}%`}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
