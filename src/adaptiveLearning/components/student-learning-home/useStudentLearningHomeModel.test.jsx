import React from "react";
import { render } from "@testing-library/react";

import useStudentLearningHomeModel from "./useStudentLearningHomeModel";

describe("useStudentLearningHomeModel", () => {
  test("keeps an authoritative empty profile empty instead of adding demo knowledge", () => {
    let current;
    function HookReader() {
      current = useStudentLearningHomeModel({
        profile: {
          student: { displayName: "新同学" },
          summary: { answerCount: 0 },
          attempts: [],
          timeline: [],
          supportActivities: [],
        },
        viewer: "student",
      });
      return null;
    }

    render(<HookReader />);

    expect(current.knowledgePointsList).toEqual([]);
    expect(current.knowledgePointsDetailed).toEqual([]);
    expect(current.activeDrillKp).toBe("");
  });
});
