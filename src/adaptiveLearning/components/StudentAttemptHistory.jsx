import React from "react";

export default function StudentAttemptHistory({ attempts = [], onClose }) {
  return (
    <div style={{ padding: "16px", background: "#fff", borderRadius: "8px" }}>
      <h4>答题历史记录</h4>
      {attempts.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>暂无答题记录</p>
      ) : (
        <ul>
          {attempts.map((att, index) => (
            <li key={index}>{att.title || `题目 #${index + 1}`}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
