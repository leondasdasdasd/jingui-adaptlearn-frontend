export function assessmentPurposeForQuestion(question, mode = "practice") {
  return (
    question?.purpose ||
    question?.sourceType ||
    (mode === "diagnostic" ? "diagnostic" : "practice")
  );
}
