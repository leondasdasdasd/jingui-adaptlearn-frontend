import React from "react";

export default function StartClassRosterStep({ roster = [], onToggleStudent }) {
  return (
    <div style={{ padding: "16px" }}>
      <h4>选择上课学生列表</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px", marginTop: "12px" }}>
        {roster.map((student) => (
          <div
            key={student.id}
            onClick={() => onToggleStudent && onToggleStudent(student.id)}
            style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", textAlign: "center" }}
          >
            {student.name}
          </div>
        ))}
      </div>
    </div>
  );
}
