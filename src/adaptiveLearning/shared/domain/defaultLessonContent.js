import { findLessonById, course } from "./courseCatalog.js";

const now = () => new Date().toISOString();

const shortAnswerRubrics = {
  "approved-pre-4": [
    { point: "判断 0℃ 不表示“没有温度”", points: 2 },
    { point: "说明 0℃ 是摄氏温标中的基准与分界点", points: 2 },
  ],
  "approved-post-3": [
    { point: "举出一组生活中具有相反意义的量", points: 2 },
    { point: "正、负号与约定的正方向保持一致", points: 2 },
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
    { point: "正确说明变化量 0 对应基准 50kg", points: 2 },
  ],
  "approved-review-1": [
    { point: "正确写出 +3 和 -2 的表示", points: 2 },
    { point: "说明 0 表示正好等于基准值", points: 2 },
  ],
  "approved-review-2": [
    { point: "正确解释 +2℃、-5℃ 和 0℃ 的现实意义", points: 3 },
    { point: "指出前两项是相反方向的变化", points: 1 },
  ],
  "rubric-generic-explanation": [
    { point: "概念或结论表述准确", points: 2 },
    { point: "推导或理由说明充分清晰", points: 2 },
  ],
};

/**
 * 构造题目基础对象
 */
function createQuestion({
  id,
  purpose = "pre",
  kpId,
  type = "single_choice",
  difficulty = 1,
  stem,
  answer,
  options = [],
  analysis = "先明确题目中的基准和正方向，再判断符号与数值关系。",
  rubric = [],
  diagnosticRole = "STANDARD_PROBE",
}) {
  const normPurpose = purpose.toLowerCase();
  const phase = normPurpose === "post" ? "knowledge" : normPurpose === "review" ? "review" : "diagnostic";
  return {
    id,
    purpose: normPurpose === "pre" ? "PRE" : normPurpose === "review" ? "POST" : "PRACTICE",
    phase,
    type,
    difficulty,
    diagnosticRole,
    stem,
    options: options.map((option) => ({
      ...option,
      id: option.id || option.key,
      key: option.key || option.id,
    })),
    answer,
    acceptableAnswers: Array.isArray(answer) ? answer : [String(answer)],
    analysis,
    maxScore: type === "short_answer" ? 4 : 2,
    rubric: rubric.length > 0 ? rubric : (shortAnswerRubrics[id] || (type === "short_answer" ? shortAnswerRubrics["rubric-generic-explanation"] : [])),
    knowledgePointIds: [kpId],
    primaryKnowledgePointId: kpId,
    knowledgeObjectiveIds: [kpId],
    knowledgePointWeights: { [kpId]: 1 },
  };
}

/**
 * 课时 1.1 从自然数到有理数 题目数据
 */
