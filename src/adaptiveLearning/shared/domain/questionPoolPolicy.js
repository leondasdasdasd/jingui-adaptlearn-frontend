// 题池容量与学生单次作答量分开：题池要足够大，学生仍可提前达标结束。
export const PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT = 15;
export const PRACTICE_POOL_MIN_SIZE_PER_KNOWLEDGE_POINT =
  PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT;
// Operational guard only. Product acceptance treats 15 as a floor, while the
// planner may create a larger reusable pool without increasing one session.
// A sparse assessment matrix can contain up to 12 cells with 6 recommended
// profiles each. Matrix-driven pools must be able to materialize all of them.
export const PRACTICE_POOL_MAX_SIZE_PER_KNOWLEDGE_POINT = 72;
// Composite review is sized from the evidence blueprint instead of the old
// fixed six-question fallback. Six is still a sensible minimum for one/two
// point lessons, while larger lessons receive one independent slot per point.
export const COMPOSITE_REVIEW_POOL_SIZE = 6;
export const PRACTICE_SESSION_MAX_QUESTIONS = 15;

export const COMPOSITE_REVIEW_DIFFICULTY_SEQUENCE = Object.freeze([
  3, 4, 4, 4, 5, 5,
]);
export const COMPOSITE_REVIEW_RECOMMENDED_TYPES = Object.freeze({
  3: Object.freeze(["short_answer", "multiple_choice", "ordering"]),
  4: Object.freeze([
    "short_answer",
    "multiple_choice",
    "ordering",
    "line_connect",
  ]),
  5: Object.freeze(["short_answer", "multiple_choice", "ordering"]),
});

export const DIFFICULTY_LEVELS = Object.freeze([1, 2, 3, 4, 5]);
export const DIFFICULTY_LABELS = Object.freeze({
  1: "D1基础识别",
  2: "D2直接理解",
  3: "D3标准应用",
  4: "D4变式综合",
  5: "D5迁移应用",
});

// Candidate pool distribution. Runtime selection normally consumes at most
// three pre-assessment items and fifteen practice items; the pool remains
// larger so a student can receive independent, unseen evidence.
export const PRACTICE_POOL_DIFFICULTY_COUNTS = Object.freeze({
  1: 3,
  2: 3,
  3: 4,
  4: 3,
  5: 2,
});

const PRACTICE_POOL_TASK_CATEGORIES = Object.freeze([
  "calculation",
  "concept_or_calculation",
  "calculation",
  "calculation",
  "application",
  "calculation",
  "application",
  "calculation",
  "application",
  "application",
  "application",
  "application",
  "calculation",
  "application",
  "application",
]);

// Each slot is a content brief, not a finished question. Locking the type and
// focus before generation prevents the model from deciding the pool structure
// while still leaving it room to create an appropriate stem and data set.
const PRACTICE_POOL_QUESTION_TYPES = Object.freeze([
  "single_choice",
  "judgement",
  "fill_blank",
  "text_marker",
  "classification",
  "matching",
  "multiple_choice",
  "word_builder",
  "ordering",
  "short_answer",
  "line_connect",
  "multiple_choice",
  "short_answer",
  "ordering",
  "short_answer",
]);

const PRACTICE_POOL_ASSESSMENT_FOCI = Object.freeze([
  "识别本知识点的基本对象、符号或直接运算入口，并排除一个典型误认",
  "判断本知识点核心规则的适用边界，辨别一个常见反例",
  "按本知识点的基本规则完成一步封闭计算或确定结果",
  "从短材料中定位决定解法的条件，并据此选择直接方法",
  "把具体情境中的对象按本知识点的互斥标准正确分类",
  "建立本知识点中对象、表示与结果之间的一一对应关系",
  "在标准情境中独立检验多个结论，区分边界条件造成的真假变化",
  "把题干数量关系转换为可计算的规范数学表达",
  "确定相互依赖的处理顺序，并完成至少两个连续推理或计算环节",
  "从具体数据建立数量关系，完成标准应用并说明结论",
  "把条件、表示和结果连接为连续关系链，处理一个条件变化",
  "比较两条可行路径，在隐藏约束下选择并验证正确方案",
  "对中间结果作一次实质修正，再沿同一依赖链完成综合计算",
  "在陌生情境中安排建模、两次依赖计算、转折处理与验证的顺序",
  "迁移本知识点解决陌生任务，处理隐藏条件并用独立限制验证结论",
]);

const RECOMMENDED_TYPES_BY_DIFFICULTY = Object.freeze({
  1: ["single_choice", "judgement", "fill_blank", "text_marker"],
  2: [
    "single_choice",
    "judgement",
    "fill_blank",
    "classification",
    "matching",
    "text_marker",
    "ordering",
    "short_answer",
  ],
  3: [
    "single_choice",
    "multiple_choice",
    "fill_blank",
    "classification",
    "matching",
    "line_connect",
    "text_marker",
    "word_builder",
    "ordering",
    "short_answer",
  ],
  4: [
    "single_choice",
    "multiple_choice",
    "fill_blank",
    "classification",
    "matching",
    "line_connect",
    "ordering",
    "short_answer",
  ],
  5: ["multiple_choice", "ordering", "short_answer"],
});

