import { calculatePostMastery } from '../../lib/mastery.js';
import { masteryStatus } from '../../shared/domain/masteryPolicy.js';
import { readQuizDraft } from '../data/studentSessionRepository.js';

export { masteryStatus };

export function buildKnowledgeProgress({
  knowledgePoints = [],
  preMastery = {},
  result = {},
  postQuestions = [],
  postAttempts = {},
  completedKnowledgePointIds = [],
  currentKnowledgePointId = '',
  currentLabel = '学习中',
}) {
  const liveResult = Object.keys(postAttempts).length
    ? calculatePostMastery(postQuestions, postAttempts, knowledgePoints, preMastery)
    : {};
  const completed = new Set(completedKnowledgePointIds);

  return knowledgePoints.map((knowledgePoint) => {
    const finalItem = result[knowledgePoint.id];
    const liveItem = liveResult[knowledgePoint.id];
    const preItem = preMastery[knowledgePoint.id];
    const hasPracticeEvidence = Number(liveItem?.evidenceCount ?? liveItem?.total ?? 0) > 0;
    const mastery = finalItem?.mastery
      ?? (hasPracticeEvidence ? liveItem.mastery : preItem?.mastery);
    const hasFinalEvidence = Number(finalItem?.evidenceCount ?? finalItem?.total ?? 0) > 0;
    const isComplete = hasFinalEvidence || completed.has(knowledgePoint.id);
    const isCurrent = !isComplete && knowledgePoint.id === currentKnowledgePointId;
    const state = isComplete ? 'complete' : isCurrent ? 'current' : 'pending';
    const label = isComplete
      ? masteryStatus(mastery)
      : isCurrent
        ? currentLabel
        : Number.isFinite(mastery)
          ? `课前${masteryStatus(mastery)}`
          : '未开始';

    return {
      id: knowledgePoint.id,
      name: knowledgePoint.name,
      mastery: Number.isFinite(mastery) ? Math.round(mastery) : null,
      state,
      label,
    };
  });
}

export function readPostQuizDraft() {
  return readQuizDraft('post');
}