function seedSection1_1Questions() {
  const k1 = "kp-positive-negative";
  const k2 = "kp-zero";
  const k3 = "kp-signed-quantity";

  const pre = [
    createQuestion({
      id: "sec11-pre-1",
      purpose: "pre",
      kpId: k1,
      type: "single_choice",
      difficulty: 1,
      diagnosticRole: "STANDARD_PROBE",
      stem: "若向东走 3 米记作 +3 米，则向西走 2 米应记作（ ）。",
      answer: "B",
      options: [
        { key: "A", text: "+2 米" },
        { key: "B", text: "-2 米" },
        { key: "C", text: "2 米" },
        { key: "D", text: "-3 米" },
      ],
      analysis: "向东和向西是具有相反意义的量，向东为正，向西则记为负，因此向西走 2 米记作 -2 米。",
    }),
    createQuestion({
      id: "sec11-pre-2",
      purpose: "pre",
      kpId: k1,
      type: "fill_blank",
      difficulty: 2,
      diagnosticRole: "STANDARD_CONFIRMATION",
      stem: "如果收入 20 元记作 +20 元，那么支出 8 元记作____元。",
      answer: "-8",
      analysis: "收入与支出是相反意义的量，收入记作正数，支出记作负数，故支出 8 元记作 -8 元。",
    }),
    createQuestion({
      id: "sec11-pre-3",
      purpose: "pre",
      kpId: k2,
      type: "single_choice",
      difficulty: 1,
      diagnosticRole: "STANDARD_PROBE",
      stem: "关于数 0，下列说法中正确的是（ ）。",
      answer: "C",
      options: [
        { key: "A", text: "0 是正数" },
        { key: "B", text: "0 是负数" },
        { key: "C", text: "0 既不是正数也不是负数" },
        { key: "D", text: "0 既是正数也是负数" },
      ],
      analysis: "0 是正数和负数的分界点，它既不是正数也不是负数，是自然数也是有理数。",
    }),
    createQuestion({
      id: "sec11-pre-4",
      purpose: "pre",
      kpId: k2,
      type: "short_answer",
      difficulty: 2,
      diagnosticRole: "STANDARD_CONFIRMATION",
      stem: "气温为 0℃ 是否表示“没有温度”？请结合生活实际简要说明理由。",
      answer: "不是，0℃ 是摄氏温标中的一个特定基准点（冰水混合物的温度），并不代表没有温度。",
      rubric: shortAnswerRubrics["approved-pre-4"],
      analysis: "在摄氏温标中，0℃ 规定为冰水混合物的温度，它是一个具体的物理量和基准点，并不是“没有”。",
    }),
    createQuestion({
      id: "sec11-pre-5",
      purpose: "pre",
      kpId: k3,
      type: "fill_blank",
      difficulty: 2,
      diagnosticRole: "STANDARD_PROBE",
      stem: "以海平面为基准，高于海平面 15 米记作 +15 米，低于海平面 6 米记作____米。",
      answer: "-6",
      analysis: "海平面以上为正，海平面以下为负，低于海平面 6 米记为 -6 米。",
    }),
    createQuestion({
      id: "sec11-pre-6",
      purpose: "pre",
      kpId: k3,
      type: "single_choice",
      difficulty: 3,
      diagnosticRole: "STANDARD_CONFIRMATION",
      stem: "质检员以 50 kg 为标准质量，某袋大米重 48.5 kg，用正负数表示应记作（ ）。",
      answer: "A",
      options: [
        { key: "A", text: "-1.5 kg" },
        { key: "B", text: "+1.5 kg" },
        { key: "C", text: "+48.5 kg" },
        { key: "D", text: "-48.5 kg" },
      ],
      analysis: "实际质量 48.5 kg 比标准质量 50 kg 少 1.5 kg，少记为负，所以应记作 -1.5 kg。",
    }),
  ];

  const practicePools = {
    [k1]: [
      createQuestion({
        id: "sec11-prac-k1-1",
        purpose: "post",
        kpId: k1,
        type: "single_choice",
        difficulty: 1,
        stem: "下列各数中，属于负数的是（ ）。",
        answer: "B",
        options: [
          { key: "A", text: "3.5" },
          { key: "B", text: "-7" },
          { key: "C", text: "0" },
          { key: "D", text: "+12" },
        ],
        analysis: "前面带有负号“-”且不为0的数为负数，故 -7 是负数。",
      }),
      createQuestion({
        id: "sec11-prac-k1-2",
        purpose: "post",
        kpId: k1,
        type: "fill_blank",
        difficulty: 2,
        stem: "如果向前走 5 步记作 +5 步，那么后退 3 步记作____步。",
        answer: "-3",
        analysis: "前进为正，后退为负，后退 3 步记作 -3 步。",
      }),
      createQuestion({
        id: "sec11-prac-k1-3",
        purpose: "post",
        kpId: k1,
        type: "single_choice",
        difficulty: 3,
        stem: "下列各组量中，具有相反意义的量是（ ）。",
        answer: "B",
        options: [
          { key: "A", text: "节约水 2 吨与浪费电 20 度" },
          { key: "B", text: "运进粮食 5 吨与运出粮食 3 吨" },
          { key: "C", text: "向东走 10 米与向南走 10 米" },
          { key: "D", text: "身高增加 2 厘米与体重减少 2 千克" },
        ],
        analysis: "相反意义的量必须是在同一种属性下意义相反的量，运进粮食与运出粮食符合要求。",
      }),
      createQuestion({
        id: "sec11-prac-k1-4",
        purpose: "post",
        kpId: k1,
        type: "short_answer",
        difficulty: 3,
        stem: "请举出一组生活中具有相反意义的量的例子，并分别用正数和负数表示出来。",
        answer: "例如：规定盈利为正，亏损为负，则盈利 500 元记作 +500 元，亏损 200 元记作 -200 元。",
        rubric: shortAnswerRubrics["approved-post-3"],
        analysis: "只要写出一对同类属性且意义相反的量，并正确赋予正负号即可得分。",
      }),
    ],
    [k2]: [
      createQuestion({
        id: "sec11-prac-k2-1",
        purpose: "post",
        kpId: k2,
        type: "single_choice",
        difficulty: 1,
        stem: "在数 0, -3, +5, -1/2 中，既不是正数也不是负数的是（ ）。",
        answer: "A",
        options: [
          { key: "A", text: "0" },
          { key: "B", text: "-3" },
          { key: "C", text: "+5" },
          { key: "D", text: "-1/2" },
        ],
        analysis: "0 是正数和负数的分界线，既不是正数也不是负数。",
      }),
      createQuestion({
        id: "sec11-prac-k2-2",
        purpose: "post",
        kpId: k2,
        type: "fill_blank",
        difficulty: 2,
        stem: "某仓库货物没有增加也没有减少，用正负数表示该仓库货物的变化量为____件。",
        answer: "0",
        analysis: "没有增加也没有减少代表变化量为 0。",
      }),
      createQuestion({
        id: "sec11-prac-k2-3",
        purpose: "post",
        kpId: k2,
        type: "short_answer",
        difficulty: 2,
        stem: "在日常生活中，‘0’除了表示‘没有’之外，还可以表示什么？请举例说明。",
        answer: "‘0’还可以表示基准点或分界线，例如温度计上的 0℃、海平面的海拔高度 0 米、时间起点的 0 时等。",
        rubric: shortAnswerRubrics["rubric-generic-explanation"],
        analysis: "阐明 0 作为基准和分界点的意义并给出具体实例。",
      }),
    ],
    [k3]: [
      createQuestion({
        id: "sec11-prac-k3-1",
        purpose: "post",
        kpId: k3,
        type: "fill_blank",
        difficulty: 2,
        stem: "如果把平均成绩 80 分记为 0 分，那么 85 分记作 +5 分，74 分应记作____分。",
        answer: "-6",
        analysis: "74 分比基准分 80 分低 6 分，低记为负，所以记作 -6 分。",
      }),
      createQuestion({
        id: "sec11-prac-k3-2",
        purpose: "post",
        kpId: k3,
        type: "single_choice",
        difficulty: 3,
        stem: "某地某天早晨的气温是 -2℃，中午上升了 6℃，则中午的气温是（ ）。",
        answer: "C",
        options: [
          { key: "A", text: "-8℃" },
          { key: "B", text: "-4℃" },
          { key: "C", text: "+4℃" },
          { key: "D", text: "+8℃" },
        ],
        analysis: "-2 + 6 = 4℃，故中午气温为 +4℃。",
      }),
      createQuestion({
        id: "sec11-prac-k3-3",
        purpose: "post",
        kpId: k3,
        type: "short_answer",
        difficulty: 4,
        stem: "一辆出租车在一条东西走向的公路上行驶，向东记为正，向西记为负。行驶记录为（单位：千米）：+8, -3, +4, -5。请问该出租车最后停在出发点的哪个方向，距离出发点多少千米？",
        answer: "计算位置变化：(+8) + (-3) + (+4) + (-5) = +4 千米。因此，出租车停在出发点东面，距离出发点 4 千米处。",
        rubric: shortAnswerRubrics["approved-post-11"],
        analysis: "将多步有向位移进行代数和计算，符号决定方向，绝对值决定距离。",
      }),
    ],
  };

  const review = [
    createQuestion({
      id: "sec11-rev-1",
      purpose: "review",
      kpId: k1,
      type: "single_choice",
      difficulty: 2,
      stem: "下列有理数：-3, +2.5, 0, -1/3, 7 中，负数共有（ ）个。",
      answer: "B",
      options: [
        { key: "A", text: "1" },
        { key: "B", text: "2" },
        { key: "C", text: "3" },
        { key: "D", text: "4" },
      ],
      analysis: "负数有 -3 和 -1/3，共 2 个（0 不是负数）。",
    }),
    createQuestion({
      id: "sec11-rev-2",
      purpose: "review",
      kpId: k3,
      type: "short_answer",
      difficulty: 3,
      stem: "某食品包装袋上标有“净含量 500g ± 5g”字样。请说明“+5g”和“-5g”的含义，并写出该食品合格的净含量范围。",
      answer: "“+5g”表示比标准净含量 500g 最多超出 5g（即 505g），“-5g”表示最多低于标准 5g（即 495g）。合格的净含量范围是 495g ~ 505g。",
      rubric: shortAnswerRubrics["rubric-generic-explanation"],
      analysis: "正负号表示围绕标准值的允许误差范围。",
    }),
  ];

  return { pre, practicePools, review };
}

