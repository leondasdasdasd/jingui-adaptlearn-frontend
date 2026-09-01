const now = () => new Date().toISOString();

const shortAnswerRubrics = {
  "approved-pre-4": [
    { point: "判断 0℃ 不表示“没有温度”", points: 2 },
    { point: "说明 0℃ 是摄氏温标的基准", points: 2 },
  ],
  "approved-post-3": [
    { point: "举出一组具有相反意义的量", points: 2 },
    { point: "正、负号与约定的正方向一致", points: 2 },
  ],
  "approved-post-7": [
    { point: "说明库存没有增加也没有减少，即变化量为 0", points: 4 },
  ],
  "approved-post-11": [
    { point: "正确解释 +8 和 -3 的方向与距离", points: 2 },
    { point: "正确解释 +4 的方向与距离", points: 2 },
  ],
  "approved-post-12": [
    { point: "正确计算 +1 和 -0.5 对应的实际质量", points: 2 },
    { point: "正确说明变化量 0 对应 50kg", points: 2 },
  ],
  "approved-review-1": [
    { point: "正确写出 +3 和 -2", points: 2 },
    { point: "说明 0 表示正好等于基准", points: 2 },
  ],
  "approved-review-2": [
    { point: "正确解释 +2℃、-5℃ 和 0℃ 的意义", points: 3 },
    { point: "指出前两项是相反方向的变化", points: 1 },
  ],
};

/**
 *
 * @param id
 * @param purpose
 * @param kpId
 * @param type
 * @param difficulty
 * @param stem
 * @param answer
 * @param options
 */
function question(
  id,
  purpose,
  kpId,
  type,
  difficulty,
  stem,
  answer,
  options = [],
) {
  return {
    id,
    purpose,
    phase: purpose === "post" ? "knowledge" : "diagnostic",
    type,
    difficulty,
    stem,
    options: options.map((option) => ({
      ...option,
      id: option.id || option.key,
    })),
    answer,
    acceptableAnswers: [],
    analysis: "先明确题目中的基准和正方向，再判断符号与大小。",
    maxScore: type === "short_answer" ? 4 : 2,
    rubric: shortAnswerRubrics[id] || [],
    knowledgePointIds: [kpId],
    knowledgePointWeights: { [kpId]: 1 },
  };
}

/**
 *
 */
