export function generationStateForLesson(content) {
  return { status: "idle", progress: 0, error: "" };
}

export const curriculumGenerationStatus = {
  COMPLETED: "已完成",
  GENERATING: "生成中",
};

