export function prepareQuestionForGradingDisplay(question, grading) {
  const showAnswer = Boolean(
    grading
    && grading.showAnswer === true
    && grading.answerQuality !== 'off_task'
    && Object.prototype.hasOwnProperty.call(grading, 'correctAnswer'),
  );
  return {
    question: showAnswer
      ? { ...question, answer: grading.correctAnswer, platformQuestion: null }
      : question,
    showAnswer,
  };
}

export function formatQuestionResult(scoreRatio, pendingLabel = '待评定') {
  if (scoreRatio == null || scoreRatio === '') return pendingLabel;
  const ratio = Number(scoreRatio);
  if (!Number.isFinite(ratio)) return pendingLabel;
  if (ratio >= 0.999) return '正确';
  if (ratio <= 0) return '错误';
  return `正确率 ${Math.round(ratio * 100)}%`;
}