/**
 * 课时 1.2 数轴 题目数据
 */
function seedSection1_2Questions() {
  const k1 = "kp-number-line-concept";
  const k2 = "kp-number-line-origin";
  const k3 = "kp-number-line-point";
  const k4 = "kp-number-line-read";
  const k5 = "kp-number-line-position";

  const pre = [
    createQuestion({
      id: "sec12-pre-1",
      purpose: "pre",
      kpId: k1,
      type: "single_choice",
      difficulty: 1,
      diagnosticRole: "STANDARD_PROBE",
      stem: "规定了（ ）、正方向和单位长度的直线叫做数轴。",
      answer: "A",
      options: [
        { key: "A", text: "原点" },
        { key: "B", text: "基准" },
        { key: "C", text: "零点" },
        { key: "D", text: "端点" },
      ],
      analysis: "数轴的三要素是：原点、正方向和单位长度。",
    }),
    createQuestion({
      id: "sec12-pre-2",
      purpose: "pre",
      kpId: k2,
      type: "fill_blank",
      difficulty: 2,
      diagnosticRole: "STANDARD_CONFIRMATION",
      stem: "数轴上表示数 0 的点称为____。",
      answer: "原点",
      analysis: "原点是数轴的基准，表示数 0。",
    }),
    createQuestion({
      id: "sec12-pre-3",
      purpose: "pre",
      kpId: k3,
      type: "single_choice",
      difficulty: 2,
      diagnosticRole: "STANDARD_PROBE",
      stem: "在数轴上，表示数 -3 的点在原点的（ ）。",
      answer: "B",
      options: [
        { key: "A", text: "右侧 3 个单位长度处" },
        { key: "B", text: "左侧 3 个单位长度处" },
        { key: "C", text: "原点位置" },
        { key: "D", text: "上方 3 个单位长度处" },
      ],
      analysis: "通常规定向右为正方向，负数在原点左侧，因此 -3 在原点左侧 3 个单位长度处。",
    }),
    createQuestion({
      id: "sec12-pre-4",
      purpose: "pre",
      kpId: k4,
      type: "fill_blank",
      difficulty: 2,
      diagnosticRole: "STANDARD_CONFIRMATION",
      stem: "数轴上点 A 位于原点右边 4 个单位长度处，则点 A 表示的数是____。",
      answer: "4",
      analysis: "原点右边表示正数，4 个单位长度即为 +4 或 4。",
    }),
    createQuestion({
      id: "sec12-pre-5",
      purpose: "pre",
      kpId: k5,
      type: "single_choice",
      difficulty: 3,
      diagnosticRole: "STANDARD_PROBE",
      stem: "数轴上点 P 从表示 -2 的点出发，向右移动 5 个单位长度后，所到达的点表示的数是（ ）。",
      answer: "C",
      options: [
        { key: "A", text: "-7" },
        { key: "B", text: "7" },
        { key: "C", text: "3" },
        { key: "D", text: "-3" },
      ],
      analysis: "-2 向右移动 5 个单位，即 -2 + 5 = 3。",
    }),
    createQuestion({
      id: "sec12-pre-6",
      purpose: "pre",
      kpId: k5,
      type: "short_answer",
      difficulty: 3,
      diagnosticRole: "STANDARD_CONFIRMATION",
      stem: "数轴上到原点的距离等于 4 的点表示的数是多少？请说明理由。",
      answer: "+4 和 -4。因为在数轴上，原点右侧距离为 4 的点表示 +4，原点左侧距离为 4 的点表示 -4。",
      rubric: shortAnswerRubrics["rubric-generic-explanation"],
      analysis: "距离原点 4 个单位的点有两个，分别在原点的左右两侧。",
    }),
  ];

  const practicePools = {
    [k1]: [
      createQuestion({
        id: "sec12-prac-k1-1",
        purpose: "post",
        kpId: k1,
        type: "single_choice",
        difficulty: 1,
        stem: "下列关于数轴的画法中，必须具备的三要素是（ ）。",
        answer: "D",
        options: [
          { key: "A", text: "原点、箭头、刻度" },
          { key: "B", text: "直线、射线、线段" },
          { key: "C", text: "正数、负数、零" },
          { key: "D", text: "原点、正方向、单位长度" },
        ],
        analysis: "数轴三要素缺一不可：原点、正方向、单位长度。",
      }),
    ],
    [k2]: [
      createQuestion({
        id: "sec12-prac-k2-1",
        purpose: "post",
        kpId: k2,
        type: "fill_blank",
        difficulty: 1,
        stem: "原点左边的数都是____数（选填“正”或“负”）。",
        answer: "负",
        analysis: "在通常规定向右为正的数轴上，原点左边的数都是负数。",
      }),
    ],
    [k3]: [
      createQuestion({
        id: "sec12-prac-k3-1",
        purpose: "post",
        kpId: k3,
        type: "single_choice",
        difficulty: 2,
        stem: "在数轴上画出表示 -1.5 的点，应该在（ ）。",
        answer: "B",
        options: [
          { key: "A", text: "0 与 1 之间" },
          { key: "B", text: "-1 与 -2 之间" },
          { key: "C", text: "-2 与 -3 之间" },
          { key: "D", text: "0 与 -1 之间" },
        ],
        analysis: "-1.5 位于 -1 和 -2 的正中点。",
      }),
    ],
    [k4]: [
      createQuestion({
        id: "sec12-prac-k4-1",
        purpose: "post",
        kpId: k4,
        type: "fill_blank",
        difficulty: 2,
        stem: "数轴上表示 -5 的点与表示 +3 的点之间的距离是____个单位长度。",
        answer: "8",
        analysis: "距离为 3 - (-5) = 8。",
      }),
    ],
    [k5]: [
      createQuestion({
        id: "sec12-prac-k5-1",
        purpose: "post",
        kpId: k5,
        type: "single_choice",
        difficulty: 3,
        stem: "若数轴上点 A 表示 -1，点 B 与点 A 相距 3 个单位长度，则点 B 表示的数是（ ）。",
        answer: "D",
        options: [
          { key: "A", text: "2" },
          { key: "B", text: "-4" },
          { key: "C", text: "3" },
          { key: "D", text: "2 或 -4" },
        ],
        analysis: "点 B 可以在点 A 的右边 (-1 + 3 = 2)，也可以在点 A 的左边 (-1 - 3 = -4)。",
      }),
    ],
  };

  const review = [
    createQuestion({
      id: "sec12-rev-1",
      purpose: "review",
      kpId: k3,
      type: "single_choice",
      difficulty: 2,
      stem: "数轴上，原点左侧的点表示的数是（ ）。",
      answer: "B",
      options: [
        { key: "A", text: "正数" },
        { key: "B", text: "负数" },
        { key: "C", text: "非负数" },
        { key: "D", text: "非正数" },
      ],
      analysis: "原点左侧不包括原点，全为负数。",
    }),
  ];

  return { pre, practicePools, review };
}

