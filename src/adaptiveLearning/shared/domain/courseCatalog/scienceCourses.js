import { kp, section } from "./builders.js";

export const zhejiangGrade7UpScience = {
  id: "zhejiang-grade7-science-volume1",
  name: "七年级科学 · 上册",
  grade: "七年级上册",
  gradeKey: "grade7-up",
  subject: "科学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "chapter-sci-7u-1",
      index: "第一章",
      title: "科学入门",
      sections: [
        section("sec-sci-7u-1-1", "1.1", "科学并不神秘", [
          kp("kp-sci-nature", "科学的本质与意义", "理解科学源于对自然界的好奇与探索"),
          kp("kp-sci-tech", "科学技术改变生活", "认识科技发展对人类文明与环境的双重影响"),
        ]),
        section("sec-sci-7u-1-2", "1.2", "走进科学实验室", [
          kp("kp-sci-lab-tools", "常见实验仪器的识别与使用", "熟练辨识试管、烧杯、量筒、酒精灯并掌握基本操作"),
          kp("kp-sci-lab-safety", "实验室安全与应急措施", "牢记实验室安全守则及触电、灼伤的应急救护"),
        ]),
        section("sec-sci-7u-1-3", "1.3", "科学观察", [
          kp("kp-sci-observation", "定性观察与定量观察", "掌握直接感官观察与利用工具定量观察的方法"),
          kp("kp-sci-obs-record", "观察现象的记录与分析", "学会客观记录实验现象并进行归纳总结"),
        ]),
        section("sec-sci-7u-1-4", "1.4", "科学测量", [
          kp("kp-sci-length", "长度的测量与刻度尺读数", "掌握长度单位换算、刻度尺估读及误差分析"),
          kp("kp-sci-volume", "体积的测量与量筒使用", "掌握量筒视线平视凹液面最低处及排水法测体积"),
          kp("kp-sci-temperature", "温度的测量与温度计", "理解液体温度计原理及规范测量读数"),
          kp("kp-sci-mass", "质量的测量与天平使用", "掌握托盘天平的调平衡与称量规范"),
        ]),
        section("sec-sci-7u-1-5", "1.5", "科学探究", [
          kp("kp-sci-inquiry-steps", "科学探究的基本环节", "熟练掌握提出问题、建立假设、设计方案等要素"),
          kp("kp-sci-control-variable", "控制变量法及其应用", "掌握在实验中保持单一变量的探究设计思想"),
        ]),
      ],
    },
    {
      id: "chapter-sci-7u-2",
      index: "第二章",
      title: "观察生物",
      sections: [
        section("sec-sci-7u-2-1", "2.1", "生物与非生物", [
          kp("kp-sci-living-things", "生物的基本生命特征", "根据营养、呼吸、繁殖等基本生命特征判断生物"),
          kp("kp-sci-microscope", "光学显微镜的构造与操作", "掌握取镜、对光、安片、调焦等规范显微镜步骤"),
        ]),
        section("sec-sci-7u-2-2", "2.2", "细胞的结构与功能", [
          kp("kp-sci-cell-structure", "动植物细胞结构异同", "对比细胞壁、细胞膜、叶绿体、液泡与线粒体功能"),
          kp("kp-sci-cell-theory", "细胞学说与生命基本单位", "理解细胞是构成生物体结构与功能的基本单位"),
        ]),
        section("sec-sci-7u-2-3", "2.3", "常见的动物与分类", [
          kp("kp-sci-vertebrates", "脊椎动物五大类群特征", "掌握鱼类、两栖类、爬行类、鸟类与哺乳类的主要特征"),
          kp("kp-sci-invertebrates", "常见无脊椎动物的多样性", "认识节肢动物、软体动物、环节动物的特征与代表"),
          kp("kp-sci-dichotomy", "二歧分类法的应用", "学会使用二歧检索表鉴定与分类常见生物"),
        ]),
        section("sec-sci-7u-2-4", "2.4", "常见的植物", [
          kp("kp-sci-seed-plants", "被子植物与裸子植物", "掌握种子植物两大分类及果实和种子的结构区别"),
          kp("kp-sci-spore-plants", "藻类、苔藓与蕨类植物", "理解孢子植物形态特征与适于生活的生境"),
        ]),
        section("sec-sci-7u-2-5", "2.5", "物种的多样性与保护", [
          kp("kp-sci-biodiversity", "生物多样性的内涵与价值", "理解物种多样性、遗传多样性与生态系统多样性"),
          kp("kp-sci-conservation", "生物多样性丧失与就地保护", "掌握建立自然保护区等生物保护的关键措施"),
        ]),
      ],
    },
    {
      id: "chapter-sci-7u-3",
      index: "第三章",
      title: "人类的家园——地球",
      sections: [
        section("sec-sci-7u-3-1", "3.1", "地球的形状与大小", [
          kp("kp-sci-earth-shape", "地球形状的认识历程", "理解证明地球是球体的证据与地球基本尺寸"),
        ]),
        section("sec-sci-7u-3-2", "3.2", "地球仪与地图", [
          kp("kp-sci-globe-lat-lon", "经纬网与地理位置定位", "掌握经纬线特点及利用经纬度确定地球表面位置"),
          kp("kp-sci-map-scale", "地图三要素与比例尺应用", "熟练运用比例尺、方向与图例进行地图判读"),
        ]),
        section("sec-sci-7u-3-3", "3.3", "组成地壳的岩石与地质变动", [
          kp("kp-sci-rocks", "三大类岩石成因及转化", "识别岩浆岩、沉积岩和变质岩及其地质循环"),
          kp("kp-sci-earthquake", "火山与地震的成因与防范", "理解板块运动导致的地质灾害及避险自救常识"),
        ]),
        section("sec-sci-7u-3-4", "3.4", "板块构造学说与地形图", [
          kp("kp-sci-plate-tectonics", "大陆漂移假说与板块构造", "掌握全球六大板块分布及生长边界与消亡边界"),
          kp("kp-sci-contour-map", "等高线地形图的判读", "识别山峰、山脊、山谷、鞍部和陡崖特征"),
        ]),
      ],
    },
    {
      id: "chapter-sci-7u-4",
      index: "第四章",
      title: "物质的特性",
      sections: [
        section("sec-sci-7u-4-1", "4.1", "物质的微观构成", [
          kp("kp-sci-molecules", "分子动理论与微观粒子", "理解物质由分子原子构成，微粒永不停息运动"),
          kp("kp-sci-diffusion", "扩散现象与分子间作用力", "用分子扩散解释生活现象，认识分子引力与斥力"),
        ]),
        section("sec-sci-7u-4-2", "4.2", "质量与物质的密度", [
          kp("kp-sci-density-concept", "密度的定义与公式计算", "理解密度的物理意义，掌握 rho=m/V 的综合计算"),
          kp("kp-sci-density-measure", "物质密度的测量与应用", "掌握量筒排水法测量形状不规则物体密度"),
        ]),
        section("sec-sci-7u-4-3", "4.3", "物质的比热容", [
          kp("kp-sci-specific-heat", "比热容的概念与吸热公式", "理解比热容的物理含义，掌握热量计算公式 Q=cm*dt"),
        ]),
        section("sec-sci-7u-4-4", "4.4", "物态变化及其规律", [
          kp("kp-sci-melting-freezing", "熔化与凝固规律及图象", "掌握晶体熔点特征及物态变化过程中的吸放热"),
          kp("kp-sci-vaporization", "汽化、液化与升华凝华", "对比蒸发与沸腾，辨析液化放热与升华吸热现象"),
        ]),
      ],
    },
  ],
};

