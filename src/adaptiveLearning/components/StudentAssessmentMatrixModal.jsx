import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Grid3X3,
  Link2,
  Lock,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";

import {
  createDefaultContent,
  getMockLessonContent,
} from "../shared/domain/defaultLessonContent";
import {
  ASSESSMENT_MATRIX_DOMAINS,
  ASSESSMENT_MATRIX_DOMAIN_LABELS,
  ASSESSMENT_MATRIX_LEVEL_LABELS,
  ASSESSMENT_MATRIX_LEVELS,
} from "../shared/domain/knowledgeAssessmentMatrix";

const DOMAINS = [
  { id: "CR", code: "CR", name: ASSESSMENT_MATRIX_DOMAIN_LABELS.CR || "概念与符号" },
  { id: "PJ", code: "PJ", name: ASSESSMENT_MATRIX_DOMAIN_LABELS.PJ || "程序、推理与论证" },
  { id: "M", code: "M", name: ASSESSMENT_MATRIX_DOMAIN_LABELS.M || "模型与不变结构" },
  { id: "SF", code: "SF", name: ASSESSMENT_MATRIX_DOMAIN_LABELS.SF || "总结、交流与反思" },
];

const LEVELS = [
  { id: "A", code: "A", name: ASSESSMENT_MATRIX_LEVEL_LABELS.A || "识别与再现" },
  { id: "B", code: "B", name: ASSESSMENT_MATRIX_LEVEL_LABELS.B || "理解与转换" },
  { id: "C", code: "C", name: ASSESSMENT_MATRIX_LEVEL_LABELS.C || "选择与执行" },
  { id: "D", code: "D", name: ASSESSMENT_MATRIX_LEVEL_LABELS.D || "关联与论证" },
  { id: "E", code: "E", name: ASSESSMENT_MATRIX_LEVEL_LABELS.E || "迁移与建构" },
];

const ROLE_META = {
  CORE: { label: "核心", className: "role-core", color: "#2563eb", bg: "#eff6ff" },
  SUPPORT: { label: "支撑", className: "role-support", color: "#059669", bg: "#ecfdf5" },
  EXTENSION: { label: "拓展", className: "role-extension", color: "#d97706", bg: "#fffbeb" },
  NOT_APPLICABLE: { label: "不适用", className: "role-na", color: "#94a3b8", bg: "#f8fafc" },
};

