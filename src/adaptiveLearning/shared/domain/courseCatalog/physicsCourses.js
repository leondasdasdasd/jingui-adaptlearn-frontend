import { kp, section } from "./builders.js";

export const pepGrade8UpPhysics = {
  id: "pep-grade8-physics-volume1",
  name: "八年级物理 · 上册",
  grade: "八年级上册",
  gradeKey: "grade8-up",
  subject: "物理",
  publisher: "人教版",
  publisherKey: "pep",
  chapters: [
    {
      id: "chapter-phy-8u-1",
      index: "第一章",
      title: "机械运动",
      sections: [
        section("sec-phy-8u-1-1", "1.1", "长度和时间的测量", [
          kp("kp-phy-length-measure", "长度的单位换算与刻度尺读数", "熟练使用刻度尺并估读到分度值的下一位"),
          kp("kp-phy-time-measure", "时间的测量与秒表使用", "学会使用机械停表和电子秒表精确计时"),
          kp("kp-phy-error-mistake", "误差与错误的本质区别", "理解误差不可避免而错误应当避免，掌握多次测量求平均"),
        ]),
        section("sec-phy-8u-1-2", "1.2", "运动的描述", [
          kp("kp-phy-motion-concept", "机械运动的概念", "理解物理学中物体位置随时间的变化叫机械运动"),
          kp("kp-phy-reference-frame", "参照物的选取与运动相对性", "根据参照物判断静止与运动，理解运动的相对性"),
        ]),
        section("sec-phy-8u-1-3", "1.3", "运动的快慢", [
          kp("kp-phy-velocity-formula", "速度的定义公式及单位换算", "熟练掌握 v=s/t 及 m/s 与 km/h 换算"),
          kp("kp-phy-uniform-motion", "匀速直线运动与图像分析", "理解匀速直线运动特征并判读 s-t 与 v-t 图像"),
        ]),
        section("sec-phy-8u-1-4", "1.4", "测量平均速度", [
          kp("kp-phy-avg-velocity-exp", "斜面小车测平均速度实验", "掌握实验原理 v=s/t、器材组装与平均速度计算"),
        ]),
      ],
    },
    {
      id: "chapter-phy-8u-2",
      index: "第二章",
      title: "声现象",
      sections: [
        section("sec-phy-8u-2-1", "2.1", "声音的产生与传播", [
          kp("kp-phy-sound-source", "发声体的振动与介质传播", "掌握一切发声体都在振动及真空不能传声"),
          kp("kp-phy-sound-speed", "声速与回声测距", "掌握 15℃ 空气声速 340m/s 及利用回声测定距离"),
        ]),
        section("sec-phy-8u-2-2", "2.2", "声音的特性", [
          kp("kp-phy-pitch", "音调与振动频率", "理解物体振动越快频率越高、音调越高"),
          kp("kp-phy-loudness", "响度与振幅及传播距离", "掌握振幅越大、离发声体越近响度越大"),
          kp("kp-phy-timbre", "音色与辨别声音", "理解不同发声体材料与结构决定独特音色"),
        ]),
        section("sec-phy-8u-2-3", "2.3", "声的利用与噪声防治", [
          kp("kp-phy-sound-application", "声传递信息与能量", "区分超声测距、B超与超声碎石、清洗等应用"),
          kp("kp-phy-noise-control", "减弱噪声的三条途径", "掌握在声源处、传播途径中和人耳处防止噪声"),
        ]),
      ],
    },
    {
      id: "chapter-phy-8u-3",
      index: "第三章",
      title: "物态变化",
      sections: [
        section("sec-phy-8u-3-1", "3.1", "温度与温度计", [
          kp("kp-phy-temperature", "摄氏温标与温度计使用", "掌握液体温度计热胀冷缩原理及规范读数"),
        ]),
        section("sec-phy-8u-3-2", "3.2", "熔化和凝固", [
          kp("kp-phy-melting-laws", "晶体与非晶体熔化规律", "掌握晶体熔化吸热且温度不变，区分熔化图象"),
        ]),
        section("sec-phy-8u-3-3", "3.3", "汽化和液化", [
          kp("kp-phy-evaporation-boiling", "蒸发与沸腾的对比及规律", "理解影响蒸发快慢因素与液体沸腾吸热特征"),
          kp("kp-phy-liquefaction", "液化的方法与放热现象", "掌握降低温度和压缩体积两种液化方式"),
        ]),
        section("sec-phy-8u-3-4", "3.4", "升华和凝华", [
          kp("kp-phy-sublimation-deposition", "升华吸热与凝华放热", "识别干冰升华、人工降雨及自然界水循环"),
        ]),
      ],
    },
    {
      id: "chapter-phy-8u-4",
      index: "第四章",
      title: "光现象",
      sections: [
        section("sec-phy-8u-4-1", "4.1", "光的直线传播", [
          kp("kp-phy-light-line", "光沿直线传播及典型应用", "解释日食月食、小孔成像及真空中光速 3x10^8 m/s"),
        ]),
        section("sec-phy-8u-4-2", "4.2", "光的反射与平面镜", [
          kp("kp-phy-reflection-law", "光的反射定律与光路可逆", "掌握三线共面、法线居中、两角相等与作图"),
          kp("kp-phy-plane-mirror", "平面镜成像特点与探究实验", "掌握等大、正立、等距且成虚像的特点"),
        ]),
        section("sec-phy-8u-4-3", "4.3", "光的折射与色散", [
          kp("kp-phy-refraction-law", "光的折射规律与折射现象", "掌握斜射入水中折射光线偏向法线的作图规律"),
          kp("kp-phy-dispersion", "白光色散与色光三原色", "掌握白光通过三棱镜分解为红橙黄绿蓝靛紫"),
        ]),
      ],
    },
    {
      id: "chapter-phy-8u-5",
      index: "第五章",
      title: "透镜及其应用",
      sections: [
        section("sec-phy-8u-5-1", "5.1", "透镜与三条特殊光线", [
          kp("kp-phy-lens-features", "凸透镜会聚与凹透镜发散", "熟练画出通过光心、焦点和与主光轴平行的三条特殊光线"),
        ]),
        section("sec-phy-8u-5-2", "5.2", "凸透镜成像规律", [
          kp("kp-phy-convex-imaging", "凸透镜成像规律及物像动态变化", "掌握物距大于两倍焦距、一二倍焦距间与一倍焦距内成像"),
          kp("kp-phy-camera-projector", "照相机、投影仪与放大镜原理", "联系实际光学仪器的成像规律与物距像距调节"),
        ]),
        section("sec-phy-8u-5-3", "5.3", "眼睛和眼镜", [
          kp("kp-phy-eye-glasses", "近视眼远视眼的成因及矫正", "理解凹透镜使光线发散矫正近视，凸透镜矫正远视"),
        ]),
      ],
    },
    {
      id: "chapter-phy-8u-6",
      index: "第六章",
      title: "质量与密度",
      sections: [
        section("sec-phy-8u-6-1", "6.1", "质量与天平使用", [
          kp("kp-phy-mass-balance", "质量的属性与天平规范称量", "掌握左物右码、游码读数及质量不随形状物态改变"),
        ]),
        section("sec-phy-8u-6-2", "6.2", "密度及其测量", [
          kp("kp-phy-density-calc", "密度的定义公式 rho=m/V 计算", "熟练运用密度公式计算物体质量、体积与密度"),
          kp("kp-phy-density-experiment", "量筒测量固液密度的实验", "掌握先测质量再测体积的防误差测量方案"),
        ]),
      ],
    },
  ],
};

