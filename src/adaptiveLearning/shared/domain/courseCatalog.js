export const AVAILABLE_SUBJECTS = [
  { id: "math", name: "数学" },
  { id: "english", name: "英语" },
  { id: "physics", name: "物理" },
];

export const AVAILABLE_GRADES = [
  { id: "grade-7", name: "七年级", term: "上册" },
  { id: "grade-8", name: "八年级", term: "上册" },
  { id: "grade-9", name: "九年级", term: "上册" },
];

export const AVAILABLE_PUBLISHERS = [
  { id: "zj", name: "浙教版" },
  { id: "rj", name: "人教版" },
];

export const course = {
  id: "zj-math-g7a",
  name: "七年级数学上册（浙教版）",
  title: "七年级数学上册",
  subject: "数学",
  subjectId: "math",
  grade: "七年级",
  gradeId: "grade-7",
  publisher: "浙教版",
  publisherId: "zj",
  semester: { semesterName: "2025-2026学年 第一学期" },
  chapters: [
    {
      id: "ch-1",
      title: "第一章 有理数",
      sections: [
        { id: "section-1-1", title: "1.1 从自然数到有理数", name: "1.1 从自然数到有理数" },
        { id: "section-1-2", title: "1.2 数轴", name: "1.2 数轴" },
        { id: "section-1-3", title: "1.3 绝对值与相反数", name: "1.3 绝对值与相反数" },
        { id: "section-1-4", title: "1.4 有理数的大小比较", name: "1.4 有理数的大小比较" },
      ],
    },
    {
      id: "ch-2",
      title: "第二章 有理数的运算",
      sections: [
        { id: "section-2-1", title: "2.1 有理数的加法", name: "2.1 有理数的加法" },
        { id: "section-2-2", title: "2.2 有理数的减法", name: "2.2 有理数的减法" },
        { id: "section-2-3", title: "2.3 有理数的乘法", name: "2.3 有理数的乘法" },
        { id: "section-2-4", title: "2.4 有理数的除法", name: "2.4 有理数的除法" },
        { id: "section-2-5", title: "2.5 有理数的乘方", name: "2.5 有理数的乘方" },
        { id: "section-2-6", title: "2.6 有理数的混合运算", name: "2.6 有理数的混合运算" },
        { id: "section-2-7", title: "2.7 准确数和近似数", name: "2.7 准确数和近似数" },
      ],
    },
    {
      id: "ch-3",
      title: "第三章 实数",
      sections: [
        { id: "section-3-1", title: "3.1 平方根", name: "3.1 平方根" },
        { id: "section-3-2", title: "3.2 立方根", name: "3.2 立方根" },
        { id: "section-3-3", title: "3.3 实数", name: "3.3 实数" },
        { id: "section-3-4", title: "3.4 实数的运算", name: "3.4 实数的运算" },
      ],
    },
    {
      id: "ch-4",
      title: "第四章 代数式",
      sections: [
        { id: "section-4-1", title: "4.1 用字母表示数", name: "4.1 用字母表示数" },
        { id: "section-4-2", title: "4.2 代数式", name: "4.2 代数式" },
        { id: "section-4-3", title: "4.3 代数式的值", name: "4.3 代数式的值" },
        { id: "section-4-4", title: "4.4 整式", name: "4.4 整式" },
        { id: "section-4-5", title: "4.5 合并同类项", name: "4.5 合并同类项" },
        { id: "section-4-6", title: "4.6 整式的加减", name: "4.6 整式的加减" },
      ],
    },
  ],
};

export const ALL_COURSES = [course];

export function getCourseById(id) {
  return ALL_COURSES.find((c) => c.id === id) || course;
}

export function findCourse(query = {}) {
  return course;
}

export function findLessonById(lessonId) {
  for (const chapter of course.chapters) {
    for (const sec of chapter.sections) {
      if (sec.id === lessonId) {
        return {
          ...sec,
          chapterTitle: chapter.title,
          chapterId: chapter.id,
        };
      }
    }
  }
  return {
    id: lessonId || "section-1-1",
    title: "1.1 从自然数到有理数",
    name: "1.1 从自然数到有理数",
    chapterTitle: "第一章 有理数",
    chapterId: "ch-1",
  };
}
