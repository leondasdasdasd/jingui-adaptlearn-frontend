import React, { useEffect, useRef } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";

import { trans } from "../../utils/i18n";
import { getAdaptivePortalHost } from "../shared/application/adaptivePortalHost";

/**
 * 只在自适应学习样式作用域内创建弹层，避免回退到主应用 body 后失去主题样式。
 * @param {React.ReactNode} dialog 弹层内容。
 * @returns {React.ReactPortal | null} Portal，宿主尚未就绪时不渲染。
 */
function renderInAdaptivePortal(dialog) {
  const portalHost = getAdaptivePortalHost();
  return portalHost ? createPortal(dialog, portalHost) : null;
}

/**
 * 课堂结束二次确认弹窗。
 * @param {object} root0 组件属性。
 * @param {string} root0.className 班级名称。
 * @param {string} root0.lessonTitle 课堂名称。
 * @param {number} root0.studentCount 已进入课堂的学生数。
 * @param {number} root0.onlineCount 当前在线学生数。
 * @param {boolean} root0.pending 下课请求是否处理中。
 * @param {string} root0.error 下课失败提示。
 * @param {() => void} root0.onCancel 取消下课回调。
 * @param {() => Promise<void> | void} root0.onConfirm 确认下课回调。
 * @returns {React.ReactPortal | null} 下课确认弹层。
 */
export default function EndClassroomDialog({
  className,
  lessonTitle,
  studentCount,
  onlineCount,
  pending,
  error,
  onCancel,
  onConfirm,
}) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, pending]);

  // 实时课堂含有独立滚动和定位容器，确认层必须挂到统一宿主才能稳定覆盖整个工作区。
  return renderInAdaptivePortal(
    <div
      className="end-classroom-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-classroom-title"
      aria-describedby="end-classroom-description"
      aria-busy={pending}
    >
      <button
        className="end-classroom-mask"
        type="button"
        aria-label={trans(
          "adaptiveLearning.endClass.cancelEnding",
          "取消下课",
        )}
        onClick={() => {
          if (!pending) onCancel();
        }}
      />
      <section>
        <header>
          <div className="end-classroom-heading-icon" aria-hidden="true">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 id="end-classroom-title">
              {trans("adaptiveLearning.endClass.title", "确认下课？")}
            </h2>
            <p>
              {className ||
                trans("adaptiveLearning.endClass.currentClass", "当前班级")} {" "}
              ·{" "}
              {lessonTitle ||
                trans("adaptiveLearning.endClass.currentLesson", "当前课堂")}
            </p>
          </div>
          <button
            type="button"
            aria-label={trans("global.close", "关闭")}
            disabled={pending}
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        </header>
        <div className="end-classroom-body">
          <p id="end-classroom-description">
            {trans(
              "adaptiveLearning.endClass.description",
              "下课后将立即结算本课堂的学习记录，并生成课堂报告。",
            )}
          </p>
          <ul>
            <li>
              {trans(
                "adaptiveLearning.endClass.stopAnswering",
                "已进入课堂的 {$count} 名学生将停止继续作答",
                { count: studentCount || 0 },
              )}
            </li>
            <li>
              {trans(
                "adaptiveLearning.endClass.finalizeProgress",
                "学生进度、作答和预警将按当前数据结算",
              )}
            </li>
            <li>
              {trans(
                "adaptiveLearning.endClass.cannotResume",
                "下课后不能恢复本课堂，可另行开启下一堂课",
              )}
            </li>
          </ul>
          {onlineCount > 0 && (
            <div className="end-classroom-online-warning">
              <AlertTriangle size={16} />
              {trans(
                "adaptiveLearning.endClass.studentsOnline",
                "当前仍有 {$count} 名学生在线，请确认后再下课。",
                { count: onlineCount },
              )}
            </div>
          )}
          {error && (
            <div className="end-classroom-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <footer>
          <button
            className="teacher-neutral"
            type="button"
            disabled={pending}
            onClick={onCancel}
          >
            {trans("adaptiveLearning.endClass.continue", "继续上课")}
          </button>
          <button
            ref={confirmButtonRef}
            className="teacher-primary end-classroom-confirm-button"
            type="button"
            aria-busy={pending}
            disabled={pending}
            onClick={() => {
              void onConfirm();
            }}
          >
            {pending && <LoaderCircle className="spin" size={16} />}
            {pending
              ? trans("adaptiveLearning.endClass.ending", "正在下课…")
              : trans("adaptiveLearning.endClass.confirm", "确认下课")}
          </button>
        </footer>
      </section>
    </div>,
  );
}

EndClassroomDialog.propTypes = {
  className: PropTypes.string,
  lessonTitle: PropTypes.string,
  studentCount: PropTypes.number.isRequired,
  onlineCount: PropTypes.number.isRequired,
  pending: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

EndClassroomDialog.defaultProps = {
  className: "",
  lessonTitle: "",
  error: "",
};