function seedQuestions() {
  const k1 = "kp-positive-negative";
  const k2 = "kp-zero";
  const k3 = "kp-signed-quantity";
  const pre = [
    question(
      "approved-pre-1",
      "pre",
      k1,
      "single_choice",
      1,
      "若向东走 3 米记作 +3 米，向西走 2 米应记作（ ）。",
      "B",
      [
        { key: "A", text: "+2 米" },
        { key: "B", text: "-2 米" },
        { key: "C", text: "2 米" },
      ],
    ),
    question(
      "approved-pre-2",
      "pre",
      k1,
      "fill_blank",
      2,
      "收入 20 元记作 +20 元，那么支出 8 元记作____元。",
      "-8",
    ),
    question(
      "approved-pre-3",
      "pre",
      k2,
      "single_choice",
      1,
      "关于 0，下列说法正确的是（ ）。",
      "C",
      [
        { key: "A", text: "0 是正数" },
        { key: "B", text: "0 是负数" },
        { key: "C", text: "0 既不是正数也不是负数" },
      ],
    ),
    question(
      "approved-pre-4",
      "pre",
      k2,
      "short_answer",
      2,
      "气温为 0℃ 是否表示“没有温度”？请简要说明。",
      "不是，0℃ 是摄氏温标中的一个基准。",
    ),
    question(
      "approved-pre-5",
      "pre",
      k3,
      "fill_blank",
      2,
      "以海平面为基准，高于海平面 15 米记作 +15 米，低于海平面 6 米记作____米。",
      "-6",
    ),
    question(
      "approved-pre-6",
      "pre",
      k3,
      "single_choice",
      3,
      "以 50kg 为标准，48.5kg 可记作（ ）。",
      "A",
      [
        { key: "A", text: "-1.5kg" },
        { key: "B", text: "+1.5kg" },
        { key: "C", text: "48.5kg" },
      ],
    ),
  ];
  const post = [
    question(
      "approved-post-1",
      "post",
      k1,
      "single_choice",
      1,
      "向北为正，向南走 4 米记作（ ）。",
      "B",
      [
        { key: "A", text: "+4 米" },
        { key: "B", text: "-4 米" },
      ],
    ),
    question(
      "approved-post-2",
      "post",
      k1,
      "fill_blank",
      2,
      "上升 7 米记作 +7 米，下降 3 米记作____米。",
      "-3",
    ),
    question(
      "approved-post-3",
      "post",
      k1,
      "short_answer",
      2,
      "举出一组生活中具有相反意义的量，并分别用正负数表示。",
      "答案合理即可。",
    ),
    question(
      "approved-post-4",
      "post",
      k1,
      "single_choice",
      3,
      "下列成对的量中，不具有相反意义的是（ ）。",
      "C",
      [
        { key: "A", text: "盈利与亏损" },
        { key: "B", text: "向东与向西" },
        { key: "C", text: "增加 2 与增加 3" },
      ],
    ),
    question(
      "approved-post-5",
      "post",
      k2,
      "single_choice",
      1,
      "0 属于（ ）。",
      "C",
      [
        { key: "A", text: "正数" },
        { key: "B", text: "负数" },
        { key: "C", text: "既不是正数也不是负数" },
      ],
    ),
    question(
      "approved-post-6",
      "post",
      k2,
      "fill_blank",
      2,
      "数轴上原点表示的数是____。",
      "0",
    ),
    question(
      "approved-post-7",
      "post",
      k2,
      "short_answer",
      2,
      "某仓库记录“库存变化为 0”，这里的 0 表示什么？",
      "库存没有增加也没有减少。",
    ),
    question(
      "approved-post-8",
      "post",
      k2,
      "single_choice",
      3,
      "下列情境中的 0 表示基准的是（ ）。",
      "A",
      [
        { key: "A", text: "海拔 0 米" },
        { key: "B", text: "篮子里有 0 个苹果" },
        { key: "C", text: "比赛得 0 分" },
      ],
    ),
    question(
      "approved-post-9",
      "post",
      k3,
      "fill_blank",
      1,
      "以平均分为基准，低 5 分记作____分。",
      "-5",
    ),
    question(
      "approved-post-10",
      "post",
      k3,
      "single_choice",
      2,
      "以 100 元为基准，余额 112 元可记作（ ）。",
      "A",
      [
        { key: "A", text: "+12 元" },
        { key: "B", text: "-12 元" },
        { key: "C", text: "+112 元" },
      ],
    ),
    question(
      "approved-post-11",
      "post",
      k3,
      "short_answer",
      2,
      "某检修车从 A 地出发，向东为正，记录为 +8、-3、+4。说明每个数的实际意义。",
      "依次表示向东 8 千米、向西 3 千米、向东 4 千米。",
    ),
    question(
      "approved-post-12",
      "post",
      k3,
      "short_answer",
      3,
      "以标准质量 50kg 为基准，三袋大米记为 +1、-0.5、0kg，请写出实际质量。",
      "51kg、49.5kg、50kg。",
    ),
  ];
  const review = [
    {
      ...question(
        "approved-review-1",
        "post",
        k1,
        "short_answer",
        2,
        "请用正负数同时表示“比基准高 3”和“比基准低 2”，并说明 0 的意义。",
        "+3、-2；0 表示正好等于基准。",
      ),
      phase: "review",
      knowledgePointIds: [k1, k2, k3],
      knowledgePointWeights: { [k1]: 0.35, [k2]: 0.3, [k3]: 0.35 },
    },
    {
      ...question(
        "approved-review-2",
        "post",
        k3,
        "short_answer",
        3,
        "某天温度变化依次为 +2℃、-5℃、0℃。解释三个数的意义，并说明哪些是相反方向的变化。",
        "升高 2℃、降低 5℃、不变；前两项是相反方向的变化。",
      ),
      phase: "review",
      knowledgePointIds: [k1, k2, k3],
      knowledgePointWeights: { [k1]: 0.35, [k2]: 0.3, [k3]: 0.35 },
    },
  ];
  return { pre, post: [...post, ...review] };
}

