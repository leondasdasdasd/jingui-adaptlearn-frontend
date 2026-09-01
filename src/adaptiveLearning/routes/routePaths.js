export const routes = {
  teacherHome: "/adaptive-learning/teacher/textbook-lessons",
  teacherQuestionQuality: "/adaptive-learning/teacher/question-quality",
  directory: "/adaptive-learning/today",
  knowledgeMap: "/adaptive-learning/knowledge-map",
  studentHome: "/adaptive-learning/student/home",
  studentEntry: (studentId = ":studentId") =>
    `/adaptive-learning/student/${studentId}`,
  knowledgeLearning: (knowledgePointId = ":knowledgePointId") =>
    `/adaptive-learning/knowledge/${knowledgePointId}/learn`,
  lesson: (lessonId = ":lessonId") => `/adaptive-learning/lesson/${lessonId}`,
  preAssessment: "/adaptive-learning/session/pre-assessment",
  preResult: "/adaptive-learning/session/pre-result",
  learning: "/adaptive-learning/session/learning",
  checkIn: "/adaptive-learning/session/check-in",
  remediation: "/adaptive-learning/session/remediation",
  postAssessment: "/adaptive-learning/session/post-assessment",
  knowledgeCheckpoint: "/adaptive-learning/session/knowledge-checkpoint",
  complete: "/adaptive-learning/session/complete",
  subjectiveAnswerAcceptance: "/adaptive-learning/acceptance/subjective-answer",
  familyMonitor: (shareToken = ":shareToken") =>
    `/adaptive-learning/family/${shareToken}`,
  teacherClasses: "/adaptive-learning/teacher/classes",
  teacherClassStudents: (classId = ":classId") =>
    `/adaptive-learning/teacher/classes/${classId}/students`,
  teacherClassStudentHome: (classId = ":classId", studentId = ":studentId") =>
    `/adaptive-learning/teacher/classes/${classId}/students/${studentId}/home`,
};
