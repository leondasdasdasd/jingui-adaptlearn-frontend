import { assessAnswerQuality } from "../shared/domain/answerQuality.js";
import {
  ALL_COURSES,
  course,
  findLessonById,
} from "../shared/domain/courseCatalog.js";
import { getMockLessonContent } from "../shared/domain/defaultLessonContent.js";
import { objectiveScoreRatio } from "../shared/domain/questionEvidence.js";

// In-memory store for snapshots and sessions
const sessionStore = new Map();
const snapshotStore = new Map();

/**
 * Build a standard published content version matching the classroom service contract
 * @param lessonId
 */
export function getMockPublishedLessonVersion(lessonId = "section-1-1") {
  const lesson = findLessonById(lessonId);
  const mockContent = getMockLessonContent(lessonId);

  return {
    id: `mock-version-${lessonId}`,
    versionNumber: 1,
    textbookLessonId: lessonId,
    publishedAt: mockContent.publishedAt || new Date().toISOString(),
    updatedAt: mockContent.updatedAt || new Date().toISOString(),
    contentPackage: {
      planType: "SINGLE_LESSON",
      title: lesson.title,
      sourceLessons: [lessonId],
      lesson: {
        id: lesson.id,
        title: lesson.title,
      },
      knowledgeObjectives: lesson.knowledgePoints || [],
      generationPolicy: {
        singleQuestionProbe: true,
        diagnosticPreAssessment: true,
      },
      diagnosticQuestionPool: mockContent.preQuestions || [],
      knowledgePracticePools: mockContent.knowledgePracticePools || {},
      compositeReviewPool: mockContent.compositeReviewPool || [],
      learningContent: {
        composite: {
          status: "READY",
          classroomId: `classroom-composite-${lessonId}`,
          classroomUrl: `/mock-classroom.html?lessonId=${encodeURIComponent(lessonId)}&kp=composite`,
          coveredKnowledgeObjectiveIds: (lesson.knowledgePoints || []).map(
            (kp) => kp.id,
          ),
        },
        knowledgePoints: (lesson.knowledgePoints || []).map((kp) => ({
          knowledgeObjectiveId: kp.id,
          openMaic: {
            status: "READY",
            classroomId: `classroom-${kp.id}`,
            classroomUrl: `/mock-classroom.html?lessonId=${encodeURIComponent(lessonId)}&kp=${encodeURIComponent(kp.id)}`,
            coveredKnowledgeObjectiveIds: [kp.id],
          },
        })),
      },
      assessmentMatrices: mockContent.assessmentMatrices || {},
      assessmentQuestionSlots: mockContent.assessmentQuestionSlots || {},
      unconfirmedItems: [],
    },
  };
}

/**
 * Get summaries for multiple lesson IDs
 * @param lessonIds
 */
export function getMockPublishedLessonSummaries(lessonIds = []) {
  const ids = Array.isArray(lessonIds) ? lessonIds : [lessonIds];
  return ids.map((id) => {
    const version = getMockPublishedLessonVersion(id);
    return {
      id: version.id,
      textbookLessonId: id,
      versionNumber: version.versionNumber,
      publishedAt: version.publishedAt,
    };
  });
}

/**
 * Find question definition by ID across all courses
 * @param questionId
 * @param contentVersionId
 */
