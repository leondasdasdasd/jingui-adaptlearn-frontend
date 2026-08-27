const now = () => new Date().toISOString();

const shortAnswerRubrics = {
  'approved-pre-4': [{ point: '判断 0℃ 不表示“没有温度”', points: 2 }, { point: '说明 0℃ 是摄氏温标的基准', points: 2 }],
  'approved-post-3': [{ point: '举出一组具有相反意义的量', points: 2 }, { point: '正、负号与约定的正方向一致', points: 2 }],
  'approved-post-7': [{ point: '说明库存没有增加也没有减少，即变化量为 0', points: 4 }],
  'approved-post-11': [{ point: '正确解释 +8 和 -3 的方向与距离', points: 2 }, { point: '正确解释 +4 的方向与距离', points: 2 }],
  'approved-post-12': [{ point: '正确计算 +1 和 -0.5 对应的实际质量', points: 2 }, { point: '正确说明变化量 0 对应 50kg', points: 2 }],
  'approved-review-1': [{ point: '正确写出 +3 和 -2', points: 2 }, { point: '说明 0 表示正好等于基准', points: 2 }],
  'approved-review-2': [{ point: '正确解释 +2℃、-5℃ 和 0℃ 的意义', points: 3 }, { point: '指出前两项是相反方向的变化', points: 1 }],
};

function question(id, purpose, kpId, type, difficulty, stem, answer, options = []) {
  return {
    id, purpose, phase: purpose === 'post' ? 'knowledge' : 'diagnostic', type, difficulty, stem,
    options: options.map((option) => ({ ...option, id: option.id || option.key })), answer, acceptableAnswers: [], analysis: '先明确题目中的基准和正方向，再判断符号与大小。',
    maxScore: type === 'short_answer' ? 4 : 2, rubric: shortAnswerRubrics[id] || [], knowledgePointIds: [kpId],
    knowledgePointWeights: { [kpId]: 1 },
  };
}

