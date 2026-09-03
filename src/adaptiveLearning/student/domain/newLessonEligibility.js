import { isMasteredValue } from "../../shared/domain/masteryPolicy.js";

/**
 * 按教材顺序判断当前课时是否满足“上新课”条件，避免组件读取持久化或复制掌握规则。
 * @param {object} input 课程、当前课时与标准化知识档案。
 * @param input.course
 * @param input.selectedSection
 * @param input.knowledgeProfile
 */
export function getNewLessonEligibility({
  course,
  selectedSection,
  knowledgeProfile = {},
}) {
  if (!course?.chapters?.length || !selectedSection?.id) {
    return { eligible: true };
  }
  const sections = course.chapters.flatMap((chapter) => chapter.sections || []);
  const currentIndex = sections.findIndex(
    (section) => section.id === selectedSection.id,
  );
  if (currentIndex <= 0) return { eligible: true };

  const previousSection = sections[currentIndex - 1];
  const previousKnowledgePoints = previousSection?.knowledgePoints || [];
  const incompleteKnowledgePoints = previousKnowledgePoints.filter(
    (knowledgePoint) => {
      const record = knowledgeProfile[knowledgePoint.id];
      return (
        !record ||
        (record.status !== "mastered" && !isMasteredValue(record.mastery))
      );
    },
  );
  const eligible = incompleteKnowledgePoints.length === 0;
  return {
    eligible,
    previousSectionTitle: previousSection?.title || "上一课",
    incompleteKnowledgePointIds: incompleteKnowledgePoints.map(
      (knowledgePoint) => knowledgePoint.id,
    ),
    blockReason: eligible ? "" : "previous_lesson_mastery",
  };
}
