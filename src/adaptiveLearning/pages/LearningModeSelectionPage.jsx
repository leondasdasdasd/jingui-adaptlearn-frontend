import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Layers3,
  ScanSearch,
  Sparkles,
  Zap,
  Target,
  Award,
  Video,
  Edit3,
  Star,
  Search,
  ShieldCheck,
  CheckCircle2,
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

const STEP_ICONS = {
  video: Video,
  edit: Edit3,
  star: Star,
  zap: Zap,
  skip: Zap,
  award: Award,
  search: Search,
  target: Target,
  shield: ShieldCheck,
};

const MODE_ICONS = {
  "book-open": BookOpen,
  layers: Layers3,
  "scan-search": ScanSearch,
};

/**
 * 学习机风格的自选学习模式页面。
 * 设计目标：低幼友好、大色块、大圆角、实体按键触感、直观易懂，杜绝套餐对比感。
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

  const handleBackToDirectory = () => {
    navigate(routes.directory);
  };

  return (
    <div className="learning-pad-page-root" id="learning-mode-selection-page">
      {/* 顶部导航 */}
      <header className="pad-navbar">
        <div className="pad-nav-left">
          <BrandLogo />
          <div className="pad-nav-divider" />
          <button
            type="button"
            className="pad-back-btn"
            onClick={handleBackToDirectory}
            aria-label="返回学习目录"
          >
            <ArrowLeft size={18} />
            <span>返回课时目录</span>
          </button>
        </div>

        <div className="pad-nav-right">
          <div className="pad-student-capsule">
            <span className="pad-student-avatar">
              {(studentIdentity?.studentName || "学").slice(0, 1)}
            </span>
            <span className="pad-student-name">
              {studentIdentity?.studentName || "自主学习空间"}
            </span>
            {studentIdentity?.className && (
              <span className="pad-student-class">· {studentIdentity.className}</span>
            )}
          </div>
        </div>
      </header>

      {/* 主体画布 */}
      <main className="pad-container">
        {/* 亲和可爱的引导区 */}
        <section className="pad-hero">
          <div className="pad-eyebrow">
            <Sparkles size={16} className="text-amber-500" />
            <span>学习机专属定制 · 选好就能开学</span>
          </div>
          <h1 className="pad-headline">
            今天想怎么学？🎒
          </h1>
          <p className="pad-subtitle">
            选一个最适合你的学习方式，点一下卡片就能开始通关！
          </p>
        </section>

        {/* 学习机三大模式大卡片 */}
        <section
          className="pad-cards-row"
          role="radiogroup"
          aria-label="选择学习模式"
        >
          {DETAILED_MODE_CONFIGS.map((mode) => {
            const isSelected = selectedMode === mode.id;
            const ModeIcon = MODE_ICONS[mode.iconName] || BookOpen;

            return (
              <div
                key={mode.id}
                className={`pad-mode-card ${isSelected ? "is-active" : ""}`}
                style={{
                  "--theme-color": mode.accentColor,
                  "--theme-bg": mode.accentBg,
                  "--theme-border": mode.accentBorder,
                  "--theme-glow": mode.cardGlow || "rgba(59,130,246,0.15)",
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
                {/* 顶部推荐徽章与选中对勾 */}
                <div className="pad-card-topbar">
                  <span className="pad-recommend-badge">
                    {mode.kidRecommendBadge || mode.tag}
                  </span>
                  <div
                    className={`pad-check-circle ${isSelected ? "checked" : ""}`}
                    aria-hidden="true"
                  >
                    {isSelected ? <Check size={16} strokeWidth={3} /> : null}
                  </div>
                </div>

                {/* 模式大图标与标题 */}
                <div className="pad-card-main-header">
                  <div className="pad-card-avatar">
                    <span className="pad-avatar-emoji">{mode.kidEmoji || "✨"}</span>
                    <div className="pad-avatar-icon-small">
                      <ModeIcon size={18} />
                    </div>
                  </div>
                  <div className="pad-card-title-group">
                    <h2 className="pad-card-title">{mode.kidTitle || mode.title}</h2>
                    <p className="pad-card-motto">{mode.kidMotto || mode.tag}</p>
                  </div>
                </div>

                {/* 大白话说明（给孩子看的简明一句话） */}
                <div className="pad-card-speech">
                  <p>{mode.kidDescription || mode.summary}</p>
                </div>

                {/* 学习机3步闯关小地图 */}
                <div className="pad-card-journey">
                  <div className="pad-journey-title">
                    <span>闯关 3 步走</span>
                  </div>
                  <div className="pad-journey-steps">
                    {(mode.kidPath || []).map((step, idx) => {
                      const StepIcon = STEP_ICONS[step.icon] || Star;
                      return (
                        <React.Fragment key={idx}>
                          <div className="pad-journey-step-item">
                            <div className="pad-journey-step-circle">
                              <StepIcon size={14} />
                            </div>
                            <span className="pad-journey-step-label">
                              {step.label}
                            </span>
                            <span className="pad-journey-step-desc">
                              {step.desc}
                            </span>
                          </div>
                          {idx < (mode.kidPath || []).length - 1 && (
                            <div className="pad-journey-arrow">➔</div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* 底部信息标签与选择按钮 */}
                <div className="pad-card-bottom">
                  <div className="pad-card-meta-chips">
                    <span className="pad-meta-chip">
                      <Clock size={13} />
                      {mode.estimatedDuration}
                    </span>
                    <span className="pad-meta-chip">
                      <Zap size={13} />
                      {mode.preAssessmentLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`pad-select-btn ${isSelected ? "selected" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(mode.id);
                    }}
                  >
                    {isSelected ? "已选这个模式 ✓" : "点击选择此模式"}
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* 学习机贴心伴学提示 */}
        <section className="pad-helper-tip" aria-label="学习机伴学建议">
          <div className="pad-helper-bubble">
            <span className="pad-helper-emoji">💡</span>
            <div className="pad-helper-text">
              <strong>选模式小贴士：</strong>
              如果是今天刚学的新章节，推荐选绿色【
              <strong className="text-emerald-600">学新课</strong>
              】；想快速写作业并跳过学会的内容，选蓝色【
              <strong className="text-blue-600">打基础</strong>
              】；单元复习和考前冲刺，选橙色【
              <strong className="text-amber-600">查缺补漏</strong>
              】！
            </div>
          </div>
        </section>
      </main>

      {/* 底部大按钮固定控制栏 */}
      <footer className="pad-footer-bar">
        <div className="pad-footer-content">
          <div className="pad-footer-info">
            <span className="pad-footer-chosen-icon">
              {activeConfig.kidEmoji || "🎯"}
            </span>
            <div className="pad-footer-chosen-text">
              <div className="pad-footer-chosen-title">
                已选择：<strong>{activeConfig.kidTitle || activeConfig.title}</strong>
              </div>
              <div className="pad-footer-chosen-desc">
                {activeConfig.kidMotto || activeConfig.summary}
              </div>
            </div>
          </div>

          <div className="pad-footer-actions">
            <button
              type="button"
              className="pad-footer-back"
              onClick={handleBackToDirectory}
            >
              返回课程目录
            </button>
            <button
              type="button"
              className="pad-footer-start-btn"
              style={{
                background: activeConfig.accentColor,
              }}
              onClick={handleConfirm}
            >
              <span>{activeConfig.ctaText || "选好了，开启学习！"}</span>
              <ArrowRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

LearningModeSelectionPage.propTypes = {
  currentCourse: PropTypes.object,
  onSelectMode: PropTypes.func,
};

