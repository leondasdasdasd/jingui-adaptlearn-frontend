import React from "react";
import { Redirect, Route, Switch } from "dva/router";

import DirectoryRoute from "./components/DirectoryPage";
import KnowledgeMapRoute from "./pages/KnowledgeMapRoute";
import LearningRoute from "./pages/LearningRoute";
import PreAssessmentResultRoute from "./components/PreAssessmentResultPage";
import TeacherCurriculumRoute from "./pages/TeacherCurriculumRoute";
import TeacherContentRoute from "./teacher/content-route/TeacherContentOpenMaicSection";

const StubPage = ({ name }) => (
  <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
    <h3>{name || "页面建设中"}</h3>
  </div>
);

const FamilyStudentMonitorRoute = () => <StubPage name="家庭学情监测" />;
const KnowledgeCheckpointRoute = () => <StubPage name="知识检查点" />;
const LearningCheckInRoute = () => <StubPage name="学习签到" />;
const PostAssessmentRoute = () => <StubPage name="课后测评" />;
const PreAssessmentRoute = () => <StubPage name="课前小测" />;
const RemediationRoute = () => <StubPage name="巩固补救" />;
const ResultRoute = () => <StubPage name="学习结果报告" />;
const StudentAuthoritativeHomeRoute = () => <StubPage name="学生主页" />;
const StudentEntryRoute = () => <StubPage name="学生入口" />;
const SubjectiveAnswerAcceptanceRoute = () => <StubPage name="主观题批改" />;
const TeacherClassesRoute = () => <StubPage name="班级管理" />;
const TeacherClassStudentHomeRoute = () => <StubPage name="学生主页" />;
const TeacherClassStudentsRoute = () => <StubPage name="班级学生列表" />;
const TeacherLiveRoute = () => <StubPage name="实时课堂" />;
const TeacherQuestionQualityRoute = () => <StubPage name="题目质量分析" />;
const TeacherReportRoute = () => <StubPage name="教学报告" />;
const TeacherReportsRoute = () => <StubPage name="报告中心" />;
const TeacherStudentDetailRoute = () => <StubPage name="学生详情" />;
const TeacherStudentHomeRoute = () => <StubPage name="学生个人中心" />;
import RequirePreAssessment from "./routes/RequirePreAssessment";
import RequireSession from "./routes/RequireSession";
import { routes } from "./routes/routePaths";
import RoleSwitcherFloat from "./components/RoleSwitcherFloat";
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
            <Redirect exact from="/" to={routes.teacherHome} />
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
            <Redirect to={routes.teacherHome} />
          </Switch>
          <RoleSwitcherFloat />
          <div id="adaptive-learning-portal-host" />
        </div>
      </LearningSessionProvider>
    </RoutingProvider>
  );
}
