import React from "react";

export default function QuestionReviewDisplay({ questions = [] }) {
  return (
    <div style={{ marginTop: "16px" }}>
      {questions.map((q, idx) => (
        <div key={idx} style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
          <div><strong>题目 {idx + 1}:</strong> {q.title || q.stem}</div>
        </div>
      ))}
    </div>
  );
}
