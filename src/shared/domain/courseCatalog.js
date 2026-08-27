const kp = (id, name, objective, type = 'concept') => ({
  id, name, objective, type,
});
const section = (id, index, title, knowledgePoints, estimatedMinutes = 22) => ({
  id, index, title, estimatedMinutes, knowledgePoints,
});

export const course = {
  id: 'zhejiang-grade7-math-volume1',
  name: '七年级数学 · 上册',
  grade: '七年级',
  subject: '数学',
  publisher: '浙教版',
  chapters: [
    {
      id: 'chapter-1', index: '第一章', title: '有理数',
      sections: [
        {
          id: 'section-1-1', index: '1.1', title: '从自然数到有理数', estimatedMinutes: 20,
          knowledgePoints: [
            {
              id: 'kp-positive-negative', name: '正数和负数的意义',
              objective: '理解正数、负数的意义',
              summary: '正数和负数可以表示具有相反意义的量。',
              example: '向东 3 米记作 +3 米，向西 2 米记作 -2 米。',
            },
            {
              id: 'kp-zero', name: '0 的意义',
              objective: '理解 0 与正数、负数的关系',
              summary: '0 既不是正数也不是负数，在实际问题中常用作基准。',
              example: '0℃ 是摄氏温标的一个基准，不是“没有温度”。',
            },
            {
              id: 'kp-signed-quantity', name: '用正负数表示相反意义的量',
              objective: '根据基准和正方向表示实际量',
              summary: '先确定基准和正方向，再确定数量的符号和大小。',
              example: '以 50kg 为基准，52kg 记作 +2kg，48.5kg 记作 -1.5kg。',
            },
          ],
        },
        section('section-1-2', '1.2', '数轴', [
          kp('kp-number-line-concept', '数轴的三要素', '识别原点、正方向和单位长度'),
          kp('kp-number-line-origin', '原点与基准', '说明原点在数轴中的基准作用'),
          kp('kp-number-line-point', '在数轴上表示有理数', '根据数的符号和大小确定点的位置', 'method'),
          kp('kp-number-line-read', '读取数轴上的点', '读出数轴上指定点表示的有理数', 'method'),
          kp('kp-number-line-position', '数与点的位置关系', '判断有理数在原点左右及相对位置', 'application'),
        ]),
        section('section-1-3', '1.3', '绝对值', [
          kp('kp-opposite-number', '相反数的意义', '识别互为相反数的两个数'),
          kp('kp-opposite-number-find', '求一个数的相反数', '正确求出给定数的相反数', 'operation'),
          kp('kp-absolute-value', '绝对值的几何意义', '用到原点的距离解释绝对值', 'concept'),
          kp('kp-absolute-value-find', '求有理数的绝对值', '根据符号求有理数的绝对值', 'operation'),
          kp('kp-absolute-value-symbol', '绝对值符号的化简', '正确化简含绝对值符号的简单式子', 'operation'),
        ]),
        section('section-1-4', '1.4', '有理数的大小比较', [
          kp('kp-positive-negative-order', '正数、零与负数的大小关系', '判断正数、零和负数之间的大小'),
          kp('kp-number-line-order', '借助数轴比较大小', '利用数轴上点的位置比较有理数', 'method'),
          kp('kp-negative-order', '两个负数的大小比较', '利用绝对值比较两个负数', 'method'),
          kp('kp-rational-compare', '多个有理数的排序', '选择合适方法给多个有理数排序', 'application'),
        ]),
      ],
    },
    {
      id: 'chapter-2', index: '第二章', title: '有理数的运算',
      sections: [
        section('section-2-1', '2.1', '有理数的加法', [kp('kp-add-same-sign', '同号两数相加', '计算同号有理数的和', 'operation'), kp('kp-add-different-sign', '异号两数相加', '计算异号有理数的和', 'operation'), kp('kp-add-zero-opposite', '与零或相反数相加', '快速计算特殊有理数加法', 'operation'), kp('kp-rational-add', '加法法则的综合运用', '选择正确法则完成有理数加法', 'application')]),
        section('section-2-2', '2.2', '有理数的减法', [kp('kp-subtract-meaning', '有理数减法的意义', '理解减法是加法的逆运算'), kp('kp-rational-subtract', '减法转化为加法', '把有理数减法改写成加法', 'method'), kp('kp-subtract-operation', '有理数减法计算', '正确完成有理数减法', 'operation'), kp('kp-add-subtract-application', '加减法的实际应用', '用有理数加减解决变化量问题', 'application')]),
        section('section-2-3', '2.3', '有理数的乘法', [kp('kp-multiply-sign', '乘积的符号规律', '根据因数符号判断积的符号'), kp('kp-rational-multiply', '有理数乘法计算', '计算两个有理数的积', 'operation'), kp('kp-multiple-product-sign', '多个因数乘积的符号', '根据负因数个数判断乘积符号', 'method'), kp('kp-multiply-properties', '乘法运算律', '运用交换律、结合律和分配律简算', 'operation')]),
        section('section-2-4', '2.4', '有理数的除法', [kp('kp-reciprocal', '倒数', '求非零有理数的倒数'), kp('kp-divide-sign', '商的符号规律', '根据被除数和除数符号判断商的符号'), kp('kp-rational-divide', '除法转化为乘法', '利用倒数完成有理数除法', 'method'), kp('kp-multiply-divide-mixed', '乘除混合运算', '按顺序完成有理数乘除混合运算', 'operation')]),
        section('section-2-5', '2.5', '有理数的乘方', [kp('kp-power-meaning', '乘方的意义', '区分底数、指数与幂'), kp('kp-power-sign', '幂的符号规律', '判断负数的整数次幂的符号'), kp('kp-rational-power', '有理数乘方计算', '正确计算有理数的幂', 'operation'), kp('kp-scientific-notation', '科学记数法', '用科学记数法表示较大的数', 'application')]),
        section('section-2-6', '2.6', '有理数的混合运算', [kp('kp-operation-order', '混合运算顺序', '确定含乘方的有理数运算顺序'), kp('kp-rational-mixed', '有理数混合运算', '按正确顺序完成混合运算', 'operation'), kp('kp-mixed-simplify', '运算律简化计算', '选择运算律简化混合运算', 'method'), kp('kp-calculator-rational', '计算器辅助计算', '使用计算器完成较复杂计算', 'application')]),
        section('section-2-7', '2.7', '近似数', [kp('kp-exact-approximate', '准确数与近似数', '区分准确数和近似数'), kp('kp-precision', '近似数的精确度', '判断近似数精确到哪一位'), kp('kp-approximation', '按要求取近似数', '用四舍五入法取近似数', 'operation'), kp('kp-effective-digits', '有效数字', '判断近似数的有效数字', 'method')]),
      ],
    },
    {
      id: 'chapter-3', index: '第三章', title: '实数',
      sections: [
        section('section-3-1', '3.1', '平方根', [kp('kp-square-concept', '平方与平方根的关系', '从平方运算理解平方根'), kp('kp-square-root', '平方根与算术平方根', '区分平方根和算术平方根'), kp('kp-square-root-find', '求非负数的平方根', '求完全平方数的平方根', 'operation'), kp('kp-square-root-estimate', '算术平方根的估算', '估计非完全平方数算术平方根的范围', 'method')]),
        section('section-3-2', '3.2', '实数', [kp('kp-irrational', '无理数的识别', '根据定义识别常见无理数'), kp('kp-real-number', '实数的分类', '按有理数和无理数对实数分类'), kp('kp-real-number-line', '实数与数轴上的点', '理解实数与数轴上的点一一对应'), kp('kp-real-absolute', '实数的相反数与绝对值', '求实数的相反数和绝对值', 'operation')]),
        section('section-3-3', '3.3', '立方根', [kp('kp-cube-concept', '立方与立方根的关系', '从立方运算理解立方根'), kp('kp-cube-root', '立方根的意义', '说明一个数的立方根'), kp('kp-cube-root-find', '求数的立方根', '求完全立方数的立方根', 'operation'), kp('kp-square-cube-root-compare', '平方根与立方根的区别', '比较两类方根的定义域和结果')]),
        section('section-3-4', '3.4', '实数的运算', [kp('kp-radical-simplify', '简单根式的化简', '化简基础二次根式', 'operation'), kp('kp-real-operation-order', '实数运算顺序', '确定含方根式子的运算顺序'), kp('kp-real-operation', '实数的加减乘除', '进行简单实数运算', 'operation'), kp('kp-real-estimation', '实数运算的估算', '用近似值估算实数运算结果', 'application')]),
      ],
    },
    {
      id: 'chapter-4', index: '第四章', title: '代数式',
      sections: [
        section('section-4-1', '4.1', '用字母表示数', [kp('kp-letter-number', '用字母表示数量', '用字母表示一个数或变化的量'), kp('kp-letter-relation', '用字母表示数量关系', '把运算关系写成含字母的式子', 'method'), kp('kp-formula-expression', '用式子表示规律', '从图形或数列中概括规律', 'application'), kp('kp-letter-writing', '含字母式子的书写规范', '按规范书写乘号、系数和带分数')]),
        section('section-4-2', '4.2', '代数式', [kp('kp-expression-identify', '代数式的识别', '判断一个式子是否为代数式'), kp('kp-algebraic-expression', '根据题意列代数式', '把数量关系转化为代数式', 'method'), kp('kp-expression-meaning', '代数式的实际意义', '结合情境解释代数式'), kp('kp-expression-unit', '代数式的单位', '在实际问题中正确标注结果单位', 'application')]),
        section('section-4-3', '4.3', '代数式的值', [kp('kp-substitution', '字母取值的代入', '把字母的值正确代入代数式', 'method'), kp('kp-expression-value', '求代数式的值', '按运算顺序计算代数式的值', 'operation'), kp('kp-expression-value-writing', '代入计算的书写规范', '规范书写代入和计算过程'), kp('kp-expression-value-application', '代数式求值的应用', '用代数式计算实际问题结果', 'application')]),
        section('section-4-4', '4.4', '整式', [kp('kp-monomial', '单项式的系数与次数', '识别单项式并指出系数和次数'), kp('kp-polynomial-term', '多项式的项与常数项', '找出多项式的各项和常数项'), kp('kp-polynomial', '多项式的次数', '判断多项式的次数'), kp('kp-polynomial-order', '多项式的排列', '按字母的升幂或降幂排列多项式', 'operation')]),
        section('section-4-5', '4.5', '合并同类项', [kp('kp-like-term-identify', '同类项的识别', '根据字母和指数判断同类项'), kp('kp-like-terms', '合并同类项法则', '利用分配律合并同类项', 'method'), kp('kp-like-terms-operation', '多项式中合并同类项', '正确合并多项式中的同类项', 'operation'), kp('kp-like-terms-evaluation', '先化简再求值', '合并同类项后代入求值', 'application')]),
        section('section-4-6', '4.6', '整式的加减', [kp('kp-remove-parentheses', '去括号法则', '根据括号前符号正确去括号', 'method'), kp('kp-polynomial-add', '整式的加法', '通过去括号和合并同类项求和', 'operation'), kp('kp-polynomial-subtract', '整式的减法', '通过去括号和合并同类项求差', 'operation'), kp('kp-polynomial-add-sub', '整式加减的综合应用', '用整式加减表示并解决数量问题', 'application')]),
      ],
    },
    {
      id: 'chapter-5', index: '第五章', title: '一元一次方程',
      sections: [
        section('section-5-1', '5.1', '一元一次方程', [kp('kp-equation-meaning', '方程与方程的解', '区分方程、等式和方程的解'), kp('kp-linear-equation-concept', '一元一次方程的识别', '根据未知数个数和次数识别一元一次方程'), kp('kp-equation-solution-check', '方程解的检验', '通过代入判断一个数是否为方程的解', 'method'), kp('kp-equation-from-relation', '根据数量关系列方程', '把简单等量关系转化为方程', 'application')]),
        section('section-5-2', '5.2', '等式的基本性质', [kp('kp-equality-property-one', '等式两边同加减', '运用等式性质完成同加或同减'), kp('kp-equality-property-two', '等式两边同乘除', '运用等式性质完成同乘或同除'), kp('kp-equation-property', '利用等式性质变形', '选择合适的等式性质变形方程', 'method'), kp('kp-simple-equation-property', '用等式性质解简单方程', '利用等式性质求简单方程的解', 'operation')]),
        section('section-5-3', '5.3', '一元一次方程的解法', [kp('kp-equation-denominator', '去分母', '利用等式性质去除方程中的分母', 'method'), kp('kp-equation-parentheses', '去括号', '正确去除方程中的括号', 'method'), kp('kp-equation-transposition', '移项', '理解并正确进行移项', 'method'), kp('kp-equation-combine', '合并同类项与系数化一', '把方程逐步化为 x=a', 'operation'), kp('kp-linear-equation-solve', '解方程并检验', '完整求解一元一次方程并检验', 'application')]),
        section('section-5-4', '5.4', '一元一次方程的应用', [kp('kp-application-unknown', '设未知数', '根据问题合理设置未知数', 'method'), kp('kp-application-relation', '寻找等量关系', '从题目信息中找出核心等量关系', 'method'), kp('kp-linear-equation-application', '列方程解决问题', '经历设元、列式、求解和作答全过程', 'application'), kp('kp-application-check', '实际问题结果检验', '检验方程的解是否符合实际意义', 'method'), kp('kp-application-types', '常见数量关系应用', '解决行程、工程、配套等基础问题', 'application')]),
      ],
    },
    {
      id: 'chapter-6', index: '第六章', title: '图形的初步知识',
      sections: [
        section('section-6-1', '6.1', '几何图形', [kp('kp-solid-plane', '立体图形与平面图形', '识别常见立体图形和平面图形'), kp('kp-geometric-figure', '从实物抽象几何图形', '从实际物体中抽象出几何图形', 'method'), kp('kp-solid-components', '立体图形的面、棱和顶点', '识别常见立体图形的组成部分'), kp('kp-net-view', '展开图与视图初步', '根据简单展开图或视图识别立体图形', 'application')]),
        section('section-6-2', '6.2', '线段、射线和直线', [kp('kp-line-ray-segment', '线段、射线和直线的区别', '从端点和延伸方向区分三类图形'), kp('kp-line-notation', '线的表示与读法', '规范表示并读出线段、射线和直线'), kp('kp-line-basic-fact', '两点确定一条直线', '理解并应用直线的基本事实'), kp('kp-line-count', '图中线段的计数', '有序数出图形中的线段', 'method')]),
        section('section-6-3', '6.3', '线段的长短比较', [kp('kp-segment-measure', '线段长度的测量', '使用刻度尺测量线段长度', 'operation'), kp('kp-segment-compare', '线段长短的比较方法', '用度量或叠合方法比较线段'), kp('kp-segment-basic-fact', '两点之间线段最短', '理解并应用线段的基本事实'), kp('kp-distance', '两点间的距离', '理解两点间距离是线段的长度')]),
        section('section-6-4', '6.4', '线段的和差', [kp('kp-segment-sum', '线段的和', '根据图形关系计算线段之和', 'operation'), kp('kp-segment-difference', '线段的差', '根据图形关系计算线段之差', 'operation'), kp('kp-segment-midpoint', '线段中点', '利用中点关系求线段长度'), kp('kp-segment-sum-difference', '线段关系的综合计算', '结合和、差与中点解决线段问题', 'application')]),
        section('section-6-5', '6.5', '角与角的度量', [kp('kp-angle-concept', '角的组成与表示', '识别角的顶点和边并规范表示'), kp('kp-angle-measure', '用量角器度量角', '正确使用量角器测量角', 'operation'), kp('kp-angle-unit-convert', '度、分、秒的换算', '进行角度单位换算', 'operation'), kp('kp-angle-classify', '角的分类', '识别锐角、直角、钝角、平角和周角')]),
        section('section-6-6', '6.6', '角的大小比较', [kp('kp-angle-compare-method', '角大小的比较方法', '用度量或叠合方法比较角'), kp('kp-angle-compare', '多个角的排序', '比较并排列多个角的大小', 'operation'), kp('kp-angle-bisector', '角平分线', '理解角平分线并运用相等关系'), kp('kp-angle-draw', '按要求画角', '使用量角器画出指定度数的角', 'operation')]),
        section('section-6-7', '6.7', '角的和差', [kp('kp-angle-sum', '角的和', '根据图形关系计算角的和', 'operation'), kp('kp-angle-difference', '角的差', '根据图形关系计算角的差', 'operation'), kp('kp-angle-sum-difference', '角关系的综合计算', '结合角平分线计算角度', 'application'), kp('kp-clock-angle', '钟面角问题', '用角的和差解决钟面问题', 'application')]),
        section('section-6-8', '6.8', '余角和补角', [kp('kp-complement', '余角的定义', '判断两个角是否互为余角'), kp('kp-supplement', '补角的定义', '判断两个角是否互为补角'), kp('kp-complement-supplement', '求余角与补角', '根据角度求其余角或补角', 'operation'), kp('kp-complement-supplement-property', '同角余角或补角的性质', '运用同角关系判断两个角相等', 'method')]),
        section('section-6-9', '6.9', '直线的相交', [kp('kp-intersecting-lines', '相交线与交点', '识别两条直线的交点'), kp('kp-vertical-angles', '对顶角', '识别对顶角并运用其相等性质'), kp('kp-perpendicular', '垂直与垂线', '识别垂直关系并规范表示'), kp('kp-perpendicular-fact', '过一点作已知直线的垂线', '理解垂线的基本事实'), kp('kp-point-line-distance', '点到直线的距离', '理解垂线段长度表示点线距离')]),
      ],
    },
  ],
};
