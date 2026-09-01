/** @jest-environment node */

import {
  createAdaptiveState,
  targetDifficultyFromSignals,
} from "./lib/adaptiveDifficulty";
import { createAutomaticLearningPlan } from "./student/domain/learningPlan";
import {
  createPreAssessmentState,
  diagnosePreAssessmentKnowledgePoint,
  PRE_DIAGNOSIS_STATUS,
  selectNextPreAssessmentQuestion,
} from "./student/domain/preAssessmentStrategy";
import {
  masteryFeedbackForQuestion,
  masteryUpdateFromAttempt,
} from "./student/domain/masteryFeedback";

const knowledgePoints = ["a", "b", "c"].map((id) => ({ id, name: id }));

const mastery = (value) => ({ evidenceCount: 3, mastery: value });

describe("自适应学习主流程", () => {
  test("只为未掌握知识点安排学习、练习和独立验证", () => {
    const plan = createAutomaticLearningPlan(knowledgePoints, {
      a: mastery(95),
      b: mastery(72),
      c: mastery(91),
    });

    expect(plan.targetKnowledgePointIds).toEqual(["b"]);
    expect(plan.units.map((unit) => unit.kind)).toEqual([
      "knowledge_learning",
      "knowledge_practice",
      "knowledge_checkpoint",
      "knowledge_verification",
      "knowledge_verification",
      "composite_review",
    ]);
  });

  test("动态前测从标准题开始，答对后继续升难确认", () => {
    const point = [{ id: "kp-1", name: "正负数" }];
    const questions = [
      {
        diagnosticRole: "STANDARD_PROBE",
        difficulty: 3,
        id: "probe",
        knowledgePointIds: ["kp-1"],
        primaryKnowledgePointId: "kp-1",
        type: "single_choice",
      },
      {
        diagnosticRole: "STANDARD_CONFIRMATION",
        difficulty: 4,
        id: "confirmation",
        knowledgePointIds: ["kp-1"],
        primaryKnowledgePointId: "kp-1",
        type: "fill_blank",
      },
    ];

    expect(
      createPreAssessmentState({ knowledgePoints: point, questions }).order,
    ).toEqual(["probe"]);
    expect(
      selectNextPreAssessmentQuestion({
        attempts: {
          probe: {
            maxScore: 1,
            score: 1,
            scoreRatio: 1,
            submittedAt: "2026-08-31T09:00:00.000Z",
          },
        },
        knowledgePoints: point,
        questions,
      }).id,
    ).toBe("confirmation");

    const failed = diagnosePreAssessmentKnowledgePoint({
      attempts: {
        probe: {
          maxScore: 1,
          score: 0,
          scoreRatio: 0,
          submittedAt: "2026-08-31T09:00:00.000Z",
        },
      },
      knowledgePointId: "kp-1",
      questions,
    });
    expect(failed.status).toBe(PRE_DIAGNOSIS_STATUS.NEEDS_LEARNING);
  });

  test("历史掌握度与近期作答共同决定初始难度并轮换题目", () => {
    const weak = targetDifficultyFromSignals({
      mastery: 35,
      recentAttempts: [{ scoreRatio: 0.4 }],
    });
    const strong = targetDifficultyFromSignals({
      mastery: 88,
      recentAttempts: [{ scoreRatio: 1 }, { scoreRatio: 0.9 }],
    });
    expect(weak.targetDifficulty).toBe("D2");
    expect(strong.effectiveAbility).toBeGreaterThan(weak.effectiveAbility);

    const questions = ["q1", "q2", "q3"].map((id) => ({
      difficulty: "D3",
      id,
      knowledgePointIds: ["a"],
    }));
    const firstQuestions = new Set(
      ["session-a", "session-b", "session-c"].map(
        (seed) => createAdaptiveState(questions, "post", {}, {}, seed).order[0],
      ),
    );
    expect(firstQuestions.size).toBeGreaterThan(1);
  });

  test("学生反馈只消费正式掌握度快照，不用答题得分伪造结论", () => {
    const pending = masteryUpdateFromAttempt({ scoreRatio: 1 }, "kp-1", {
      confidence: 55,
      mastery: 63,
    });
    expect(pending.after).toBeNull();
    expect(pending.hasAuthoritativeSnapshot).toBe(false);

    const attempt = {
      unifiedMastery: {
        "kp-1": {
          algorithmVersion: "U1-test",
          confidenceAfter: 0.64,
          masteryAfter: 70.5,
          masteryBefore: 61.2,
        },
      },
    };
    const feedback = masteryFeedbackForQuestion({
      attempt,
      knowledgePoints: [{ id: "kp-1", name: "有理数比较" }],
      previousMastery: { "kp-1": { mastery: 60 } },
      question: { knowledgePointIds: ["kp-1"] },
    });
    expect(feedback[0]).toMatchObject({
      after: 70.5,
      confidence: 64,
      knowledgePointName: "有理数比较",
    });
  });
});
