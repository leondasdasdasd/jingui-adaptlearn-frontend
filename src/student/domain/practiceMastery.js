import { calculatePostMastery } from '../../lib/mastery.js';

function hasMastery(item) {
  return item?.mastery !== null && item?.mastery !== undefined && item?.mastery !== ''
    && Number.isFinite(Number(item.mastery));
}

function numericMastery(item) {
  return hasMastery(item) ? Number(item.mastery) : null;
}

export function currentPracticeMastery({ result = {}, preMastery = {} } = {}) {
  const knowledgePointIds = new Set([...Object.keys(preMastery), ...Object.keys(result)]);
  return Object.fromEntries([...knowledgePointIds].map((knowledgePointId) => [
    knowledgePointId,
    hasMastery(result[knowledgePointId]) ? result[knowledgePointId] : preMastery[knowledgePointId],
  ]).filter(([, item]) => item));
}

export function calculatePracticeRoundMastery({
  questions = [], attempts = {}, knowledgePoints = [], baseline = {}, preMastery = {},
} = {}) {
  const result = calculatePostMastery(questions, attempts, knowledgePoints, baseline);
  return Object.fromEntries(knowledgePoints.map((knowledgePoint) => {
    const item = result[knowledgePoint.id];
    const originalPreMastery = numericMastery(preMastery[knowledgePoint.id]);
    const mastery = numericMastery(item);
    return [knowledgePoint.id, {
      ...item,
      preMastery: originalPreMastery,
      improvement: originalPreMastery != null && mastery != null
        ? Math.round((mastery - originalPreMastery) * 100) / 100 : null,
    }];
  }));
}
