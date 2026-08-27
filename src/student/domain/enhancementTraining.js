import { normalizeU1Difficulty, U1_DIFFICULTIES } from '../../shared/domain/unifiedMastery.js';

function difficultyRank(value) {
  return U1_DIFFICULTIES.indexOf(normalizeU1Difficulty(value));
}

export function enhancementEligibility({ knowledgePoints = [], result = {}, resultSource = 'preview' }) {
  void knowledgePoints;
  void result;
  void resultSource;
  return { eligible: false, reason: 'ENHANCEMENT_DISABLED' };
}

export function selectEnhancementQuestions({ publishedContent = {}, attempts = {}, limit = 8 }) {
  const pools = Object.values(publishedContent.knowledgePracticePools || {}).flat();
  const composite = publishedContent.compositeReviewPool || [];
  const seen = new Set(Object.keys(attempts || {}));
  const unique = new Map();
  [...pools, ...composite].forEach((question) => {
    if (!question?.id || seen.has(question.id) || unique.has(question.id)) return;
    unique.set(question.id, question);
  });
  const unattempted = [...unique.values()];
  const challenging = unattempted.filter((question) => difficultyRank(question.difficulty) >= difficultyRank('D4'));
  const candidates = challenging.length >= 3 ? challenging : unattempted;
  return candidates
    .sort((left, right) => difficultyRank(right.difficulty) - difficultyRank(left.difficulty)
      || String(left.id).localeCompare(String(right.id)))
    .slice(0, Math.max(1, limit))
    .map((question) => ({ ...question, phase: 'enhancement', sourceType: 'PRACTICE' }));
}
