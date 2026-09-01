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

const DOMAIN_DEFINITIONS = [
  ["CR", "adaptiveLearning.assessment.domain.concepts", "概念与符号"],
  ["PJ", "adaptiveLearning.assessment.domain.reasoning", "程序、推理与论证"],
  ["M", "adaptiveLearning.assessment.domain.models", "模型与不变结构"],
  ["SF", "adaptiveLearning.assessment.domain.reflection", "总结、交流与反思"],
];

const LEVEL_DEFINITIONS = [
  ["A", "adaptiveLearning.assessment.level.recognize", "识别与再现"],
  ["B", "adaptiveLearning.assessment.level.understand", "理解与转换"],
  ["C", "adaptiveLearning.assessment.level.execute", "选择与执行"],
  ["D", "adaptiveLearning.assessment.level.reason", "关联与论证"],
  ["E", "adaptiveLearning.assessment.level.transfer", "迁移与建构"],
];

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
 * 读取首个非空值。
 * @param {Array<unknown>} values - 候选值。
 * @param {unknown} fallback - 缺省值。
 * @returns {unknown} 首个非空值或缺省值。
 */
function firstPresent(values, fallback) {
  return (
    values.find(
      (value) => value !== undefined && value !== null && value !== "",
    ) ?? fallback
  );
}

/**
 * 将单个已保存插槽投影为展示模型。
 * @param {object} slot - 已保存的插槽合同。
 * @param {number} index - 展示序号。
 * @param {Map<string, object>} generatedStateById - 生成任务状态索引。
 * @param {Function} translate - 渲染层翻译函数。
 * @returns {object} 插槽展示模型。
 */
function projectAssessmentSlot(slot, index, generatedStateById, translate) {
  const generatedState = generatedStateById.get(String(slot.id));
  const status = normalizeSlotStatus(generatedState?.status);
  const statusLabel = translateCopy(
    translate,
    SLOT_STATUS_DEFINITIONS.get(status),
  );
  const contractLabel = [slot.matrixCode, slot.difficulty]
    .filter(Boolean)
    .join(" · ");

  return {
    id: slot.id,
    status,
    statusLabel,
    title: translate(
      "adaptiveLearning.assessment.slotTitle",
      "插槽 {$index} · {$status}",
      { index: index + 1, status: statusLabel },
    ),
    heading: translate(
      "adaptiveLearning.assessment.slotHeading",
      "插槽 {$index} · {$contract}",
      { index: index + 1, contract: contractLabel },
    ),
    questionTypeLabel: assessmentQuestionTypeLabel(
      slot.questionType,
      translate,
    ),
    roleLabel: assessmentRoleMeta(slot.matrixRole, translate).label,
    observableBehavior: firstPresent(
      [slot.observableBehavior],
      translate(
        "adaptiveLearning.assessment.missingTargetBehavior",
        "未填写目标行为",
      ),
    ),
    evidenceCriterion: firstPresent(
      [slot.evidenceCriterion],
      translate("adaptiveLearning.assessment.notProvided", "未填写"),
    ),
    variationRequirement: firstPresent(
      [slot.variationRequirement],
      translate("adaptiveLearning.assessment.notProvided", "未填写"),
    ),
  };
}

/**
 * 构造矩阵领域选项。
 * @param {Function} translate - 渲染层翻译函数。
 * @returns {object[]} 本地化领域选项。
 */
export function assessmentDomains(translate) {
  return DOMAIN_DEFINITIONS.map(([id, key, fallback]) => ({
    id,
    label: translate(key, fallback),
  }));
}

/**
 * 构造矩阵认知层级选项。
 * @param {Function} translate - 渲染层翻译函数。
 * @returns {object[]} 本地化层级选项。
 */
export function assessmentLevels(translate) {
  return LEVEL_DEFINITIONS.map(([id, key, fallback]) => ({
    id,
    label: translate(key, fallback),
  }));
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
 * @param {object} root0.slotGeneration - 已投影的插槽生成状态。
 * @param {Function} root0.translate - 渲染层翻译函数。
 * @returns {object} 插槽区域展示模型。
 */
export function projectAssessmentSlots({
  hasMatrix,
  questionSlots = [],
  slotGeneration = {},
  translate,
}) {
  const generatedSlots = Array.isArray(slotGeneration.states)
    ? slotGeneration.states
    : [];
  const generatedStateById = new Map(
    generatedSlots.map((slot) => [String(slot.id), slot]),
  );
  const slots = questionSlots.map((slot, index) =>
    projectAssessmentSlot(slot, index, generatedStateById, translate),
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
