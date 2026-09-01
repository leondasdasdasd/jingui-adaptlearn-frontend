import React from "react";
import { Redirect, Route, Switch } from "dva/router";

import DirectoryRoute from "./pages/DirectoryRoute";
import FamilyStudentMonitorRoute from "./pages/FamilyStudentMonitorRoute";
import KnowledgeCheckpointRoute from "./pages/KnowledgeCheckpointRoute";
import KnowledgeMapRoute from "./pages/KnowledgeMapRoute";
import LearningCheckInRoute from "./pages/LearningCheckInRoute";
import LearningRoute from "./pages/LearningRoute";
import PostAssessmentRoute from "./pages/PostAssessmentRoute";
import PreAssessmentResultRoute from "./pages/PreAssessmentResultRoute";
import PreAssessmentRoute from "./pages/PreAssessmentRoute";
import RemediationRoute from "./pages/RemediationRoute";
import ResultRoute from "./pages/ResultRoute";
import StudentAuthoritativeHomeRoute from "./pages/StudentAuthoritativeHomeRoute";
import StudentEntryRoute from "./pages/StudentEntryRoute";
import SubjectiveAnswerAcceptanceRoute from "./pages/SubjectiveAnswerAcceptanceRoute";
import TeacherClassesRoute from "./pages/TeacherClassesRoute";
import TeacherClassStudentHomeRoute from "./pages/TeacherClassStudentHomeRoute";
import TeacherClassStudentsRoute from "./pages/TeacherClassStudentsRoute";
import TeacherContentRoute from "./pages/TeacherContentRoute";
import TeacherCurriculumRoute from "./pages/TeacherCurriculumRoute";
import TeacherLiveRoute from "./pages/TeacherLiveRoute";
import TeacherQuestionQualityRoute from "./pages/TeacherQuestionQualityRoute";
import TeacherReportRoute from "./pages/TeacherReportRoute";
import TeacherReportsRoute from "./pages/TeacherReportsRoute";
import TeacherStudentDetailRoute from "./pages/TeacherStudentDetailRoute";
import TeacherStudentHomeRoute from "./pages/TeacherStudentHomeRoute";
import RequirePreAssessment from "./routes/RequirePreAssessment";
import RequireSession from "./routes/RequireSession";
import { routes } from "./routes/routePaths";
import ScrollToTop from "./routes/ScrollToTop";
import TeacherAuthorizationBoundary from "./routes/TeacherAuthorizationBoundary";
import { RoutingProvider } from "./routing";
import { LearningSessionProvider } from "./session/LearningSessionContext";

import "@fontsource-variable/noto-serif-sc/wght.css";
import "./class-roster.css";
import "./styles.css";
import "./yungu-classroom-theme.css";

/**
 *
 * @param path
 * @param element
 */
function route(path, element) {
  return (
    <Route
      key={path}
      path={path}
      exact
      render={(routeProperties) => (
        <RoutingProvider route={routeProperties}>{element}</RoutingProvider>
      )}
    />
  );
}

const requireSession = (element) => <RequireSession>{element}</RequireSession>;
const requireAssessment = (element) => (
  <RequireSession>
    <RequirePreAssessment>{element}</RequirePreAssessment>
  </RequireSession>
);
const requireTeacher = (element) => (
  <TeacherAuthorizationBoundary>{element}</TeacherAuthorizationBoundary>
);

/**
 *
 * @param routeProperties
 */
export default function AdaptiveLearningRoot(routeProperties) {
  return (
    <RoutingProvider route={routeProperties}>
      <LearningSessionProvider>
        <div className="adaptive-learning-root">
          <ScrollToTop />
          <Switch>
            <Redirect exact from="/adaptive-learning" to={routes.teacherHome} />
            {route(routes.directory, <DirectoryRoute />)}
            {route(routes.knowledgeMap, <KnowledgeMapRoute />)}
            {route(routes.studentHome, <StudentAuthoritativeHomeRoute />)}
            {route(routes.studentEntry(), <StudentEntryRoute />)}
            {route(routes.knowledgeLearning(), <LearningRoute />)}
            {route(routes.lesson(), <DirectoryRoute />)}
            {route(
              routes.preAssessment,
              requireSession(<PreAssessmentRoute />),
            )}
            {route(
              routes.preResult,
              requireSession(<PreAssessmentResultRoute />),
            )}
            {route(routes.learning, requireAssessment(<LearningRoute />))}
            {route(routes.checkIn, requireAssessment(<LearningCheckInRoute />))}
            {route(routes.remediation, requireAssessment(<RemediationRoute />))}
            {route(
              routes.postAssessment,
              requireAssessment(<PostAssessmentRoute />),
            )}
            {route(
              routes.knowledgeCheckpoint,
              requireAssessment(<KnowledgeCheckpointRoute />),
            )}
            {route(routes.complete, requireSession(<ResultRoute />))}
            {route(
              routes.subjectiveAnswerAcceptance,
              <SubjectiveAnswerAcceptanceRoute />,
            )}
            {route(routes.familyMonitor(), <FamilyStudentMonitorRoute />)}
            {route(
              routes.teacherHome,
              requireTeacher(<TeacherCurriculumRoute />),
            )}
            {route(
              "/adaptive-learning/teacher/textbook-lessons/:lessonId/content",
              requireTeacher(<TeacherContentRoute />),
            )}
            {route(
              routes.teacherQuestionQuality,
              requireTeacher(<TeacherQuestionQualityRoute />),
            )}
            {route(
              "/adaptive-learning/teacher/live",
              requireTeacher(<TeacherLiveRoute />),
            )}
            {route(
              "/adaptive-learning/teacher/periods/:periodId/live",
              requireTeacher(<TeacherLiveRoute />),
            )}
            {route(
              "/adaptive-learning/teacher/periods/:periodId/students/:studentId/home",
              requireTeacher(<TeacherStudentHomeRoute />),
            )}
            {route(
              "/adaptive-learning/teacher/periods/:periodId/students/:studentId",
              requireTeacher(<TeacherStudentDetailRoute />),
            )}
            {route(
              "/adaptive-learning/teacher/reports",
              requireTeacher(<TeacherReportsRoute />),
            )}
            {route(
              "/adaptive-learning/teacher/periods/:periodId/report",
              requireTeacher(<TeacherReportRoute />),
            )}
            {route(
              routes.teacherClasses,
              requireTeacher(<TeacherClassesRoute />),
            )}
            {route(
              routes.teacherClassStudentHome(),
              requireTeacher(<TeacherClassStudentHomeRoute />),
            )}
            {route(
              routes.teacherClassStudents(),
              requireTeacher(<TeacherClassStudentsRoute />),
            )}
            <Redirect
              from="/adaptive-learning/teacher/classroom-plans"
              to={routes.teacherHome}
            />
            <Redirect to={routes.directory} />
          </Switch>
          <div id="adaptive-learning-portal-host" />
        </div>
      </LearningSessionProvider>
    </RoutingProvider>
  );
}
