import React from "react";
import PropTypes from "prop-types";

import { trans } from "../../utils/i18n";
import { studentAccountSessionIssues } from "../student/domain/studentAccountSession";
import StatePanel from "./StatePanel";
import StudentLearningHome from "./StudentLearningHome";

// 文案在渲染时读取当前语言，避免模块初始化后切换语言仍显示旧文本。
const getIssueCopy = () => ({
  [studentAccountSessionIssues.loginRequired]: {
    title: trans("adaptiveLearning.student.signInTitle", "请先登录测验"),
    description: trans(
      "adaptiveLearning.student.signInDescription",
      "使用你的测验学生账号登录后，即可进入自适应学习。",
    ),
  },
  [studentAccountSessionIssues.accessDenied]: {
    title: trans(
      "adaptiveLearning.student.accessDeniedTitle",
      "当前账号不是学生账号",
    ),
    description: trans(
      "adaptiveLearning.student.accessDeniedDescription",
      "请切换到有学习权限的测验学生账号。",
    ),
  },
  [studentAccountSessionIssues.noClassroom]: {
    title: trans(
      "adaptiveLearning.student.noClassroomTitle",
      "暂时没有可学习的课堂",
    ),
    description: trans(
      "adaptiveLearning.student.noClassroomDescription",
      "老师开课并选择你后，课堂会显示在这里。",
    ),
  },
  [studentAccountSessionIssues.unavailable]: {
    title: trans(
      "adaptiveLearning.student.unavailableTitle",
      "学习主页暂时不可用",
    ),
    description: trans(
      "adaptiveLearning.student.unavailableDescription",
      "请稍后刷新重试，已保存的学习记录不会丢失。",
    ),
  },
});

/**
 * @param {object} props 主页加载状态。
 * @param {boolean} props.loading 是否正在读取身份或主页。
 * @param {object | null} props.profile 权威学习主页投影。
 * @param {string} props.issue 稳定业务错误码。
 * @param {string} props.loginUrl 测验学生登录地址。
 * @returns {React.ReactElement | null} 当前主页状态视图。
 */
export default function StudentAccountLearningHomeState({
  loading,
  profile,
  issue,
  loginUrl,
}) {
  if (loading) {
    return (
      <StatePanel
        tone="loading"
        title={trans(
          "adaptiveLearning.student.loadingTitle",
          "正在加载学习主页",
        )}
        description={trans(
          "adaptiveLearning.student.loadingDescription",
          "正在读取你的课堂与学习记录。",
        )}
      />
    );
  }
  if (issue) {
    const issueCopy = getIssueCopy();
    const copy = issueCopy[issue] || issueCopy.UNAVAILABLE;
    const action =
      issue === studentAccountSessionIssues.loginRequired && loginUrl ? (
        <a className="primary-button" href={loginUrl}>
          {trans("adaptiveLearning.student.signIn", "登录测验")}
        </a>
      ) : null;
    return (
      <StatePanel
        tone={
          issue === studentAccountSessionIssues.noClassroom ? "empty" : "error"
        }
        title={copy.title}
        description={copy.description}
        action={action}
      />
    );
  }
  return profile ? (
    <StudentLearningHome profile={profile} viewer="student" recordScope="all" />
  ) : null;
}

StudentAccountLearningHomeState.propTypes = {
  issue: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  loginUrl: PropTypes.string.isRequired,
  profile: PropTypes.object,
};

StudentAccountLearningHomeState.defaultProps = {
  profile: null,
};