// Compatibility exports for generation/audit callers that still import the
// former 10/3/2 partition contract. Knowledge-point pools are now one
// adaptive PRACTICE pool, so there are no partition quotas to enforce.
export const PRACTICE_POOL_PARTITION_COUNTS = Object.freeze({});
export const PRACTICE_POOL_PARTITIONS = Object.freeze([]);

/**
 *
 * @param knowledgePointCount
 */
export function compositeReviewCount(knowledgePointCount = 0) {
  const count = Math.max(0, Number(knowledgePointCount) || 0);
  return count <= 0
    ? 0
    : Math.max(COMPOSITE_REVIEW_POOL_SIZE, Math.min(10, count + 2));
}

/**
 *
 * @param count
 */
export function compositeReviewBlueprint(count = COMPOSITE_REVIEW_POOL_SIZE) {
  const total = Math.max(
    1,
    Math.min(
      PRACTICE_POOL_MAX_SIZE_PER_KNOWLEDGE_POINT,
      Number(count) || COMPOSITE_REVIEW_POOL_SIZE,
    ),
  );
  return Array.from({ length: total }, (_, index) => {
    const difficulty =
      COMPOSITE_REVIEW_DIFFICULTY_SEQUENCE[
        index % COMPOSITE_REVIEW_DIFFICULTY_SEQUENCE.length
      ];
    const calculationSlot =
      index % COMPOSITE_REVIEW_DIFFICULTY_SEQUENCE.length === 1;
    return {
      id: `review:${index + 1}`,
      difficulty: `D${difficulty}`,
      taskCategory: calculationSlot ? "calculation" : "application",
      adaptiveRole:
        difficulty === 5
          ? "transfer"
          : difficulty === 4
            ? "challenge"
            : "comprehensive",
      questionType: [
        "multiple_choice",
        "ordering",
        "short_answer",
        "line_connect",
        "short_answer",
        "ordering",
      ][index % COMPOSITE_REVIEW_DIFFICULTY_SEQUENCE.length],
      assessmentFocus: [
        "综合多个知识点，把情境数据转化为标准模型并检验多个结论",
        "确定跨知识点计算的依赖顺序，完成连续计算且不泄露中间答案",
        "在条件变化后修正中间量，再完成综合推理并解释结论",
        "在不同表示之间建立连续关系链，并用隐藏约束筛选有效路径",
        "在陌生情境中完成建模、两次依赖计算、真实转折和结果验证",
        "逆向规划迁移任务的处理顺序，并用独立限制验证最终方案",
      ][index % COMPOSITE_REVIEW_DIFFICULTY_SEQUENCE.length],
      recommendedQuestionTypes: calculationSlot
        ? ["ordering", "multiple_choice", "short_answer"]
        : COMPOSITE_REVIEW_RECOMMENDED_TYPES[difficulty],
    };
  });
}

/**
 *
 * @param knowledgePointId
 * @param count
 */
export function practicePoolBlueprint(
  knowledgePointId,
  count = PRACTICE_POOL_SIZE_PER_KNOWLEDGE_POINT,
) {
  const total = Math.max(
    1,
    Math.min(PRACTICE_POOL_MAX_SIZE_PER_KNOWLEDGE_POINT, Number(count) || 0),
  );
  const baselineLevels = Object.entries(
    PRACTICE_POOL_DIFFICULTY_COUNTS,
  ).flatMap(([difficulty, levelCount]) =>
    Array.from({ length: levelCount }, () => Number(difficulty)),
  );
  const slots = Array.from(
    { length: total },
    (_, index) =>
      baselineLevels[index] || [3, 4, 5][(index - baselineLevels.length) % 3],
  );
  return slots.map((difficultyLevel, index) => ({
    id: `${knowledgePointId}:practice:${index + 1}`,
    knowledgePointId,
    // New V6 content carries the five-level code end to end. Numeric values
    // remain accepted only by legacy readers and migration code.
    difficulty: `D${difficultyLevel}`,
    adaptiveRole:
      difficultyLevel <= 2
        ? "remediation"
        : difficultyLevel === 3
          ? "standard"
          : "challenge",
    // The fixed blueprint makes the 7-9 application-question quota
    // deterministic instead of asking the model to estimate a batch ratio.
    taskCategory:
      PRACTICE_POOL_TASK_CATEGORIES[index] ||
      ((index - PRACTICE_POOL_TASK_CATEGORIES.length) % 2 === 0
        ? "calculation"
        : "application"),
    questionType:
      PRACTICE_POOL_QUESTION_TYPES[index] ||
      RECOMMENDED_TYPES_BY_DIFFICULTY[difficultyLevel][
        index % RECOMMENDED_TYPES_BY_DIFFICULTY[difficultyLevel].length
      ],
    assessmentFocus:
      PRACTICE_POOL_ASSESSMENT_FOCI[index] ||
      `在新的${difficultyLevel >= 4 ? "变式或迁移" : "标准"}材料中考查本知识点，改变数据组织、设问目标和推理路径，避免与前序槽位重复`,
    recommendedQuestionTypes: RECOMMENDED_TYPES_BY_DIFFICULTY[difficultyLevel],
  }));
}
