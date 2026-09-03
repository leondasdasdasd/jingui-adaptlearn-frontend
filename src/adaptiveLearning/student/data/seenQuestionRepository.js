import {
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";

const storagePrefix = "adaptive-student-seen-questions-v1:";
const MAX_ENTRIES = 2000;

/**
 *
 * @param value
 */
function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll(/[\s!"'(),.:;?[\]{}‘’“”、。！（），：；？]/g, "");
}

/**
 *
 * @param question
 */
export function questionFingerprint(question = {}) {
  return normalizeText(question.stem || "");
}

/**
 *
 * @param selection
 */
export function seenQuestionScope(selection = {}) {
  return (
    selection.studentId ||
    (selection.learningPeriodId ? selection.studentSessionId : "") ||
    "local-student"
  );
}

/**
 *
 * @param studentScope
 */
function scopeKey(studentScope = "local-student") {
  return `${storagePrefix}${encodeURIComponent(studentScope || "local-student")}`;
}

/**
 *
 * @param studentScope
 */
export function readSeenQuestions(studentScope) {
  const stored = readJson(scopeKey(studentScope), {
    ids: [],
    fingerprints: [],
  });
  return {
    ids: new Set(stored.ids || []),
    fingerprints: new Set(stored.fingerprints || []),
  };
}

/**
 *
 * @param studentScope
 * @param question
 */
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

/**
 *
 * @param question
 * @param seen
 */
export function isQuestionSeen(question, seen) {
  const fingerprint = questionFingerprint(question);
  return (
    Boolean(question?.id && seen.ids.has(String(question.id))) ||
    Boolean(fingerprint && seen.fingerprints.has(fingerprint))
  );
}

/**
 *
 * @param question
 */
function objectiveIds(question) {
  return question.knowledgeObjectiveIds || question.knowledgePointIds || [];
}

/**
 *
 * @param questions
 * @param studentScope
 * @param root0
 * @param root0.minimumPerObjective
 */
export function preferUnseenQuestions(
  questions = [],
  studentScope,
  { minimumPerObjective = 1 } = {},
) {
  if (questions.length < 2) return questions;
  const seen = readSeenQuestions(studentScope);
  const unseen = questions.filter(
    (question) => !isQuestionSeen(question, seen),
  );
  if (unseen.length === 0) return questions;
  const requiredObjectives = new Set(questions.flatMap(objectiveIds));
  const coverage = Object.fromEntries(
    [...requiredObjectives].map((id) => [id, 0]),
  );
  for (const question of unseen)
    for (const id of objectiveIds(question)) {
      if (Object.hasOwn(coverage, id)) coverage[id] += 1;
    }
  const needsFallback = () =>
    [...requiredObjectives].some((id) => coverage[id] < minimumPerObjective);
  if (!needsFallback()) return unseen;
  const fallback = [];
  for (const question of questions.filter((question) =>
    isQuestionSeen(question, seen),
  )) {
    if (!needsFallback()) continue;
    const targets = objectiveIds(question).filter(
      (id) => coverage[id] < minimumPerObjective,
    );
    if (targets.length === 0) continue;
    fallback.push(question);
    for (const id of objectiveIds(question)) {
      if (Object.hasOwn(coverage, id)) coverage[id] += 1;
    }
  }
  return [...unseen, ...fallback];
}

/**
 *
 * @param published
 * @param studentScope
 */
export function preferUnseenPublishedContent(published, studentScope) {
  return {
    ...published,
    preQuestions: preferUnseenQuestions(
      published.preQuestions || [],
      studentScope,
      { minimumPerObjective: 3 },
    ),
    postQuestions: preferUnseenQuestions(
      published.postQuestions || [],
      studentScope,
    ),
    knowledgePracticePools: Object.fromEntries(
      Object.entries(published.knowledgePracticePools || {}).map(
        ([knowledgePointId, questions]) => [
          knowledgePointId,
          preferUnseenQuestions(questions || [], studentScope),
        ],
      ),
    ),
    compositeReviewPool: preferUnseenQuestions(
      published.compositeReviewPool || [],
      studentScope,
    ),
  };
}
