import React from "react";

export default function LearningResourceStatePage({ title = "学习资源加载中", onBack, children }) {
  return (
    <div style={{ padding: "32px", maxWidth: "900px", margin: "0 auto" }}>
      {onBack && (
        <button onClick={onBack} style={{ marginBottom: "16px", padding: "6px 12px", cursor: "pointer" }}>
          返回
        </button>
      )}
      <h2>{title}</h2>
      {children || <p>暂无资源内容。</p>}
    </div>
  );
}
