export const CHECK_IN_VERSION = 4;

/**
 * 创建全新的学习会话，避免多个入口共享可变的嵌套默认状态。
 * @returns {object} 空学习会话
 */
export function createEmptyLearningSession() {
  return {
    selection: null,
    preQuestions: [],
    postQuestions: [],
    preAttempts: {},
    postAttempts: {},
    preMastery: {},
    preAssessment: null,
    result: {},
    resultSource: "preview",
    publishedContent: null,
    learningFlow: {
      mode: "lesson_flow",
      plan: null,
      activeUnit: null,
      context: null,
      returnTo: "",
      returnUnit: null,
      returnMode: null,
    },
    learningCheckIn: {
      version: CHECK_IN_VERSION,
      messages: [],
      diagnosis: null,
    },
    practiceIntervention: null,
    tutoringSession: null,
    remediationOpenMaic: {
      jobId: "",
      status: "idle",
      step: "",
      progress: 0,
      message: "",
      classroomId: "",
      classroomUrl: "",
    },
  };
}

export const emptySession = createEmptyLearningSession();