export const pepGrade8DownPhysics = {
  id: "pep-grade8-physics-volume2",
  name: "八年级物理 · 下册",
  grade: "八年级下册",
  gradeKey: "grade8-down",
  subject: "物理",
  publisher: "人教版",
  publisherKey: "pep",
  chapters: [
    {
      id: "chapter-phy-8d-1",
      index: "第七章",
      title: "力",
      sections: [
        section("sec-phy-8d-1-1", "7.1", "力与力的示意图", [
          kp("kp-phy-force-concept", "力的概念与力的三要素", "掌握力是物体对物体的作用及大小方向作用点"),
          kp("kp-phy-force-diagram", "力的示意图画法与相互作用力", "熟练绘制力的示意图，理解作用力与反作用力等大反向"),
        ]),
        section("sec-phy-8d-1-2", "7.2", "重力与弹力", [
          kp("kp-phy-gravity", "重力方向与 G=mg 综合计算", "掌握重力方向竖直向下及重心概念"),
        ]),
      ],
    },
    {
      id: "chapter-phy-8d-2",
      index: "第八章",
      title: "运动和力",
      sections: [
        section("sec-phy-8d-2-1", "8.1", "牛顿第一定律与惯性", [
          kp("kp-phy-newton-first", "牛顿第一定律与伽利略理想实验", "理解一切物体在没有受外力时总保持静止或匀速直线运动"),
          kp("kp-phy-inertia", "惯性现象及其利用与防范", "理解惯性是物体的固有属性，质量是惯性大小的唯一量度"),
        ]),
        section("sec-phy-8d-2-2", "8.2", "二力平衡与摩擦力", [
          kp("kp-phy-two-forces", "二力平衡的条件", "掌握同体、等大、反向、共线四要素"),
          kp("kp-phy-friction", "滑动摩擦力影响因素及增减方法", "掌握压力大小与接触面粗糙程度对摩擦力的影响"),
        ]),
      ],
    },
    {
      id: "chapter-phy-8d-3",
      index: "第九章",
      title: "压强与浮力",
      sections: [
        section("sec-phy-8d-3-1", "9.1", "压强与液体压强", [
          kp("kp-phy-pressure-calc", "固体压强计算公式 p=F/S", "熟练计算压力压强，掌握增大和减小压强的方法"),
          kp("kp-phy-liquid-pressure", "液体压强公式 p=rho*g*h", "理解液体内部各个方向均有压强且随深度增加而增大"),
        ]),
        section("sec-phy-8d-3-2", "9.2", "大气压强与流体压强", [
          kp("kp-phy-atm-pressure", "托里拆利实验与流体压强流速", "掌握标准大气压值及流体流速越大的位置压强越小"),
        ]),
        section("sec-phy-8d-3-3", "9.3", "浮力与阿基米德原理", [
          kp("kp-phy-buoyancy-archimedes", "阿基米德原理及浮沉条件应用", "熟练运用 F浮=G排 计算，分析潜水艇、轮船热气球原理"),
        ]),
      ],
    },
    {
      id: "chapter-phy-8d-4",
      index: "第十章",
      title: "功和机械能及简单机械",
      sections: [
        section("sec-phy-8d-4-1", "10.1", "功与功率的计算", [
          kp("kp-phy-work-concept", "做功的两个必要因素与公式 W=Fs", "判断物体是否做功，熟练运用功的国际单位焦耳计算"),
          kp("kp-phy-power-calc", "功率的概念与公式 P=W/t", "掌握功率是表示做功快慢的物理量，掌握 P=Fv"),
        ]),
        section("sec-phy-8d-4-2", "10.2", "杠杆与滑轮组", [
          kp("kp-phy-lever-balance", "杠杆的五要素与平衡条件", "掌握动力臂阻力臂作图及动力乘以动力臂等于阻力乘以阻力臂"),
          kp("kp-phy-pulley-efficiency", "滑轮组受力分析与机械效率", "熟练计算省力滑轮组绳子段数 n 与机械效率 eta=W有/W总"),
        ]),
      ],
    },
  ],
};

