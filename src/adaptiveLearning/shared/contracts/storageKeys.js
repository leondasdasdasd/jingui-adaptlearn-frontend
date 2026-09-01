// 浏览器存储只是当前单机适配器。端侧代码通过仓储访问，未来可直接替换为 HTTP API。
export const storageKeys = {
  teacherContent: "adaptive-teacher-content-v1",
  learningEvents: "adaptive-learning-events-v1",
  studentSession: "adaptive-learning-session-v1",
  localStudentIdentity: "adaptive-local-student-identity-v1",
  classStudentIdentity: "adaptive-class-student-identity-v1",
  studentLearningHistory: "adaptive-student-learning-history-v1",
  quizDraft: (draftId) => `adaptive-quiz-${encodeURIComponent(draftId)}`,
  scratchPaperSession: (scope) =>
    `adaptive-scratch-paper-session-v1-${encodeURIComponent(scope)}`,
  autoSpeech: "adaptive-learning-auto-speech",
  knowledgeProfile: "adaptive-learning-knowledge-profile-v2",
  classroomEventOutbox: "adaptive-classroom-event-outbox-v1",
  classroomAnswerOutbox: "adaptive-classroom-answer-outbox-v1",
  classroomClientSequence: "adaptive-classroom-client-sequence-v1",
  classroomSnapshotSync: "adaptive-classroom-snapshot-sync-v1",
  quizDraftIndex: "adaptive-quiz-draft-index-v1",
  currentTeacherPeriod: "adaptive-current-teacher-period-v1",
  currentTeacherClass: "adaptive-current-teacher-class-v1",
  teacherStudentAccessToken: (periodId, studentId) =>
    `adaptive-teacher-student-access-token-v1-${encodeURIComponent(periodId)}-${encodeURIComponent(studentId)}`,
  studentSupportSession: "adaptive-student-support-session-v1",
  collapsedStudentHelpRequest: "adaptive-collapsed-help-request",
  teacherAgentSession: (lessonId) =>
    `adaptive-teacher-agent-session-v1-${encodeURIComponent(lessonId)}`,
};

export const clientEvents = {
  contentUpdated: "adaptive-content-updated",
  learningEventRecorded: "adaptive-learning-event",
  quizDraftUpdated: "adaptive-quiz-draft-updated",
  persistenceStatusChanged: "adaptive-persistence-status-changed",
};