export function findQuestionById(questionId, contentVersionId = "") {
  if (!questionId) return null;
  // Try extracting lessonId from questionId or versionId
  let targetLessonId = "section-1-1";
  if (contentVersionId && contentVersionId.startsWith("mock-version-")) {
    targetLessonId = contentVersionId.replace("mock-version-", "");
  } else if (questionId.startsWith("sec11-")) {
    targetLessonId = "section-1-1";
  } else if (questionId.startsWith("sec12-")) {
    targetLessonId = "section-1-2";
  } else if (questionId.startsWith("sec13-")) {
    targetLessonId = "section-1-3";
  } else {
    const match = questionId.match(/^(section-[\d-]+)/);
    if (match) targetLessonId = match[1];
  }

  // Search in target lesson first
  const mockContent = getMockLessonContent(targetLessonId);
  const allTargetQuestions = [
    ...(mockContent.preQuestions || []),
    ...Object.values(mockContent.knowledgePracticePools || {}).flat(),
    ...(mockContent.compositeReviewPool || []),
  ];
  const directMatch = allTargetQuestions.find((q) => q.id === questionId);
  if (directMatch) return directMatch;

  // Search across common sections
  for (const sId of ["section-1-1", "section-1-2", "section-1-3"]) {
    const secContent = getMockLessonContent(sId);
    const questions = [
      ...(secContent.preQuestions || []),
      ...Object.values(secContent.knowledgePracticePools || {}).flat(),
      ...(secContent.compositeReviewPool || []),
    ];
    const found = questions.find((q) => q.id === questionId);
    if (found) return found;
  }

  return null;
}

/**
 * Mock grade student answer
 * @param root0
 * @param root0.question
 * @param root0.questionId
 * @param root0.contentVersionId
 * @param root0.answerText
 * @param root0.imageDataUrl
 * @param root0.attemptStage
 * @param root0.priorFormalGradeReceipt
 */
