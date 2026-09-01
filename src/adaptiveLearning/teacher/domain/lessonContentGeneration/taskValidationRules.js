import { assessmentMatrixCellRequiredSlotCount } from "../../../shared/domain/knowledgeAssessmentMatrix.js";
import {
  buildPreAssessmentBlueprint,
  diagnosticSlotForQuestion,
} from "../../../shared/domain/preAssessmentBlueprint.js";
import {
  DIFFICULTY_LEVELS,
  PRACTICE_POOL_DIFFICULTY_COUNTS,
} from "../../../shared/domain/questionPoolPolicy.js";
import {
  difficultyNumber,
  LESSON_GENERATION_MODULE_KIND,
  questionKnowledgeIds,
} from "./modules.js";

/**
 *
 * @param value
 */
function normalizedStem(value) {
  return String(value || "")
    .replaceAll(/\s+/g, "")
    .replaceAll(/[!,.?。！，？]/g, "")
    .toLowerCase();
}

/**
 *
 * @param answer
 */
function hasAnswer(answer) {
  if (answer === null || answer === undefined) return false;
  if (typeof answer === "string") return Boolean(answer.trim());
  if (Array.isArray(answer)) return answer.length > 0;
  return typeof answer === "object" ? Object.keys(answer).length > 0 : true;
}

/**
 *
 * @param task
 * @param code
 * @param message
 * @param questionId
 * @param details
 */
export function taskIssue(task, code, message, questionId = "", details = {}) {
  return { code, message, moduleIds: [task.moduleId], questionId, ...details };
}

/**
 *
 * @param question
 */
export function hasIndependentEvidenceMap(question) {
  const ids = questionKnowledgeIds(question);
  if (ids.length <= 1) return true;
  const map = Array.isArray(question?.knowledgeEvidenceMap)
    ? question.knowledgeEvidenceMap
    : [];
  const mapped = new Set(
    map
      .filter((item) => item?.knowledgePointId && Number(item.maxScore) > 0)
      .map((item) => item.knowledgePointId),
  );
  return (
    ids.every((id) => mapped.has(id)) &&
    map.some((item) => item?.role === "primary")
  );
}

/**
 *
 * @param task
 * @param result
 */
