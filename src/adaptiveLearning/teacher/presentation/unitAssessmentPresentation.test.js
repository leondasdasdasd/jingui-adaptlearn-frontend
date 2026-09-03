/** @vitest-environment node */

import { buildUnitAssessmentContent } from "../domain/unitAssessmentContent";
import {
  projectUnitAssessmentContent,
  projectUnitAssessmentEntry,
} from "./unitAssessmentPresentation";

describe("unit assessment presentation", () => {
  test("projects unit slots for the shared assessment workspace", () => {
    const content = buildUnitAssessmentContent({
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
      ],
    });
    const viewModel = projectUnitAssessmentContent(content);

    expect(viewModel.knowledgePointCount).toBe(2);
    expect(viewModel.plannedQuestionCount).toBe(2);
    expect(viewModel).not.toHaveProperty("coverageRows");
    expect(viewModel.assessment.questionSlots[0]).toMatchObject({
      matrixCode: "CR · B",
      primaryKnowledgePointId: "kp-1",
      secondaryKnowledgePointIds: ["kp-2"],
    });
    expect(projectUnitAssessmentEntry({ id: "c1", sections: [] })).toEqual({
      chapterId: "c1",
      lessonCount: 0,
      knowledgePointCount: 0,
    });
  });
});
