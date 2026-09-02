export function getMockLessonContent(lessonId = "section-1-1") {
  return {
    id: lessonId,
    title: "1.1 从自然数到有理数",
    publishedAt: "2025-09-01T08:00:00.000Z",
    updatedAt: "2025-09-01T08:00:00.000Z",
    knowledgePoints: [
      { id: "kp-1-1-1", title: "正数与负数的概念", description: "理解正数与负数的实际意义与表达" },
      { id: "kp-1-1-2", title: "有理数的分类", description: "掌握按定义与符号两种分类方式" },
    ],
    questions: [
      {
        id: "q-1-1-1",
        title: "下列各数中是负数的是（ ）",
        type: "single",
        options: [
          { id: "A", text: "-3" },
          { id: "B", text: "0" },
          { id: "C", text: "5" },
          { id: "D", text: "2/3" },
        ],
        correctOptionId: "A",
        knowledgePointId: "kp-1-1-1",
      },
      {
        id: "q-1-1-2",
        title: "有理数包括整数和（ ）",
        type: "single",
        options: [
          { id: "A", text: "正数" },
          { id: "B", text: "分数" },
          { id: "C", text: "负数" },
          { id: "D", text: "小数" },
        ],
        correctOptionId: "B",
        knowledgePointId: "kp-1-1-2",
      },
    ],
  };
}

export function createDefaultContent() {
  const mock = getMockLessonContent("section-1-1");
  return {
    "section-1-1": mock,
    "section-1-2": getMockLessonContent("section-1-2"),
    "section-1-3": getMockLessonContent("section-1-3"),
    "section-1-4": getMockLessonContent("section-1-4"),
  };
}
