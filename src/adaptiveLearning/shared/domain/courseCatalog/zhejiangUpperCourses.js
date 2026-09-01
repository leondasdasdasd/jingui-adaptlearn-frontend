import { kp, section } from "./builders.js";

// 浙教版 八年级下册
export const zhejiangGrade8Down = {
  id: "zhejiang-grade8-math-volume2",
  name: "八年级数学 · 下册",
  grade: "八年级下册",
  gradeKey: "grade8-down",
  subject: "数学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "zj8d-ch1",
      index: "第一章",
      title: "二次根式",
      sections: [
        section("zj8d-sec-1-1", "1.1", "二次根式的概念与性质", [
          kp("kp-radical-def", "二次根式有意义的条件", "被开方数大于等于零"),
        ]),
        section("zj8d-sec-1-2", "1.2", "二次根式的四则运算", [
          kp(
            "kp-radical-calc",
            "最简二次根式与运算",
            "化简与加减乘除混合运算",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "zj8d-ch2",
      index: "第二章",
      title: "一元二次方程",
      sections: [
        section("zj8d-sec-2-1", "2.1", "一元二次方程及其解法", [
          kp(
            "kp-quad-eq-solve",
            "配方法与公式法",
            "求根公式 x=(-b±√(b²-4ac))/(2a)",
            "operation",
          ),
        ]),
        section("zj8d-sec-2-2", "2.2", "一元二次方程的根的判别式与应用", [
          kp(
            "kp-quad-discriminant",
            "Δ=b²-4ac 与根的情况",
            "判别根的个数及实际应用",
            "application",
          ),
        ]),
      ],
    },
    {
      id: "zj8d-ch3",
      index: "第三章",
      title: "平行四边形与特殊平行四边形",
      sections: [
        section("zj8d-sec-3-1", "3.1", "平行四边形的性质与判定", [
          kp(
            "kp-parallelogram",
            "平行四边形对边对角对角线性质",
            "灵活运用五个判定定理",
            "method",
          ),
        ]),
        section("zj8d-sec-3-2", "3.2", "矩形、菱形与正方形", [
          kp(
            "kp-special-quad",
            "特殊平行四边形的转化关系",
            "掌握对称性、中点四边形与性质",
            "application",
          ),
        ]),
      ],
    },
    {
      id: "zj8d-ch4",
      index: "第四章",
      title: "反比例函数",
      sections: [
        section("zj8d-sec-4-1", "4.1", "反比例函数的图象与性质", [
          kp(
            "kp-inverse-prop-func",
            "y=k/x 的双曲线特征",
            "k 的几何意义与面积不变性",
            "application",
          ),
        ]),
      ],
    },
  ],
};

// 浙教版 九年级上册
export const zhejiangGrade9Up = {
  id: "zhejiang-grade9-math-volume1",
  name: "九年级数学 · 上册",
  grade: "九年级上册",
  gradeKey: "grade9-up",
  subject: "数学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "zj9u-ch1",
      index: "第一章",
      title: "二次函数",
      sections: [
        section("zj9u-sec-1-1", "1.1", "二次函数的概念与图象", [
          kp(
            "kp-quad-func-concept",
            "抛物线的顶点与对称轴",
            "y=a(x-h)²+k 与一般式的转化",
          ),
        ]),
        section("zj9u-sec-1-2", "1.2", "二次函数的性质与最值", [
          kp(
            "kp-quad-func-maxmin",
            "二次函数在闭区间上的最值",
            "解决利润、面积等实际最大值问题",
            "application",
          ),
        ]),
      ],
    },
    {
      id: "zj9u-ch2",
      index: "第二章",
      title: "简单事件的概率",
      sections: [
        section("zj9u-sec-2-1", "2.1", "概率的意义与计算", [
          kp(
            "kp-prob-calc",
            "树状图与列表法求概率",
            "掌握古典概型计算方法",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "zj9u-ch3",
      index: "第三章",
      title: "圆的基本性质",
      sections: [
        section("zj9u-sec-3-1", "3.1", "圆的对称性与垂径定理", [
          kp(
            "kp-circle-symmetry",
            "垂径定理及其推论",
            "垂直于弦的直径平分弦与弧",
            "method",
          ),
        ]),
        section("zj9u-sec-3-2", "3.2", "圆心角、弧、弦与圆周角定理", [
          kp(
            "kp-inscribed-angle",
            "同弧所对圆周角与圆心角关系",
            "直径所对圆周角为 90°",
            "operation",
          ),
        ]),
      ],
    },
    {
      id: "zj9u-ch4",
      index: "第四章",
      title: "相似三角形",
      sections: [
        section("zj9u-sec-4-1", "4.1", "比例线段与相似三角形判定", [
          kp(
            "kp-similar-tri-test",
            "相似判定 AA/SAS/SSS",
            "掌握判定定理与射影定理",
            "method",
          ),
        ]),
        section("zj9u-sec-4-2", "4.2", "相似三角形的性质与应用", [
          kp(
            "kp-similar-tri-app",
            "周长比等于相似比，面积比等于平方比",
            "解决测量高度与距离等几何建模",
            "application",
          ),
        ]),
      ],
    },
  ],
};

// 浙教版 九年级下册
export const zhejiangGrade9Down = {
  id: "zhejiang-grade9-math-volume2",
  name: "九年级数学 · 下册",
  grade: "九年级下册",
  gradeKey: "grade9-down",
  subject: "数学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "zj9d-ch1",
      index: "第一章",
      title: "解直角三角形",
      sections: [
        section("zj9d-sec-1-1", "1.1", "锐角三角函数", [
          kp(
            "kp-trig-func",
            "正弦、余弦与正切的定义",
            "sin/cos/tan 及特殊角函数值",
            "operation",
          ),
        ]),
        section("zj9d-sec-1-2", "1.2", "解直角三角形的应用", [
          kp(
            "kp-trig-app",
            "仰角、俯角、坡度与方向角",
            "构造直角三角形模型解决实际测量",
            "application",
          ),
        ]),
      ],
    },
    {
      id: "zj9d-ch2",
      index: "第二章",
      title: "直线与圆的位置关系",
      sections: [
        section("zj9d-sec-2-1", "2.1", "切线的判定与性质", [
          kp(
            "kp-tangent-line",
            "圆的切线性质定理与判定",
            "经过半径外端且垂直于半径的直线",
            "method",
          ),
        ]),
      ],
    },
    {
      id: "zj9d-ch3",
      index: "第三章",
      title: "投影与三视图",
      sections: [
        section("zj9d-sec-3-1", "3.1", "平行投影与正投影", [
          kp(
            "kp-projection",
            "主视图、左视图与俯视图",
            "长对正、高平齐、宽相等",
          ),
        ]),
      ],
    },
  ],
};