/**
 * 课时 1.3 绝对值 题目数据
 */
function seedSection1_3Questions() {
  const k1 = "kp-opposite-number";
  const k2 = "kp-opposite-number-find";
  const k3 = "kp-absolute-value";
  const k4 = "kp-absolute-value-find";
  const k5 = "kp-absolute-value-symbol";

  const pre = [
    createQuestion({
      id: "sec13-pre-1",
      purpose: "pre",
      kpId: k1,
      type: "single_choice",
      difficulty: 1,
      diagnosticRole: "STANDARD_PROBE",
      stem: "-5 的相反数是（ ）。",
      answer: "A",
      options: [
        { key: "A", text: "5" },
        { key: "B", text: "-5" },
        { key: "C", text: "1/5" },
        { key: "D", text: "-1/5" },
      ],
      analysis: "只有符号不同的两个数互为相反数，-5 的相反数是 5。",
    }),
    createQuestion({
      id: "sec13-pre-2",
      purpose: "pre",
      kpId: k2,
      type: "fill_blank",
      difficulty: 2,
      diagnosticRole: "STANDARD_CONFIRMATION",
      stem: "数 0 的相反数是____。",
      answer: "0",
      analysis: "0 的相反数依然是 0。",
    }),
    createQuestion({
      id: "sec13-pre-3",
      purpose: "pre",
      kpId: k3,
      type: "single_choice",
      difficulty: 2,
      diagnosticRole: "STANDARD_PROBE",
      stem: "在数轴上，一个数所对应的点到原点的距离叫做这个数的（ ）。",
      answer: "B",
      options: [
        { key: "A", text: "相反数" },
        { key: "B", text: "绝对值" },
        { key: "C", text: "倒数" },
        { key: "D", text: "有效数字" },
      ],
      analysis: "绝对值的几何意义是数轴上表示该数的点到原点的距离。",
    }),
    createQuestion({
      id: "sec13-pre-4",
      purpose: "pre",
      kpId: k4,
      type: "fill_blank",
      difficulty: 2,
      diagnosticRole: "STANDARD_CONFIRMATION",
      stem: "|-7| = ____。",
      answer: "7",
      analysis: "负数的绝对值是它的相反数，|-7| = 7。",
    }),
    createQuestion({
      id: "sec13-pre-5",
      purpose: "pre",
      kpId: k5,
      type: "single_choice",
      difficulty: 3,
      diagnosticRole: "STANDARD_PROBE",
      stem: "化简 -(-4) 的结果是（ ）。",
      answer: "B",
      options: [
        { key: "A", text: "-4" },
        { key: "B", text: "4" },
        { key: "C", text: "±4" },
        { key: "D", text: "0" },
      ],
      analysis: "-(-4) 表示 -4 的相反数，结果为 4。",
    }),
    createQuestion({
      id: "sec13-pre-6",
      purpose: "pre",
      kpId: k5,
      type: "short_answer",
      difficulty: 3,
      diagnosticRole: "STANDARD_CONFIRMATION",
      stem: "如果 |a| = 6，那么 a 的值是多少？请写出理由。",
      answer: "a = 6 或 a = -6。因为绝对值为 6 的数表示在数轴上与原点距离为 6 的点，有正 6 和负 6 两个值。",
      rubric: shortAnswerRubrics["rubric-generic-explanation"],
      analysis: "互为相反数的两个数的绝对值相等，绝对值为正数的数有两个解。",
    }),
  ];

  const practicePools = {
    [k1]: [
      createQuestion({
        id: "sec13-prac-k1-1",
        purpose: "post",
        kpId: k1,
        type: "single_choice",
        difficulty: 1,
        stem: "下列各组数中，互为相反数的是（ ）。",
        answer: "C",
        options: [
          { key: "A", text: "+2 与 2" },
          { key: "B", text: "-3 与 -1/3" },
          { key: "C", text: "-4 与 +4" },
          { key: "D", text: "0 与 1" },
        ],
        analysis: "-4 与 +4 只有符号不同，互为相反数。",
      }),
    ],
    [k2]: [
      createQuestion({
        id: "sec13-prac-k2-1",
        purpose: "post",
        kpId: k2,
        type: "fill_blank",
        difficulty: 2,
        stem: "若 a 与 3 互为相反数，则 a = ____。",
        answer: "-3",
        analysis: "3 的相反数是 -3。",
      }),
    ],
    [k3]: [
      createQuestion({
        id: "sec13-prac-k3-1",
        purpose: "post",
        kpId: k3,
        type: "single_choice",
        difficulty: 2,
        stem: "任何一个有理数的绝对值一定是（ ）。",
        answer: "C",
        options: [
          { key: "A", text: "正数" },
          { key: "B", text: "负数" },
          { key: "C", text: "非负数" },
          { key: "D", text: "非正数" },
        ],
        analysis: "绝对值表示距离，距离不可能为负，故绝对值总是大于或等于 0（非负数）。",
      }),
    ],
    [k4]: [
      createQuestion({
        id: "sec13-prac-k4-1",
        purpose: "post",
        kpId: k4,
        type: "fill_blank",
        difficulty: 2,
        stem: "计算：|0| + |-3.5| = ____。",
        answer: "3.5",
        analysis: "0 + 3.5 = 3.5。",
      }),
    ],
    [k5]: [
      createQuestion({
        id: "sec13-prac-k5-1",
        purpose: "post",
        kpId: k5,
        type: "single_choice",
        difficulty: 3,
        stem: "化简 -|-5| 的结果是（ ）。",
        answer: "A",
        options: [
          { key: "A", text: "-5" },
          { key: "B", text: "5" },
          { key: "C", text: "±5" },
          { key: "D", text: "0" },
        ],
        analysis: "|-5| = 5，前面有负号，结果为 -5。",
      }),
    ],
  };

  const review = [
    createQuestion({
      id: "sec13-rev-1",
      purpose: "review",
      kpId: k4,
      type: "single_choice",
      difficulty: 2,
      stem: "若 |x| = x，则 x 一定是（ ）。",
      answer: "C",
      options: [
        { key: "A", text: "正数" },
        { key: "B", text: "负数" },
        { key: "C", text: "非负数（正数或 0）" },
        { key: "D", text: "负数或 0" },
      ],
      analysis: "当 x >= 0 时，|x| = x，故 x 是非负数。",
    }),
  ];

  return { pre, practicePools, review };
}

