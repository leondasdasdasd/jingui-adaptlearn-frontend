// 数轴课时的五个风格样例分别放入五个知识点，便于直接按知识点预览。
// 选定最终风格并写入正式内容版本后，应删除这份临时覆盖。
const numberLineKnowledgeClassrooms = {
  "kp-number-line-concept": {
    classroomId: "KkLTL7KoZp",
    classroomUrl: "/openmaic/classroom/KkLTL7KoZp",
    scenesCount: 6,
    teacherInstruction: "style:minimal",
  },
  "kp-number-line-origin": {
    classroomId: "pq77paC8uS",
    classroomUrl: "/openmaic/classroom/pq77paC8uS",
    scenesCount: 6,
    teacherInstruction: "style:colorful",
  },
  "kp-number-line-point": {
    classroomId: "mTPYC1pAAD",
    classroomUrl: "/openmaic/classroom/mTPYC1pAAD",
    scenesCount: 6,
    teacherInstruction: "style:professional",
  },
  "kp-number-line-read": {
    classroomId: "4b1ZL8wtef",
    classroomUrl: "/openmaic/classroom/4b1ZL8wtef",
    scenesCount: 5,
    teacherInstruction: "style:playful",
  },
  "kp-number-line-position": {
    classroomId: "mo2Pc_x6Cz",
    classroomUrl: "/openmaic/classroom/mo2Pc_x6Cz",
    scenesCount: 6,
    teacherInstruction: "style:claymorphism",
  },
};

/**
 *
 * @param lessonId
 * @param learningContent
 */
export function applyStyleSampleKnowledgeClassrooms(lessonId, learningContent) {
  if (lessonId !== "section-1-2") return learningContent;
  const existing = learningContent?.knowledgePoints || [];
  const existingById = new Map(
    existing.map((item) => [item.knowledgeObjectiveId, item]),
  );
  return {
    ...learningContent,
    knowledgePoints: Object.entries(numberLineKnowledgeClassrooms).map(
      ([knowledgeObjectiveId, openMaic]) => ({
        ...existingById.get(knowledgeObjectiveId),
        knowledgeObjectiveId,
        openMaic: {
          ...openMaic,
          status: "READY",
          generatedAt: "2026-07-13T16:30:00.000Z",
        },
      }),
    ),
  };
}
