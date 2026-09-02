import React from "react";

export default function BrandLogo({ className = "", size = "normal" }) {
  return (
    <div className={`brand-logo ${className}`} style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
      <span style={{ fontSize: size === "large" ? "20px" : "16px", color: "#2563eb" }}>云谷课堂</span>
      <span style={{ fontSize: "12px", background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "4px" }}>2.0</span>
    </div>
  );
}