export const zhejiangGrade7DownScience = {
  id: "zhejiang-grade7-science-volume2",
  name: "七年级科学 · 下册",
  grade: "七年级下册",
  gradeKey: "grade7-down",
  subject: "科学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "chapter-sci-7d-1",
      index: "第一章",
      title: "水和水资源",
      sections: [
        section("sec-sci-7d-1-1", "1.1", "地球上的水与水循环", [
          kp("kp-sci-water-cycle", "水在自然界的循环过程", "掌握蒸发、水汽输送、降水、地表径流等环节"),
        ]),
        section("sec-sci-7d-1-2", "1.2", "水的组成与电解水实验", [
          kp("kp-sci-electrolysis", "电解水实验及产物检验", "记住正氧负氢、体积比一比二的实验结论"),
        ]),
        section("sec-sci-7d-1-3", "1.3", "水的净化与溶液", [
          kp("kp-sci-water-purification", "沉淀过滤蒸馏等净水方法", "掌握混合物分离的物理方法与明矾净水作用"),
        ]),
      ],
    },
    {
      id: "chapter-sci-7d-2",
      index: "第二章",
      title: "空气与生命",
      sections: [
        section("sec-sci-7d-2-1", "2.1", "空气的成分与氧气性质", [
          kp("kp-sci-air-composition", "空气中各组分体积分数", "牢记氮气约78%、氧气约21%及稀有气体常识"),
          kp("kp-sci-oxygen", "氧气的物理化学性质与制取", "掌握氧气助燃性与高锰酸钾分解制氧实验"),
        ]),
        section("sec-sci-7d-2-2", "2.2", "呼吸作用与光合作用", [
          kp("kp-sci-respiration", "生物呼吸作用释放能量", "理解有机物被氧化分解并产生二氧化碳和水"),
          kp("kp-sci-photosynthesis", "绿色植物光合作用", "掌握光合作用原料、产物、条件与场所"),
        ]),
      ],
    },
    {
      id: "chapter-sci-7d-3",
      index: "第三章",
      title: "植物的生长与繁衍",
      sections: [
        section("sec-sci-7d-3-1", "3.1", "种子的萌发与幼苗生长", [
          kp("kp-sci-seed-germination", "种子萌发的外界条件", "掌握充足水分、适宜温度与充足空气三要素"),
        ]),
        section("sec-sci-7d-3-2", "3.2", "植物的营养器官与功能", [
          kp("kp-sci-plant-organs", "根茎叶的水分与有机物运输", "掌握导管输导水分无机盐与筛管运输有机物"),
        ]),
      ],
    },
  ],
};

