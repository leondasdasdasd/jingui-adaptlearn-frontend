import { readJson, writeJson } from '../../shared/infrastructure/browserStorage.js';

const storagePrefix = 'adaptive-student-seen-questions-v1:';
const MAX_ENTRIES = 2000;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　，。！？；：、,.!?;:'"“”‘’()[\]{}（）]/g, '');
}

export function questionFingerprint(question = {}) {
  return normalizeText(question.stem || '');
}

export function seenQuestionScope(selection = {}) {
  return selection.studentId
    || (selection.learningPeriodId ? selection.studentSessionId : '')
    || 'local-student';
}

function scopeKey(studentScope = 'local-student') {
  return `${storagePrefix}${encodeURIComponent(studentScope || 'local-student')}`;
}

export function readSeenQuestions(studentScope) {
  const stored = readJson(scopeKey(studentScope), { ids: [], fingerprints: [] });
  return {
    ids: new Set(stored.ids || []),
    fingerprints: new Set(stored.fingerprints || []),
  };
}

export function markQuestionSeen(studentScope, question) {
  if (!question?.id && !question?.stem) return;
  const seen = readSeenQuestions(studentScope);
  if (question.id) seen.ids.add(String(question.id));
  const fingerprint = questionFingerprint(question);
  if (fingerprint) seen.fingerprints.add(fingerprint);
  writeJson(scopeKey(studentScope), {
    ids: [...seen.ids].slice(-MAX_ENTRIES),
    fingerprints: [...seen.fingerprints].slice(-MAX_ENTRIES),
  });
}

export function isQuestionSeen(question, seen) {
  const fingerprint = questionFingerprint(question);
  return Boolean(question?.id && seen.ids.has(String(question.id)))
    || Boolean(fingerprint && seen.fingerprints.has(fingerprint));
}

function objectiveIds(question) {
  return question.knowledgeObjectiveIds || question.knowledgePointIds || [];
}

export function preferUnseenQuestions(questions = [], studentScope, { minimumPerObjective = 1 } = {}) {
  if (questions.length < 2) return questions;
  const seen = readSeenQuestions(studentScope);
  const unseen = questions.filter((question) => !isQuestionSeen(question, seen));
  if (!unseen.length) return questions;
  const requiredObjectives = new Set(questions.flatMap(objectiveIds));
  const coverage = Object.fromEntries([...requiredObjectives].map((id) => [id, 0]));
  unseen.forEach((question) => objectiveIds(question).forEach((id) => {
    if (Object.hasOwn(coverage, id)) coverage[id] += 1;
  }));
  const needsFallback = () => [...requiredObjectives].some((id) => coverage[id] < minimumPerObjective);
  if (!needsFallback()) return unseen;
  const fallback = [];
  questions.filter((question) => isQuestionSeen(question, seen)).forEach((question) => {
    if (!needsFallback()) return;
    const targets = objectiveIds(question).filter((id) => coverage[id] < minimumPerObjective);
    if (!targets.length) return;
    fallback.push(question);
    objectiveIds(question).forEach((id) => {
      if (Object.hasOwn(coverage, id)) coverage[id] += 1;
    });
  });
  return [...unseen, ...fallback];
}

export function preferUnseenPublishedContent(published, studentScope) {
  return {
    ...published,
    preQuestions: preferUnseenQuestions(
      published.preQuestions || [], studentScope, { minimumPerObjective: 3 },
    ),
    postQuestions: preferUnseenQuestions(published.postQuestions || [], studentScope),
    knowledgePracticePools: Object.fromEntries(
      Object.entries(published.knowledgePracticePools || {}).map(([knowledgePointId, questions]) => [
        knowledgePointId, preferUnseenQuestions(questions || [], studentScope),
      ]),
    ),
    compositeReviewPool: preferUnseenQuestions(published.compositeReviewPool || [], studentScope),
  };
}