export function validateClassroomTaskResult(task, result) {
  const runtime = result?.runtime || result?.openMaic || result || {};
  const issues = [];
  if (!runtime.classroomId) {
    issues.push(
      taskIssue(
        task,
        "OPENMAIC_CLASSROOM_ID_MISSING",
        `${task.label}缺少课堂标识`,
      ),
    );
  }
  const classroomUrl = String(runtime.classroomUrl || "").trim();
  const validUrl =
    /^\/openmaic\/classroom\/[\w-]+(?:[#/?]|$)/.test(classroomUrl) ||
    /^https?:\/\/\S+/.test(classroomUrl);
  if (!validUrl) {
    issues.push(
      taskIssue(
        task,
        "OPENMAIC_CLASSROOM_URL_MISSING",
        `${task.label}缺少有效访问地址`,
      ),
    );
  }
  return issues;
}

/**
 *
 * @param content
 * @param task
 */
function questionsOutsideTaskModule(content, task) {
  const preQuestions = content?.preQuestions || [];
  const postQuestions = content?.postQuestions || [];
  if (task.targetBlueprintSlots?.length)
    return [...preQuestions, ...postQuestions];
  if (task.targetQuestionIds?.length) {
    const targets = new Set(task.targetQuestionIds);
    return [...preQuestions, ...postQuestions].filter(
      (question) => !targets.has(question.id),
    );
  }
  const filters = {
    [LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT]: () => postQuestions,
    [LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW]: () => [
      ...preQuestions,
      ...postQuestions.filter((question) => question.phase !== "review"),
    ],
    [LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS]: () => [
      ...preQuestions,
      ...postQuestions.filter(
        (question) =>
          question.phase === "review" ||
          questionKnowledgeIds(question)[0] !== task.knowledgePointId,
      ),
    ],
  };
  return filters[task.moduleKind]?.() || [...preQuestions, ...postQuestions];
}

/**
 *
 * @param task
 * @param question
 * @param index
 * @param lessonKnowledgeIds
 */
function requiredQuestionIssues(task, question, index, lessonKnowledgeIds) {
  const issues = [];
  const questionName = question?.id || `第 ${index + 1} 题`;
  const add = (condition, code, message) => {
    if (condition) issues.push(taskIssue(task, code, message, question?.id));
  };
  add(
    !String(question?.stem || "").trim(),
    "QUESTION_STEM_MISSING",
    `${questionName} 缺少题干`,
  );
  add(!question?.type, "QUESTION_TYPE_MISSING", `${questionName} 缺少题型`);
  add(
    !hasAnswer(question?.answer),
    "ANSWER_MISSING",
    `${questionName} 缺少答案`,
  );
  add(
    question?.type === "short_answer" &&
      (!Array.isArray(question?.rubric) || question.rubric.length === 0),
    "RUBRIC_MISSING",
    `${questionName} 缺少评分点`,
  );
  issues.push(
    ...questionScopeIssues(task, question, questionName, lessonKnowledgeIds),
  );
  add(
    !DIFFICULTY_LEVELS.includes(difficultyNumber(question?.difficulty)),
    "QUESTION_DIFFICULTY_INVALID",
    `${questionName} 难度必须为 D1–D5（1–5）`,
  );
  return issues;
}

/**
 *
 * @param task
 * @param question
 * @param questionName
 * @param lessonKnowledgeIds
 */
function questionScopeIssues(task, question, questionName, lessonKnowledgeIds) {
  const ids = questionKnowledgeIds(question);
  const issues = [];
  const add = (condition, code, message) => {
    if (condition) issues.push(taskIssue(task, code, message, question?.id));
  };
  add(ids.length === 0, "QUESTION_SCOPE_MISSING", `${questionName} 缺少知识点`);
  add(
    ids.some((id) => !lessonKnowledgeIds.has(id)),
    "QUESTION_SCOPE_OUT_OF_RANGE",
    `${questionName} 包含课时外知识点`,
  );
  add(
    task.moduleKind === LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS &&
      (ids.length !== 1 || ids[0] !== task.knowledgePointId),
    "QUESTION_SCOPE_OUT_OF_RANGE",
    `${questionName} 不属于当前单点题池`,
  );
  const composite =
    task.moduleKind === LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW;
  add(
    composite && ids.length < 2,
    "COMPOSITE_REVIEW_SCOPE_INVALID",
    `${questionName} 未混合至少两个知识点`,
  );
  add(
    composite && !hasIndependentEvidenceMap(question),
    "COMPOSITE_REVIEW_SCOPE_INVALID",
    `${questionName} 缺少按子题或评分点拆分的独立知识点证据`,
  );
  return issues;
}

/**
 *
 * @param task
 * @param questions
 * @param content
 */
function duplicateQuestionIssues(task, questions, content) {
  const existing = new Set(
    questionsOutsideTaskModule(content, task)
      .map((question) => normalizedStem(question.stem))
      .filter(Boolean),
  );
  const generated = new Set();
  const issues = [];
  for (const question of questions) {
    const stem = normalizedStem(question?.stem);
    if (!stem) continue;
    if (existing.has(stem) || generated.has(stem)) {
      issues.push(
        taskIssue(
          task,
          "DUPLICATE_QUESTION",
          `${question?.id || "未命名题目"} 与已有题目重复`,
          question?.id,
        ),
      );
    }
    generated.add(stem);
  }
  return issues;
}

/**
 *
 * @param task
 * @param questions
 * @param targetedRepair
 * @param matrixDrivenTask
 */
function poolStructureIssues(
  task,
  questions,
  targetedRepair,
  matrixDrivenTask,
) {
  if (targetedRepair || matrixDrivenTask || questions.length === 0) return [];
  const issues = [];
  const distinctTypes = new Set(
    questions.map((question) => question.type).filter(Boolean),
  );
  const distinctDifficulties = new Set(
    questions
      .map((question) => difficultyNumber(question.difficulty))
      .filter((value) => DIFFICULTY_LEVELS.includes(value)),
  );
  if (distinctTypes.size < 2) {
    issues.push(
      taskIssue(
        task,
        "POOL_TYPE_INSUFFICIENT",
        `${task.label}至少需要 2 种题型`,
      ),
    );
  }
  if (distinctDifficulties.size < 2) {
    issues.push(
      taskIssue(
        task,
        "QUESTION_DIFFICULTY_STRUCTURE_INVALID",
        `${task.label}至少需要 2 个难度层级`,
      ),
    );
  }
  return issues;
}

/**
 *
 * @param task
 * @param questions
 * @param matrix
 * @param targetedRepair
 */
function assessmentMatrixIssues(task, questions, matrix, targetedRepair) {
  if (targetedRepair || !matrix?.cells?.length) return [];
  return matrix.cells.flatMap((cell) => {
    const cellId = String(
      cell.matrixCellId ||
        `${task.knowledgePointId}:${cell.domain}:${cell.targetLevel || cell.level}`,
    );
    const currentCount = questions.filter(
      (question) => String(question.matrixCellId || "") === cellId,
    ).length;
    const required = assessmentMatrixCellRequiredSlotCount(cell);
    return currentCount < required
      ? [
          taskIssue(
            task,
            "ASSESSMENT_MATRIX_EVIDENCE_INSUFFICIENT",
            `${task.label}的矩阵格 ${cell.domain}-${cell.targetLevel || cell.level} 有 ${currentCount} 条独立证据，还需 ${required - currentCount} 条`,
          ),
        ]
      : [];
  });
}

/**
 *
 * @param task
 * @param questions
 * @param matrixDrivenTask
 * @param targetedRepair
 */
function adaptiveDifficultyIssues(
  task,
  questions,
  matrixDrivenTask,
  targetedRepair,
) {
  if (
    targetedRepair ||
    matrixDrivenTask ||
    task.moduleKind !== LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS
  )
    return [];
  return Object.entries(PRACTICE_POOL_DIFFICULTY_COUNTS).flatMap(
    ([difficulty, required]) => {
      const current = questions.filter(
        (question) =>
          difficultyNumber(question.difficulty) === Number(difficulty),
      ).length;
      return current < required
        ? [
            taskIssue(
              task,
              "ADAPTIVE_POOL_DIFFICULTY_INSUFFICIENT",
              `${task.label}的D${difficulty}题有 ${current} 道，还需补充 ${required - current} 道`,
            ),
          ]
        : [];
    },
  );
}

/**
 *
 * @param slot
 */
function blueprintSlotDetails(slot) {
  return {
    blueprintSlotId: slot.id,
    primaryKnowledgePointId: slot.primaryKnowledgePointId,
    diagnosticRole: slot.diagnosticRole,
  };
}

/**
 *
 * @param task
 * @param questions
 * @param lesson
 */
function preAssessmentBlueprintIssues(task, questions, lesson) {
  if (task.moduleKind !== LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT)
    return [];
  const expected = task.targetBlueprintSlots?.length
    ? task.targetBlueprintSlots
    : buildPreAssessmentBlueprint(lesson?.knowledgePoints || []);
  const slotsById = new Map();
  const issues = [];
  for (const question of questions) {
    const slot = diagnosticSlotForQuestion(question);
    if (!slot) continue;
    if (slotsById.has(slot.id)) {
      issues.push(
        taskIssue(
          task,
          "PRE_ASSESSMENT_SLOT_DUPLICATED",
          `${slot.primaryKnowledgePointId} 的 ${slot.diagnosticRole} 主证据槽位重复`,
          question.id,
          blueprintSlotDetails(slot),
        ),
      );
    }
    slotsById.set(slot.id, question);
  }
  for (const slot of expected)
    issues.push(...expectedSlotIssues(task, slot, slotsById));
  return issues;
}

/**
 *
 * @param task
 * @param slot
 * @param slotsById
 */
function expectedSlotIssues(task, slot, slotsById) {
  const question = slotsById.get(slot.id);
  if (!question) {
    return [
      taskIssue(
        task,
        "PRE_ASSESSMENT_SLOT_MISSING",
        `${slot.primaryKnowledgePointId} 的 ${slot.diagnosticRole} 主证据槽位缺失`,
        "",
        blueprintSlotDetails(slot),
      ),
    ];
  }
  if (
    difficultyNumber(question.difficulty) === difficultyNumber(slot.difficulty)
  )
    return [];
  return [
    taskIssue(
      task,
      "PRE_ASSESSMENT_SLOT_DIFFICULTY_INVALID",
      `${slot.primaryKnowledgePointId} 的 ${slot.diagnosticRole} 槽位应为 ${slot.difficulty} 级难度`,
      question.id,
      blueprintSlotDetails(slot),
    ),
  ];
}

/**
 *
 * @param task
 * @param questions
 * @param lesson
 * @param targetedRepair
 */
function preAssessmentPoolIssues(task, questions, lesson, targetedRepair) {
  if (
    targetedRepair ||
    task.moduleKind !== LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT
  )
    return [];
  return (lesson?.knowledgePoints || []).flatMap((knowledgePoint) => {
    const scoped = questions.filter(
      (question) =>
        diagnosticSlotForQuestion(question)?.primaryKnowledgePointId ===
        knowledgePoint.id,
    );
    const issues = [];
    if (scoped.length < 4) {
      issues.push(
        taskIssue(
          task,
          "POOL_QUANTITY_INSUFFICIENT",
          `${knowledgePoint.name}的课前主证据题只有 ${scoped.length} 道，至少需要 4 道`,
        ),
      );
    }
    const types = new Set(
      scoped.map((question) => question.type).filter(Boolean),
    );
    if (types.size < 2) {
      issues.push(
        taskIssue(
          task,
          "POOL_TYPE_INSUFFICIENT",
          `${knowledgePoint.name}的课前测验至少需要 2 种题型`,
        ),
      );
    }
    const difficulties = new Set(
      scoped
        .map((question) => difficultyNumber(question.difficulty))
        .filter((value) => DIFFICULTY_LEVELS.includes(value)),
    );
    if (difficulties.size < 2) {
      issues.push(
        taskIssue(
          task,
          "QUESTION_DIFFICULTY_STRUCTURE_INVALID",
          `${knowledgePoint.name}的课前测验至少需要 2 个难度层级`,
        ),
      );
    }
    return issues;
  });
}

/**
 *
 * @param root0
 * @param root0.task
 * @param root0.result
 * @param root0.lesson
 * @param root0.content
 */
export function validateQuestionTaskResult({ task, result, lesson, content }) {
  const questions = Array.isArray(result?.questions) ? result.questions : [];
  const targetedRepair =
    task.taskType === "repair" &&
    (task.targetQuestionIds?.length > 0 ||
      task.targetBlueprintSlots?.length > 0);
  const matrix =
    task.moduleKind === LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS
      ? content?.assessmentMatrices?.[task.knowledgePointId]
      : null;
  const matrixDriven = Boolean(matrix?.cells?.length);
  const lessonKnowledgeIds = new Set(
    (lesson?.knowledgePoints || []).map((item) => item.id),
  );
  const issues = questions.flatMap((question, index) =>
    requiredQuestionIssues(task, question, index, lessonKnowledgeIds),
  );
  const requiredCount = Number(task.requiredCount || 0);
  if (questions.length < requiredCount) {
    issues.unshift(
      taskIssue(
        task,
        "QUESTION_QUANTITY_INSUFFICIENT",
        `${task.label}只生成 ${questions.length} 道，需要 ${requiredCount} 道`,
      ),
    );
  }
  issues.push(
    ...duplicateQuestionIssues(task, questions, content),
    ...poolStructureIssues(task, questions, targetedRepair, matrixDriven),
    ...assessmentMatrixIssues(task, questions, matrix, targetedRepair),
    ...adaptiveDifficultyIssues(task, questions, matrixDriven, targetedRepair),
    ...preAssessmentBlueprintIssues(task, questions, lesson),
    ...preAssessmentPoolIssues(task, questions, lesson, targetedRepair),
  );
  return issues;
}