export const zhejiangGrade8UpScience = {
  id: "zhejiang-grade8-science-volume1",
  name: "八年级科学 · 上册",
  grade: "八年级上册",
  gradeKey: "grade8-up",
  subject: "科学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "chapter-sci-8u-1",
      index: "第一章",
      title: "水和溶液",
      sections: [
        section("sec-sci-8u-1-1", "1.1", "浮力与阿基米德原理", [
          kp("kp-sci-buoyancy", "浮力的产生原因与计算", "理解上下表面压力差及 F浮=rho*g*V排"),
          kp("kp-sci-floating-conditions", "物体的浮沉条件及应用", "对比物体重力与浮力，分析漂浮、悬浮与沉底"),
        ]),
        section("sec-sci-8u-1-2", "1.2", "物质的溶解与溶解度", [
          kp("kp-sci-solubility", "饱和溶液与溶解度曲线", "熟练运用溶解度曲线分析溶质质量分数"),
        ]),
      ],
    },
    {
      id: "chapter-sci-8u-2",
      index: "第二章",
      title: "天气与气候",
      sections: [
        section("sec-sci-8u-2-1", "2.1", "大气的温度与气压", [
          kp("kp-sci-air-pressure", "大气压强的存在与测量", "掌握托里拆利实验原理与气压对沸点的影响"),
        ]),
        section("sec-sci-8u-2-2", "2.2", "风的成因与天气系统", [
          kp("kp-sci-wind-weather", "气压梯度与冷锋暖锋", "解释高低压中心及常见锋面过境时的天气特征"),
        ]),
      ],
    },
    {
      id: "chapter-sci-8u-3",
      index: "第三章",
      title: "生命活动的调节",
      sections: [
        section("sec-sci-8u-3-1", "3.1", "植物的感应性与激素调节", [
          kp("kp-sci-tropism", "植物向光性与生长素作用", "掌握单侧光引起生长素背光侧分布多而向光弯曲"),
        ]),
        section("sec-sci-8u-3-2", "3.2", "人体的神经系统与反射弧", [
          kp("kp-sci-reflex-arc", "反射与反射弧五部分构造", "掌握感受器、传入神经、神经中枢、传出神经、效应器"),
        ]),
      ],
    },
    {
      id: "chapter-sci-8u-4",
      index: "第四章",
      title: "电路探秘",
      sections: [
        section("sec-sci-8u-4-1", "4.1", "电荷与电流", [
          kp("kp-sci-electric-current", "电流的形成与方向", "掌握电荷定向移动形成电流及电流表的使用"),
        ]),
        section("sec-sci-8u-4-2", "4.2", "电压、电阻与欧姆定律", [
          kp("kp-sci-ohm-law", "欧姆定律及其计算应用", "掌握 I=U/R 并熟练解决串并联电路计算"),
        ]),
      ],
    },
  ],
};

