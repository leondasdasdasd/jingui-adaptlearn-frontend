import React, { useEffect, useState } from "react";
import {
  ChevronRight,
  Layers3,
  LockKeyhole,
  Zap,
} from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import UnitKnowledgeMindmap from "./UnitKnowledgeMindmap";

/**
 * 单元测试与查缺补漏专属综合工作台页面
 * @param root0
 * @param root0.course
 * @param root0.courseName
 * @param root0.chapter
 * @param root0.knowledgeProfile
 * @param root0.busy
 * @param root0.learningMode
 * @param root0.onStart
 * @param root0.onStartUnitAssessment
 * @param root0.onChooseSection
 * @param root0.onOpenKnowledgeMap
 */
export default function UnitAssessmentWorkspace({
  course,
  courseName = "七年级数学 · 上册",
  chapter,
  knowledgeProfile = {},
  busy = false,
  learningMode = "REMEDIATION",
  onStart,
  onStartUnitAssessment,
  onChooseSection,
  onOpenKnowledgeMap,
}) {
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleStartUnitAssessment = () => {
    if (onStartUnitAssessment) {
      onStartUnitAssessment(chapter);
      return;
    }

    // 如果未接入真实单元测试生成，给出友好明确的空态提示
    setToastMessage(
      trans(
        "adaptiveLearning.learningMode.unitAssessmentUnavailable",
        "这个单元还没有可用的单元测试",
      ),
    );
  };

  return (
    <div
      className="modern-workspace-container unit-assessment-workspace-root"
      id="unit-assessment-workspace"
    >
      {/* 提示消息 */}
      {toastMessage && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <LockKeyhole size={15} className="text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 顶部单元测试标题栏 */}
      <div className="unit-hero-card">
        <div className="unit-hero-main">
          <h1 className="unit-hero-title">
            {chapter.title} · 单元测试
          </h1>
        </div>
      </div>

      {/* 单元考点思维导图与知识结构（内含掌握状态表达） */}
      <UnitKnowledgeMindmap chapter={chapter} knowledgeProfile={knowledgeProfile} />

      {/* 底部固定行动栏 */}
      <footer className="fixed-bottom-action-dock" id="unit-assessment-action-dock">
        <div className="action-dock-info" />

        <div className="action-dock-actions single-action">
          <button
            type="button"
            className="modern-cta-btn modern-unit-start-btn"
            disabled={busy}
            onClick={handleStartUnitAssessment}
            aria-label="开始单元测试"
          >
            <Zap size={18} />
            <span>开始单元测试</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}

UnitAssessmentWorkspace.propTypes = {
  busy: PropTypes.bool,
  chapter: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    index: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sections: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  course: PropTypes.object,
  courseName: PropTypes.string,
  knowledgeProfile: PropTypes.object,
  learningMode: PropTypes.string,
  onChooseSection: PropTypes.func,
  onOpenKnowledgeMap: PropTypes.func,
  onStart: PropTypes.func,
  onStartUnitAssessment: PropTypes.func,
};
