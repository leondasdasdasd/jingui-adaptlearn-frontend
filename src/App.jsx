import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DirectoryRoute from './pages/DirectoryRoute';
import KnowledgeMapRoute from './pages/KnowledgeMapRoute';
import LearningRoute from './pages/LearningRoute';
import LearningCheckInRoute from './pages/LearningCheckInRoute';
import RemediationRoute from './pages/RemediationRoute';
import PostAssessmentRoute from './pages/PostAssessmentRoute';
import PreAssessmentRoute from './pages/PreAssessmentRoute';
import PreAssessmentResultRoute from './pages/PreAssessmentResultRoute';
import ResultRoute from './pages/ResultRoute';
import KnowledgeCheckpointRoute from './pages/KnowledgeCheckpointRoute';
import TeacherContentRoute from './pages/TeacherContentRoute';
import TeacherCurriculumRoute from './pages/TeacherCurriculumRoute';
import TeacherLiveRoute from './pages/TeacherLiveRoute';
import TeacherReportRoute from './pages/TeacherReportRoute';
import TeacherReportsRoute from './pages/TeacherReportsRoute';
import TeacherStudentDetailRoute from './pages/TeacherStudentDetailRoute';
import TeacherStudentHomeRoute from './pages/TeacherStudentHomeRoute';
import StudentAuthoritativeHomeRoute from './pages/StudentAuthoritativeHomeRoute';
import TeacherLearningPlansRoute from './pages/TeacherLearningPlansRoute';
import SubjectiveAnswerAcceptanceRoute from './pages/SubjectiveAnswerAcceptanceRoute';
import FamilyStudentMonitorRoute from './pages/FamilyStudentMonitorRoute';
import StudentEntryRoute from './pages/StudentEntryRoute';
import TeacherClassStudentsRoute from './pages/TeacherClassStudentsRoute';
import TeacherClassesRoute from './pages/TeacherClassesRoute';
import TeacherClassStudentHomeRoute from './pages/TeacherClassStudentHomeRoute';
import TeacherQuestionQualityRoute from './pages/TeacherQuestionQualityRoute';
import RequireSession from './routes/RequireSession';
import RequirePreAssessment from './routes/RequirePreAssessment';
import ScrollToTop from './routes/ScrollToTop';
import TeacherAuthorizationBoundary from './routes/TeacherAuthorizationBoundary';
import { routes } from './routes/routePaths';
import { LearningSessionProvider } from './session/LearningSessionContext';
import './class-roster.css';

export default function App() {
  return (
    <BrowserRouter>
      <LearningSessionProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Navigate to={routes.teacherHome} replace />} />
          <Route path="/adaptive-learning" element={<Navigate to={routes.teacherHome} replace />} />
          <Route path={routes.directory} element={<DirectoryRoute />} />
          <Route path={routes.knowledgeMap} element={<KnowledgeMapRoute />} />
          <Route path={routes.studentHome} element={<StudentAuthoritativeHomeRoute />} />
          <Route path={routes.studentEntry()} element={<StudentEntryRoute />} />
          <Route path={routes.knowledgeLearning()} element={<LearningRoute />} />
          <Route path={routes.lesson()} element={<DirectoryRoute />} />
          <Route path={routes.preAssessment} element={<RequireSession><PreAssessmentRoute /></RequireSession>} />
          <Route path={routes.preResult} element={<RequireSession><PreAssessmentResultRoute /></RequireSession>} />
          <Route path={routes.learning} element={<RequireSession><RequirePreAssessment><LearningRoute /></RequirePreAssessment></RequireSession>} />
          <Route path={routes.checkIn} element={<RequireSession><RequirePreAssessment><LearningCheckInRoute /></RequirePreAssessment></RequireSession>} />
          <Route path={routes.remediation} element={<RequireSession><RequirePreAssessment><RemediationRoute /></RequirePreAssessment></RequireSession>} />
          <Route path={routes.postAssessment} element={<RequireSession><RequirePreAssessment><PostAssessmentRoute /></RequirePreAssessment></RequireSession>} />
          <Route path={routes.knowledgeCheckpoint} element={<RequireSession><RequirePreAssessment><KnowledgeCheckpointRoute /></RequirePreAssessment></RequireSession>} />
          <Route path={routes.complete} element={<RequireSession><ResultRoute /></RequireSession>} />
          <Route path={routes.subjectiveAnswerAcceptance} element={<SubjectiveAnswerAcceptanceRoute />} />
          <Route path={routes.familyMonitor()} element={<FamilyStudentMonitorRoute />} />
          <Route path="/adaptive-learning/teacher/textbook-lessons" element={<TeacherAuthorizationBoundary><TeacherCurriculumRoute /></TeacherAuthorizationBoundary>} />
          <Route path="/adaptive-learning/teacher/textbook-lessons/:lessonId/content" element={<TeacherAuthorizationBoundary><TeacherContentRoute /></TeacherAuthorizationBoundary>} />
          <Route path={routes.teacherQuestionQuality} element={<TeacherAuthorizationBoundary><TeacherQuestionQualityRoute /></TeacherAuthorizationBoundary>} />
          <Route path="/adaptive-learning/teacher/classroom-plans" element={<TeacherAuthorizationBoundary><TeacherLearningPlansRoute /></TeacherAuthorizationBoundary>} />
          <Route path="/adaptive-learning/teacher/live" element={<TeacherAuthorizationBoundary><TeacherLiveRoute /></TeacherAuthorizationBoundary>} />
          <Route path="/adaptive-learning/teacher/periods/:periodId/live" element={<TeacherAuthorizationBoundary><TeacherLiveRoute /></TeacherAuthorizationBoundary>} />
          <Route path="/adaptive-learning/teacher/periods/:periodId/students/:studentId" element={<TeacherAuthorizationBoundary><TeacherStudentDetailRoute /></TeacherAuthorizationBoundary>} />
          <Route path="/adaptive-learning/teacher/periods/:periodId/students/:studentId/home" element={<TeacherAuthorizationBoundary><TeacherStudentHomeRoute /></TeacherAuthorizationBoundary>} />
          <Route path="/adaptive-learning/teacher/reports" element={<TeacherAuthorizationBoundary><TeacherReportsRoute /></TeacherAuthorizationBoundary>} />
          <Route path="/adaptive-learning/teacher/periods/:periodId/report" element={<TeacherAuthorizationBoundary><TeacherReportRoute /></TeacherAuthorizationBoundary>} />
          <Route path={routes.teacherClasses} element={<TeacherAuthorizationBoundary><TeacherClassesRoute /></TeacherAuthorizationBoundary>} />
          <Route path={routes.teacherClassStudents()} element={<TeacherAuthorizationBoundary><TeacherClassStudentsRoute /></TeacherAuthorizationBoundary>} />
          <Route path={routes.teacherClassStudentHome()} element={<TeacherAuthorizationBoundary><TeacherClassStudentHomeRoute /></TeacherAuthorizationBoundary>} />
          <Route path="*" element={<Navigate to={routes.directory} replace />} />
        </Routes>
      </LearningSessionProvider>
    </BrowserRouter>
  );
}