export const zhejiangGrade8DownScience = {
  id: "zhejiang-grade8-science-volume2",
  name: "八年级科学 · 下册",
  grade: "八年级下册",
  gradeKey: "grade8-down",
  subject: "科学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "chapter-sci-8d-1",
      index: "第一章",
      title: "电与磁",
      sections: [
        section("sec-sci-8d-1-1", "1.1", "磁场与磁感线", [
          kp("kp-sci-magnetic-field", "磁体与磁场基本性质", "掌握磁极间相互作用与磁感线空间分布规律"),
        ]),
        section("sec-sci-8d-1-2", "1.2", "电生磁与电磁铁", [
          kp("kp-sci-electromagnet", "奥斯特实验与安培定则", "用右手螺旋定则判断通电螺线管磁极方向"),
        ]),
        section("sec-sci-8d-1-3", "1.3", "电磁感应与发电机", [
          kp("kp-sci-electromagnetic-induction", "法拉第电磁感应定律", "掌握闭合电路一部分导体切割磁感线产生感应电流"),
        ]),
      ],
    },
    {
      id: "chapter-sci-8d-2",
      index: "第二章",
      title: "微粒的模型与符号",
      sections: [
        section("sec-sci-8d-2-1", "2.1", "原子结构与元素符号", [
          kp("kp-sci-atomic-structure", "原子核与核外电子", "理解质子数等于中子数等于核外电子数的电中性"),
        ]),
        section("sec-sci-8d-2-2", "2.2", "化学式与化合价", [
          kp("kp-sci-chemical-formula", "根据化合价书写化学式", "掌握化合物中正负化合价代数和为零的原则"),
        ]),
      ],
    },
  ],
};

export const zhejiangGrade9UpScience = {
  id: "zhejiang-grade9-science-volume1",
  name: "九年级科学 · 上册",
  grade: "九年级上册",
  gradeKey: "grade9-up",
  subject: "科学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "chapter-sci-9u-1",
      index: "第一章",
      title: "物质及其变化",
      sections: [
        section("sec-sci-9u-1-1", "1.1", "常见的酸与碱", [
          kp("kp-sci-acids-bases", "盐酸硫酸与氢氧化钠性质", "掌握常见酸碱的腐蚀性、通性与指标剂反应"),
        ]),
        section("sec-sci-9u-1-2", "1.2", "酸碱中和反应与盐", [
          kp("kp-sci-neutralization", "酸碱中和反应的实质", "理解 H+ 与 OH- 结合生成水的微观本质"),
        ]),
      ],
    },
    {
      id: "chapter-sci-9u-2",
      index: "第二章",
      title: "能量的转化与守恒",
      sections: [
        section("sec-sci-9u-2-1", "2.1", "功与功率的计算", [
          kp("kp-sci-work-power", "机械功与功率的定义公式", "掌握 W=Fs 及 P=W/t 的标准国际单位与运算"),
        ]),
        section("sec-sci-9u-2-2", "2.2", "杠杆与滑轮机械效率", [
          kp("kp-sci-levers-pulleys", "杠杆平衡条件与机械效率", "熟练运用 F1*L1=F2*L2 及有用功总功计算"),
        ]),
      ],
    },
  ],
};

export const zhejiangGrade9DownScience = {
  id: "zhejiang-grade9-science-volume2",
  name: "九年级科学 · 下册",
  grade: "九年级下册",
  gradeKey: "grade9-down",
  subject: "科学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    {
      id: "chapter-sci-9d-1",
      index: "第一章",
      title: "演化的自然",
      sections: [
        section("sec-sci-9d-1-1", "1.1", "宇宙的起源与恒星演化", [
          kp("kp-sci-universe-origin", "大爆炸宇宙论与太阳系形成", "掌握恒星演化阶段及光谱红移支持宇宙膨胀"),
        ]),
        section("sec-sci-9d-1-2", "1.2", "生命的起源与生物进化", [
          kp("kp-sci-evolution", "自然选择学说与化石证据", "理解过度繁殖、生存斗争、遗传变异与适者生存"),
        ]),
      ],
    },
    {
      id: "chapter-sci-9d-2",
      index: "第二章",
      title: "生物与环境及健康",
      sections: [
        section("sec-sci-9d-2-1", "2.1", "生态系统与生态平衡", [
          kp("kp-sci-ecosystem", "生态系统的组成与食物链", "掌握生产者、消费者、分解者及能量单向流动"),
        ]),
        section("sec-sci-9d-2-2", "2.2", "传染病的预防与免疫", [
          kp("kp-sci-immunity", "控制传染源切断传播途径与抗体", "掌握非特异性免疫与特异性免疫的三道防线"),
        ]),
      ],
    },
  ],
};

export const ALL_SCIENCE_COURSES = [
  zhejiangGrade7UpScience,
  zhejiangGrade7DownScience,
  zhejiangGrade8UpScience,
  zhejiangGrade8DownScience,
  zhejiangGrade9UpScience,
  zhejiangGrade9DownScience,
];