/**
 * 通用课时 Mock 生成器（支持课程目录中任何课时）
 */
function createMockLessonData(lesson) {
  const kps = lesson.knowledgePoints && lesson.knowledgePoints.length > 0
    ? lesson.knowledgePoints
    : [{ id: `${lesson.id}-kp-1`, name: `${lesson.title}基础` }];

  const pre = [];
  const practicePools = {};
  const review = [];

  kps.forEach((kp, kpIndex) => {
    const q1 = createQuestion({
      id: `${lesson.id}-pre-${kpIndex + 1}a`,
      purpose: "pre",
      kpId: kp.id,
      type: "single_choice",
      difficulty: 1,
      diagnosticRole: "STANDARD_PROBE",
      stem: `关于「${kp.name}」，下列说法中正确的是（ ）。`,
      answer: "A",
      options: [
        { key: "A", text: `正确掌握${kp.name}的核心定义与基本性质` },
        { key: "B", text: `${kp.name}在所有情况下都不成立` },
        { key: "C", text: `${kp.name}只适用于正数范围` },
        { key: "D", text: `以上说法都不对` },
      ],
      analysis: `本题考查「${kp.name}」的基础概念与定义。选项 A 表述准确。`,
    });

    const q2 = createQuestion({
      id: `${lesson.id}-pre-${kpIndex + 1}b`,
      purpose: "pre",
      kpId: kp.id,
      type: "fill_blank",
      difficulty: 2,
      diagnosticRole: "STANDARD_CONFIRMATION",
      stem: `在学习「${kp.name}」时，若已知基础条件满足，则计算其标准对应值为____（填整数或简明结果）。`,
      answer: "1",
      analysis: `根据「${kp.name}」的基础性质直接推导求解。`,
    });

    pre.push(q1, q2);

    practicePools[kp.id] = [
      createQuestion({
        id: `${lesson.id}-prac-${kpIndex + 1}-1`,
        purpose: "post",
        kpId: kp.id,
        type: "single_choice",
        difficulty: 2,
        stem: `针对「${kp.name}」的巩固应用，下列选项正确的是（ ）。`,
        answer: "B",
        options: [
          { key: "A", text: `忽略符号直接计算` },
          { key: "B", text: `按照「${kp.name}」法则规范运算` },
          { key: "C", text: `只计算绝对值` },
          { key: "D", text: `无需验证基准` },
        ],
        analysis: `考查「${kp.name}」的运算与推理规则。`,
      }),
      createQuestion({
        id: `${lesson.id}-prac-${kpIndex + 1}-2`,
        purpose: "post",
        kpId: kp.id,
        type: "fill_blank",
        difficulty: 3,
        stem: `运用「${kp.name}」求解：已知相关变量在基准位置，则变化量为____。`,
        answer: "0",
        analysis: `考查「${kp.name}」在特殊值与平衡状态下的数值。`,
      }),
    ];
  });

  review.push(
    createQuestion({
      id: `${lesson.id}-rev-1`,
      purpose: "review",
      kpId: kps[0].id,
      type: "single_choice",
      difficulty: 2,
      stem: `综合复习：本课「${lesson.title}」的核心思想是（ ）。`,
      answer: "A",
      options: [
        { key: "A", text: `数形结合与严密逻辑推理` },
        { key: "B", text: `仅死记硬背计算公式` },
        { key: "C", text: `无需关注实际情境` },
        { key: "D", text: `随意选定基准方向` },
      ],
      analysis: `数学学习强调数形结合与严密的逻辑思维。`,
    }),
  );

  return { pre, practicePools, review };
}