export const pepGrade9UpPhysics = {
  id: "pep-grade9-physics-volume1",
  name: "九年级物理 · 上册",
  grade: "九年级上册",
  gradeKey: "grade9-up",
  subject: "物理",
  publisher: "人教版",
  publisherKey: "pep",
  chapters: [
    {
      id: "chapter-phy-9u-1",
      index: "第十三章",
      title: "内能与热机",
      sections: [
        section("sec-phy-9u-1-1", "13.1", "分子热运动与内能", [
          kp("kp-phy-internal-energy", "分子的热运动与内能概念", "理解温度是分子热运动剧烈程度的标志，掌握做功与热传递"),
          kp("kp-phy-specific-heat-calc", "比热容的吸热放热公式计算", "熟练掌握 Q=cm*dt 计算并分析水比热容大的应用"),
        ]),
        section("sec-phy-9u-1-2", "13.2", "热机与能量守恒定律", [
          kp("kp-phy-heat-engine", "四冲程内燃机工作原理", "掌握吸气、压缩、做功、排气冲程及能量转化"),
          kp("kp-phy-fuel-heat", "燃料的热值与热机效率", "掌握 Q=mq 与热机效率计算公式"),
        ]),
      ],
    },
    {
      id: "chapter-phy-9u-2",
      index: "第十四章",
      title: "电流与电路",
      sections: [
        section("sec-phy-9u-2-1", "14.1", "电荷与电路的组成", [
          kp("kp-phy-electric-charge", "两种电荷与验电器原理", "掌握正负电荷、同种电荷排斥异种电荷吸引"),
          kp("kp-phy-circuit-elements", "电路的三种状态与电路图画法", "区分通路、断路与短路，规范画出串并联电路图"),
        ]),
        section("sec-phy-9u-2-2", "14.2", "串联和并联电路电流规律", [
          kp("kp-phy-current-rule", "电流表的正确使用及电流规律", "掌握串联电路电流处处相等，并联电路干路电流等于支路之和"),
        ]),
      ],
    },
    {
      id: "chapter-phy-9u-3",
      index: "第十五章",
      title: "电压与电阻",
      sections: [
        section("sec-phy-9u-3-1", "15.1", "电压与电压表的使用", [
          kp("kp-phy-voltage-rule", "串并联电路电压规律", "掌握串联分压总电压等于各部分电压之和，并联各支路电压相等"),
        ]),
        section("sec-phy-9u-3-2", "15.2", "电阻与滑动变阻器", [
          kp("kp-phy-resistor-factors", "影响电阻大小的四个因素", "掌握材料、长度、横截面积和温度对电阻的影响"),
          kp("kp-phy-rheostat", "滑动变阻器的正确连接与原理", "掌握一上一下接线柱与改变接入电路电阻丝长度"),
        ]),
      ],
    },
    {
      id: "chapter-phy-9u-4",
      index: "第十六章",
      title: "欧姆定律与电功率",
      sections: [
        section("sec-phy-9u-4-1", "16.1", "欧姆定律及其综合应用", [
          kp("kp-phy-ohm-law", "欧姆定律公式 I=U/R 及变形", "熟练进行串并联电路电压、电流与电阻综合方程求解"),
          kp("kp-phy-voltammetry", "伏安法测电阻实验设计", "掌握实验电路图、多次测量减小误差及滑动变阻器作用"),
        ]),
        section("sec-phy-9u-4-2", "16.2", "电能与电功率计算", [
          kp("kp-phy-electric-power", "电功率公式 P=UI 及推导式", "掌握额定功率与实际功率的区别及计算"),
          kp("kp-phy-joule-law", "焦耳定律 Q=I^2*R*t 及电热", "计算电流产生的热量并分析电热器与防止电热危害"),
        ]),
      ],
    },
  ],
};

