import React from "react";

export default function StatePanel({ title, description, children, action }) {
  return (
    <div style={{ padding: "24px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
      {title && <h3 style={{ margin: "0 0 8px 0" }}>{title}</h3>}
      {description && <p style={{ margin: "0 0 16px 0", color: "#64748b" }}>{description}</p>}
      {children}
      {action && <div style={{ marginTop: "16px" }}>{action}</div>}
    </div>
  );
}
