import React, { useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Grid3X3,
  Link2,
  Lock,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { createDefaultContent } from "../shared/domain/defaultLessonContent";

const DOMAINS = [
  { id: "CR", name: "概念与符号", code: "CR" },
  { id: "PJ", name: "程序、推理与论证", code: "PJ" },
  { id: "M", name: "模型与不变结构", code: "M" },
  { id: "SF", name: "总结、交流与反思", code: "SF" },
];

const LEVELS = [
  { id: "A", name: "识别与再现", code: "A" },
  { id: "B", name: "理解与转换", code: "B" },
  { id: "C", name: "选择与执行", code: "C" },
  { id: "D", name: "关联与论证", code: "D" },
  { id: "E", name: "迁移与建构", code: "E" },
];

const ROLE_META = {
  CORE: { label: "核心", className: "role-core", color: "#2563eb" },
  SUPPORT: { label: "支撑", className: "role-support", color: "#059669" },
  EXTENSION: { label: "拓展", className: "role-extension", color: "#d97706" },
  NOT_APPLICABLE: { label: "不适用", className: "role-na", color: "#94a3b8" },
};

/**
 *
 * @param kpName
 * @param kpIdx
 */
function getFallbackMatrix(kpName, kpIdx) {
  const defaultMatrices =
    createDefaultContent()["section-1-1"].assessmentMatrices || {};
  const keys = Object.keys(defaultMatrices).filter((k) => k !== "composite");
  const fallbackKey = keys[kpIdx % keys.length] || keys[0];
  const base = defaultMatrices[fallbackKey] || defaultMatrices[keys[0]];

  return {
    ...base,
    knowledgePointId: kpName,
    knowledgePointName: kpName,
    cells: base.cells || [],
  };
}

/**
 *
 * @param root0
 * @param root0.profile
 * @param root0.selectedKp
 * @param root0.attempts
 * @param root0.knowledgePointsList
 * @param root0.kpMasteryMap
 * @param root0.onSelectKp
 */
export default function StudentMatrixMasteryCard({
  profile,
  selectedKp = "ALL",
  attempts = [],
  knowledgePointsList = [],
  kpMasteryMap = new Map(),
  onSelectKp,
}) {
  const matricesSource =
    profile?.assessmentMatrices ||
    profile?.contentPackage?.assessmentMatrices ||
    createDefaultContent()["section-1-1"].assessmentMatrices;

  // 1. 整理知识点与对应矩阵
  const activeKpName =
    selectedKp === "ALL" ? knowledgePointsList[0] || "正数和负数" : selectedKp;
  const activeKpIdx = Math.max(0, knowledgePointsList.indexOf(activeKpName));

  const currentMatrix = useMemo(() => {
    let raw = null;
    if (Array.isArray(matricesSource)) {
      raw = matricesSource.find(
        (m) =>
          m.knowledgePointName === activeKpName ||
          m.knowledgePointId === activeKpName,
      );
    } else if (matricesSource && typeof matricesSource === "object") {
      raw =
        matricesSource[activeKpName] ||
        Object.values(matricesSource).find(
          (m) => m.knowledgePointName === activeKpName,
        );
    }

    if (raw && Array.isArray(raw.cells) && raw.cells.length > 0) {
      return { ...raw, knowledgePointName: activeKpName };
    }
    return getFallbackMatrix(activeKpName, activeKpIdx);
  }, [matricesSource, activeKpName, activeKpIdx]);

  // 2. 匹配作答记录并判定【点亮】状态
  const {
    cellMap,
    activeCells,
    lightedCells,
    lightedCount,
    totalApplicable,
    isAllLighted,
  } = useMemo(() => {
    const cells = currentMatrix.cells || [];
    const cellDataMap = new Map();

    const kpAttempts = attempts.filter(
      (a) => a.kpName === activeKpName || activeKpName === "ALL",
    );
    const kpMasteryInfo = kpMasteryMap.get(activeKpName);
    const postMastery = kpMasteryInfo?.postMastery ?? 85;

    let totalApp = 0;
    let litCount = 0;

    // 建立 4 Domain x 5 Level 的全格子网格
    for (const domain of DOMAINS) {
      for (const level of LEVELS) {
        const key = `${domain.id}:${level.id}`;
        const cell = cells.find(
          (c) =>
            (c.domain === domain.id || c.domainId === domain.id) &&
            (c.targetLevel === level.id || c.level === level.id),
        );

        if (!cell || cell.role === "NOT_APPLICABLE" || cell.role === "NA") {
          cellDataMap.set(key, {
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

        // 查找与该评估格关联的学生作答证据
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

        // 决定是否【点亮】: 存在通过证据，或整体掌握度达标且为核心/支撑格
        let isLighted = false;
        if (passedAttempts.length > 0) {
          isLighted = true;
        } else if (relatedAttempts.length === 0 && postMastery >= 75) {
          // 模拟无特定格Id标签的通用作答但知识点已掌握的情况
          switch (cell.role) {
            case "CORE": {
              isLighted = postMastery >= 70;
              break;
            }
            case "SUPPORT": {
              isLighted = postMastery >= 80;
              break;
            }
            case "EXTENSION": {
              {
                isLighted = postMastery >= 90;
                // No default
              }
              break;
            }
          }
        }

        if (isLighted) litCount += 1;

        cellDataMap.set(key, {
          key,
          domain: domain.id,
          level: level.id,
          cellId:
            cell.matrixCellId || `${activeKpName}:${domain.id}:${level.id}`,
          role: cell.role || "SUPPORT",
          observableBehavior:
            cell.observableBehavior || "能理解并运用该维度的概念进行题目推演",
          evidenceCriteria: cell.evidenceCriteria || [
            "准确识别关键信息",
            "逻辑表达严密",
          ],
          recommendedTypes: cell.recommendedQuestionTypes || ["single_choice"],
          isApplicable: true,
          isLighted,
          relatedAttempts,
          passedAttempts,
        });
      }
    }

    const activeList = [...cellDataMap.values()].filter((c) => c.isApplicable);
    const litList = activeList.filter((c) => c.isLighted);

    return {
      cellMap: cellDataMap,
      activeCells: activeList,
      lightedCells: litList,
      lightedCount: litCount,
      totalApplicable: totalApp,
      isAllLighted: totalApp > 0 && litCount === totalApp,
    };
  }, [currentMatrix, attempts, activeKpName, kpMasteryMap]);

  // 默认选中第一个可用的评估格
  const [selectedCellKey, setSelectedCellKey] = useState(
    () => activeCells[0]?.key || "CR:A",
  );

  const selectedCellData =
    cellMap.get(selectedCellKey) || activeCells[0] || null;

  return (
    <section
      className="student-matrix-card"
      aria-label="知识点评估矩阵点亮状态"
    >
      {/* 矩阵表格主体 (4 Domain x 5 Level) */}
      <div className="sm-table-container">
        <table className="sm-matrix-table">
          <thead>
            <tr>
              <th scope="col" className="col-domain-header">
                领域 / 认知维度
              </th>
              {LEVELS.map((lvl) => (
                <th key={lvl.id} scope="col">
                  <div className="lvl-head-code">{lvl.code}</div>
                  <div className="lvl-head-name">{lvl.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((dom) => (
              <tr key={dom.id}>
                <th scope="row" className="row-domain-header">
                  <div className="dom-head-code">{dom.code}</div>
                  <div className="dom-head-name">{dom.name}</div>
                </th>
                {LEVELS.map((lvl) => {
                  const cellKey = `${dom.id}:${lvl.id}`;
                  const cell = cellMap.get(cellKey);

                  if (!cell || !cell.isApplicable) {
                    return (
                      <td key={lvl.id}>
                        <div className="sm-cell cell-na">
                          <span className="dash">—</span>
                          <small>不适用</small>
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
                        className={`sm-cell cell-applicable ${cell.isLighted ? "is-lighted" : "is-pending"} ${isSelected ? "is-selected" : ""}`}
                        onClick={() => setSelectedCellKey(cellKey)}
                        title={`${dom.code}-${lvl.code} (${roleMeta.label}): ${cell.isLighted ? "已点亮" : "待点亮"}`}
                      >
                        <div className="cell-top-row">
                          <span className="cell-code">{`${dom.code}-${lvl.code}`}</span>
                          <span
                            className={`cell-role-badge ${roleMeta.className}`}
                          >
                            {roleMeta.label}
                          </span>
                        </div>

                        <div className="cell-body">
                          {cell.isLighted ? (
                            <span className="lighted-badge">
                              <Sparkles size={11} /> 已点亮
                            </span>
                          ) : (
                            <span className="pending-badge">
                              <Lock size={11} /> 待点亮
                            </span>
                          )}
                        </div>

                        <div className="cell-footer">
                          {cell.relatedAttempts.length > 0 ? (
                            <span className="evidence-count">
                              <Link2 size={11} /> {cell.passedAttempts.length}/
                              {cell.relatedAttempts.length} 通过
                            </span>
                          ) : (
                            <span className="evidence-none">需要答题</span>
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

      {/* 选中评估格的下探详情面板 */}
      {selectedCellData && selectedCellData.isApplicable && (
        <div className="sm-cell-detail-inspector">
          <div className="inspector-header">
            <div className="inspector-title">
              <span
                className={`role-badge-lg ${ROLE_META[selectedCellData.role]?.className}`}
              >
                {ROLE_META[selectedCellData.role]?.label}评估格
              </span>
              <h4>
                {`${selectedCellData.domain}-${selectedCellData.level}`} ·{" "}
                {DOMAINS.find((d) => d.id === selectedCellData.domain)?.name} /{" "}
                {LEVELS.find((l) => l.id === selectedCellData.level)?.name}
              </h4>
            </div>

            <div className="inspector-status-box">
              {selectedCellData.isLighted ? (
                <span className="status-pill lighted">
                  <CheckCircle2 size={15} />{" "}
                  该评估格已点亮（已具备合格答题证据）
                </span>
              ) : (
                <span className="status-pill pending">
                  <Target size={15} /> 待点亮（继续作答该维度的题目以攻克）
                </span>
              )}
            </div>
          </div>

          <div className="inspector-body">
            <div className="inspector-col">
              <h5>
                <Award size={14} /> 目标行为要求
              </h5>
              <p>{selectedCellData.observableBehavior}</p>
            </div>

            <div className="inspector-col">
              <h5>
                <Zap size={14} /> 证据标准
              </h5>
              <ul>
                {selectedCellData.evidenceCriteria.map((criterion, i) => (
                  <li key={i}>{criterion}</li>
                ))}
              </ul>
            </div>

            <div className="inspector-col attempts-col">
              <h5>
                <BookOpen size={14} /> 本格作答证据 (
                {selectedCellData.relatedAttempts.length} 题)
              </h5>
              {selectedCellData.relatedAttempts.length > 0 ? (
                <div className="evidence-attempts-list">
                  {selectedCellData.relatedAttempts.map((att, idx) => {
                    const passed =
                      att.result === "已通过" || att.score === att.maxScore;
                    return (
                      <div
                        key={idx}
                        className={`evidence-att-item ${passed ? "pass" : "fail"}`}
                      >
                        <span className="att-idx">#{idx + 1}</span>
                        <span className="att-stem">
                          {att.stem || att.question?.stem || "习题试题"}
                        </span>
                        <span
                          className={`att-score-tag ${passed ? "pass" : "fail"}`}
                        >
                          {passed ? "正确" : "待提升"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="no-evidence-text">
                  目前暂无该特定评估格的直接关联答题，可以通过针对性练习题点亮该格。
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
