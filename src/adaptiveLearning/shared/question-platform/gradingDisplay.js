/**
 *
 * @param question
 * @param grading
 */
export function prepareQuestionForGradingDisplay(question, grading) {
  const showAnswer = Boolean(
    grading &&
    grading.showAnswer === true &&
    grading.answerQuality !== "off_task" &&
    Object.prototype.hasOwnProperty.call(grading, "correctAnswer"),
  );
  return {
    question: showAnswer
      ? { ...question, answer: grading.correctAnswer, platformQuestion: null }
      : question,
    showAnswer,
  };
}
