import { localizedDifficultyLabel } from "../../shared/presentation/difficultyPresentation";

const ROLE_DEFINITIONS = new Map([
  [
    "CORE",
    {
      className: "core",
      label: ["adaptiveLearning.assessment.role.core", "核心"],
    },
  ],
  [
    "SUPPORT",
    {
      className: "support",
      label: ["adaptiveLearning.assessment.role.support", "支撑"],
    },
  ],
  [
    "EXTENSION",
    {
      className: "extension",
      label: ["adaptiveLearning.assessment.role.extension", "拓展"],
    },
  ],
  [
    "NOT_APPLICABLE",
    {
      className: "not-applicable",
      label: ["adaptiveLearning.assessment.role.notApplicable", "不适用"],
    },
  ],
]);

const QUESTION_TYPE_DEFINITIONS = new Map([
  [
    "single_choice",
    ["adaptiveLearning.assessment.type.singleChoice", "单选题"],
  ],
  [
    "multiple_choice",
    ["adaptiveLearning.assessment.type.multipleChoice", "多选题"],
  ],
  ["fill_blank", ["adaptiveLearning.assessment.type.fillBlank", "填空题"]],
  ["short_answer", ["adaptiveLearning.assessment.type.shortAnswer", "问答题"]],
  ["judgement", ["adaptiveLearning.assessment.type.judgement", "判断题"]],
  ["ordering", ["adaptiveLearning.assessment.type.ordering", "排序题"]],
  [
    "classification",
    ["adaptiveLearning.assessment.type.classification", "分类题"],
  ],
  ["matching", ["adaptiveLearning.assessment.type.matching", "匹配题"]],
  ["line_connect", ["adaptiveLearning.assessment.type.lineConnect", "连线题"]],
  [
    "text_marker",
    ["adaptiveLearning.assessment.type.textMarker", "文本标记题"],
  ],
  ["word_builder", ["adaptiveLearning.assessment.type.wordBuilder", "组式题"]],
]);

const SLOT_STATUS_DEFINITIONS = new Map([
  ["ready", ["adaptiveLearning.assessment.slotStatus.ready", "插槽已就绪"]],
  ["pending", ["adaptiveLearning.assessment.slotStatus.pending", "等待"]],
  ["running", ["adaptiveLearning.assessment.slotStatus.running", "生成中"]],
  ["success", ["adaptiveLearning.assessment.slotStatus.success", "题目已生成"]],
  ["failed", ["adaptiveLearning.assessment.slotStatus.failed", "生成失败"]],
  ["stopped", ["adaptiveLearning.assessment.slotStatus.stopped", "已停止"]],
]);

const WAITING_STATUSES = new Set(["pending", "running", "stopped"]);

/**
 * 翻译单个展示定义。
 * @param {Function} translate - 渲染层翻译函数。
 * @param {string[]} definition - i18n key 与中文兜底文案。
 * @param {object} replacements - 插值变量。
 * @returns {string} 本地化文案。
 */
function translateCopy(translate, definition, replacements = {}) {
  const [key, fallback] = definition;
  return translate(key, fallback, replacements);
}

/**
 * 约束组件支持的插槽状态。
 * @param {string} status - 任务返回状态。
 * @returns {string} 稳定展示状态。
 */
function normalizeSlotStatus(status) {
  return SLOT_STATUS_DEFINITIONS.has(status) ? status : "ready";
}

/**
 * 将插槽知识点标识集中转换为展示标签，避免组件理解兼容字段优先级。
 * @param {object} slot - 已保存的插槽合同。
 * @param {Map<string, object>} knowledgePointById - 知识点展示索引。
 * @returns {{ primaryBadge: object | null, secondaryBadges: object[] }} 知识点展示标签。
 */
