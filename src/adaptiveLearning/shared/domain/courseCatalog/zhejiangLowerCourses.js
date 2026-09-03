import { kp, section } from "./builders.js";

// 浙教版 七年级下册
export const zhejiangGrade7Down = {
  id: "zhejiang-grade7-math-volume2",
  name: "七年级数学 · 下册",
  grade: "七年级下册",
  gradeKey: "grade7-down",
  subject: "数学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "zj7d-ch1",
      index: "第一章",
      title: "平行线",
      sections: [
        section("zj7d-sec-1-1", "1.1", "平行线的三种位置关系", [
          kp("kp-parallel-def", "平行线的概念", "理解平面内平行线的定义"),
          kp(
            "kp-parallel-draw",
            "平行线的画法与基本事实",
            "过直线外一点有且只有一条直线与已知直线平行",
            "method",
          ),
        ]),
        section("zj7d-sec-1-2", "1.2", "同位角、内错角、同旁内角", [
          kp(
            "kp-three-angles",
            "三线八角识别",
            "准确判断同位角、内错角和同旁内角",
          ),
        ]),
        section("zj7d-sec-1-3", "1.3", "平行线的判定", [
          kp(
            "kp-parallel-test",
            "平行线的三个判定定理",
            "利用角的关系证明两直线平行",
            "operation",
          ),
        ]),
        section("zj7d-sec-1-4", "1.4", "平行线的性质", [
          kp(
            "kp-parallel-prop",
            "平行线的三个性质定理",
            "利用平行关系求解角度",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "zj7d-ch2",
      index: "第二章",
      title: "二元一次方程组",
      sections: [
        section("zj7d-sec-2-1", "2.1", "二元一次方程及其解", [
          kp(
            "kp-2var-eq",
            "二元一次方程的定义与解",
            "理解二元一次方程及其解的不唯一性",
          ),
        ]),
        section("zj7d-sec-2-2", "2.2", "二元一次方程组", [
          kp(
            "kp-2var-sys",
            "二元一次方程组的定义与公共解",
            "理解方程组解的含义",
          ),
        ]),
        section("zj7d-sec-2-3", "2.3", "代入消元法", [
          kp(
            "kp-sub-method",
            "代入法解二元一次方程组",
            "把一个未知数代入另一个方程完成消元",
            "method",
          ),
        ]),
        section("zj7d-sec-2-4", "2.4", "加减消元法", [
          kp(
            "kp-addsub-method",
            "加减法解二元一次方程组",
            "通过加减两方程消去一个未知数",
            "method",
          ),
        ]),
        section("zj7d-sec-2-5", "2.5", "二元一次方程组的应用", [
          kp(
            "kp-2var-app",
            "实际问题与二元一次方程组",
            "设双未知数列方程组解决实际问题",
            "application",
          ),
        ]),
      ],
    },
    {
      id: "zj7d-ch3",
      index: "第三章",
      title: "整式的乘除",
      sections: [
        section("zj7d-sec-3-1", "3.1", "同底数幂的乘法与幂的乘方", [
          kp(
            "kp-power-mul",
            "同底数幂乘法法则",
            "底数不变，指数相加",
            "operation",
          ),
          kp(
            "kp-power-power",
            "幂的乘方法则",
            "底数不变，指数相乘",
            "operation",
          ),
        ]),
        section("zj7d-sec-3-2", "3.2", "积的乘方与同底数幂的除法", [
          kp(
            "kp-prod-power",
            "积的乘方法则",
            "每一项分别乘方后再相乘",
            "operation",
          ),
          kp(
            "kp-power-div",
            "同底数幂除法与零指数",
            "底数不变，指数相减",
            "operation",
          ),
        ]),
        section("zj7d-sec-3-3", "3.3", "单项式与多项式的乘法", [
          kp(
            "kp-mono-poly-mul",
            "整式乘法法则",
            "熟练进行单项式与多项式相乘",
            "operation",
          ),
        ]),
        section("zj7d-sec-3-4", "3.4", "乘法公式", [
          kp(
            "kp-diff-square",
            "平方差公式",
            "利用 (a+b)(a-b)=a²-b² 简便运算",
            "operation",
          ),
          kp(
            "kp-perf-square",
            "完全平方公式",
            "利用 (a±b)²=a²±2ab+b² 计算",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "zj7d-ch4",
      index: "第四章",
      title: "因式分解",
      sections: [
        section("zj7d-sec-4-1", "4.1", "因式分解的意义", [
          kp(
            "kp-factor-concept",
            "因式分解的定义",
            "理解因式分解与整式乘法的互逆关系",
          ),
        ]),
        section("zj7d-sec-4-2", "4.2", "提公因式法", [
          kp(
            "kp-common-factor",
            "公因式的确定与提取",
            "准确找出多项式各项的公因式并提取",
            "method",
          ),
        ]),
        section("zj7d-sec-4-3", "4.3", "公式法", [
          kp(
            "kp-factor-formula",
            "公式法分解因式",
            "运用平方差和完全平方公式分解因式",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "zj7d-ch5",
      index: "第五章",
      title: "分式",
      sections: [
        section("zj7d-sec-5-1", "5.1", "分式的意义与基本性质", [
          kp("kp-fraction-def", "分式有意义的条件", "分母不为零判定分式有意义"),
          kp(
            "kp-fraction-prop",
            "分式的基本性质与约分",
            "分子分母同乘除不为零的整式",
            "operation",
          ),
        ]),
        section("zj7d-sec-5-2", "5.2", "分式的乘除与加减", [
          kp(
            "kp-fraction-op",
            "分式的四则运算",
            "通分与分式乘除加减混合运算",
            "operation",
          ),
        ]),
        section("zj7d-sec-5-3", "5.3", "分式方程", [
          kp(
            "kp-fraction-eq",
            "分式方程的解法与检验",
            "去分母化为整式方程并检验增根",
            "application",
          ),
        ]),
      ],
    },
  ],
};

// 浙教版 八年级上册
export const zhejiangGrade8Up = {
  id: "zhejiang-grade8-math-volume1",
  name: "八年级数学 · 上册",
  grade: "八年级上册",
  gradeKey: "grade8-up",
  subject: "数学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "zj8u-ch1",
      index: "第一章",
      title: "三角形的初步知识",
      sections: [
        section("zj8u-sec-1-1", "1.1", "认识三角形", [
          kp(
            "kp-tri-concept",
            "三角形的边角关系与稳定性",
            "两边之和大于第三边，内角和等于180°",
          ),
        ]),
        section("zj8u-sec-1-2", "1.2", "全等三角形", [
          kp("kp-congruent-tri", "全等三角形的性质", "对应边相等，对应角相等"),
        ]),
        section("zj8u-sec-1-3", "1.3", "探索三角形全等的条件", [
          kp(
            "kp-congruence-criteria",
            "全等判定 SAS/ASA/AAS/SSS",
            "灵活运用判定定理证明三角形全等",
            "method",
          ),
        ]),
      ],
    },
    {
      id: "zj8u-ch2",
      index: "第二章",
      title: "特殊三角形",
      sections: [
        section("zj8u-sec-2-1", "2.1", "等腰三角形", [
          kp(
            "kp-isosceles-tri",
            "等腰三角形的性质与判定",
            "等边对等角与三线合一",
          ),
        ]),
        section("zj8u-sec-2-2", "2.2", "直角三角形与勾股定理", [
          kp(
            "kp-pythagorean",
            "勾股定理及其逆定理",
            "直角三角形中 a²+b²=c² 及其应用",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "zj8u-ch3",
      index: "第三章",
      title: "一元一次不等式",
      sections: [
        section("zj8u-sec-3-1", "3.1", "不等式的基本性质", [
          kp("kp-inequality-prop", "不等式性质", "两边同乘负数改变不等号方向"),
        ]),
        section("zj8u-sec-3-2", "3.2", "一元一次不等式及其解法", [
          kp(
            "kp-linear-ineq-solve",
            "解一元一次不等式并在数轴上表示",
            "正确去分母、移项、化系数",
            "operation",
          ),
        ]),
        section("zj8u-sec-3-3", "3.3", "一元一次不等式组", [
          kp(
            "kp-ineq-system",
            "不等式组公共解集的确定",
            "数轴法与口诀法确定解集",
            "method",
          ),
        ]),
      ],
    },
    {
      id: "zj8u-ch4",
      index: "第四章",
      title: "图形与坐标",
      sections: [
        section("zj8u-sec-4-1", "4.1", "平面直角坐标系", [
          kp(
            "kp-cartesian-coord",
            "点的坐标与象限特征",
            "点到坐标轴的距离与对称点坐标",
          ),
        ]),
      ],
    },
    {
      id: "zj8u-ch5",
      index: "第五章",
      title: "一次函数",
      sections: [
        section("zj8u-sec-5-1", "5.1", "函数与一次函数的概念", [
          kp("kp-func-def", "函数的变量与定义域", "理解因变量与自变量的关系"),
        ]),
        section("zj8u-sec-5-2", "5.2", "一次函数的图象与性质", [
          kp(
            "kp-linear-func-graph",
            "y=kx+b 的图象与性质",
            "k、b对图象倾斜与交点位置的决定作用",
            "application",
          ),
        ]),
      ],
    },
  ],
};
