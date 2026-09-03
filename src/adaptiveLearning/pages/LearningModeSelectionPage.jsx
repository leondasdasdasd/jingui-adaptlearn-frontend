import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  HelpCircle,
  Layers3,
  ScanSearch,
  Sparkles,
  Target,
  GraduationCap,
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

const ICON_COMPONENTS = {
  "book-open": BookOpen,
  layers: Layers3,
  "scan-search": ScanSearch,
};

/**
 * 独立的自适应学习模式选择页面。
 * 在进入具体自适应学习前，帮助学生根据个人目标（上新课 / 打基础 / 查缺补漏）自选适配路径。
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
    // 带有选定模式参数重定向到学习目录/工作台
    navigate(`${routes.directory}?mode=${selectedMode}&selected=1`);
  };

  const handleBackToDirectory = () => {
    navigate(routes.directory);
  };

  return (
    <div className="learning-mode-page-root" id="learning-mode-selection-page">
      {/* 顶部导航栏 */}
      <header className="mode-page-navbar">
        <div className="mode-page-nav-left">
          <BrandLogo />
          <div className="mode-page-nav-divider" />
          <button
            type="button"
            className="mode-page-back-btn"
            onClick={handleBackToDirectory}
            aria-label="返回学习目录"
          >
            <ArrowLeft size={16} />
            <span>返回学习目录</span>
          </button>
        </div>

        <div className="mode-page-nav-right">
          <div className="mode-page-student-badge">
            <span className="mode-page-student-avatar">
              {(studentIdentity?.studentName || "学").slice(0, 1)}
            </span>
            <span>{studentIdentity?.studentName || "自主学习空间"}</span>
            {studentIdentity?.className && (
              <span className="text-slate-400">· {studentIdentity.className}</span>
            )}
          </div>
        </div>
      </header>

      {/* 主体容器 */}
      <main className="mode-page-container">
        {/* 顶部引导说明 */}
        <section className="mode-page-hero">
          <div className="mode-page-eyebrow">
            <Sparkles size={14} />
            <span>自适应学习路径定制</span>
          </div>
          <h1 className="mode-page-headline">这次想怎么学？</h1>
          <p className="mode-page-description">
            云谷自适应引擎提供三种差异化的学习链路与练习密度。请根据你今天的学习目的自由选择，进入后系统将为你自动生成专属任务。
          </p>
        </section>

        {/* 三个模式卡片网格 */}
        <section
          className="mode-cards-grid"
          role="radiogroup"
          aria-label="选择学习模式"
        >
          {DETAILED_MODE_CONFIGS.map((mode) => {
            const isSelected = selectedMode === mode.id;
            const Icon = ICON_COMPONENTS[mode.iconName] || BookOpen;

            return (
              <div
                key={mode.id}
                className={`mode-card ${isSelected ? "is-selected" : ""}`}
                style={{
                  "--card-accent": mode.accentColor,
                  "--card-soft-bg": mode.accentBg,
                  "--card-border-subtle": mode.accentBorder,
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
                {/* 卡片顶部：图标与选中指示器 */}
                <div className="mode-card-header">
                  <div
                    className="mode-card-icon-wrapper"
                    style={{
                      background: mode.accentBg,
                      color: mode.accentColor,
                      border: `1px solid ${mode.accentBorder}`,
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="mode-card-radio" aria-hidden="true">
                    {isSelected && <div className="mode-card-radio-inner" />}
                  </div>
                </div>

                {/* 卡片主体：标题、标签与概述 */}
                <div className="mode-card-body">
                  <div className="mode-card-title-row">
                    <h2 className="mode-card-title">{mode.title}</h2>
                    <span
                      className="mode-card-badge"
                      style={{
                        background: mode.badgeBg,
                        color: mode.badgeFg,
                      }}
                    >
                      {mode.tag}
                    </span>
                  </div>
                  <p className="mode-card-summary">{mode.summary}</p>

                  <div className="mode-card-meta-pills">
                    <span className="mode-card-meta-pill">
                      <Clock size={12} />
                      {mode.estimatedDuration}
                    </span>
                    <span className="mode-card-meta-pill">
                      <Target size={12} />
                      {mode.preAssessmentLabel}
                    </span>
                  </div>
                </div>

                {/* 卡片流程：Pipeline 步骤分解 */}
                <div className="mode-card-pipeline">
                  <span className="mode-pipeline-title">学习流程安排</span>
                  {mode.steps.map((step) => (
                    <div key={step.index} className="mode-pipeline-step">
                      <span className="mode-pipeline-index">{step.index}</span>
                      <div className="mode-pipeline-info">
                        <span className="mode-pipeline-step-name">
                          {step.title}
                        </span>
                        <span className="mode-pipeline-step-desc">
                          {step.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 适合场景说明 */}
                <div className="mode-card-suitable">
                  <strong>适用：</strong>
                  {mode.suitableFor}
                </div>

                {/* 核心亮点 */}
                <div className="mode-card-highlights">
                  {mode.highlights.map((highlight, idx) => (
                    <div key={idx} className="mode-highlight-item">
                      <CheckCircle2 size={13} className="mode-highlight-icon" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* 模式对比矩阵 */}
        <section className="mode-comparison-section" aria-label="模式对比">
          <div className="mode-comparison-header">
            <h3 className="mode-comparison-title">三种模式功能对照</h3>
            <span className="text-xs text-slate-400">随时可在学习主页切换</span>
          </div>
          <div className="mode-comparison-table-wrapper">
            <table className="mode-comparison-table">
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>对比维度</th>
                  <th style={{ width: "26%" }}>📖 上新课</th>
                  <th style={{ width: "27%" }}>📚 打基础</th>
                  <th style={{ width: "27%" }}>🎯 查缺补漏</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold text-slate-700">课前摸底前测</td>
                  <td className="text-emerald-700 font-medium">❌ 免除前测，直接学</td>
                  <td className="text-blue-700 font-medium">✅ 包含 5-8 题摸底测</td>
                  <td className="text-amber-700 font-medium">✅ 单元全卷综合测试</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-700">自适应策略</td>
                  <td>循序概念推导 + 随堂例题</td>
                  <td>跳关已掌握，专注攻关薄弱层</td>
                  <td>定位考点死角，变式题靶向刷透</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-700">建议学习场景</td>
                  <td>新知首学 / 课前预习</td>
                  <td>课后巩固 / 循序过关</td>
                  <td>单元复习 / 考前冲刺</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-700">预期学习时长</td>
                  <td>20 ~ 30 分钟</td>
                  <td>15 ~ 25 分钟</td>
                  <td>30 ~ 45 分钟</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* 底部固定操作条 */}
      <footer className="mode-page-footer-dock">
        <div className="mode-footer-left">
          <div
            className="mode-footer-active-badge"
            style={{
              background: activeConfig.accentBg,
              color: activeConfig.accentColor,
              border: `1px solid ${activeConfig.accentBorder}`,
            }}
          >
            <span>当前选择：{activeConfig.title}</span>
          </div>
          <span className="mode-footer-summary">{activeConfig.summary}</span>
        </div>

        <div className="mode-footer-right">
          <button
            type="button"
            className="mode-footer-cancel-btn"
            onClick={handleBackToDirectory}
          >
            稍后再选
          </button>
          <button
            type="button"
            className="mode-footer-confirm-btn"
            onClick={handleConfirm}
          >
            <span>{activeConfig.ctaText}</span>
            <ArrowRight size={18} />
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
