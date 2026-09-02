import React from "react";

export default function DifficultyBadge({ difficulty = "MEDIUM" }) {
  const map = {
    EASY: { label: "简单", color: "#10b981", bg: "#ecfdf5" },
    MEDIUM: { label: "中等", color: "#f59e0b", bg: "#fffbeb" },
    HARD: { label: "较难", color: "#ef4444", bg: "#fef2f2" },
  };
  const config = map[difficulty] || map.MEDIUM;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: "500",
        color: config.color,
        backgroundColor: config.bg,
      }}
    >
      {config.label}
    </span>
  );
}
