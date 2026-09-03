import React, { useMemo, useRef, useState } from "react";
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
import PropTypes from "prop-types";

import { trans } from "../../utils/i18n";
import {
  ASSESSMENT_MATRIX_DOMAIN_LABELS,
  ASSESSMENT_MATRIX_LEVEL_LABELS,
} from "../shared/domain/knowledgeAssessmentMatrix";
import useModalLifecycle from "../shared/react/useModalLifecycle";
import { buildStudentAssessmentMatrixViewModel } from "../student/presentation/studentAssessmentMatrix";

const DOMAINS = [
  {
    id: "CR",
    code: "CR",
    name: ASSESSMENT_MATRIX_DOMAIN_LABELS.CR || "概念与符号",
  },
  {
    id: "PJ",
    code: "PJ",
    name: ASSESSMENT_MATRIX_DOMAIN_LABELS.PJ || "程序、推理与论证",
  },
  {
    id: "M",
    code: "M",
    name: ASSESSMENT_MATRIX_DOMAIN_LABELS.M || "模型与不变结构",
  },
  {
    id: "SF",
    code: "SF",
    name: ASSESSMENT_MATRIX_DOMAIN_LABELS.SF || "总结、交流与反思",
  },
];

const LEVELS = [
  {
    id: "A",
    code: "A",
    name: ASSESSMENT_MATRIX_LEVEL_LABELS.A || "识别与再现",
  },
  {
    id: "B",
    code: "B",
    name: ASSESSMENT_MATRIX_LEVEL_LABELS.B || "理解与转换",
  },
  {
    id: "C",
    code: "C",
    name: ASSESSMENT_MATRIX_LEVEL_LABELS.C || "选择与执行",
  },
  {
    id: "D",
    code: "D",
    name: ASSESSMENT_MATRIX_LEVEL_LABELS.D || "关联与论证",
  },
  {
    id: "E",
    code: "E",
    name: ASSESSMENT_MATRIX_LEVEL_LABELS.E || "迁移与建构",
  },
];

/**
 *
 * @param root0
 * @param root0.isOpen
 * @param root0.onClose
 * @param root0.mode
 * @param root0.lesson
 * @param root0.knowledgePoint
 * @param root0.profile
 * @param root0.attempts
 * @param root0.assessmentMatrices
 * @param root0.onStartPractice
 */
