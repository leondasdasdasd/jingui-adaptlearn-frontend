import { normalizeLearningGenerationPolicy } from './learningGenerationPolicy.js';
import {
  repairGrade7QuestionContract,
  repairGrade7VisualQuestion,
} from './grade7VisualQuestionRepairs.js';
import { repairEmbeddedChoiceDescriptions } from '../question-platform/questionContract.js';
import { normalizeKnowledgePracticeQuestion } from './questionPurpose.js';

const normalizeQuestions = (questions = []) => questions.map((question) => (
  repairEmbeddedChoiceDescriptions(repairGrade7QuestionContract(repairGrade7VisualQuestion(question)))
));

const normalizePracticePools = (pools = {}) => Object.fromEntries(
  Object.entries(pools).map(([knowledgePointId, questions]) => [
    knowledgePointId,
    normalizeQuestions(questions || []).map(normalizeKnowledgePracticeQuestion),
  ]),
);

export function normalizeOpenMaicClassroomUrl(value, classroomId = '') {
  const raw = String(value || '').trim();
  const fallbackId = String(classroomId || '').trim();
  if (!raw && /^[a-zA-Z0-9_-]+$/.test(fallbackId)) {
    return `/openmaic/classroom/${encodeURIComponent(fallbackId)}`;
  }
  try {
    const parsed = new URL(raw, 'http://127.0.0.1');
    const isInternalOpenMaic = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
      && (parsed.port === '3100' || parsed.port === '');
    const match = parsed.pathname.match(/\/classroom\/([a-zA-Z0-9_-]+)\/?$/);
    if (isInternalOpenMaic && match) {
      return `/openmaic/classroom/${encodeURIComponent(match[1])}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Keep malformed or external URLs unchanged for the existing quality gate.
  }
  return value || '';
}

const readyRuntime = (runtime = {}) => ({
  status: runtime.status || (runtime.classroomUrl ? 'READY' : 'UNAVAILABLE'),
  classroomId: runtime.classroomId || '',
  classroomUrl: normalizeOpenMaicClassroomUrl(runtime.classroomUrl, runtime.classroomId),
  coveredKnowledgeObjectiveIds: runtime.coveredKnowledgeObjectiveIds || [],
});

export function normalizePublishedContentPackage(content = {}) {
  if (content.learningContent) {
    return {
      planType: content.planType,
      title: content.title,
      sourceLessons: content.sourceLessons || [],
      generationPolicy: normalizeLearningGenerationPolicy(content.generationPolicy),
      questionDistribution: content.questionDistribution || null,
      lesson: content.lesson,
      knowledgeObjectives: content.knowledgeObjectives || [],
      assessmentMatrices: content.assessmentMatrices || {},
      assessmentQuestionSlots: content.assessmentQuestionSlots || {},
      diagnosticQuestionPool: normalizeQuestions(content.diagnosticQuestionPool || []),
      learningContent: {
        composite: readyRuntime(content.learningContent.composite),
        knowledgePoints: (content.learningContent.knowledgePoints || []).map((item) => ({
          knowledgeObjectiveId: item.knowledgeObjectiveId,
          openMaic: readyRuntime(item.openMaic),
        })),
      },
      knowledgePracticePools: normalizePracticePools(content.knowledgePracticePools || {}),
      compositeReviewPool: normalizeQuestions(content.compositeReviewPool || []),
      unconfirmedItems: content.unconfirmedItems || [],
    };
  }

  const questions = content.questionPool || [];
  const objectives = content.knowledgeObjectives || [];
  const practicePools = Object.fromEntries(objectives.map((objective) => [objective.id, []]));
  questions
    .filter((item) => ['PRACTICE', 'POST', 'REVALIDATION'].includes(String(item.purpose).toUpperCase()) && item.phase !== 'review')
    .forEach((question) => {
      const objectiveId = question.knowledgeObjectiveIds?.[0] || question.knowledgePointIds?.[0];
      if (practicePools[objectiveId]) practicePools[objectiveId].push(question);
    });

  return {
    planType: content.planType,
    title: content.title,
    sourceLessons: content.sourceLessons || [],
    generationPolicy: normalizeLearningGenerationPolicy(content.generationPolicy),
    questionDistribution: content.questionDistribution || null,
    lesson: content.lesson,
    knowledgeObjectives: objectives,
    assessmentMatrices: content.assessmentMatrices || {},
    assessmentQuestionSlots: content.assessmentQuestionSlots || {},
    diagnosticQuestionPool: normalizeQuestions(questions.filter((item) => String(item.purpose).toUpperCase() === 'PRE')),
    learningContent: {
      composite: readyRuntime(content.openMaic),
      knowledgePoints: [],
    },
    knowledgePracticePools: normalizePracticePools(practicePools),
    compositeReviewPool: normalizeQuestions(questions.filter((item) => item.phase === 'review')),
    unconfirmedItems: content.unconfirmedItems || [],
    legacySource: true,
  };
}

export function flattenPublishedQuestions(content = {}) {
  const normalized = normalizePublishedContentPackage(content);
  return [
    ...normalized.diagnosticQuestionPool,
    ...Object.values(normalized.knowledgePracticePools).flat(),
    ...normalized.compositeReviewPool,
  ];
}

export function findKnowledgeRuntime(content, knowledgeObjectiveId) {
  const normalized = normalizePublishedContentPackage(content);
  return normalized.learningContent.knowledgePoints
    .find((item) => item.knowledgeObjectiveId === knowledgeObjectiveId)?.openMaic || null;
}