export function gradeMockAnswer({
  question,
  questionId,
  contentVersionId = "",
  answerText = "",
  imageDataUrl = "",
  attemptStage = "initial",
  priorFormalGradeReceipt = "",
}) {
  const targetQuestion = question ||
    findQuestionById(questionId, contentVersionId) || {
      id: questionId || "mock-q",
      type: "single_choice",
      maxScore: 2,
      answer: "A",
      analysis: "先明确题目中的基准和正方向，再判断符号与数值关系。",
    };

  const quality = assessAnswerQuality
    ? assessAnswerQuality(targetQuestion, answerText)
    : { quality: "valid", message: "" };
  if (quality.quality === "off_task") {
    return {
      score: 0,
      maxScore: Number(targetQuestion.maxScore || 2),
      scoreRatio: 0,
      correct: false,
      feedback: quality.message || "请填写与题目相关的答案。",
      strengths: [],
      improvements: ["重新读题，并写出与题意有关的答案"],
      recognizedAnswer: String(answerText || ""),
      answerQuality: "off_task",
      behaviorFeedback: quality.message,
      formalGradeReceipt: `receipt-mock-${Date.now()}`,
      gradingStatus: "final",
      evidenceEligible: true,
      authority: "authoritative",
      syncStatus: "synced",
      gradedBy: "mock-ai-server",
    };
  }

  let scoreRatio = 0;
  if (
    [
      "multiple_choice",
      "single_choice",
      "fill_blank",
      "judgement",
      "ordering",
      "classification",
      "matching",
      "line_connect",
      "text_marker",
      "word_builder",
    ].includes(targetQuestion.type)
  ) {
    scoreRatio = objectiveScoreRatio(targetQuestion, answerText);
  } else {
    // short answer text matching
    const ref = String(targetQuestion.answer || "")
      .trim()
      .toLowerCase();
    const user = String(answerText || "")
      .trim()
      .toLowerCase();
    if (ref && user.includes(ref)) {
      scoreRatio = 1;
    } else if (user.length > 5) {
      scoreRatio = 0.8;
    } else {
      scoreRatio = 0;
    }
  }

  const correct = scoreRatio >= 0.99;
  const maxScore = Number(targetQuestion.maxScore || 2);
  const score = Math.round(maxScore * scoreRatio * 100) / 100;

  return {
    score,
    maxScore,
    scoreRatio,
    correct,
    feedback: correct
      ? "回答正确！思路非常清晰。"
      : scoreRatio > 0
        ? "部分正确，继续加油！"
        : "答案有误，请仔细核对题目条件和运算符号。",
    strengths: correct
      ? ["概念理解准确", "结论正确"]
      : scoreRatio > 0
        ? ["部分判断准确"]
        : [],
    improvements: correct ? [] : ["核对题目关键已知条件与正负号"],
    recognizedAnswer: Array.isArray(answerText)
      ? answerText.join("、")
      : String(answerText || ""),
    answerQuality: correct ? "valid" : quality.quality || "valid",
    behaviorFeedback: quality.quality === "off_task" ? quality.message : "",
    correctAnswer: targetQuestion.answer,
    analysis:
      targetQuestion.analysis || "解析：根据相关数学概念及法则分析得出。",
    formalGradeReceipt: `receipt-mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    gradingStatus: "final",
    evidenceEligible: true,
    authority: "authoritative",
    syncStatus: "synced",
    gradedBy: "mock-ai-server",
  };
}

/**
 * Mock answer reviews
 * @param questionIds
 * @param contentVersionId
 */
export function getMockAnswerReviews(questionIds = [], contentVersionId = "") {
  const ids = Array.isArray(questionIds) ? questionIds : [questionIds];
  return {
    items: ids.map((id) => {
      const q = findQuestionById(id, contentVersionId);
      return {
        questionId: id,
        correctAnswer: q?.answer || "参考答案",
        analysis: q?.analysis || "解析：根据本节核心概念推导分析得出正确结论。",
      };
    }),
  };
}

/**
 * Mock learning periods
 */
export function getMockLearningPeriods() {
  return {
    learningPeriods: [
      {
        id: "mock-period-1-1",
        title: "七年级数学 · 1.1 从自然数到有理数",
        textbookLessonId: "section-1-1",
        courseId: "zhejiang-grade-7-up",
        teacherName: "数学名师团队",
        status: "IN_PROGRESS",
        createdAt: new Date().toISOString(),
        sessionCount: 1,
      },
      {
        id: "mock-period-1-2",
        title: "七年级数学 · 1.2 数轴",
        textbookLessonId: "section-1-2",
        courseId: "zhejiang-grade-7-up",
        teacherName: "数学名师团队",
        status: "IN_PROGRESS",
        createdAt: new Date().toISOString(),
        sessionCount: 1,
      },
      {
        id: "mock-period-1-3",
        title: "七年级数学 · 1.3 绝对值与相反数",
        textbookLessonId: "section-1-3",
        courseId: "zhejiang-grade-7-up",
        teacherName: "数学名师团队",
        status: "IN_PROGRESS",
        createdAt: new Date().toISOString(),
        sessionCount: 1,
      },
    ],
  };
}

/**
 * Mock start student session
 * @param periodId
 * @param accessToken
 */
export function startMockStudentSession(
  periodId = "mock-period-1-1",
  accessToken = "",
) {
  let lessonId = "section-1-1";
  if (periodId.includes("1-2")) lessonId = "section-1-2";
  if (periodId.includes("1-3")) lessonId = "section-1-3";

  const sessionId = `student-session-${Date.now()}`;
  const sessionData = {
    id: sessionId,
    studentId: "student-mock-1",
    studentName: "演示同学",
    periodId,
    lessonId,
    startedAt: new Date().toISOString(),
    status: "ACTIVE",
  };
  sessionStore.set(sessionId, sessionData);
  return sessionData;
}

/**
 * Mock get session content
 * @param sessionId
 */
export function getMockStudentSessionContent(sessionId = "") {
  const session = sessionStore.get(sessionId);
  const lessonId = session?.lessonId || "section-1-1";
  return {
    contentVersion: getMockPublishedLessonVersion(lessonId),
    masteryStates: {},
  };
}

/**
 * Mock snapshot store
 * @param sessionId
 */
export function getMockSessionSnapshot(sessionId = "") {
  return snapshotStore.get(sessionId) || { hydrated: null };
}

/**
 *
 * @param sessionId
 * @param payload
 */
export function putMockSessionSnapshot(sessionId = "", payload = {}) {
  snapshotStore.set(sessionId, payload);
  return { ok: true, updatedAt: new Date().toISOString() };
}

/**
 * Mock check-in analysis
 * @param root0
 * @param root0.lesson
 * @param root0.knowledgePoints
 * @param root0.practiceContext
 * @param root0.messages
 */
export function getMockCheckInDiagnosis({
  lesson = {},
  knowledgePoints = [],
  practiceContext = {},
  messages = [],
}) {
  const kpTitle =
    practiceContext?.knowledgePointTitle ||
    knowledgePoints[0]?.name ||
    "核心概念";
  const userMessages = messages.filter((m) => m.role === "user");

  if (userMessages.length === 0) {
    return {
      reply: `同学你好！老师看到你在「${kpTitle}」的练习中连续遇到了困难。不用灰心，我们先来理清本质：通常这类型题目的关键在于【找准基准点】与【区分正负方向】。你还记得题中规定的正方向是什么吗？试着说说看！`,
      ready: false,
      diagnosis: null,
      promptVersion: "v1",
    };
  }

  return {
    reply: `非常棒！你的分析已经抓住了核心！只要在运算时【先定正负号，再计算绝对值】，就不会再混淆了。老师为你准备好了巩固练习，现在就去试试吧！`,
    ready: true,
    diagnosis: {
      summary: `针对知识点「${kpTitle}」的诊断：学生已理清正负号判定法则与基准点概念，具备再次练习能力。`,
      causeType: "CONCEPT_CONFUSION",
      studentTip:
        "做题时养成习惯：第一步圈出基准，第二步判定方向，第三步计算数值。",
      promptVersion: "v1",
      reviewedQuestionIds:
        practiceContext?.evidence?.map((e) => e.questionId) || [],
      needsRemediation: false,
    },
    needsRemediation: false,
    promptVersion: "v1",
  };
}

/**
 * Mock teacher classes
 */
export function getMockTeacherClasses() {
  return [
    {
      classId: "class-7-1",
      className: "初一（1）班",
      studentCount: 32,
      status: "ACTIVE",
    },
    {
      classId: "class-7-2",
      className: "初一（2）班",
      studentCount: 30,
      status: "ACTIVE",
    },
  ];
}

/**
 * Mock class details
 * @param classId
 */
export function getMockClassDetails(classId = "class-7-1") {
  const classes = getMockTeacherClasses();
  return classes.find((c) => c.classId === classId) || classes[0];
}

/**
 * Mock class students
 * @param classId
 */
export function getMockClassStudents(classId = "class-7-1") {
  return [
    {
      studentId: "student-mock-1",
      studentName: "张小明",
      studentNumber: "20240701",
      credential: {
        status: "ACTIVE",
        accessToken: "mock-token-s1",
        updatedAt: "2026-03-01T08:00:00.000Z",
      },
      activity: {
        sessionCount: 12,
        answerCount: 85,
        lastActiveAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    },
    {
      studentId: "student-mock-2",
      studentName: "李欣怡",
      studentNumber: "20240702",
      credential: {
        status: "ACTIVE",
        accessToken: "mock-token-s2",
        updatedAt: "2026-03-01T08:00:00.000Z",
      },
      activity: {
        sessionCount: 15,
        answerCount: 102,
        lastActiveAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
    },
    {
      studentId: "student-mock-3",
      studentName: "王晨阳",
      studentNumber: "20240703",
      credential: {
        status: "ACTIVE",
        accessToken: "mock-token-s3",
        updatedAt: "2026-03-01T08:00:00.000Z",
      },
      activity: {
        sessionCount: 9,
        answerCount: 64,
        lastActiveAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
    },
    {
      studentId: "student-mock-4",
      studentName: "赵雨涵",
      studentNumber: "20240704",
      credential: {
        status: "ACTIVE",
        accessToken: "mock-token-s4",
        updatedAt: "2026-03-01T08:00:00.000Z",
      },
      activity: {
        sessionCount: 14,
        answerCount: 98,
        lastActiveAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      },
    },
  ];
}

/**
 * Mock teacher learning periods
 */
export function getMockTeacherPeriods() {
  return [
    {
      periodId: "mock-period-1-1",
      id: "mock-period-1-1",
      title: "正数和负数（第一课时）",
      classId: "class-7-1",
      className: "初一（1）班",
      teachingCourseId: "course-math-7",
      teachingCourseName: "七年级数学（人教版）",
      semesterId: "semester-2024-1",
      semesterName: "2024-2025学年第一学期",
      status: "ACTIVE",
      studentCount: 32,
      onlineCount: 28,
      avgAccuracy: 86,
      completionRate: 91,
      scheduledStartAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 3700 * 1000).toISOString(),
      activityAt: new Date().toISOString(),
      linkedLessonIds: ["section-1-1"],
      durationSeconds: 2700,
    },
    {
      periodId: "mock-period-1-2",
      id: "mock-period-1-2",
      title: "有理数与数轴",
      classId: "class-7-1",
      className: "初一（1）班",
      teachingCourseId: "course-math-7",
      teachingCourseName: "七年级数学（人教版）",
      semesterId: "semester-2024-1",
      semesterName: "2024-2025学年第一学期",
      status: "COMPLETED",
      studentCount: 32,
      onlineCount: 0,
      avgAccuracy: 82,
      completionRate: 95,
      scheduledStartAt: new Date(Date.now() - 86400 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 86500 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 82800 * 1000).toISOString(),
      activityAt: new Date(Date.now() - 82800 * 1000).toISOString(),
      linkedLessonIds: ["section-1-2"],
      durationSeconds: 2700,
    },
  ];
}

/**
 * Mock single teacher learning period
 * @param periodId
 */
export function getMockTeacherPeriod(periodId = "mock-period-1-1") {
  const periods = getMockTeacherPeriods();
  return (
    periods.find((p) => p.periodId === periodId || p.id === periodId) ||
    periods[0]
  );
}

/**
 * Mock classroom live snapshot
 * @param periodId
 */
export function getMockClassroomSnapshot(periodId = "mock-period-1-1") {
  const students = getMockClassStudents("class-7-1");
  return {
    periodId,
    sessions: students.map((s, idx) => ({
      id: `session-mock-${s.studentId}`,
      studentId: s.studentId,
      studentName: s.studentName,
      status: "ACTIVE",
      startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      currentStage:
        idx === 0
          ? "knowledge_practice"
          : idx === 1
            ? "composite_review"
            : "knowledge_learning",
      currentKnowledgeObjectiveId: "kp-1-1-1",
      lastActiveAt: s.activity.lastActiveAt,
    })),
    events: students.flatMap((s) => [
      {
        id: `ev-${s.studentId}-1`,
        studentSessionId: `session-mock-${s.studentId}`,
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        payload: {
          type: "stage_entered",
          stage: "pre_assessment",
          lessonTitle: "正数和负数的概念与表示",
        },
      },
      {
        id: `ev-${s.studentId}-2`,
        studentSessionId: `session-mock-${s.studentId}`,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        payload: {
          type: "stage_entered",
          stage: "knowledge_practice",
          knowledgeObjectiveId: "kp-1-1-1",
          lessonTitle: "正数和负数的概念与表示",
        },
      },
    ]),
    answers: students.flatMap((s, idx) => [
      {
        id: `ans-${s.studentId}-1`,
        studentSessionId: `session-mock-${s.studentId}`,
        questionId: "sec11-pre-1",
        knowledgeObjectiveId: "kp-1-1-1",
        score: idx === 2 ? 0 : 2,
        maxScore: 2,
        submittedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
      {
        id: `ans-${s.studentId}-2`,
        studentSessionId: `session-mock-${s.studentId}`,
        questionId: "sec11-pre-2",
        knowledgeObjectiveId: "kp-1-1-1",
        score: 2,
        maxScore: 2,
        submittedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      },
    ]),
    dialogues: [],
  };
}

/**
 * Mock classroom student reports
 * @param periodId
 */
export function getMockClassroomReports(periodId = "mock-period-1-1") {
  const students = getMockClassStudents("class-7-1");
  return students.map((s, idx) => ({
    studentId: s.studentId,
    studentSessionId: `session-mock-${s.studentId}`,
    studentName: s.studentName,
    learningMinutes: 35 + idx * 2,
    questionCount: 8 + idx,
    accuracy: 80 + idx * 5,
    answeredQuestionCount: 8 + idx,
    masteryResults: [
      {
        knowledgeObjectiveId: "kp-1-1-1",
        status: "DETERMINED",
        priorMastery: 0.45,
        mastery: 0.85 + (idx % 2) * 0.1,
        confidence: 0.9,
      },
      {
        knowledgeObjectiveId: "kp-1-1-2",
        status: "DETERMINED",
        priorMastery: 0.35,
        mastery: 0.78 + (idx % 3) * 0.08,
        confidence: 0.85,
      },
    ],
    score: {
      status: "SUBMITTED",
      reviewStatus: "CONFIRMED",
      summary: "知识点掌握扎实，练习完成迅速",
    },
  }));
}

/**
 * Mock student learning home profile
 * @param studentId
 */
export function getMockStudentLearningHome(studentId = "student-mock-1") {
  const students = getMockClassStudents("class-7-1");
  const s =
    students.find((item) => item.studentId === studentId) || students[0];
  const now = Date.now();
  return {
    student: {
      displayName: s.studentName,
      name: s.studentName,
      studentId: s.studentId,
    },
    className: "初一（1）班",
    records: [
      {
        knowledgePointId: "kp-1-1-1",
        knowledgePointName: "1.1.1 正数与负数的定义",
        chapterTitle: "第一章 有理数",
        lessonTitle: "第1课 正数和负数的概念与表示",
        mastery: 88,
        priorMastery: 45,
        confidence: 90,
        status: "MASTERED",
        attemptCount: 12,
        correctCount: 10,
        lastAttemptAt: new Date(now - 15 * 60 * 1000).toISOString(),
      },
      {
        knowledgePointId: "kp-1-1-2",
        knowledgePointName: "1.1.2 具有相反意义的量",
        chapterTitle: "第一章 有理数",
        lessonTitle: "第1课 正数和负数的概念与表示",
        mastery: 78,
        priorMastery: 35,
        confidence: 85,
        status: "IN_PROGRESS",
        attemptCount: 10,
        correctCount: 8,
        lastAttemptAt: new Date(now - 45 * 60 * 1000).toISOString(),
      },
      {
        knowledgePointId: "kp-1-2-1",
        knowledgePointName: "1.2.1 数轴的三要素与画法",
        chapterTitle: "第一章 有理数",
        lessonTitle: "第2课 有理数与数轴规律",
        mastery: 92,
        priorMastery: 60,
        confidence: 95,
        status: "MASTERED",
        attemptCount: 14,
        correctCount: 13,
        lastAttemptAt: new Date(now - 86400 * 1000).toISOString(),
      },
    ],
    timeline: [
      {
        id: "tl-1",
        stage: "pre_assessment",
        stageTitle: "课前小测",
        kpName: "1.1.1 正数与负数的定义",
        startedAt: new Date(now - 35 * 60 * 1000).toISOString(),
        endedAt: new Date(now - 25 * 60 * 1000).toISOString(),
        durationSeconds: 600,
      },
      {
        id: "tl-2",
        stage: "knowledge_practice",
        stageTitle: "知识点练习",
        kpName: "1.1.1 正数与负数的定义",
        startedAt: new Date(now - 25 * 60 * 1000).toISOString(),
        endedAt: new Date(now - 10 * 60 * 1000).toISOString(),
        durationSeconds: 900,
      },
    ],
    attempts: [
      {
        id: "att-1",
        questionId: "sec11-pre-1",
        kpName: "1.1.1 正数与负数的定义",
        stem: "下列各数中，属于负数的是（ ）",
        type: "single_choice",
        userAnswer: "B",
        correctAnswer: "B",
        isCorrect: true,
        score: 2,
        maxScore: 2,
        submittedAt: new Date(now - 28 * 60 * 1000).toISOString(),
        presentedAt: new Date(now - 30 * 60 * 1000).toISOString(),
      },
      {
        id: "att-2",
        questionId: "sec11-pre-2",
        kpName: "1.1.1 正数与负数的定义",
        stem: "如果+30元表示收入30元，那么支出20元表示为（ ）",
        type: "single_choice",
        userAnswer: "-20元",
        correctAnswer: "-20元",
        isCorrect: true,
        score: 2,
        maxScore: 2,
        submittedAt: new Date(now - 24 * 60 * 1000).toISOString(),
        presentedAt: new Date(now - 26 * 60 * 1000).toISOString(),
      },
    ],
    supportActivities: [],
    score: {
      status: "SUBMITTED",
      reviewStatus: "CONFIRMED",
      summary: "课堂表现良好，基础概念掌握扎实。",
    },
    matrix: {
      totalQuestions: 15,
      correctQuestions: 13,
      avgAccuracy: 87,
      totalMinutes: 38,
    },
  };
}

/**
 * Mock platform subjects
 */
export function getMockPlatformSubjects() {
  return {
    status: true,
    content: [
      { subjectId: "math", subjectName: "初中数学" },
      { subjectId: "physics", subjectName: "初中物理" },
    ],
  };
}

/**
 * Mock platform semester
 */
export function getMockPlatformSemester() {
  return {
    status: true,
    content: [
      {
        semesterId: "semester-2024-1",
        semesterName: "2024-2025学年第一学期",
        current: true,
      },
    ],
  };
}

/**
 * Mock platform courses
 */
export function getMockPlatformCourses() {
  return {
    status: true,
    content: [
      {
        courseId: "course-math-7",
        courseName: "七年级数学（人教版）",
        subjectId: "math",
        semesterId: "semester-2024-1",
        gradeId: "grade-7",
        gradeName: "初一",
      },
    ],
  };
}

/**
 * Mock platform course students
 */
export function getMockPlatformCourseStudents() {
  return {
    status: true,
    content: [
      {
        classId: "class-7-1",
        className: "初一（1）班",
        students: [
          { studentId: "student-mock-1", studentName: "张小明" },
          { studentId: "student-mock-2", studentName: "李欣怡" },
          { studentId: "student-mock-3", studentName: "王晨阳" },
          { studentId: "student-mock-4", studentName: "赵雨涵" },
        ],
      },
      {
        classId: "class-7-2",
        className: "初一（2）班",
        students: [
          { studentId: "student-mock-5", studentName: "周思远" },
          { studentId: "student-mock-6", studentName: "吴雨桐" },
        ],
      },
    ],
  };
}

/**
 * Mock batch create generation runs
 * @param lessons
 */
export function batchCreateMockGenerationRuns(lessons = []) {
  const list = Array.isArray(lessons) ? lessons : [lessons];
  return list.map((lesson) => {
    const lessonId = lesson?.id || "section-1-1";
    const version = getMockPublishedLessonVersion(lessonId);
    return {
      runId: `run-mock-${lessonId}-${Date.now()}`,
      lessonId,
      status: "awaiting_review",
      progress: 100,
      checkpoint: {
        teacherAgent: { operation: "generate_whole_lesson" },
      },
      draft: {
        publishedVersionNumber: 1,
        status: "draft",
        preQuestions: version.contentPackage.diagnosticQuestionPool,
        postQuestions: [
          ...Object.values(version.contentPackage.knowledgePracticePools).flat(),
          ...version.contentPackage.compositeReviewPool,
        ],
        learningContent: version.contentPackage.learningContent,
        qualityReport: { passed: true, issues: [] },
      },
      qualityIssues: [],
      reviewRequired: true,
      updatedAt: new Date().toISOString(),
    };
  });
}
