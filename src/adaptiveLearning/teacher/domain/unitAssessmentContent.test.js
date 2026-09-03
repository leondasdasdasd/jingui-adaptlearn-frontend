/** @vitest-environment node */

import { buildUnitAssessmentContent } from "./unitAssessmentContent";

describe("unit assessment content", () => {
  const chapter = {
    id: "chapter-1",
    sections: [
      {
        id: "lesson-1",
        title: "第一课",
        knowledgePoints: [
          { id: "kp-1", name: "知识点一" },
          { id: "kp-2", name: "知识点二" },
        ],
      },
      {
        id: "lesson-2",
        title: "第二课",
        knowledgePoints: [
          { id: "kp-2", name: "知识点二" },
          { id: "kp-3", name: "知识点三" },
        ],
      },
    ],
  };

  test("uses lesson anchors for mixed slots instead of creating two slots per point", () => {
    const content = buildUnitAssessmentContent(chapter);
    expect(content.knowledgePoints.map((item) => item.id)).toEqual([
      "kp-1",
      "kp-2",
      "kp-3",
    ]);
    expect(content.questionSlots).toHaveLength(4);
    expect(
      content.questionSlots.filter(
        (slot) => slot.primaryKnowledgePointId === "kp-1",
      ),
    ).toHaveLength(2);
    expect(
      content.questionSlots.every(
        (slot) => slot.matrixCellId && slot.secondaryKnowledgePointIds.length,
      ),
    ).toBe(true);
    expect(
      new Set(
        content.questionSlots.flatMap((slot) => [
          slot.primaryKnowledgePointId,
          ...slot.secondaryKnowledgePointIds,
        ]),
      ),
    ).toEqual(new Set(["kp-1", "kp-2", "kp-3"]));
  });
});