export const pepGrade9DownPhysics = {
  id: "pep-grade9-physics-volume2",
  name: "九年级物理 · 下册",
  grade: "九年级下册",
  gradeKey: "grade9-down",
  subject: "物理",
  publisher: "人教版",
  publisherKey: "pep",
  chapters: [
    {
      id: "chapter-phy-9d-1",
      index: "第十七章",
      title: "生活用电与家庭电路",
      sections: [
        section("sec-phy-9d-1-1", "17.1", "家庭电路的组成与连接", [
          kp("kp-phy-home-circuit", "火线零线与试电笔使用", "掌握进户线、电能表、总开关、保险装置与测电笔辨别火线"),
          kp("kp-phy-safe-electricity", "安全用电原则与触电急救", "掌握低压带电体不靠近高压带电体不接触，三孔插座接地线"),
        ]),
      ],
    },
    {
      id: "chapter-phy-9d-2",
      index: "第十八章",
      title: "电与磁及信息时代",
      sections: [
        section("sec-phy-9d-2-1", "18.1", "磁现象与电生磁", [
          kp("kp-phy-magnetism", "磁场性质与地磁场分布", "掌握磁感线方向由 N 极指向 S 极及指南针指向"),
          kp("kp-phy-ampere-rule", "奥斯特实验与安培定则", "用右手握住螺线管判定通电螺线管 N 极与电流方向"),
        ]),
        section("sec-phy-9d-2-2", "18.2", "电动机与发电机", [
          kp("kp-phy-motor-generator", "磁场对电流作用与电磁感应", "区分通电导线在磁场中受力（电动机）与电磁感应（发电机）"),
        ]),
        section("sec-phy-9d-2-3", "18.3", "电磁波与现代通信", [
          kp("kp-phy-em-wave", "电磁波的产生传播与 c=lambda*f", "掌握电磁波在真空中传播速度与现代卫星/无线通信"),
        ]),
      ],
    },
  ],
};

export const pepGrade7UpPhysics = {
  id: "pep-grade7-physics-volume1",
  name: "七年级物理 · 上册 (趣味入门)",
  grade: "七年级上册",
  gradeKey: "grade7-up",
  subject: "物理",
  publisher: "人教版",
  publisherKey: "pep",
  chapters: pepGrade8UpPhysics.chapters.slice(0, 3),
};

export const pepGrade7DownPhysics = {
  id: "pep-grade7-physics-volume2",
  name: "七年级物理 · 下册 (趣味进阶)",
  grade: "七年级下册",
  gradeKey: "grade7-down",
  subject: "物理",
  publisher: "人教版",
  publisherKey: "pep",
  chapters: pepGrade8UpPhysics.chapters.slice(3),
};

export const ALL_PHYSICS_COURSES = [
  pepGrade8UpPhysics,
  pepGrade8DownPhysics,
  pepGrade9UpPhysics,
  pepGrade9DownPhysics,
  pepGrade7UpPhysics,
  pepGrade7DownPhysics,
];
