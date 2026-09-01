import { kp, section } from "./builders.js";

const GRADE7_UP_COURSE_NAME = "七年级数学 · 上册";

// 人教版 (PEP) 七年级上册
export const pepGrade7Up = {
  id: "pep-grade7-math-volume1",
  name: GRADE7_UP_COURSE_NAME,
  grade: "七年级上册",
  gradeKey: "grade7-up",
  subject: "数学",
  publisher: "人教版",
  publisherKey: "pep",
  chapters: [
    {
      id: "pep7u-ch1",
      index: "第一章",
      title: "有理数",
      sections: [
        section("pep7u-sec-1-1", "1.1", "正数和负数", [
          kp("kp-pep-pos-neg", "正数和负数", "理解正负数及实际生活中的表达"),
        ]),
        section("pep7u-sec-1-2", "1.2", "有理数与数轴", [
          kp(
            "kp-pep-numline",
            "数轴、相反数与绝对值",
            "理解几何意义并进行运算",
          ),
        ]),
        section("pep7u-sec-1-3", "1.3", "有理数的加减法", [
          kp(
            "kp-pep-addsub",
            "有理数的加法与减法运算",
            "掌握符号确定与绝对值计算",
            "operation",
          ),
        ]),
        section("pep7u-sec-1-4", "1.4", "有理数的乘除法与乘方", [
          kp(
            "kp-pep-muldiv",
            "乘除运算法则与科学记数法",
            "混合运算法则",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "pep7u-ch2",
      index: "第二章",
      title: "整式的加减",
      sections: [
        section("pep7u-sec-2-1", "2.1", "整式", [
          kp("kp-pep-monomial", "单项式与多项式", "系数、次数与项"),
        ]),
        section("pep7u-sec-2-2", "2.2", "整式的加减", [
          kp("kp-pep-polyadd", "合并同类项与去括号", "化简与求值", "operation"),
        ]),
      ],
    },
    {
      id: "pep7u-ch3",
      index: "第三章",
      title: "一元一次方程",
      sections: [
        section("pep7u-sec-3-1", "3.1", "从算式到方程", [
          kp("kp-pep-eq-prop", "等式的基本性质", "利用性质变形方程"),
        ]),
        section("pep7u-sec-3-2", "3.2", "解一元一次方程", [
          kp(
            "kp-pep-solve-eq",
            "移项、去括号与去分母",
            "完整解题步骤",
            "operation",
          ),
        ]),
        section("pep7u-sec-3-3", "3.3", "实际问题与一元一次方程", [
          kp(
            "kp-pep-eq-app",
            "工程、配套与行程问题建模",
            "分析等量关系列式求解",
            "application",
          ),
        ]),
      ],
    },
    {
      id: "pep7u-ch4",
      index: "第四章",
      title: "几何图形初步",
      sections: [
        section("pep7u-sec-4-1", "4.1", "立体图形与平面图形", [
          kp("kp-pep-geom-intro", "认识几何体与视图", "从不同方向看几何体"),
        ]),
        section("pep7u-sec-4-2", "4.2", "直线、射线、线段与角", [
          kp(
            "kp-pep-line-angle",
            "线段中点与角的和差度量",
            "线段长短与角度计算",
            "operation",
          ),
        ]),
      ],
    },
  ],
};

// 北师大版 (BNUP) 七年级上册
export const bnupGrade7Up = {
  id: "bnup-grade7-math-volume1",
  name: GRADE7_UP_COURSE_NAME,
  grade: "七年级上册",
  gradeKey: "grade7-up",
  subject: "数学",
  publisher: "北师大版",
  publisherKey: "bnup",
  chapters: [
    {
      id: "bnup7u-ch1",
      index: "第一章",
      title: "丰富的图形世界",
      sections: [
        section("bnup7u-sec-1-1", "1.1", "生活中的立体图形与展开图", [
          kp("kp-bnup-shapes", "截一个几何体与视图", "观察空间图形特征"),
        ]),
      ],
    },
    {
      id: "bnup7u-ch2",
      index: "第二章",
      title: "有理数及其运算",
      sections: [
        section("bnup7u-sec-2-1", "2.1", "有理数的意义与数轴", [
          kp("kp-bnup-rational-def", "相反数与绝对值", "理解数轴上的点"),
        ]),
        section("bnup7u-sec-2-2", "2.2", "有理数的混合运算", [
          kp(
            "kp-bnup-rational-calc",
            "加减乘除与乘方综合",
            "运算律与简便计算",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "bnup7u-ch3",
      index: "第三章",
      title: "整式及其加减",
      sections: [
        section("bnup7u-sec-3-1", "3.1", "用字母表示数与代数式", [
          kp(
            "kp-bnup-algebra",
            "代数式的值与整式加减",
            "探索规律与去括号",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "bnup7u-ch4",
      index: "第四章",
      title: "基本平面图形",
      sections: [
        section("bnup7u-sec-4-1", "4.1", "线段、射线、直线与角", [
          kp(
            "kp-bnup-plane-geom",
            "线段比较与角平分线",
            "多边形和圆的初步认识",
          ),
        ]),
      ],
    },
    {
      id: "bnup7u-ch5",
      index: "第五章",
      title: "一元一次方程",
      sections: [
        section("bnup7u-sec-5-1", "5.1", "一元一次方程的应用", [
          kp(
            "kp-bnup-eq-solve",
            "日历中的方程与求解应用",
            "掌握方程建模思维",
            "application",
          ),
        ]),
      ],
    },
  ],
};

// 苏科版 七年级上册
export const sukehGrade7Up = {
  id: "sukeh-grade7-math-volume1",
  name: GRADE7_UP_COURSE_NAME,
  grade: "七年级上册",
  gradeKey: "grade7-up",
  subject: "数学",
  publisher: "苏科版",
  publisherKey: "sukeh",
  chapters: [
    {
      id: "sk7u-ch1",
      index: "第一章",
      title: "数学与我们同行",
      sections: [
        section("sk7u-sec-1-1", "1.1", "走进数学世界", [
          kp("kp-sk-intro", "数学活动与思维探究", "感受生活中的数学规律"),
        ]),
      ],
    },
    {
      id: "sk7u-ch2",
      index: "第二章",
      title: "有理数",
      sections: [
        section("sk7u-sec-2-1", "2.1", "有理数与数轴绝对值", [
          kp("kp-sk-numline", "有理数分类与大小比较", "掌握数轴几何意义"),
        ]),
        section("sk7u-sec-2-2", "2.2", "有理数的加法减法与乘除", [
          kp("kp-sk-calc", "有理数运算法则与乘方", "四则混合运算", "operation"),
        ]),
      ],
    },
    {
      id: "sk7u-ch3",
      index: "第三章",
      title: "用字母表示数",
      sections: [
        section("sk7u-sec-3-1", "3.1", "代数式与整式", [
          kp(
            "kp-sk-algebra",
            "合并同类项与整式化简",
            "代数式求值",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "sk7u-ch4",
      index: "第四章",
      title: "一元一次方程",
      sections: [
        section("sk7u-sec-4-1", "4.1", "等式的性质与一元一次方程解法", [
          kp(
            "kp-sk-eq",
            "解一元一次方程及其实际应用",
            "行程与分配问题建模",
            "application",
          ),
        ]),
      ],
    },
  ],
};

// 华师大版 七年级上册
export const ecnuGrade7Up = {
  id: "ecnu-grade7-math-volume1",
  name: GRADE7_UP_COURSE_NAME,
  grade: "七年级上册",
  gradeKey: "grade7-up",
  subject: "数学",
  publisher: "华师大版",
  publisherKey: "ecnu",
  chapters: [
    {
      id: "ecnu7u-ch1",
      index: "第1章",
      title: "走进数学世界",
      sections: [
        section("ecnu7u-sec-1-1", "1.1", "数学伴我们成长", [
          kp(
            "kp-ecnu-intro",
            "数学伴我们成长与人类离不开数学",
            "探索数与形的规律",
          ),
        ]),
      ],
    },
    {
      id: "ecnu7u-ch2",
      index: "第2章",
      title: "有理数",
      sections: [
        section("ecnu7u-sec-2-1", "2.1", "有理数与相反数绝对值", [
          kp("kp-ecnu-rat", "有理数的基本概念与数轴", "绝对值化简与大小比较"),
        ]),
        section("ecnu7u-sec-2-2", "2.2", "有理数的运算", [
          kp(
            "kp-ecnu-calc",
            "有理数四则运算与科学记数法",
            "混合运算法则",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "ecnu7u-ch3",
      index: "第3章",
      title: "整式的加减",
      sections: [
        section("ecnu7u-sec-3-1", "3.1", "单项式与多项式", [
          kp(
            "kp-ecnu-poly",
            "去括号与合并同类项",
            "整式加减综合运算",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "ecnu7u-ch4",
      index: "第4章",
      title: "图形的初步认识",
      sections: [
        section("ecnu7u-sec-4-1", "4.1", "生活中的立体图形与平面图形", [
          kp(
            "kp-ecnu-geom",
            "线段、射线、直线与角",
            "角平分线与垂直性质",
            "operation",
          ),
        ]),
      ],
    },
  ],
};
