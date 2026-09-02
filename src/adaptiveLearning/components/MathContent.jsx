import React from "react";

export default function MathContent({ content, className = "" }) {
  if (!content) return null;
  return <div className={`math-content ${className}`}>{content}</div>;
}
