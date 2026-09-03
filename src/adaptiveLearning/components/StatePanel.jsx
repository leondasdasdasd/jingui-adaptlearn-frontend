import React from "react";
import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";

const icons = {
  loading: LoaderCircle,
  empty: Inbox,
  error: AlertCircle,
};

/**
 *
 * @param root0
 * @param root0.tone
 * @param root0.title
 * @param root0.description
 * @param root0.action
 * @param root0.compact
 */
export default function StatePanel({
  tone = "empty",
  title,
  description,
  action = null,
  compact = false,
}) {
  const Icon = icons[tone] || Inbox;
  return (
    <section
      className={`visual-state-panel ${tone}${compact ? " compact" : ""}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "loading" ? "polite" : undefined}
      aria-busy={tone === "loading" || undefined}
    >
      <span className="visual-state-icon" aria-hidden="true">
        <Icon className={tone === "loading" ? "spin" : undefined} size={22} />
      </span>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="visual-state-action">{action}</div>}
    </section>
  );
}
