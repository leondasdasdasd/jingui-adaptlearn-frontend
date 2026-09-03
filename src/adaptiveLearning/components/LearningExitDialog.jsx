import React, { useRef } from "react";
import { Sparkles } from "lucide-react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";

import { getAdaptivePortalHost } from "../shared/application/adaptivePortalHost";
import useModalLifecycle from "../shared/react/useModalLifecycle";

/**
 * 学习流程退出确认统一在门户层展示，避免页面滚动容器裁切弹窗并保证键盘焦点可恢复。
 * @param {object} props 弹窗文案与操作。
 * @param {string} props.title 弹窗标题。
 * @param {string} props.description 进度保存说明。
 * @param {string} props.exitLabel 退出操作文案。
 * @param {string} props.continueLabel 继续学习操作文案。
 * @param {() => void} props.onExit 确认退出回调。
 * @param {() => void} props.onContinue 继续学习回调。
 * @returns {React.ReactPortal | null} 退出确认弹窗。
 */
export default function LearningExitDialog({
  title,
  description,
  exitLabel,
  continueLabel,
  onExit,
  onContinue,
}) {
  const continueButtonRef = useRef(null);
  const dialogRef = useRef(null);
  useModalLifecycle({
    open: true,
    dialogRef,
    initialFocusRef: continueButtonRef,
    onEscape: onContinue,
  });

  const portalHost = getAdaptivePortalHost();
  if (!portalHost) return null;

  return createPortal(
    <div
      className="learning-exit-dialog-mask"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onContinue();
      }}
    >
      <section
        ref={dialogRef}
        className="learning-exit-dialog"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="learning-exit-dialog-title"
        aria-describedby="learning-exit-dialog-description"
      >
        <span className="learning-exit-dialog-icon" aria-hidden="true">
          <Sparkles size={22} />
        </span>
        <h2 id="learning-exit-dialog-title">{title}</h2>
        <p id="learning-exit-dialog-description">{description}</p>
        <footer>
          <button className="neutral-button" type="button" onClick={onExit}>
            {exitLabel}
          </button>
          <button
            ref={continueButtonRef}
            className="primary-button"
            type="button"
            onClick={onContinue}
          >
            <Sparkles size={14} aria-hidden="true" />
            {continueLabel}
          </button>
        </footer>
      </section>
    </div>,
    portalHost,
  );
}

LearningExitDialog.propTypes = {
  continueLabel: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  exitLabel: PropTypes.string.isRequired,
  onContinue: PropTypes.func.isRequired,
  onExit: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
};
