import React from "react";
import { LogIn, RefreshCw } from "lucide-react";
import PropTypes from "prop-types";

/**
 * 教师授权失败时只暴露登录或重试，不提供任何隐式演示身份入口。
 * @param root0
 * @param root0.action
 * @param root0.canRetry
 * @param root0.loginPending
 * @param root0.onLogin
 * @param root0.onRetry
 */
export default function TeacherAuthorizationAction({
  action,
  canRetry,
  loginPending,
  onLogin,
  onRetry,
}) {
  if (action === "login") {
    return (
      <button className="teacher-primary" type="button" onClick={onLogin}>
        <LogIn size={15} />
        {loginPending ? "已打开测验，等待登录" : "前往测验登录"}
      </button>
    );
  }
  if (!canRetry) return null;
  return (
    <button className="teacher-primary" type="button" onClick={onRetry}>
      <RefreshCw size={15} />
      重新确认
    </button>
  );
}

TeacherAuthorizationAction.propTypes = {
  action: PropTypes.oneOf(["login", "none", "retry"]).isRequired,
  canRetry: PropTypes.bool.isRequired,
  loginPending: PropTypes.bool.isRequired,
  onLogin: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
};