export default function StudentAssessmentMatrixModal({
  isOpen,
  onClose,
  mode = "lesson", // "lesson" | "knowledgePoint"
  lesson,
  knowledgePoint = null,
  profile = {},
  attempts = [],
  assessmentMatrices = {},
  onStartPractice = null,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const isComposite = mode === "lesson" && !knowledgePoint;
  const domains = useMemo(
    () =>
      DOMAINS.map((domain) => ({
        ...domain,
        name: trans(`adaptiveLearning.matrix.domain.${domain.id}`, domain.name),
      })),
    [],
  );
  const levels = useMemo(
    () =>
      LEVELS.map((level) => ({
        ...level,
        name: trans(`adaptiveLearning.matrix.level.${level.id}`, level.name),
      })),
    [],
  );
  const roleMeta = {
    CORE: {
      label: trans("adaptiveLearning.matrix.core", "核心"),
      className: "role-core",
    },
    SUPPORT: {
      label: trans("adaptiveLearning.matrix.support", "支撑"),
      className: "role-support",
    },
    EXTENSION: {
      label: trans("adaptiveLearning.matrix.extension", "拓展"),
      className: "role-extension",
    },
    NOT_APPLICABLE: {
      label: trans("adaptiveLearning.matrix.notApplicable", "不适用"),
      className: "role-na",
    },
  };
  const {
    activeTargetId,
    currentKpName,
    cellMap,
    activeCells,
    lightedCount,
    totalApplicable,
    lightingRate,
  } = useMemo(
    () =>
      buildStudentAssessmentMatrixViewModel({
        lesson,
        knowledgePoint,
        mode,
        profile,
        attempts,
        assessmentMatrices,
        domains,
        levels,
      }),
    [
      assessmentMatrices,
      attempts,
      domains,
      knowledgePoint,
      lesson,
      levels,
      mode,
      profile,
    ],
  );
  useModalLifecycle({
    open: isOpen,
    dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  });

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
    <div
      className="sam-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="sam-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sam-modal-title"
        tabIndex={-1}
      >
        {/* Simplified Header: Icon + Name */}
        <header className="sam-modal-header">
          <div className="sam-header-left">
            <div className="sam-icon-badge">
              <Grid3X3 size={20} />
            </div>
            <h2 id="sam-modal-title" className="sam-modal-title">
              {currentKpName}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="sam-btn-close"
            onClick={onClose}
            aria-label={trans(
              "adaptiveLearning.matrix.closeDialog",
              "关闭弹窗",
            )}
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
                <span className="sam-lighting-title">
                  {trans("adaptiveLearning.matrix.progress", "矩阵点亮进度")}
                </span>
                <span className="sam-lighting-numbers">
                  {trans(
                    "adaptiveLearning.matrix.progressCount",
                    "{$lighted} / {$total} 格已点亮",
                    { lighted: lightedCount, total: totalApplicable },
                  )}
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
            <div
              className="sam-legend-group"
              aria-label={trans("adaptiveLearning.matrix.legend", "矩阵图例")}
            >
              <span className="sam-legend-item">
                <span className="sam-legend-dot lighted" />
                <span>
                  {trans("adaptiveLearning.matrix.lighted", "已点亮")}
                </span>
              </span>
              <span className="sam-legend-item">
                <span className="sam-legend-dot core" />
                <span>{roleMeta.CORE.label}</span>
              </span>
              <span className="sam-legend-item">
                <span className="sam-legend-dot support" />
                <span>{roleMeta.SUPPORT.label}</span>
              </span>
              <span className="sam-legend-item">
                <span className="sam-legend-dot extension" />
                <span>{roleMeta.EXTENSION.label}</span>
              </span>
              <span className="sam-legend-item">
                <span className="sam-legend-dot pending" />
                <span>
                  {trans("adaptiveLearning.matrix.pending", "待点亮")}
                </span>
              </span>
              <span className="sam-legend-item">
                <span className="sam-legend-dot na" />
                <span>{roleMeta.NOT_APPLICABLE.label}</span>
              </span>
            </div>
          </div>

          {/* 4 Domains x 5 Levels Matrix Grid Table */}
          <div className="sam-table-wrapper">
            <table className="sam-matrix-table">
              <thead>
                <tr>
                  <th scope="col" className="col-domain-header">
                    {trans(
                      "adaptiveLearning.matrix.domainDimension",
                      "认知领域 / 维度",
                    )}
                  </th>
                  {levels.map((lvl) => (
                    <th key={lvl.id} scope="col">
                      <div className="sam-lvl-code">{lvl.code}</div>
                      <div className="sam-lvl-name">{lvl.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domains.map((dom) => (
                  <tr key={dom.id}>
                    <th scope="row" className="row-domain-header">
                      <div className="sam-dom-code">{dom.code}</div>
                      <div className="sam-dom-name">{dom.name}</div>
                    </th>
                    {levels.map((lvl) => {
                      const cellKey = `${dom.id}:${lvl.id}`;
                      const cell = cellMap.get(cellKey);

                      if (!cell || !cell.isApplicable) {
                        return (
                          <td key={lvl.id}>
                            <div className="sam-cell cell-na">
                              <span className="sam-na-dash">—</span>
                              <span className="sam-na-label">
                                {roleMeta.NOT_APPLICABLE.label}
                              </span>
                            </div>
                          </td>
                        );
                      }

                      const cellRoleMeta =
                        roleMeta[cell.role] || roleMeta.SUPPORT;
                      const isSelected = selectedCellKey === cellKey;

                      return (
                        <td key={lvl.id}>
                          <button
                            type="button"
                            className={`sam-cell cell-applicable ${cell.isLighted ? "is-lighted" : "is-pending"} ${isSelected ? "is-selected" : ""}`}
                            onClick={() => setSelectedCellKey(cellKey)}
                            title={`${dom.code}-${lvl.code} (${cellRoleMeta.label}): ${
                              cell.isLighted
                                ? trans(
                                    "adaptiveLearning.matrix.lighted",
                                    "已点亮",
                                  )
                                : trans(
                                    "adaptiveLearning.matrix.pending",
                                    "待点亮",
                                  )
                            }`}
                          >
                            <div className="sam-cell-top">
                              <span className="sam-cell-code">{`${dom.code}-${lvl.code}`}</span>
                              <span
                                className={`sam-role-tag ${cellRoleMeta.className}`}
                              >
                                {cellRoleMeta.label}
                              </span>
                            </div>

                            <div className="sam-cell-center">
                              {cell.isLighted ? (
                                <span className="sam-lighted-badge">
                                  <Sparkles size={11} />
                                  <span>
                                    {trans(
                                      "adaptiveLearning.matrix.lighted",
                                      "已点亮",
                                    )}
                                  </span>
                                </span>
                              ) : (
                                <span className="sam-pending-badge">
                                  <Lock size={11} />
                                  <span>
                                    {trans(
                                      "adaptiveLearning.matrix.pending",
                                      "待点亮",
                                    )}
                                  </span>
                                </span>
                              )}
                            </div>

                            <div className="sam-cell-bottom">
                              {cell.relatedAttempts?.length > 0 ? (
                                <span className="sam-evidence-count">
                                  <Link2 size={10} />
                                  <span>
                                    {trans(
                                      "adaptiveLearning.matrix.answerEvidence",
                                      "{$passed}/{$total} 答题",
                                      {
                                        passed: cell.passedAttempts.length,
                                        total: cell.relatedAttempts.length,
                                      },
                                    )}
                                  </span>
                                </span>
                              ) : (
                                <span className="sam-evidence-hint">
                                  {trans(
                                    "adaptiveLearning.matrix.toMaster",
                                    "待攻克",
                                  )}
                                </span>
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
                  <span
                    className={`sam-role-badge-lg ${roleMeta[selectedCell.role]?.className}`}
                  >
                    {trans(
                      "adaptiveLearning.matrix.roleCell",
                      "{$role}考核格",
                      { role: roleMeta[selectedCell.role]?.label },
                    )}
                  </span>
                  <h3 className="sam-inspector-title">
                    {`${selectedCell.domain}-${selectedCell.level}`} ·{" "}
                    {domains.find((d) => d.id === selectedCell.domain)?.name} /{" "}
                    {levels.find((l) => l.id === selectedCell.level)?.name}
                  </h3>
                </div>

                <div className="sam-inspector-status-badge">
                  {selectedCell.isLighted ? (
                    <span className="sam-status-pill lighted">
                      <CheckCircle2 size={14} />
                      <span>
                        {trans(
                          "adaptiveLearning.matrix.lightedDetail",
                          "该认知格已点亮（具备达标学习与答题证据）",
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className="sam-status-pill pending">
                      <Target size={14} />
                      <span>
                        {trans(
                          "adaptiveLearning.matrix.pendingDetail",
                          "待点亮（继续作答该维度的题目以攻克点亮）",
                        )}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="sam-inspector-grid">
                {/* 1. 可观察行为要求 */}
                <div className="sam-inspector-box">
                  <div className="sam-box-heading">
                    <Award size={14} />
                    <span>
                      {trans(
                        "adaptiveLearning.matrix.observableBehavior",
                        "目标行为要求 (Observable Behavior)",
                      )}
                    </span>
                  </div>
                  <p className="sam-box-text">
                    {selectedCell.observableBehavior}
                  </p>
                </div>

                {/* 2. 证据标准 */}
                <div className="sam-inspector-box">
                  <div className="sam-box-heading">
                    <Zap size={14} />
                    <span>
                      {trans(
                        "adaptiveLearning.matrix.evidenceCriteria",
                        "证据标准 (Evidence Criteria)",
                      )}
                    </span>
                  </div>
                  <ul className="sam-criteria-list">
                    {selectedCell.evidenceCriteria.map((crit, idx) => (
                      <li key={idx}>
                        <ChevronRight
                          size={12}
                          className="sam-criteria-arrow"
                        />
                        <span>{crit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. 作答与证据记录 */}
                <div className="sam-inspector-box attempts-box">
                  <div className="sam-box-heading">
                    <BookOpen size={14} />
                    <span>
                      {trans(
                        "adaptiveLearning.matrix.attemptRecords",
                        "作答证据与记录 ({$count} 题)",
                        { count: selectedCell.relatedAttempts.length },
                      )}
                    </span>
                  </div>
                  {selectedCell.relatedAttempts.length > 0 ? (
                    <div className="sam-attempts-list">
                      {selectedCell.relatedAttempts.map((att, idx) => {
                        const passed =
                          selectedCell.passedAttempts.includes(att);
                        return (
                          <div
                            key={idx}
                            className={`sam-att-item ${passed ? "pass" : "fail"}`}
                          >
                            <span className="sam-att-num">#{idx + 1}</span>
                            <span className="sam-att-stem">
                              {att.stem ||
                                att.question?.stem ||
                                trans(
                                  "adaptiveLearning.matrix.practiceQuestion",
                                  "课前/巩固练习题",
                                )}
                            </span>
                            <span
                              className={`sam-att-result ${passed ? "pass" : "fail"}`}
                            >
                              {passed
                                ? trans(
                                    "adaptiveLearning.matrix.passed",
                                    "正确通过",
                                  )
                                : trans(
                                    "adaptiveLearning.matrix.needsReview",
                                    "需巩固",
                                  )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="sam-no-att-text">
                      {trans(
                        "adaptiveLearning.matrix.noAttempts",
                        "暂无直接关联作答记录。可通过针对性题目演练点亮该格！",
                      )}
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
              {trans("global.close", "关闭")}
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
                <span>
                  {trans(
                    "adaptiveLearning.matrix.startPractice",
                    "强化学习 {$knowledgePoint}",
                    { knowledgePoint: currentKpName },
                  )}
                </span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

const knowledgePointShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  objective: PropTypes.string,
});

StudentAssessmentMatrixModal.propTypes = {
  assessmentMatrices: PropTypes.objectOf(PropTypes.object),
  attempts: PropTypes.arrayOf(PropTypes.object),
  isOpen: PropTypes.bool.isRequired,
  knowledgePoint: knowledgePointShape,
  lesson: PropTypes.shape({
    id: PropTypes.string.isRequired,
    knowledgePoints: PropTypes.arrayOf(knowledgePointShape),
    title: PropTypes.string.isRequired,
  }),
  mode: PropTypes.oneOf(["lesson", "knowledgePoint"]),
  onClose: PropTypes.func.isRequired,
  onStartPractice: PropTypes.func,
  profile: PropTypes.objectOf(PropTypes.object),
};
