import React from "react";

import { trans } from "../../utils/i18n";
import AppShell from "../components/AppShell";
import StudentAccountLearningHomeState from "../components/StudentAccountLearningHomeState";
import { routes } from "../routes/routePaths";
import { useNavigate } from "../routing";
import { useStudentAccountLearningHome } from "../student/hooks/useStudentAccountLearningHome";

import "../student-progress.css";
import "../student-learning-home.css";

/**
 * @returns {React.ReactElement} 学生账号的权威学习主页。
 */
export default function StudentAuthoritativeHomeRoute() {
  const navigate = useNavigate();
  const state = useStudentAccountLearningHome();

  return (
    <AppShell
      title={trans("adaptiveLearning.student.learningHome", "学习主页")}
      onBack={() => navigate(routes.directory)}
      compact
    >
      <StudentAccountLearningHomeState {...state} />
    </AppShell>
  );
}