/**
 *
 */
function seedAssessmentMatrices() {
  const kp1 = "kp-positive-negative";
  const kp2 = "kp-zero";
  const kp3 = "kp-signed-quantity";

  return {
    [kp1]: {
      knowledgePointId: kp1,
      targetStatement:
        "理解正数和负数的概念，能正确辨析正号与负号在生活中的实际含义。",
      rationale:
        "正数和负数是数域扩展到有理数的基础，需建构符号与方向的直观对应关系。",
      cells: [
        {
          matrixCellId: `${kp1}:CR:A`,
          domain: "CR",
          targetLevel: "A",
          role: "CORE",
          observableBehavior: "能准确识别给出的有理数是正数、负数还是零。",
          evidenceCriteria: ["准确区分正数与负数", "正确书写正负号"],
          commonMisconceptions: ["误认为带“+”号的才是正数"],
          recommendedQuestionTypes: ["single_choice"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp1}:PJ:B`,
          domain: "PJ",
          targetLevel: "B",
          role: "CORE",
          observableBehavior:
            "能结合方向、收支等情境，用正负数表示具有相反意义的量。",
          evidenceCriteria: [
            "确立参照基准与正方向",
            "用“+”、“-”表示量的大小与方向",
          ],
          commonMisconceptions: ["漏写负号或未明确正方向"],
          recommendedQuestionTypes: ["fill_blank"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp1}:M:C`,
          domain: "M",
          targetLevel: "C",
          role: "SUPPORT",
          observableBehavior: "能将生活情境中的增减变化归纳建构为正负数模型。",
          evidenceCriteria: ["构建生活情境与正负数模型的对应"],
          commonMisconceptions: ["情境抽象时混淆增减量与实际总量"],
          recommendedQuestionTypes: ["short_answer"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp1}:SF:D`,
          domain: "SF",
          targetLevel: "D",
          role: "EXTENSION",
          observableBehavior:
            "能向他人清楚阐释正负号在具体现实问题中的抽象数学意义。",
          evidenceCriteria: ["表达逻辑严密，说理清楚"],
          commonMisconceptions: ["表述缺乏针对性，混淆方向与绝对数量"],
          recommendedQuestionTypes: ["short_answer"],
          minimumIndependentEvidence: 1,
        },
      ],
    },
    [kp2]: {
      knowledgePointId: kp2,
      targetStatement:
        "理解 0 的双重含义（基准与无），能在数轴和生活情境中准确运用 0。",
      rationale: "0 不仅表示没有，更是正负数的分界点与衡量基准。",
      cells: [
        {
          matrixCellId: `${kp2}:CR:A`,
          domain: "CR",
          targetLevel: "A",
          role: "CORE",
          observableBehavior: "明确 0 既不是正数也不是负数，是正负数的分界。",
          evidenceCriteria: ["正确判定 0 的归属", "理解 0 作为原点的几何意义"],
          commonMisconceptions: ["将 0 误归为正数或自然数中的正有理数"],
          recommendedQuestionTypes: ["single_choice"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp2}:SF:B`,
          domain: "SF",
          targetLevel: "B",
          role: "CORE",
          observableBehavior:
            "能举例说明 0 在不同情境中（如 0℃、海拔 0 米）作为参照基准的含义。",
          evidenceCriteria: ["区分“没有”与“作为标准/基准的 0”"],
          commonMisconceptions: ["认为 0 仅代表“什么都没有”"],
          recommendedQuestionTypes: ["short_answer"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp2}:M:C`,
          domain: "M",
          targetLevel: "C",
          role: "SUPPORT",
          observableBehavior:
            "能在变式数据分析中独立选定合适的 0 基准简化计算。",
          evidenceCriteria: ["灵活设定临时基准 0", "计算偏差并恢复真实值"],
          commonMisconceptions: ["改变基准后未调整计算规则"],
          recommendedQuestionTypes: ["fill_blank"],
          minimumIndependentEvidence: 1,
        },
      ],
    },
    [kp3]: {
      knowledgePointId: kp3,
      targetStatement:
        "掌握正负号与基准组合表示实际物理量的方法，解决复杂生活实际问题。",
      rationale: "综合运用正负数解决质量偏差、气温起伏、路线移动等现实问题。",
      cells: [
        {
          matrixCellId: `${kp3}:CR:A`,
          domain: "CR",
          targetLevel: "A",
          role: "CORE",
          observableBehavior:
            "能根据题目给出的基准值，写出指定数值对应的实际量。",
          evidenceCriteria: ["正确计算实际数值", "规范书写单位与符号"],
          commonMisconceptions: ["忘记加上基准初始值"],
          recommendedQuestionTypes: ["fill_blank"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp3}:M:C`,
          domain: "M",
          targetLevel: "C",
          role: "CORE",
          observableBehavior:
            "能建立“实际量 = 基准量 + 增减变化量”的模型并求解未知量。",
          evidenceCriteria: [
            "准确建立算术方程或代数结构",
            "解出正确的实际结果",
          ],
          commonMisconceptions: ["正负号带入代数运算时符号出错"],
          recommendedQuestionTypes: ["single_choice"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp3}:PJ:D`,
          domain: "PJ",
          targetLevel: "D",
          role: "EXTENSION",
          observableBehavior:
            "能针对连续移动或多步收支记录，推理算出一阶段后的最终位置与总路程。",
          evidenceCriteria: ["清晰列出移动步骤", "区分最终位置与累积路程"],
          commonMisconceptions: ["混淆位移与绝对路程"],
          recommendedQuestionTypes: ["short_answer"],
          minimumIndependentEvidence: 1,
        },
      ],
    },
    composite: {
      knowledgePointId: "composite",
      targetStatement:
        "整课综合能力评估：迁移建构正负数、基准与相反意义量的统一概念系统。",
      rationale: "跨知识点融合综合测评。",
      cells: [
        {
          matrixCellId: "composite:CR:B",
          domain: "CR",
          targetLevel: "B",
          role: "CORE",
          observableBehavior: "综合分析有理数的分类与基准 0 的关系。",
          evidenceCriteria: ["系统理解分类逻辑"],
          commonMisconceptions: ["分类遗漏 0"],
          recommendedQuestionTypes: ["short_answer"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: "composite:PJ:C",
          domain: "PJ",
          targetLevel: "C",
          role: "CORE",
          observableBehavior: "综合多步实际量变化进行连续推理计算。",
          evidenceCriteria: ["步骤清晰，符号准确"],
          commonMisconceptions: ["累积计算中符号反向错误"],
          recommendedQuestionTypes: ["short_answer"],
          minimumIndependentEvidence: 1,
        },
      ],
    },
  };
}

/**
 *
 * 默认内容使用显式插槽 fixture，避免在读取矩阵时隐式规划题型和难度。
 */
function seedAssessmentQuestionSlots() {
  const slot = (
    knowledgePointId,
    sequence,
    matrixCellId,
    difficulty,
    questionType,
    taskCategory,
    assessmentFocus,
  ) => ({
    id: `${knowledgePointId}:practice:${sequence}`,
    knowledgePointId,
    matrixCellId,
    difficulty,
    adaptiveRole: ["D1", "D2"].includes(difficulty) ? "remediation" : "standard",
    questionType,
    taskCategory,
    assessmentFocus,
    contextTheme: "正负数、基准与方向的数学情境",
  });
  return {
    "kp-positive-negative": [
      slot("kp-positive-negative", 1, "kp-positive-negative:CR:A", "D1", "single_choice", "concept_or_calculation", "辨认正数、负数与零并识别符号误区"),
      slot("kp-positive-negative", 2, "kp-positive-negative:PJ:B", "D2", "fill_blank", "application", "根据统一基准和方向用正负数表示实际量"),
      slot("kp-positive-negative", 3, "kp-positive-negative:M:C", "D3", "short_answer", "application", "从增减情境中建立正负数模型并排除无关信息"),
      slot("kp-positive-negative", 4, "kp-positive-negative:SF:D", "D4", "short_answer", "application", "解释正负号的现实含义并区分方向与绝对数量"),
    ],
    "kp-zero": [
      slot("kp-zero", 1, "kp-zero:CR:A", "D1", "single_choice", "concept_or_calculation", "判断零的数集归属并识别零作为分界点的意义"),
      slot("kp-zero", 2, "kp-zero:SF:B", "D2", "short_answer", "application", "比较零表示没有与零作为参照基准的不同含义"),
      slot("kp-zero", 3, "kp-zero:M:C", "D3", "fill_blank", "application", "选择临时零基准计算偏差并恢复真实数值"),
    ],
    "kp-signed-quantity": [
      slot("kp-signed-quantity", 1, "kp-signed-quantity:CR:A", "D1", "fill_blank", "calculation", "由基准值和变化量计算实际量并规范书写单位"),
      slot("kp-signed-quantity", 2, "kp-signed-quantity:M:C", "D3", "single_choice", "application", "建立实际量等于基准量加变化量的数量关系"),
      slot("kp-signed-quantity", 3, "kp-signed-quantity:PJ:D", "D4", "short_answer", "application", "连续推理多步变化并区分最终位置与累计路程"),
    ],
    composite: [
      slot("composite", 1, "composite:CR:B", "D2", "short_answer", "concept_or_calculation", "综合分析有理数分类与基准零之间的关系"),
      slot("composite", 2, "composite:PJ:C", "D3", "short_answer", "application", "综合多步实际量变化完成连续推理计算"),
    ],
  };
}

/**
 *
 */
export function createDefaultContent() {
  const questions = seedQuestions();
  const matrices = seedAssessmentMatrices();
  const slots = seedAssessmentQuestionSlots();
  return {
    "section-1-1": {
      lessonId: "section-1-1",
      version: 1,
      status: "published",
      updatedAt: now(),
      publishedAt: now(),
      teacherRequirement:
        "联系温度、海拔和收支情境，先判断基准与方向，再使用正负号。",
      learningUnits: [
        {
          id: "unit-1",
          title: "相反意义的量",
          format: "讲解 + 例题",
          summary: "从方向、增减和收支三个情境认识正负数。",
          confirmed: true,
        },
        {
          id: "unit-2",
          title: "0 与基准",
          format: "白板互动",
          summary: "区分“没有”和“作为基准”的 0。",
          confirmed: true,
        },
        {
          id: "unit-3",
          title: "实际量的表示",
          format: "互动练习",
          summary: "先确定基准和正方向，再写符号与大小。",
          confirmed: true,
        },
      ],
      reviewNotes: [
        "“0 的意义”已包含概念辨析与反例训练",
        "综合练习全面覆盖生活场景",
      ],
      preQuestions: questions.pre,
      postQuestions: questions.post,
      assessmentMatrices: matrices,
      assessmentQuestionSlots: slots,
    },
  };
}

/**
 *
 * @param content
 */
export function normalizeLessonContent(content) {
  return Object.fromEntries(
    Object.entries(content).map(([id, item]) => [
      id,
      {
        ...item,
        preQuestions: (item.preQuestions || []).map((questionItem) => ({
          ...questionItem,
          options: (questionItem.options || []).map((option) => ({
            ...option,
            id: option.id || option.key,
          })),
        })),
        postQuestions: (item.postQuestions || []).map((questionItem) => ({
          ...questionItem,
          options: (questionItem.options || []).map((option) => ({
            ...option,
            id: option.id || option.key,
          })),
        })),
      },
    ]),
  );
}