/**
 * 认知诊断矩阵构造
 */
function createAssessmentMatrices(lessonId, knowledgePoints) {
  const matrices = {};
  knowledgePoints.forEach((kp) => {
    matrices[kp.id] = {
      knowledgePointId: kp.id,
      targetStatement: `掌握 ${kp.name} 的基本概念、运算规则与应用。`,
      rationale: `课标核心认知目标。`,
      cells: [
        {
          matrixCellId: `${kp.id}:CR:A`,
          domain: "CR",
          targetLevel: "A",
          role: "CORE",
          observableBehavior: `识别与解释 ${kp.name} 的基本定义。`,
          evidenceCriteria: ["概念清晰", "无符号混淆"],
          commonMisconceptions: ["概念混淆"],
          recommendedQuestionTypes: ["single_choice", "fill_blank"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp.id}:M:B`,
          domain: "M",
          targetLevel: "B",
          role: "CORE",
          observableBehavior: `运用 ${kp.name} 建立数学模型并解决问题。`,
          evidenceCriteria: ["步骤规范", "结果准确"],
          commonMisconceptions: ["模型建立不当"],
          recommendedQuestionTypes: ["single_choice", "fill_blank", "short_answer"],
          minimumIndependentEvidence: 1,
        },
      ],
    };
  });
  matrices.composite = {
    knowledgePointId: "composite",
    targetStatement: `综合掌握全课知识体系并能灵活迁移。`,
    rationale: `整课认知建构。`,
    cells: [
      {
        matrixCellId: "composite:CR:B",
        domain: "CR",
        targetLevel: "B",
        role: "CORE",
        observableBehavior: "综合分析各知识点之间的内在逻辑联系。",
        evidenceCriteria: ["系统理解分类与推理"],
        commonMisconceptions: ["遗漏边界条件"],
        recommendedQuestionTypes: ["short_answer", "single_choice"],
        minimumIndependentEvidence: 1,
      },
    ],
  };
  return matrices;
}

/**
 * 考点插槽构造
 */
function createAssessmentQuestionSlots(lessonId, knowledgePoints) {
  const slots = {};
  knowledgePoints.forEach((kp) => {
    slots[kp.id] = [
      {
        id: `${kp.id}:slot:1`,
        knowledgePointId: kp.id,
        matrixCellId: `${kp.id}:CR:A`,
        difficulty: "D1",
        adaptiveRole: "standard",
        questionType: "single_choice",
        taskCategory: "concept_or_calculation",
        assessmentFocus: `辨析 ${kp.name} 的基本概念与性质`,
        contextTheme: "数学基础概念情境",
      },
      {
        id: `${kp.id}:slot:2`,
        knowledgePointId: kp.id,
        matrixCellId: `${kp.id}:M:B`,
        difficulty: "D2",
        adaptiveRole: "standard",
        questionType: "fill_blank",
        taskCategory: "application",
        assessmentFocus: `应用 ${kp.name} 进行计算与求解`,
        contextTheme: "实际应用情境",
      },
    ];
  });
  slots.composite = [
    {
      id: `composite:slot:1`,
      knowledgePointId: "composite",
      matrixCellId: "composite:CR:B",
      difficulty: "D2",
      adaptiveRole: "standard",
      questionType: "short_answer",
      taskCategory: "concept_or_calculation",
      assessmentFocus: "综合分析整课知识点的内在联系",
      contextTheme: "综合迁移情境",
    },
  ];
  return slots;
}

/**
 * 获取指定课时的完整 mock 内容包
 */
export function getMockLessonContent(lessonId) {
  const lesson = findLessonById(lessonId);
  let questionsData;
  if (lessonId === "section-1-1") {
    questionsData = seedSection1_1Questions();
  } else if (lessonId === "section-1-2") {
    questionsData = seedSection1_2Questions();
  } else if (lessonId === "section-1-3") {
    questionsData = seedSection1_3Questions();
  } else {
    questionsData = createMockLessonData(lesson);
  }

  const kps = lesson.knowledgePoints || [];
  const matrices = createAssessmentMatrices(lessonId, kps);
  const slots = createAssessmentQuestionSlots(lessonId, kps);

  const postList = [
    ...Object.values(questionsData.practicePools).flat(),
    ...questionsData.review,
  ];

  return {
    lessonId,
    version: 1,
    versionId: `mock-version-${lessonId}`,
    status: "published",
    updatedAt: now(),
    publishedAt: now(),
    teacherRequirement: `系统精选《${lesson.title}》诊断与自适应巩固题目，支持智能诊断、知识点练习与阶段评测。`,
    preQuestions: questionsData.pre,
    postQuestions: postList,
    knowledgePracticePools: questionsData.practicePools,
    compositeReviewPool: questionsData.review,
    assessmentMatrices: matrices,
    assessmentQuestionSlots: slots,
    learningUnits: kps.map((kp) => ({
      id: `unit-${kp.id}`,
      knowledgePointId: kp.id,
      title: kp.name,
      estimatedMinutes: 5,
    })),
    reviewNotes: [
      `本课核心重点是理解并熟练运用「${lesson.title}」的相关概念和法则。`,
    ],
  };
}

/**
 * 转换成符合发布版本的 contentVersion 对象
 */
export function getMockContentVersion(lessonId) {
  const lesson = findLessonById(lessonId);
  const content = getMockLessonContent(lessonId);
  const kps = lesson.knowledgePoints || [];

  return {
    id: `mock-version-${lessonId}`,
    textbookLessonId: lessonId,
    versionNumber: 1,
    publishedAt: now(),
    contentPackage: {
      planType: "SINGLE_LESSON",
      title: lesson.title,
      sourceLessons: [lesson.id],
      lesson: {
        id: lesson.id,
        title: lesson.title,
        knowledgePoints: kps,
      },
      knowledgeObjectives: kps.map((kp) => ({
        id: kp.id,
        name: kp.name,
        objective: `理解并掌握${kp.name}`,
        summary: `${kp.name}是${lesson.title}的核心考点之一。`,
        example: `例如在实际生活与几何数轴中，${kp.name}有广泛的应用。`,
      })),
      generationPolicy: {
        aiGenerationEnabled: true,
        diagnosticAdaptiveEnabled: true,
        masteryThreshold: 85,
      },
      questionDistribution: null,
      diagnosticQuestionPool: content.preQuestions,
      knowledgePracticePools: content.knowledgePracticePools,
      compositeReviewPool: content.compositeReviewPool,
      learningContent: {
        composite: {
          status: "READY",
          classroomId: `mock-room-composite-${lessonId}`,
          classroomUrl: "about:blank",
          coveredKnowledgeObjectiveIds: kps.map((k) => k.id),
        },
        knowledgePoints: kps.map((kp) => ({
          knowledgeObjectiveId: kp.id,
          openMaic: {
            status: "READY",
            classroomId: `mock-room-${kp.id}`,
            classroomUrl: "about:blank",
            coveredKnowledgeObjectiveIds: [kp.id],
          },
        })),
      },
      assessmentMatrices: content.assessmentMatrices,
      assessmentQuestionSlots: content.assessmentQuestionSlots,
      unconfirmedItems: [],
    },
  };
}

/**
 * 兼容旧导出
 */
export function seedQuestions() {
  const s11 = seedSection1_1Questions();
  return {
    pre: s11.pre,
    post: [
      ...Object.values(s11.practicePools).flat(),
      ...s11.review,
    ],
  };
}

export function seedAssessmentMatrices() {
  const lesson = findLessonById("section-1-1");
  return createAssessmentMatrices("section-1-1", lesson.knowledgePoints);
}

export function seedAssessmentQuestionSlots() {
  const lesson = findLessonById("section-1-1");
  return createAssessmentQuestionSlots("section-1-1", lesson.knowledgePoints);
}

export function createDefaultContent() {
  return {
    "section-1-1": getMockLessonContent("section-1-1"),
    "section-1-2": getMockLessonContent("section-1-2"),
    "section-1-3": getMockLessonContent("section-1-3"),
  };
}

export function normalizeLessonContent(content) {
  return Object.fromEntries(
    Object.entries(content).map(([id, item]) => [
      id,
      {
        ...item,
        preQuestions: (item.preQuestions || []).map((q) => ({
          ...q,
          options: (q.options || []).map((opt) => ({
            ...opt,
            id: opt.id || opt.key,
          })),
        })),
        postQuestions: (item.postQuestions || []).map((q) => ({
          ...q,
          options: (q.options || []).map((opt) => ({
            ...opt,
            id: opt.id || opt.key,
          })),
        })),
      },
    ]),
  );
}
