import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  ArrowRight,
  Check,
  BookOpen,
  Edit3,
  Award,
  CheckCheck,
  FastForward,
  Search,
  FileText,
  Sparkles,
} from "lucide-react";

import BrandLogo from "../components/BrandLogo";
import { DETAILED_MODE_CONFIGS } from "../student/presentation/learningModeSelectionData";
import {
  readPreferredLearningMode,
  savePreferredLearningMode,
} from "../student/data/studentLearningModePreference";
import { readClassStudentIdentity } from "../student/data/classStudentIdentityRepository";
import { CLASSROOM_LEARNING_MODE } from "../shared/domain/classroomLearningMode";
import { routes } from "../routes/routePaths";
import { useNavigate, useSearchParams } from "../routing";

import "../styles/learning-mode-selection-page.css";

/**
 * 专为 AI 自适应学习机重绘的纯净矢量模式图标（替代传统火箭、靶子等陈旧符号）
 */
function NewLessonIcon({ size = 28, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 展开的知识卷页与渐进通关阶梯 */}
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1-2.5-2.5z" />
      <path d="M8 7h6" />
      <path d="M8 11h4" />
      <path d="M12 17l2.5-2.5 2.5 2.5" />
      <path d="M14.5 14.5v4" />
    </svg>
  );
}

function FoundationIcon({ size = 28, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 知识基石层叠与智能跳关快速推进 */}
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 12l9 4 9-4" />
      <path d="M3 17l9 4 9-4" />
      <path d="M15 9.5l3 2-3 2" />
    </svg>
  );
}

function RemediationIcon({ size = 28, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 单元智能诊断取景与精准聚焦点阵 */}
      <path d="M3 7V4a1 1 0 0 1 1-1h3" />
      <path d="M17 3h3a1 1 0 0 1 1 1v3" />
      <path d="M21 17v3a1 1 0 0 1-1 1h-3" />
      <path d="M7 21H4a1 1 0 0 1-1-1v-3" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 4.5v2" />
      <path d="M12 17.5v2" />
      <path d="M4.5 12h2" />
      <path d="M17.5 12h2" />
    </svg>
  );
}

const MODE_CUSTOM_ICONS = {
  "new-lesson": NewLessonIcon,
  foundation: FoundationIcon,
  remediation: RemediationIcon,
};

const STEP_ICONS = {
  concept: BookOpen,
  practice: Edit3,
  milestone: Award,
  check: Check,
  skip: FastForward,
  mastery: CheckCheck,
  diagnostic: FileText,
  locate: Search,
  "target-mastery": Sparkles,
};

/**
 * 现代简约风格的 AI 自适应学习机模式选择主页面。
 */