function getLessonMatrices(lesson) {
  if (!lesson) return {};
  try {
    const defaultContent = createDefaultContent();
    if (defaultContent[lesson.id]?.assessmentMatrices) {
      return defaultContent[lesson.id].assessmentMatrices;
    }
    const mock = getMockLessonContent(lesson.id);
    if (mock?.assessmentMatrices) {
      return mock.assessmentMatrices;
    }
  } catch {
    // fallback
  }

  // Generate standard fallback matrices for this lesson
  const kps = lesson.knowledgePoints || [];
  const matrices = {};
  for (const kp of kps) {
    matrices[kp.id] = {
      knowledgePointId: kp.id,
      knowledgePointName: kp.name,
      targetStatement: kp.objective || `掌握 ${kp.name} 的基本概念与解题方法。`,
      rationale: "课标核心要求与学业质量标准。",
      cells: [
        {
          matrixCellId: `${kp.id}:CR:A`,
          domain: "CR",
          targetLevel: "A",
          role: "CORE",
          observableBehavior: `能够准确识别和描述 ${kp.name} 的基本概念与符号表示。`,
          evidenceCriteria: ["概念表述准确无误", "能区分正负及基准"],
          recommendedQuestionTypes: ["single_choice", "fill_blank"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp.id}:CR:B`,
          domain: "CR",
          targetLevel: "B",
          role: "SUPPORT",
          observableBehavior: `能够理解 ${kp.name} 的数学含义并在不同表征之间进行转换。`,
          evidenceCriteria: ["能解释具体情境中的数学含义", "准确进行数形转换"],
          recommendedQuestionTypes: ["single_choice", "fill_blank"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp.id}:PJ:C`,
          domain: "PJ",
          targetLevel: "C",
          role: "CORE",
          observableBehavior: `能够选择合适的方法并规范执行 ${kp.name} 的计算或推理步骤。`,
          evidenceCriteria: ["运算过程完整无跳步", "推理依据合理"],
          recommendedQuestionTypes: ["fill_blank", "short_answer"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp.id}:M:B`,
          domain: "M",
          targetLevel: "B",
          role: "SUPPORT",
          observableBehavior: `能够在实际问题情境中提炼 ${kp.name} 的数学模型并建立数量关系。`,
          evidenceCriteria: ["能准确抽象出关键变量与条件", "建立的方程或模型符合题意"],
          recommendedQuestionTypes: ["single_choice", "short_answer"],
          minimumIndependentEvidence: 1,
        },
        {
          matrixCellId: `${kp.id}:SF:D`,
          domain: "SF",
          targetLevel: "D",
          role: "EXTENSION",
          observableBehavior: `能反思求解过程并总结关于 ${kp.name} 的数学思想方法与错因规律。`,
          evidenceCriteria: ["总结逻辑清晰条理", "能指出易错点与变式规律"],
          recommendedQuestionTypes: ["short_answer"],
          minimumIndependentEvidence: 1,
        },
      ],
    };
  }

  matrices.composite = {
    knowledgePointId: "composite",
    knowledgePointName: "整课综合评估",
    targetStatement: `综合运用本课各知识点解决复杂与迁移问题。`,
    rationale: "全课综合认知建构与核心素养考查。",
    cells: [
      {
        matrixCellId: "composite:CR:B",
        domain: "CR",
        targetLevel: "B",
        role: "CORE",
        observableBehavior: "能综合分析各知识点之间的内在逻辑联系并形成知识结构。",
        evidenceCriteria: ["构建完整的概念图谱", "准确阐明概念间的承接关系"],
        recommendedQuestionTypes: ["single_choice", "short_answer"],
        minimumIndependentEvidence: 1,
      },
      {
        matrixCellId: "composite:PJ:C",
        domain: "PJ",
        targetLevel: "C",
        role: "CORE",
        observableBehavior: "能综合运用多种法则与步骤完成多阶段问题的求解。",
        evidenceCriteria: ["多步骤演算准确", "综合解题逻辑严谨"],
        recommendedQuestionTypes: ["fill_blank", "short_answer"],
        minimumIndependentEvidence: 1,
      },
      {
        matrixCellId: "composite:M:D",
        domain: "M",
        targetLevel: "D",
        role: "EXTENSION",
        observableBehavior: "能在跨情境、综合情境中建立复合数学模型并论证其合理性。",
        evidenceCriteria: ["提炼复合情境关键规律", "论证严密且结论正确"],
        recommendedQuestionTypes: ["short_answer"],
        minimumIndependentEvidence: 1,
      },
    ],
  };

  return matrices;
}

export default function StudentAssessmentMatrixModal({
  isOpen,
  onClose,
  mode = "lesson", // "lesson" | "knowledgePoint"
  lesson,
  knowledgePoint = null,
  profile = {},
  attempts = [],
  onStartPractice = null,
}) {
  const matrices = useMemo(() => getLessonMatrices(lesson), [lesson]);

  // Determine current active target (specific KP or Lesson Composite)
  const isComposite = mode === "lesson" && !knowledgePoint;
  const activeTargetId = knowledgePoint ? knowledgePoint.id : "composite";
  const currentKpName = knowledgePoint
    ? knowledgePoint.name
    : lesson
      ? `${lesson.title} · 课时综合矩阵`
      : "认知与考核矩阵";

  // Current Matrix Data
  const currentMatrix = useMemo(() => {
    let raw = matrices[activeTargetId];
    if (!raw && !isComposite) {
      raw = Object.values(matrices).find(
        (m) =>
          m.knowledgePointId === activeTargetId ||
          m.knowledgePointName === currentKpName,
      );
    }
    if (raw && Array.isArray(raw.cells) && raw.cells.length > 0) {
      return raw;
    }
    // Fallback if missing
    return {
      knowledgePointId: activeTargetId,
      knowledgePointName: currentKpName,
      targetStatement: knowledgePoint?.objective || `掌握 ${currentKpName} 的核心认知结构。`,
      rationale: "依据国家新课标素养评价框架建立。",
      cells: [
        {
          matrixCellId: `${activeTargetId}:CR:A`,
          domain: "CR",
          targetLevel: "A",
          role: "CORE",
          observableBehavior: `能准确识别并表述 ${currentKpName} 的定义及数学符号。`,
          evidenceCriteria: ["概念清晰", "符号无误"],
          recommendedQuestionTypes: ["single_choice", "fill_blank"],
        },
        {
          matrixCellId: `${activeTargetId}:PJ:B`,
          domain: "PJ",
          targetLevel: "B",
          role: "CORE",
          observableBehavior: `能理解 ${currentKpName} 的法则并在具体情境中执行演算。`,
          evidenceCriteria: ["计算准确", "步骤合规"],
          recommendedQuestionTypes: ["fill_blank", "short_answer"],
        },
        {
          matrixCellId: `${activeTargetId}:M:C`,
          domain: "M",
          targetLevel: "C",
          role: "SUPPORT",
          observableBehavior: `能在应用情境中运用 ${currentKpName} 建立数量关系。`,
          evidenceCriteria: ["模型建立合理", "答案正确"],
          recommendedQuestionTypes: ["single_choice", "short_answer"],
        },
      ],
    };
  }, [matrices, activeTargetId, isComposite, currentKpName, knowledgePoint]);

  // Current KP's student mastery & status
  const studentKpItem = profile[activeTargetId] || {
    status: "not_started",
    mastery: null,
  };
  const kpMasteryValue = studentKpItem.mastery;

  // Build grid map and calculate lighting state
  const { cellMap, activeCells, lightedCount, totalApplicable, lightingRate } =
    useMemo(() => {
      const cells = currentMatrix.cells || [];
      const map = new Map();
      let totalApp = 0;
      let litCount = 0;

      const kpAttempts = attempts.filter((a) => {
        if (isComposite) return true;
        return (
          a.kpId === activeTargetId ||
          a.kpName === currentKpName ||
          a.knowledgePointId === activeTargetId
        );
      });

      for (const domain of DOMAINS) {
        for (const level of LEVELS) {
          const key = `${domain.id}:${level.id}`;
          const cell = cells.find(
            (c) =>
              (c.domain === domain.id || c.domainId === domain.id) &&
              (c.targetLevel === level.id || c.level === level.id),
          );

          if (!cell || cell.role === "NOT_APPLICABLE" || cell.role === "NA") {
            map.set(key, {
              key,
              domain: domain.id,
              level: level.id,
              role: "NOT_APPLICABLE",
              isApplicable: false,
              isLighted: false,
            });
            continue;
          }

          totalApp += 1;

          // Evidence matching
          const relatedAttempts = kpAttempts.filter((a) => {
            const matchCellId =
              a.matrixCellId === cell.matrixCellId ||
              a.question?.matrixCellId === cell.matrixCellId;
            const matchCode =
              a.matrixCellCode === `${domain.id}-${level.id}` ||
              a.matrixCellCode === `${domain.id}:${level.id}`;
            const matchDomainLevel =
              (a.domain === domain.id || a.question?.domain === domain.id) &&
              (a.targetLevel === level.id || a.level === level.id);
            return matchCellId || matchCode || matchDomainLevel;
          });

          const passedAttempts = relatedAttempts.filter(
            (a) =>
              a.result === "已通过" ||
              a.score === a.maxScore ||
              a.score / (a.maxScore || 1) >= 0.7,
          );

          // Lighting policy
          let isLighted = false;
          if (passedAttempts.length > 0) {
            isLighted = true;
          } else if (kpMasteryValue != null) {
            if (cell.role === "CORE" && kpMasteryValue >= 70) isLighted = true;
            else if (cell.role === "SUPPORT" && kpMasteryValue >= 80) isLighted = true;
            else if (cell.role === "EXTENSION" && kpMasteryValue >= 90) isLighted = true;
          }

          if (isLighted) litCount += 1;

          map.set(key, {
            key,
            domain: domain.id,
            level: level.id,
            cellId: cell.matrixCellId || `${activeTargetId}:${domain.id}:${level.id}`,
            role: cell.role || "CORE",
            observableBehavior:
              cell.observableBehavior ||
              `能够理解并运用 ${currentKpName} 在 ${domain.name} 维度达到 ${level.name} 认知层级。`,
            evidenceCriteria:
              Array.isArray(cell.evidenceCriteria) && cell.evidenceCriteria.length > 0
                ? cell.evidenceCriteria
                : ["能准确理解关键概念并独立推导", "解题规范且逻辑严密"],
            recommendedQuestionTypes: Array.isArray(cell.recommendedQuestionTypes)
              ? cell.recommendedQuestionTypes
              : ["single_choice", "fill_blank"],
            isApplicable: true,
            isLighted,
            relatedAttempts,
            passedAttempts,
          });
        }
      }

      const activeList = [...map.values()].filter((c) => c.isApplicable);
      const rate = totalApp > 0 ? Math.round((litCount / totalApp) * 100) : 0;

      return {
        cellMap: map,
        activeCells: activeList,
        lightedCount: litCount,
        totalApplicable: totalApp,
        lightingRate: rate,
      };
    }, [currentMatrix, attempts, activeTargetId, isComposite, currentKpName, kpMasteryValue]);

  // Selected Cell for Detailed Inspection
  const [selectedCellKey, setSelectedCellKey] = useState("");

  // Auto-select first applicable cell on load
  React.useEffect(() => {
    if (activeCells.length > 0) {
      setSelectedCellKey(activeCells[0].key);
    }
  }, [activeTargetId, activeCells]);

  const selectedCell = cellMap.get(selectedCellKey) || activeCells[0] || null;

  if (!isOpen) return null;

  return (
    <div className="sam-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="sam-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Simplified Header: Icon + Name */}
        <header className="sam-modal-header">
          <div className="sam-header-left">
            <div className="sam-icon-badge">
              <Grid3X3 size={20} />
            </div>
            <h2 className="sam-modal-title">{currentKpName}</h2>
          </div>
          <button
            type="button"
            className="sam-btn-close"
            onClick={onClose}
            aria-label="关闭弹窗"
          >
            <X size={18} />
          </button>
        </header>

        {/* Modal Body */}
        <div className="sam-modal-body">
          {/* Matrix Lighting Statistics & Legend Bar */}
          <div className="sam-stats-legend-bar">
            {/* Left: Progress Pill */}
            <div className="sam-lighting-stat-pill">
              <div className="sam-lighting-icon">
                <Sparkles size={16} />
              </div>
              <div className="sam-lighting-info">
                <span className="sam-lighting-title">矩阵点亮进度</span>
                <span className="sam-lighting-numbers">
                  <strong>{lightedCount}</strong> / {totalApplicable} 格已点亮
                  <span className="sam-lighting-pct">({lightingRate}%)</span>
                </span>
              </div>
              <div className="sam-lighting-progress-track">
                <div
                  className="sam-lighting-progress-fill"
                  style={{ width: `${lightingRate}%` }}
                />
              </div>
            </div>

            {/* Right: Legend */}
            <div className="sam-legend-group" aria-label="矩阵图例">
              <span className="sam-legend-item">
                <span className="sam-legend-dot lighted" />
                <span>已点亮</span>
              </span>
              <span className="sam-legend-item">
                <span className="sam-legend-dot core" />
                <span>核心</span>
              </span>
              <span className="sam-legend-item">
                <span className="sam-legend-dot support" />
                <span>支撑</span>
              </span>
              <span className="sam-legend-item">
                <span className="sam-legend-dot extension" />
                <span>拓展</span>
              </span>
              <span className="sam-legend-item">
                <span className="sam-legend-dot pending" />
                <span>待点亮</span>
              </span>
              <span className="sam-legend-item">
                <span className="sam-legend-dot na" />
                <span>不适用</span>
              </span>
            </div>
          </div>

          {/* 4 Domains x 5 Levels Matrix Grid Table */}
          <div className="sam-table-wrapper">
            <table className="sam-matrix-table">
              <thead>
                <tr>
                  <th scope="col" className="col-domain-header">
                    认知领域 / 维度
                  </th>
                  {LEVELS.map((lvl) => (
                    <th key={lvl.id} scope="col">
                      <div className="sam-lvl-code">{lvl.code}</div>
                      <div className="sam-lvl-name">{lvl.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOMAINS.map((dom) => (
                  <tr key={dom.id}>
                    <th scope="row" className="row-domain-header">
                      <div className="sam-dom-code">{dom.code}</div>
                      <div className="sam-dom-name">{dom.name}</div>
                    </th>
                    {LEVELS.map((lvl) => {
                      const cellKey = `${dom.id}:${lvl.id}`;
                      const cell = cellMap.get(cellKey);

                      if (!cell || !cell.isApplicable) {
                        return (
                          <td key={lvl.id}>
                            <div className="sam-cell cell-na">
                              <span className="sam-na-dash">—</span>
                              <span className="sam-na-label">不适用</span>
                            </div>
                          </td>
                        );
                      }

                      const roleMeta = ROLE_META[cell.role] || ROLE_META.SUPPORT;
                      const isSelected = selectedCellKey === cellKey;

                      return (
                        <td key={lvl.id}>
                          <button
                            type="button"
                            className={`sam-cell cell-applicable ${cell.isLighted ? "is-lighted" : "is-pending"} ${isSelected ? "is-selected" : ""}`}
                            onClick={() => setSelectedCellKey(cellKey)}
                            title={`${dom.code}-${lvl.code} (${roleMeta.label}): ${cell.isLighted ? "已点亮" : "待点亮"}`}
                          >
                            <div className="sam-cell-top">
                              <span className="sam-cell-code">{`${dom.code}-${lvl.code}`}</span>
                              <span className={`sam-role-tag ${roleMeta.className}`}>
                                {roleMeta.label}
                              </span>
                            </div>

                            <div className="sam-cell-center">
                              {cell.isLighted ? (
                                <span className="sam-lighted-badge">
                                  <Sparkles size={11} />
                                  <span>已点亮</span>
                                </span>
                              ) : (
                                <span className="sam-pending-badge">
                                  <Lock size={11} />
                                  <span>待点亮</span>
                                </span>
                              )}
                            </div>

                            <div className="sam-cell-bottom">
                              {cell.relatedAttempts?.length > 0 ? (
                                <span className="sam-evidence-count">
                                  <Link2 size={10} />
                                  <span>
                                    {cell.passedAttempts.length}/{cell.relatedAttempts.length} 答题
                                  </span>
                                </span>
                              ) : (
                                <span className="sam-evidence-hint">待攻克</span>
                              )}
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected Cell Inspector Detail Card */}
          {selectedCell && selectedCell.isApplicable && (
            <div className="sam-inspector-panel">
              <div className="sam-inspector-header">
                <div className="sam-inspector-title-wrap">
                  <span className={`sam-role-badge-lg ${ROLE_META[selectedCell.role]?.className}`}>
                    {ROLE_META[selectedCell.role]?.label}考核格
                  </span>
                  <h3 className="sam-inspector-title">
                    {`${selectedCell.domain}-${selectedCell.level}`} ·{" "}
                    {DOMAINS.find((d) => d.id === selectedCell.domain)?.name} /{" "}
                    {LEVELS.find((l) => l.id === selectedCell.level)?.name}
                  </h3>
                </div>

                <div className="sam-inspector-status-badge">
                  {selectedCell.isLighted ? (
                    <span className="sam-status-pill lighted">
                      <CheckCircle2 size={14} />
                      <span>该认知格已点亮（具备达标学习与答题证据）</span>
                    </span>
                  ) : (
                    <span className="sam-status-pill pending">
                      <Target size={14} />
                      <span>待点亮（继续作答该维度的题目以攻克点亮）</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="sam-inspector-grid">
                {/* 1. 可观察行为要求 */}
                <div className="sam-inspector-box">
                  <div className="sam-box-heading">
                    <Award size={14} />
                    <span>目标行为要求 (Observable Behavior)</span>
                  </div>
                  <p className="sam-box-text">{selectedCell.observableBehavior}</p>
                </div>

                {/* 2. 证据标准 */}
                <div className="sam-inspector-box">
                  <div className="sam-box-heading">
                    <Zap size={14} />
                    <span>证据标准 (Evidence Criteria)</span>
                  </div>
                  <ul className="sam-criteria-list">
                    {selectedCell.evidenceCriteria.map((crit, idx) => (
                      <li key={idx}>
                        <ChevronRight size={12} className="sam-criteria-arrow" />
                        <span>{crit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. 作答与证据记录 */}
                <div className="sam-inspector-box attempts-box">
                  <div className="sam-box-heading">
                    <BookOpen size={14} />
                    <span>作答证据与记录 ({selectedCell.relatedAttempts.length} 题)</span>
                  </div>
                  {selectedCell.relatedAttempts.length > 0 ? (
                    <div className="sam-attempts-list">
                      {selectedCell.relatedAttempts.map((att, idx) => {
                        const passed =
                          att.result === "已通过" || att.score === att.maxScore;
                        return (
                          <div
                            key={idx}
                            className={`sam-att-item ${passed ? "pass" : "fail"}`}
                          >
                            <span className="sam-att-num">#{idx + 1}</span>
                            <span className="sam-att-stem">
                              {att.stem || att.question?.stem || "课前/巩固练习题"}
                            </span>
                            <span className={`sam-att-result ${passed ? "pass" : "fail"}`}>
                              {passed ? "正确通过" : "需巩固"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="sam-no-att-text">
                      暂无直接关联作答记录。可通过针对性题目演练点亮该格！
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer: Clean, simplified buttons */}
        <footer className="sam-modal-footer">
          <div className="sam-footer-right">
            <button
              type="button"
              className="sam-btn-secondary"
              onClick={onClose}
            >
              关闭
            </button>
            {onStartPractice && !isComposite && (
              <button
                type="button"
                className="sam-btn-primary"
                onClick={() => {
                  onClose();
                  onStartPractice(activeTargetId);
                }}
              >
                <span>强化学习 {currentKpName}</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