function projectSlotKnowledgePoints(slot, knowledgePointById) {
  const knowledgePointIds = Array.isArray(slot.knowledgePointIds)
    ? slot.knowledgePointIds.map(String)
    : [];
  const primaryKnowledgePointId = String(
    slot.primaryKnowledgePointId || knowledgePointIds[0] || "",
  );
  const secondaryKnowledgePointIds = Array.isArray(
    slot.secondaryKnowledgePointIds,
  )
    ? slot.secondaryKnowledgePointIds.map(String)
    : knowledgePointIds.filter((id) => id !== primaryKnowledgePointId);
  const primaryBadge = primaryKnowledgePointId
    ? {
        id: primaryKnowledgePointId,
        label:
          knowledgePointById.get(primaryKnowledgePointId)?.name ||
          primaryKnowledgePointId,
        role: "primary",
      }
    : null;
  const secondaryBadges = secondaryKnowledgePointIds.map((id) => ({
    id,
    label: knowledgePointById.get(id)?.name || id,
    role: "secondary",
  }));
  return {
    primaryBadge,
    secondaryBadges,
  };
}

/**
 * 将单个已保存插槽投影为展示模型。
 * @param {object} slot - 已保存的插槽合同。
 * @param {Map<string, object>} generatedStateById - 生成任务状态索引。
 * @param {Map<string, object>} knowledgePointById - 知识点展示索引。
 * @param {Function} translate - 渲染层翻译函数。
 * @returns {object} 插槽展示模型。
 */
function projectAssessmentSlot(
  slot,
  generatedStateById,
  knowledgePointById,
  translate,
) {
  const generatedState = generatedStateById.get(String(slot.id));
  const status = normalizeSlotStatus(generatedState?.status);
  const statusLabel = translateCopy(
    translate,
    SLOT_STATUS_DEFINITIONS.get(status),
  );
  const { primaryBadge, secondaryBadges } = projectSlotKnowledgePoints(
    slot,
    knowledgePointById,
  );
  const questionType = slot.questionType || "";
  const matrixCode = String(slot.matrixCode || "-");
  const difficulty = String(slot.difficulty || "");
  const difficultyLabel = localizedDifficultyLabel(difficulty);
  const questionTypeLabel = assessmentQuestionTypeLabel(
    questionType,
    translate,
  );
  return {
    id: String(slot.id),
    matrixCellId: String(slot.matrixCellId || ""),
    matrixCode,
    questionType,
    difficulty,
    difficultyLabel,
    knowledgePointBadges: [primaryBadge, ...secondaryBadges].filter(Boolean),
    status,
    statusLabel,
    questionTypeLabel,
    assignmentLabel: [matrixCode, questionTypeLabel, difficultyLabel]
      .filter(Boolean)
      .join(" · "),
    questionCount: Array.isArray(slot.questions) ? slot.questions.length : 0,
    questions: Array.isArray(slot.questions)
      ? slot.questions.map((question) => ({
          id: String(question.id),
          stem: question.stem,
          typeMatchesSlot: !question.type || question.type === questionType,
        }))
      : [],
  };
}

/**
 * 构造矩阵领域选项。
 * @param {Function} translate - 渲染层翻译函数。
 * @param policyId
 * @returns {object[]} 本地化领域选项。
 */
export function assessmentDomains(translate, policyId) {
  return assessmentPolicy(policyId).domains.map(
    ({ id, labelKey, fallback }) => ({
      id,
      label: translate(
        `adaptiveLearning.assessment.domain.${labelKey}`,
        fallback,
      ),
    }),
  );
}

/**
 * 构造矩阵认知层级选项。
 * @param {Function} translate - 渲染层翻译函数。
 * @param policyId
 * @returns {object[]} 本地化层级选项。
 */
export function assessmentLevels(translate, policyId) {
  return assessmentPolicy(policyId).levels.map(
    ({ id, labelKey, fallback }) => ({
      id,
      label: translate(
        `adaptiveLearning.assessment.level.${labelKey}`,
        fallback,
      ),
    }),
  );
}

/**
 * 构造单个矩阵角色展示模型。
 * @param {string} role - 领域角色代码。
 * @param {Function} translate - 渲染层翻译函数。
 * @returns {object} 角色展示模型。
 */
