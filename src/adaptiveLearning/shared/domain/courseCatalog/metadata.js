export const AVAILABLE_SUBJECTS = [
  {
    id: "math",
    name: "数学",
    enabled: true,
    icon: "Calculator",
    badge: "全功能开放",
  },
  { id: "chinese", name: "语文", enabled: false, tip: "敬请期待" },
  { id: "english", name: "英语", enabled: false, tip: "敬请期待" },
  { id: "physics", name: "物理/科学", enabled: false, tip: "敬请期待" },
  { id: "chemistry", name: "化学", enabled: false, tip: "敬请期待" },
  { id: "biology", name: "生物", enabled: false, tip: "敬请期待" },
  { id: "history", name: "历史与道法", enabled: false, tip: "敬请期待" },
];

export const AVAILABLE_GRADES = [
  { id: "grade7-up", name: "七年级上册", shortName: "七上", stage: "初中" },
  { id: "grade7-down", name: "七年级下册", shortName: "七下", stage: "初中" },
  { id: "grade8-up", name: "八年级上册", shortName: "八上", stage: "初中" },
  { id: "grade8-down", name: "八年级下册", shortName: "八下", stage: "初中" },
  { id: "grade9-up", name: "九年级上册", shortName: "九上", stage: "初中" },
  { id: "grade9-down", name: "九年级下册", shortName: "九下", stage: "初中" },
];

export const AVAILABLE_PUBLISHERS = [
  {
    id: "zhejiang",
    name: "浙教版",
    fullName: "浙江教育出版社",
    isDefault: true,
    tag: "已适配精品课件",
  },
  {
    id: "pep",
    name: "人教版",
    fullName: "人民教育出版社 (PEP)",
    tag: "部编标准",
  },
  {
    id: "bnup",
    name: "北师大版",
    fullName: "北京师范大学出版社",
    tag: "新课标",
  },
  { id: "sukeh", name: "苏科版", fullName: "江苏科技出版社", tag: "新课标" },
  {
    id: "ecnu",
    name: "华师大版",
    fullName: "华东师范大学出版社",
    tag: "新课标",
  },
];
