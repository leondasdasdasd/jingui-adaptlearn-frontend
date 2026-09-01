/** @jest-environment node */

import {
  applyLessonGenerationDraftPatch,
  buildLessonGenerationModules,
  buildMissingContentGenerationPlan,
  buildParallelLessonGenerationLanes,
  classifyContentQualityIssue,
  createLessonGenerationTaskGraph,
  getRunnableLessonGenerationTasks,
  LESSON_GENERATION_MODULE_KIND,
  settleLessonQualityCheck,
  startLessonGenerationTask,
  validateLessonGenerationTaskResult,
} from "./lessonContentGeneration";

const lesson = {
  id: "lesson-1",
  title: "有理数",
  knowledgePoints: [{ id: "kp-1", name: "正负数" }],
};

const emptyContent = {
  preQuestions: [],
  postQuestions: [],
  learningContent: { composite: null, knowledgePoints: [] },
};

describe("whole lesson content generation domain", () => {
  test("缺失内容仍映射为统一模块、并行 lane 和任务图", () => {
    const modules = buildLessonGenerationModules({
      lesson,
      content: emptyContent,
    });
    const plan = buildMissingContentGenerationPlan({
      lesson,
      content: emptyContent,
    });
    const lanes = buildParallelLessonGenerationLanes(plan.actions);
    const graph = createLessonGenerationTaskGraph({
      lesson,
      content: emptyContent,
    });

    expect(modules.map((moduleRecord) => moduleRecord.kind)).toEqual([
      LESSON_GENERATION_MODULE_KIND.PRE_ASSESSMENT,
      LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS,
      LESSON_GENERATION_MODULE_KIND.COMPOSITE_REVIEW,
      LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM,
      LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_CLASSROOM,
    ]);
    expect(lanes.questions).toHaveLength(3);
    expect(lanes.openMaic).toHaveLength(2);
    expect(getRunnableLessonGenerationTasks(graph)).toHaveLength(5);

    const firstTask = getRunnableLessonGenerationTasks(graph)[0];
    expect(
      startLessonGenerationTask(graph, firstTask.id).tasks.find(
        (task) => task.id === firstTask.id,
      ).status,
    ).toBe("running");
  });

  test("课堂任务继续校验课堂标识和公开访问地址", () => {
    const task = {
      label: "复合学习课堂",
      moduleId: "composite-classroom",
      moduleKind: LESSON_GENERATION_MODULE_KIND.COMPOSITE_CLASSROOM,
    };

    expect(
      validateLessonGenerationTaskResult({
        task,
        result: { runtime: {} },
        lesson,
        content: emptyContent,
      }).map((issue) => issue.code),
    ).toEqual([
      "OPENMAIC_CLASSROOM_ID_MISSING",
      "OPENMAIC_CLASSROOM_URL_MISSING",
    ]);
    expect(
      validateLessonGenerationTaskResult({
        task,
        result: {
          runtime: {
            classroomId: "room-1",
            classroomUrl: "/openmaic/classroom/room-1",
          },
        },
        lesson,
        content: emptyContent,
      }),
    ).toEqual([]);
  });

  test("定向返修保留题目蓝图身份与服务端难度", () => {
    const original = {
      id: "q-1",
      stem: "原题",
      phase: "knowledge",
      purpose: "post",
      type: "short_answer",
      difficulty: "D4",
      blueprintSlotId: "kp-1:D4:1",
      adaptiveRole: "challenge",
      primaryKnowledgePointId: "kp-1",
      knowledgePointIds: ["kp-1"],
    };
    const patched = applyLessonGenerationDraftPatch(
      { ...emptyContent, postQuestions: [original] },
      {
        operations: [
          {
            type: "replace-question-module",
            moduleKind: LESSON_GENERATION_MODULE_KIND.KNOWLEDGE_QUESTIONS,
            knowledgePointId: "kp-1",
            mergeMode: "targeted",
            targetQuestionIds: ["q-1"],
            questions: [
              {
                id: "generated-q-1",
                stem: "返修后的题目",
                type: "short_answer",
                difficulty: "D1",
                knowledgePointIds: ["kp-1"],
              },
            ],
          },
        ],
      },
    );

    expect(patched.postQuestions).toHaveLength(1);
    expect(patched.postQuestions[0]).toMatchObject({
      id: "q-1",
      stem: "返修后的题目",
      difficulty: "D4",
      blueprintSlotId: "kp-1:D4:1",
      adaptiveRole: "challenge",
    });
  });

  test("带明确题目 ID 的新质检码仍定向到原题模块", () => {
    const content = {
      ...emptyContent,
      postQuestions: [
        {
          id: "q-target",
          stem: "需要返修的题目",
          phase: "knowledge",
          knowledgePointIds: ["kp-1"],
        },
      ],
    };
    const classified = classifyContentQualityIssue(
      {
        code: "TEACHER_AUDIT_NEW_RULE",
        questionId: "q-target",
        message: "题目 q-target 需要返修",
      },
      { lesson, content },
    );

    expect(classified).toMatchObject({
      category: "questions",
      moduleIds: ["knowledge-questions:kp-1"],
      targetQuestionIds: ["q-target"],
      repairable: true,
    });
  });

  test("质检问题只记录告警，不自动创建返修任务", () => {
    const issue = { code: "QUESTION_QUALITY_LOW", message: "题目需要教师确认" };
    const graph = {
      phase: "quality_check",
      tasks: [
        {
          id: "quality-check:0",
          taskType: "quality_check",
          status: "running",
        },
      ],
    };

    const settled = settleLessonQualityCheck({
      graph,
      taskId: "quality-check:0",
      issues: [issue],
    });

    expect(settled).toMatchObject({
      phase: "ready",
      exhausted: false,
      remainingIssues: [issue],
    });
    expect(settled.tasks).toHaveLength(1);
    expect(settled.tasks[0]).toMatchObject({
      status: "completed",
      passed: false,
      issues: [issue],
    });
  });
});
