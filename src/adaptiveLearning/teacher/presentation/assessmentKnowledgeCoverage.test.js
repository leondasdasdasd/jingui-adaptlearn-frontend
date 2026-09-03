/** @vitest-environment node */

import { projectAssessmentKnowledgeCoverage } from "./assessmentKnowledgeCoverage";

describe("assessment knowledge coverage", () => {
  test("counts primary, secondary, and difficulty coverage from one slot view", () => {
    const rows = projectAssessmentKnowledgeCoverage({
      knowledgePoints: [
        { id: "kp-1", name: "一" },
        { id: "kp-2", name: "二" },
      ],
      slots: [
        {
          difficulty: "D3",
          questionCount: 2,
          knowledgePointBadges: [
            { id: "kp-1", role: "primary" },
            { id: "kp-2", role: "secondary" },
          ],
        },
      ],
    });

    expect(rows[0]).toMatchObject({
      primaryQuestionCount: 2,
      secondaryQuestionCount: 0,
      difficultyCounts: { D3: 2 },
    });
    expect(rows[1]).toMatchObject({
      primaryQuestionCount: 0,
      secondaryQuestionCount: 2,
      difficultyCounts: { D3: 2 },
    });
  });
});
