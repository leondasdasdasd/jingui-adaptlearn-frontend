import { getNewLessonEligibility } from "./newLessonEligibility";

const firstSection = {
  id: "lesson-1",
  title: "第一课",
  knowledgePoints: [{ id: "kp-1" }, { id: "kp-2" }],
};
const secondSection = {
  id: "lesson-2",
  title: "第二课",
  knowledgePoints: [{ id: "kp-3" }],
};
const course = {
  chapters: [{ id: "chapter-1", sections: [firstSection, secondSection] }],
};

describe("new lesson eligibility", () => {
  it("allows the first lesson without prerequisite evidence", () => {
    expect(
      getNewLessonEligibility({ course, selectedSection: firstSection }),
    ).toEqual({ eligible: true });
  });

  it("blocks the next lesson until every previous knowledge point reaches mastery", () => {
    expect(
      getNewLessonEligibility({
        course,
        selectedSection: secondSection,
        knowledgeProfile: {
          "kp-1": { mastery: 90 },
          "kp-2": { mastery: 89 },
        },
      }),
    ).toMatchObject({
      eligible: false,
      incompleteKnowledgePointIds: ["kp-2"],
    });
  });

  it("accepts either authoritative mastery status or a mastery value of 90", () => {
    expect(
      getNewLessonEligibility({
        course,
        selectedSection: secondSection,
        knowledgeProfile: {
          "kp-1": { status: "mastered" },
          "kp-2": { mastery: 90 },
        },
      }),
    ).toMatchObject({ eligible: true, incompleteKnowledgePointIds: [] });
  });
});
