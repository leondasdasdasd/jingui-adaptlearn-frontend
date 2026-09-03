import { kp, section } from "./builders.js";

export const zhejiangGrade7UpAlgebraGeometryChapters = [
  {
    id: "chapter-4",
    index: "第四章",
    title: "代数式",
    sections: [
      section("section-4-1", "4.1", "用字母表示数", [
        kp("kp-letter-number", "用字母表示数量", "用字母表示一个数或变化的量"),
        kp(
          "kp-letter-relation",
          "用字母表示数量关系",
          "把运算关系写成含字母的式子",
          "method",
        ),
        kp(
          "kp-formula-expression",
          "用式子表示规律",
          "从图形或数列中概括规律",
          "application",
        ),
        kp(
          "kp-letter-writing",
          "含字母式子的书写规范",
          "按规范书写乘号、系数和带分数",
        ),
      ]),
      section("section-4-2", "4.2", "代数式", [
        kp(
          "kp-expression-identify",
          "代数式的识别",
          "判断一个式子是否为代数式",
        ),
        kp(
          "kp-algebraic-expression",
          "根据题意列代数式",
          "把数量关系转化为代数式",
          "method",
        ),
        kp("kp-expression-meaning", "代数式的实际意义", "结合情境解释代数式"),
        kp(
          "kp-expression-unit",
          "代数式的单位",
          "在实际问题中正确标注结果单位",
          "application",
        ),
      ]),
      section("section-4-3", "4.3", "代数式的值", [
        kp(
          "kp-substitution",
          "字母取值的代入",
          "把字母的值正确代入代数式",
          "method",
        ),
        kp(
          "kp-expression-value",
          "求代数式的值",
          "按运算顺序计算代数式的值",
          "operation",
        ),
        kp(
          "kp-expression-value-writing",
          "代入计算的书写规范",
          "规范书写代入和计算过程",
        ),
        kp(
          "kp-expression-value-application",
          "代数式求值的应用",
          "用代数式计算实际问题结果",
          "application",
        ),
      ]),
      section("section-4-4", "4.4", "整式", [
        kp("kp-monomial", "单项式的系数与次数", "识别单项式并指出系数和次数"),
        kp(
          "kp-polynomial-term",
          "多项式的项与常数项",
          "找出多项式的各项和常数项",
        ),
        kp("kp-polynomial", "多项式的次数", "判断多项式的次数"),
        kp(
          "kp-polynomial-order",
          "多项式的排列",
          "按字母的升幂或降幂排列多项式",
          "operation",
        ),
      ]),
      section("section-4-5", "4.5", "合并同类项", [
        kp("kp-like-term-identify", "同类项的识别", "根据字母和指数判断同类项"),
        kp("kp-like-terms", "合并同类项法则", "利用分配律合并同类项", "method"),
        kp(
          "kp-like-terms-operation",
          "多项式中合并同类项",
          "正确合并多项式中的同类项",
          "operation",
        ),
        kp(
          "kp-like-terms-evaluation",
          "先化简再求值",
          "合并同类项后代入求值",
          "application",
        ),
      ]),
      section("section-4-6", "4.6", "整式的加减", [
        kp(
          "kp-remove-parentheses",
          "去括号法则",
          "根据括号前符号正确去括号",
          "method",
        ),
        kp(
          "kp-polynomial-add",
          "整式的加法",
          "通过去括号和合并同类项求和",
          "operation",
        ),
        kp(
          "kp-polynomial-subtract",
          "整式的减法",
          "通过去括号和合并同类项求差",
          "operation",
        ),
        kp(
          "kp-polynomial-add-sub",
          "整式加减的综合应用",
          "用整式加减表示并解决数量问题",
          "application",
        ),
      ]),
    ],
  },
  {
    id: "chapter-5",
    index: "第五章",
    title: "一元一次方程",
    sections: [
      section("section-5-1", "5.1", "一元一次方程", [
        kp("kp-equation-meaning", "方程与方程的解", "区分方程、等式和方程的解"),
        kp(
          "kp-linear-equation-concept",
          "一元一次方程的识别",
          "根据未知数个数和次数识别一元一次方程",
        ),
        kp(
          "kp-equation-solution-check",
          "方程解的检验",
          "通过代入判断一个数是否为方程的解",
          "method",
        ),
        kp(
          "kp-equation-from-relation",
          "根据数量关系列方程",
          "把简单等量关系转化为方程",
          "application",
        ),
      ]),
      section("section-5-2", "5.2", "等式的基本性质", [
        kp(
          "kp-equality-property-one",
          "等式两边同加减",
          "运用等式性质完成同加或同减",
        ),
        kp(
          "kp-equality-property-two",
          "等式两边同乘除",
          "运用等式性质完成同乘或同除",
        ),
        kp(
          "kp-equation-property",
          "利用等式性质变形",
          "选择合适的等式性质变形方程",
          "method",
        ),
        kp(
          "kp-simple-equation-property",
          "用等式性质解简单方程",
          "利用等式性质求简单方程的解",
          "operation",
        ),
      ]),
      section("section-5-3", "5.3", "一元一次方程的解法", [
        kp(
          "kp-equation-denominator",
          "去分母",
          "利用等式性质去除方程中的分母",
          "method",
        ),
        kp(
          "kp-equation-parentheses",
          "去括号",
          "正确去除方程中的括号",
          "method",
        ),
        kp("kp-equation-transposition", "移项", "理解并正确进行移项", "method"),
        kp(
          "kp-equation-combine",
          "合并同类项与系数化一",
          "把方程逐步化为 x=a",
          "operation",
        ),
        kp(
          "kp-linear-equation-solve",
          "解方程并检验",
          "完整求解一元一次方程并检验",
          "application",
        ),
      ]),
      section("section-5-4", "5.4", "一元一次方程的应用", [
        kp(
          "kp-application-unknown",
          "设未知数",
          "根据问题合理设置未知数",
          "method",
        ),
        kp(
          "kp-application-relation",
          "寻找等量关系",
          "从题目信息中找出核心等量关系",
          "method",
        ),
        kp(
          "kp-linear-equation-application",
          "列方程解决问题",
          "经历设元、列式、求解和作答全过程",
          "application",
        ),
        kp(
          "kp-application-check",
          "实际问题结果检验",
          "检验方程的解是否符合实际意义",
          "method",
        ),
        kp(
          "kp-application-types",
          "常见数量关系应用",
          "解决行程、工程、配套等基础问题",
          "application",
        ),
      ]),
    ],
  },
  {
    id: "chapter-6",
    index: "第六章",
    title: "图形的初步知识",
    sections: [
      section("section-6-1", "6.1", "几何图形", [
        kp(
          "kp-solid-plane",
          "立体图形与平面图形",
          "识别常见立体图形和平面图形",
        ),
        kp(
          "kp-geometric-figure",
          "从实物抽象几何图形",
          "从实际物体中抽象出几何图形",
          "method",
        ),
        kp(
          "kp-solid-components",
          "立体图形的面、棱和顶点",
          "识别常见立体图形的组成部分",
        ),
        kp(
          "kp-net-view",
          "展开图与视图初步",
          "根据简单展开图或视图识别立体图形",
          "application",
        ),
      ]),
      section("section-6-2", "6.2", "线段、射线和直线", [
        kp(
          "kp-line-ray-segment",
          "线段、射线和直线的区别",
          "从端点和延伸方向区分三类图形",
        ),
        kp(
          "kp-line-notation",
          "线的表示与读法",
          "规范表示并读出线段、射线和直线",
        ),
        kp(
          "kp-line-basic-fact",
          "两点确定一条直线",
          "理解并应用直线的基本事实",
        ),
        kp("kp-line-count", "图中线段的计数", "有序数出图形中的线段", "method"),
      ]),
      section("section-6-3", "6.3", "线段的长短比较", [
        kp(
          "kp-segment-measure",
          "线段长度的测量",
          "使用刻度尺测量线段长度",
          "operation",
        ),
        kp(
          "kp-segment-compare",
          "线段长短的比较方法",
          "用度量或叠合方法比较线段",
        ),
        kp(
          "kp-segment-basic-fact",
          "两点之间线段最短",
          "理解并应用线段的基本事实",
        ),
        kp("kp-distance", "两点间的距离", "理解两点间距离是线段的长度"),
      ]),
      section("section-6-4", "6.4", "线段的和差", [
        kp(
          "kp-segment-sum",
          "线段的和",
          "根据图形关系计算线段之和",
          "operation",
        ),
        kp(
          "kp-segment-difference",
          "线段的差",
          "根据图形关系计算线段之差",
          "operation",
        ),
        kp("kp-segment-midpoint", "线段中点", "利用中点关系求线段长度"),
        kp(
          "kp-segment-sum-difference",
          "线段关系的综合计算",
          "结合和、差与中点解决线段问题",
          "application",
        ),
      ]),
      section("section-6-5", "6.5", "角与角的度量", [
        kp("kp-angle-concept", "角的组成与表示", "识别角的顶点和边并规范表示"),
        kp(
          "kp-angle-measure",
          "用量角器度量角",
          "正确使用量角器测量角",
          "operation",
        ),
        kp(
          "kp-angle-unit-convert",
          "度、分、秒的换算",
          "进行角度单位换算",
          "operation",
        ),
        kp("kp-angle-classify", "角的分类", "识别锐角、直角、钝角、平角和周角"),
      ]),
      section("section-6-6", "6.6", "角的大小比较", [
        kp(
          "kp-angle-compare-method",
          "角大小的比较方法",
          "用度量或叠合方法比较角",
        ),
        kp(
          "kp-angle-compare",
          "多个角的排序",
          "比较并排列多个角的大小",
          "operation",
        ),
        kp("kp-angle-bisector", "角平分线", "理解角平分线并运用相等关系"),
        kp(
          "kp-angle-draw",
          "按要求画角",
          "使用量角器画出指定度数的角",
          "operation",
        ),
      ]),
      section("section-6-7", "6.7", "角的和差", [
        kp("kp-angle-sum", "角的和", "根据图形关系计算角的和", "operation"),
        kp(
          "kp-angle-difference",
          "角的差",
          "根据图形关系计算角的差",
          "operation",
        ),
        kp(
          "kp-angle-sum-difference",
          "角关系的综合计算",
          "结合角平分线计算角度",
          "application",
        ),
        kp(
          "kp-clock-angle",
          "钟面角问题",
          "用角的和差解决钟面问题",
          "application",
        ),
      ]),
      section("section-6-8", "6.8", "余角和补角", [
        kp("kp-complement", "余角的定义", "判断两个角是否互为余角"),
        kp("kp-supplement", "补角的定义", "判断两个角是否互为补角"),
        kp(
          "kp-complement-supplement",
          "求余角与补角",
          "根据角度求其余角或补角",
          "operation",
        ),
        kp(
          "kp-complement-supplement-property",
          "同角余角或补角的性质",
          "运用同角关系判断两个角相等",
          "method",
        ),
      ]),
      section("section-6-9", "6.9", "直线的相交", [
        kp("kp-intersecting-lines", "相交线与交点", "识别两条直线的交点"),
        kp("kp-vertical-angles", "对顶角", "识别对顶角并运用其相等性质"),
        kp("kp-perpendicular", "垂直与垂线", "识别垂直关系并规范表示"),
        kp(
          "kp-perpendicular-fact",
          "过一点作已知直线的垂线",
          "理解垂线的基本事实",
        ),
        kp(
          "kp-point-line-distance",
          "点到直线的距离",
          "理解垂线段长度表示点线距离",
        ),
      ]),
    ],
  },
];