export default function LearningModeSelectionPage({
  onSelectMode,
  currentCourse,
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryMode = searchParams.get("mode");

  const [selectedMode, setSelectedMode] = useState(() => {
    if (
      queryMode &&
      Object.values(CLASSROOM_LEARNING_MODE).includes(queryMode)
    ) {
      return queryMode;
    }
    return readPreferredLearningMode();
  });

  const studentIdentity = useMemo(() => {
    return readClassStudentIdentity();
  }, []);

  const activeConfig = useMemo(() => {
    return (
      DETAILED_MODE_CONFIGS.find((cfg) => cfg.id === selectedMode) ||
      DETAILED_MODE_CONFIGS[0]
    );
  }, [selectedMode]);

  const handleCardClick = (modeId) => {
    setSelectedMode(modeId);
  };

  const handleConfirm = () => {
    savePreferredLearningMode(selectedMode);
    if (onSelectMode) {
      onSelectMode(selectedMode);
      return;
    }
    navigate(`${routes.directory}?mode=${selectedMode}&selected=1`);
  };

  return (
    <div className="learning-pad-page-root" id="learning-mode-selection-page">
      {/* 顶部极简导航栏 */}
      <header className="pad-navbar">
        <div className="pad-nav-left">
          <BrandLogo />
        </div>

        <div className="pad-nav-right">
          <div className="pad-student-capsule">
            <span className="pad-student-avatar">
              {(studentIdentity?.studentName || "学").slice(0, 1)}
            </span>
            <span className="pad-student-name">
              {studentIdentity?.studentName || "AI 自适应学习空间"}
            </span>
            {studentIdentity?.className && (
              <span className="pad-student-class">· {studentIdentity.className}</span>
            )}
          </div>
        </div>
      </header>

      {/* 主体画布 */}
      <main className="pad-container">
        {/* 三大自适应学习模式卡片 */}
        <section
          className="pad-cards-row"
          role="radiogroup"
          aria-label="选择学习模式"
        >
          {DETAILED_MODE_CONFIGS.map((mode) => {
            const isSelected = selectedMode === mode.id;
            const ModeIcon =
              MODE_CUSTOM_ICONS[mode.iconName] || NewLessonIcon;

            return (
              <div
                key={mode.id}
                className={`pad-mode-card ${isSelected ? "is-active" : ""}`}
                style={{
                  "--theme-color": mode.accentColor,
                  "--theme-bg": mode.accentBg,
                  "--theme-border": mode.accentBorder,
                  "--theme-glow": mode.cardGlow || "rgba(37,99,235,0.08)",
                }}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => handleCardClick(mode.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(mode.id);
                  }
                }}
              >
                {/* 顶部标签与选中状态 */}
                <div className="pad-card-topbar">
                  <span className="pad-recommend-badge">
                    {mode.kidRecommendBadge || mode.tag}
                  </span>
                  <div
                    className={`pad-check-circle ${isSelected ? "checked" : ""}`}
                    aria-hidden="true"
                  >
                    {isSelected ? <Check size={15} strokeWidth={2.5} /> : null}
                  </div>
                </div>

                {/* 模式重绘矢量图标与标题 */}
                <div className="pad-card-main-header">
                  <div className="pad-card-avatar">
                    <ModeIcon size={26} />
                  </div>
                  <div className="pad-card-title-group">
                    <h2 className="pad-card-title">{mode.kidTitle || mode.title}</h2>
                    <p className="pad-card-motto">{mode.kidMotto || mode.tag}</p>
                  </div>
                </div>

                {/* 模式核心说明 */}
                <div className="pad-card-desc-box">
                  <p>{mode.kidDescription || mode.summary}</p>
                </div>

                {/* 进阶 3 步走微流程 */}
                <div className="pad-card-journey">
                  <div className="pad-journey-steps">
                    {(mode.kidPath || []).map((step, idx) => {
                      const StepIcon = STEP_ICONS[step.icon] || Check;
                      return (
                        <React.Fragment key={idx}>
                          <div className="pad-journey-step-item">
                            <div className="pad-journey-step-circle">
                              <StepIcon size={13} strokeWidth={2.2} />
                            </div>
                            <span className="pad-journey-step-label">
                              {step.label}
                            </span>
                            <span className="pad-journey-step-desc">
                              {step.desc}
                            </span>
                          </div>
                          {idx < (mode.kidPath || []).length - 1 && (
                            <div className="pad-journey-arrow" aria-hidden="true">
                              →
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* 底部选择操作按钮（已彻底去除时间限制与相关表达行） */}
                <div className="pad-card-bottom">
                  <button
                    type="button"
                    className={`pad-select-btn ${isSelected ? "selected" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(mode.id);
                    }}
                  >
                    {isSelected ? "已选定此模式 ✓" : "选择此模式"}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* 底部固定控制栏 */}
      <footer className="pad-footer-bar">
        <div className="pad-footer-content">
          <button
            type="button"
            className="pad-footer-start-btn"
            style={{
              background: activeConfig.accentColor,
            }}
            onClick={handleConfirm}
          >
            <span>{activeConfig.ctaText || "选好了，开启学习！"}</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </footer>
    </div>
  );
}

LearningModeSelectionPage.propTypes = {
  currentCourse: PropTypes.object,
  onSelectMode: PropTypes.func,
};


