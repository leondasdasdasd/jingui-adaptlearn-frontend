import { kp, section } from "./builders.js";

export const zhejiangGrade7UpNumberChapters = [
  {
    id: "chapter-1",
    index: "第一章",
    title: "有理数",
    sections: [
      {
        id: "section-1-1",
        index: "1.1",
        title: "从自然数到有理数",
        estimatedMinutes: 20,
        knowledgePoints: [
          {
            id: "kp-positive-negative",
            name: "正数和负数的意义",
            objective: "理解正数、负数的意义",
            summary: "正数和负数可以表示具有相反意义的量。",
            example: "向东 3 米记作 +3 米，向西 2 米记作 -2 米。",
          },
          {
            id: "kp-zero",
            name: "0 的意义",
            objective: "理解 0 与正数、负数的关系",
            summary: "0 既不是正数也不是负数，在实际问题中常用作基准。",
            example: "0℃ 是摄氏温标的一个基准，不是“没有温度”。",
          },
          {
            id: "kp-signed-quantity",
            name: "用正负数表示相反意义的量",
            objective: "根据基准和正方向表示实际量",
            summary: "先确定基准和正方向，再确定数量的符号和大小。",
            example: "以 50kg 为基准，52kg 记作 +2kg，48.5kg 记作 -1.5kg。",
          },
        ],
      },
      section("section-1-2", "1.2", "数轴", [
        kp(
          "kp-number-line-concept",
          "数轴的三要素",
          "识别原点、正方向和单位长度",
        ),
        kp("kp-number-line-origin", "原点与基准", "说明原点在数轴中的基准作用"),
        kp(
          "kp-number-line-point",
          "在数轴上表示有理数",
          "根据数的符号和大小确定点的位置",
          "method",
        ),
        kp(
          "kp-number-line-read",
          "读取数轴上的点",
          "读出数轴上指定点表示的有理数",
          "method",
        ),
        kp(
          "kp-number-line-position",
          "数与点的位置关系",
          "判断有理数在原点左右及相对位置",
          "application",
        ),
      ]),
      section("section-1-3", "1.3", "绝对值", [
        kp("kp-opposite-number", "相反数的意义", "识别互为相反数的两个数"),
        kp(
          "kp-opposite-number-find",
          "求一个数的相反数",
          "正确求出给定数的相反数",
          "operation",
        ),
        kp(
          "kp-absolute-value",
          "绝对值的几何意义",
          "用到原点的距离解释绝对值",
          "concept",
        ),
        kp(
          "kp-absolute-value-find",
          "求有理数的绝对值",
          "根据符号求有理数的绝对值",
          "operation",
        ),
        kp(
          "kp-absolute-value-symbol",
          "绝对值符号的化简",
          "正确化简含绝对值符号的简单式子",
          "operation",
        ),
      ]),
      section("section-1-4", "1.4", "有理数的大小比较", [
        kp(
          "kp-positive-negative-order",
          "正数、零与负数的大小关系",
          "判断正数、零和负数之间的大小",
        ),
        kp(
          "kp-number-line-order",
          "借助数轴比较大小",
          "利用数轴上点的位置比较有理数",
          "method",
        ),
        kp(
          "kp-negative-order",
          "两个负数的大小比较",
          "利用绝对值比较两个负数",
          "method",
        ),
        kp(
          "kp-rational-compare",
          "多个有理数的排序",
          "选择合适方法给多个有理数排序",
          "application",
        ),
      ]),
    ],
  },
  {
    id: "chapter-2",
    index: "第二章",
    title: "有理数的运算",
    sections: [
      section("section-2-1", "2.1", "有理数的加法", [
        kp(
          "kp-add-same-sign",
          "同号两数相加",
          "计算同号有理数的和",
          "operation",
        ),
        kp(
          "kp-add-different-sign",
          "异号两数相加",
          "计算异号有理数的和",
          "operation",
        ),
        kp(
          "kp-add-zero-opposite",
          "与零或相反数相加",
          "快速计算特殊有理数加法",
          "operation",
        ),
        kp(
          "kp-rational-add",
          "加法法则的综合运用",
          "选择正确法则完成有理数加法",
          "application",
        ),
      ]),
      section("section-2-2", "2.2", "有理数的减法", [
        kp("kp-subtract-meaning", "有理数减法的意义", "理解减法是加法的逆运算"),
        kp(
          "kp-rational-subtract",
          "减法转化为加法",
          "把有理数减法改写成加法",
          "method",
        ),
        kp(
          "kp-subtract-operation",
          "有理数减法计算",
          "正确完成有理数减法",
          "operation",
        ),
        kp(
          "kp-add-subtract-application",
          "加减法的实际应用",
          "用有理数加减解决变化量问题",
          "application",
        ),
      ]),
      section("section-2-3", "2.3", "有理数的乘法", [
        kp("kp-multiply-sign", "乘积的符号规律", "根据因数符号判断积的符号"),
        kp(
          "kp-rational-multiply",
          "有理数乘法计算",
          "计算两个有理数的积",
          "operation",
        ),
        kp(
          "kp-multiple-product-sign",
          "多个因数乘积的符号",
          "根据负因数个数判断乘积符号",
          "method",
        ),
        kp(
          "kp-multiply-properties",
          "乘法运算律",
          "运用交换律、结合律和分配律简算",
          "operation",
        ),
      ]),
      section("section-2-4", "2.4", "有理数的除法", [
        kp("kp-reciprocal", "倒数", "求非零有理数的倒数"),
        kp(
          "kp-divide-sign",
          "商的符号规律",
          "根据被除数和除数符号判断商的符号",
        ),
        kp(
          "kp-rational-divide",
          "除法转化为乘法",
          "利用倒数完成有理数除法",
          "method",
        ),
        kp(
          "kp-multiply-divide-mixed",
          "乘除混合运算",
          "按顺序完成有理数乘除混合运算",
          "operation",
        ),
      ]),
      section("section-2-5", "2.5", "有理数的乘方", [
        kp("kp-power-meaning", "乘方的意义", "区分底数、指数与幂"),
        kp("kp-power-sign", "幂的符号规律", "判断负数的整数次幂的符号"),
        kp(
          "kp-rational-power",
          "有理数乘方计算",
          "正确计算有理数的幂",
          "operation",
        ),
        kp(
          "kp-scientific-notation",
          "科学记数法",
          "用科学记数法表示较大的数",
          "application",
        ),
      ]),
      section("section-2-6", "2.6", "有理数的混合运算", [
        kp("kp-operation-order", "混合运算顺序", "确定含乘方的有理数运算顺序"),
        kp(
          "kp-rational-mixed",
          "有理数混合运算",
          "按正确顺序完成混合运算",
          "operation",
        ),
        kp(
          "kp-mixed-simplify",
          "运算律简化计算",
          "选择运算律简化混合运算",
          "method",
        ),
        kp(
          "kp-calculator-rational",
          "计算器辅助计算",
          "使用计算器完成较复杂计算",
          "application",
        ),
      ]),
      section("section-2-7", "2.7", "近似数", [
        kp("kp-exact-approximate", "准确数与近似数", "区分准确数和近似数"),
        kp("kp-precision", "近似数的精确度", "判断近似数精确到哪一位"),
        kp(
          "kp-approximation",
          "按要求取近似数",
          "用四舍五入法取近似数",
          "operation",
        ),
        kp("kp-effective-digits", "有效数字", "判断近似数的有效数字", "method"),
      ]),
    ],
  },
  {
    id: "chapter-3",
    index: "第三章",
    title: "实数",
    sections: [
      section("section-3-1", "3.1", "平方根", [
        kp("kp-square-concept", "平方与平方根的关系", "从平方运算理解平方根"),
        kp("kp-square-root", "平方根与算术平方根", "区分平方根和算术平方根"),
        kp(
          "kp-square-root-find",
          "求非负数的平方根",
          "求完全平方数的平方根",
          "operation",
        ),
        kp(
          "kp-square-root-estimate",
          "算术平方根的估算",
          "估计非完全平方数算术平方根的范围",
          "method",
        ),
      ]),
      section("section-3-2", "3.2", "实数", [
        kp("kp-irrational", "无理数的识别", "根据定义识别常见无理数"),
        kp("kp-real-number", "实数的分类", "按有理数和无理数对实数分类"),
        kp(
          "kp-real-number-line",
          "实数与数轴上的点",
          "理解实数与数轴上的点一一对应",
        ),
        kp(
          "kp-real-absolute",
          "实数的相反数与绝对值",
          "求实数的相反数和绝对值",
          "operation",
        ),
      ]),
      section("section-3-3", "3.3", "立方根", [
        kp("kp-cube-concept", "立方与立方根的关系", "从立方运算理解立方根"),
        kp("kp-cube-root", "立方根的意义", "说明一个数的立方根"),
        kp(
          "kp-cube-root-find",
          "求数的立方根",
          "求完全立方数的立方根",
          "operation",
        ),
        kp(
          "kp-square-cube-root-compare",
          "平方根与立方根的区别",
          "比较两类方根的定义域和结果",
        ),
      ]),
      section("section-3-4", "3.4", "实数的运算", [
        kp(
          "kp-radical-simplify",
          "简单根式的化简",
          "化简基础二次根式",
          "operation",
        ),
        kp(
          "kp-real-operation-order",
          "实数运算顺序",
          "确定含方根式子的运算顺序",
        ),
        kp(
          "kp-real-operation",
          "实数的加减乘除",
          "进行简单实数运算",
          "operation",
        ),
        kp(
          "kp-real-estimation",
          "实数运算的估算",
          "用近似值估算实数运算结果",
          "application",
        ),
      ]),
    ],
  },
];