function seedQuestions() {
  const k1 = 'kp-positive-negative';
  const k2 = 'kp-zero';
  const k3 = 'kp-signed-quantity';
  const pre = [
    question('approved-pre-1', 'pre', k1, 'single_choice', 1, '若向东走 3 米记作 +3 米，向西走 2 米应记作（ ）。', 'B', [{ key: 'A', text: '+2 米' }, { key: 'B', text: '-2 米' }, { key: 'C', text: '2 米' }]),
    question('approved-pre-2', 'pre', k1, 'fill_blank', 2, '收入 20 元记作 +20 元，那么支出 8 元记作____元。', '-8'),
    question('approved-pre-3', 'pre', k2, 'single_choice', 1, '关于 0，下列说法正确的是（ ）。', 'C', [{ key: 'A', text: '0 是正数' }, { key: 'B', text: '0 是负数' }, { key: 'C', text: '0 既不是正数也不是负数' }]),
    question('approved-pre-4', 'pre', k2, 'short_answer', 2, '气温为 0℃ 是否表示“没有温度”？请简要说明。', '不是，0℃ 是摄氏温标中的一个基准。'),
    question('approved-pre-5', 'pre', k3, 'fill_blank', 2, '以海平面为基准，高于海平面 15 米记作 +15 米，低于海平面 6 米记作____米。', '-6'),
    question('approved-pre-6', 'pre', k3, 'single_choice', 3, '以 50kg 为标准，48.5kg 可记作（ ）。', 'A', [{ key: 'A', text: '-1.5kg' }, { key: 'B', text: '+1.5kg' }, { key: 'C', text: '48.5kg' }]),
  ];
  const post = [
    question('approved-post-1', 'post', k1, 'single_choice', 1, '向北为正，向南走 4 米记作（ ）。', 'B', [{ key: 'A', text: '+4 米' }, { key: 'B', text: '-4 米' }]),
    question('approved-post-2', 'post', k1, 'fill_blank', 2, '上升 7 米记作 +7 米，下降 3 米记作____米。', '-3'),
    question('approved-post-3', 'post', k1, 'short_answer', 2, '举出一组生活中具有相反意义的量，并分别用正负数表示。', '答案合理即可。'),
    question('approved-post-4', 'post', k1, 'single_choice', 3, '下列成对的量中，不具有相反意义的是（ ）。', 'C', [{ key: 'A', text: '盈利与亏损' }, { key: 'B', text: '向东与向西' }, { key: 'C', text: '增加 2 与增加 3' }]),
    question('approved-post-5', 'post', k2, 'single_choice', 1, '0 属于（ ）。', 'C', [{ key: 'A', text: '正数' }, { key: 'B', text: '负数' }, { key: 'C', text: '既不是正数也不是负数' }]),
    question('approved-post-6', 'post', k2, 'fill_blank', 2, '数轴上原点表示的数是____。', '0'),
    question('approved-post-7', 'post', k2, 'short_answer', 2, '某仓库记录“库存变化为 0”，这里的 0 表示什么？', '库存没有增加也没有减少。'),
    question('approved-post-8', 'post', k2, 'single_choice', 3, '下列情境中的 0 表示基准的是（ ）。', 'A', [{ key: 'A', text: '海拔 0 米' }, { key: 'B', text: '篮子里有 0 个苹果' }, { key: 'C', text: '比赛得 0 分' }]),
    question('approved-post-9', 'post', k3, 'fill_blank', 1, '以平均分为基准，低 5 分记作____分。', '-5'),
    question('approved-post-10', 'post', k3, 'single_choice', 2, '以 100 元为基准，余额 112 元可记作（ ）。', 'A', [{ key: 'A', text: '+12 元' }, { key: 'B', text: '-12 元' }, { key: 'C', text: '+112 元' }]),
    question('approved-post-11', 'post', k3, 'short_answer', 2, '某检修车从 A 地出发，向东为正，记录为 +8、-3、+4。说明每个数的实际意义。', '依次表示向东 8 千米、向西 3 千米、向东 4 千米。'),
    question('approved-post-12', 'post', k3, 'short_answer', 3, '以标准质量 50kg 为基准，三袋大米记为 +1、-0.5、0kg，请写出实际质量。', '51kg、49.5kg、50kg。'),
  ];
  const review = [
    { ...question('approved-review-1', 'post', k1, 'short_answer', 2, '请用正负数同时表示“比基准高 3”和“比基准低 2”，并说明 0 的意义。', '+3、-2；0 表示正好等于基准。'), phase: 'review', knowledgePointIds: [k1, k2, k3], knowledgePointWeights: { [k1]: 0.35, [k2]: 0.3, [k3]: 0.35 } },
    { ...question('approved-review-2', 'post', k3, 'short_answer', 3, '某天温度变化依次为 +2℃、-5℃、0℃。解释三个数的意义，并说明哪些是相反方向的变化。', '升高 2℃、降低 5℃、不变；前两项是相反方向的变化。'), phase: 'review', knowledgePointIds: [k1, k2, k3], knowledgePointWeights: { [k1]: 0.35, [k2]: 0.3, [k3]: 0.35 } },
  ];
  return { pre, post: [...post, ...review] };
}

export function createDefaultContent() {
  const questions = seedQuestions();
  return {
    'section-1-1': {
      lessonId: 'section-1-1', version: 1, status: 'draft', updatedAt: now(), publishedAt: '',
      teacherRequirement: '联系温度、海拔和收支情境，先判断基准与方向，再使用正负号。',
      learningUnits: [
        { id: 'unit-1', title: '相反意义的量', format: '讲解 + 例题', summary: '从方向、增减和收支三个情境认识正负数。', confirmed: true },
        { id: 'unit-2', title: '0 与基准', format: '白板互动', summary: '区分“没有”和“作为基准”的 0。', confirmed: false },
        { id: 'unit-3', title: '实际量的表示', format: '互动练习', summary: '先确定基准和正方向，再写符号与大小。', confirmed: true },
      ],
      reviewNotes: ['“0 的意义”缺少学生易混淆的反例', '综合练习中真实情境题偏少'],
      preQuestions: questions.pre, postQuestions: questions.post,
    },
  };
}

export function normalizeLessonContent(content) {
  return Object.fromEntries(Object.entries(content).map(([id, item]) => [id, {
    ...item,
    preQuestions: (item.preQuestions || []).map((questionItem) => ({
      ...questionItem,
      options: (questionItem.options || []).map((option) => ({ ...option, id: option.id || option.key })),
    })),
    postQuestions: (item.postQuestions || []).map((questionItem) => ({
      ...questionItem,
      options: (questionItem.options || []).map((option) => ({ ...option, id: option.id || option.key })),
    })),
  }]));
}