export function assessmentRoleMeta(role, translate) {
  const normalizedRole = ROLE_DEFINITIONS.has(role) ? role : "SUPPORT";
  const definition = ROLE_DEFINITIONS.get(normalizedRole);
  return {
    id: normalizedRole,
    className: definition.className,
    label: translateCopy(translate, definition.label),
  };
}

/**
 * 构造全部矩阵角色展示模型。
 * @param {Function} translate - 渲染层翻译函数。
 * @returns {object[]} 角色展示模型列表。
 */
export function assessmentRoles(translate) {
  return [...ROLE_DEFINITIONS.keys()].map((role) =>
    assessmentRoleMeta(role, translate),
  );
}

/**
 * 将题型代码映射为本地化名称。
 * @param {string} questionType - 题型代码。
 * @param {Function} translate - 渲染层翻译函数。
 * @returns {string} 题型名称。
 */
export function assessmentQuestionTypeLabel(questionType, translate) {
  const definition = QUESTION_TYPE_DEFINITIONS.get(questionType);
  if (definition) return translateCopy(translate, definition);
  return (
    questionType || translate("adaptiveLearning.assessment.question", "题目")
  );
}

/**
 * 将任务运行态与已保存的插槽合同合并成组件专用 view model。
 * 组件不会接触任务 DTO，也不会让任务返回值覆盖插槽的业务合同字段。
 * @param {object} root0 - 投影输入。
 * @param {boolean} root0.hasMatrix - 是否存在评估矩阵。
 * @param {object[]} root0.questionSlots - 已保存的插槽合同。
 * @param {object[]} root0.knowledgePoints - 当前范围内的知识点。
 * @param {object} root0.slotGeneration - 已投影的插槽生成状态。
 * @param {Function} root0.translate - 渲染层翻译函数。
 * @returns {object} 插槽区域展示模型。
 */
export function projectAssessmentSlots({
  hasMatrix,
  questionSlots = [],
  knowledgePoints = [],
  slotGeneration = {},
  translate,
}) {
  const generatedSlots = Array.isArray(slotGeneration.states)
    ? slotGeneration.states
    : [];
  const generatedStateById = new Map(
    generatedSlots.map((slot) => [String(slot.id), slot]),
  );
  const knowledgePointById = new Map(
    knowledgePoints.map((item) => [String(item.id), item]),
  );
  const slots = questionSlots.map((slot) =>
    projectAssessmentSlot(
      slot,
      generatedStateById,
      knowledgePointById,
      translate,
    ),
  );
  const successful = generatedSlots.filter(
    (slot) => slot.status === "success",
  ).length;
  const failed = generatedSlots.filter(
    (slot) => slot.status === "failed",
  ).length;
  const waiting = generatedSlots.filter((slot) =>
    WAITING_STATUSES.has(slot.status),
  ).length;

  return {
    slots,
    counts: { successful, failed, waiting },
    hasGenerationProgress: generatedSlots.length > 0,
    isPlanningSlots: Boolean(slotGeneration.isPlanning),
    isGeneratingQuestions: Boolean(slotGeneration.isRunning),
    canRetryFailedSlots: Boolean(slotGeneration.canRetry),
    summary: slotGeneration.isPlanning
      ? translate(
          "adaptiveLearning.assessment.planningSlots",
          "正在规划题目插槽",
        )
      : slots.length > 0
        ? translate(
            "adaptiveLearning.assessment.slotSummary",
            "{$count} 个题目插槽，覆盖矩阵题型与证据要求",
            { count: slots.length },
          )
        : hasMatrix
          ? translate(
              "adaptiveLearning.assessment.slotReadyToPlan",
              "矩阵已就绪，可规划对应的出题插槽",
            )
          : translate(
              "adaptiveLearning.assessment.matrixMissing",
              "未生成评估矩阵",
            ),
  };
}
import { assessmentPolicy } from "../../shared/domain/assessmentMatrixPolicy";
