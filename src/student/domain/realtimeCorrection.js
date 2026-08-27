export const correctionEncouragements = [
  '没关系，再看一眼题目，你已经接近了。',
  '先别急，检查条件和符号，再试一次。',
  '这一步很关键，换个思路再想想。',
  '你已经完成第一次尝试，再认真核对一下。',
  '慢一点会更准，看看有没有漏掉条件。',
  '再给自己一次机会，从关键步骤开始检查。',
  '思路正在变清楚，重新算一遍试试。',
  '错误也是线索，找到不一致的地方再提交。',
  '坚持一下，先判断题目真正问的是什么。',
  '愿意订正就是进步，再试一次。',
];

export const correctionReadingGuide = Object.freeze({
  title: '先重新读题，再订正',
  description: '重新读一遍题目，先找出“已知条件”和“问题要求”，再注意表示数量关系、范围和正负号的关键词。',
  reminder: '已知条件是什么？题目最终要求什么？',
  confirmLabel: '我已读题，开始订正',
});

function stableHash(value) {
  return [...String(value || '')].reduce(
    (hash, character) => ((hash * 31) + character.codePointAt(0)) >>> 0,
    0,
  );
}

export function encouragementForCorrection(questionId) {
  return correctionEncouragements[stableHash(questionId) % correctionEncouragements.length];
}

export function confirmCorrectionReading(correction, confirmedAt = new Date().toISOString()) {
  if (!correction?.questionId) return correction;
  return { ...correction, readingConfirmedAt: correction.readingConfirmedAt || confirmedAt };
}

export function hasConfirmedCorrectionReading(correction) {
  return Boolean(correction?.questionId && correction.readingConfirmedAt);
}

export function shouldRequestCorrection({ mode, grading, correction, revalidation = false }) {
  return mode === 'post'
    && !revalidation
    && !correction
    && Boolean(grading)
    && grading.correct !== true
    && !['off_task', 'no_attempt'].includes(grading.answerQuality);
}

export function correctionAttemptMetadata(correction, answer, grading) {
  if (!correction) return {};
  return {
    correctionAttempted: true,
    correctionSucceeded: grading.correct === true,
    hintUsed: true,
    initialAnswer: correction.initialAnswer,
    initialRecognizedAnswer: correction.initialRecognizedAnswer,
    initialScore: correction.initialScore,
    initialMaxScore: correction.initialMaxScore,
    initialScoreRatio: correction.initialScoreRatio,
    correctedAnswer: answer,
  };
}
